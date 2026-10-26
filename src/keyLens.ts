import * as vscode from 'vscode';
import { readConfig, SECTION } from './config';
import { hoverMarkdown, inlineText } from './core/hoverText';
import { compilePatterns, findKeys, KeyMatch } from './core/keys';
import { toDecodedUri } from './decodedDocs';
import { IndexService } from './indexService';
import { uiLabels } from './labels';
import { openKeyDefinition } from './search';

const DEBOUNCE_MS = 150;
const LINK_COMMANDS = ['propertiesLens.openDefinition', 'propertiesLens.findUsages', 'propertiesLens.copyKey'];

let compiled: { source: string[]; regexes: RegExp[]; errors: string[] } | undefined;

function patterns(): { regexes: RegExp[]; errors: string[] } {
	const source = readConfig().keyPatterns;
	if (compiled?.source !== source) compiled = { source, ...compilePatterns(source) };
	return compiled;
}

function selector(): vscode.DocumentSelector {
	return { scheme: 'file', pattern: readConfig().decorateFiles };
}

function keyAt(doc: vscode.TextDocument, pos: vscode.Position): KeyMatch | undefined {
	const offset = doc.offsetAt(pos);
	return findKeys(doc.getText(), patterns().regexes).find((m) => m.start <= offset && offset < m.end);
}

export function computeDecorations(doc: vscode.TextDocument, svc: IndexService): { normal: vscode.DecorationOptions[]; unknown: vscode.DecorationOptions[] } {
	const normal: vscode.DecorationOptions[] = [];
	const unknown: vscode.DecorationOptions[] = [];
	const labels = uiLabels();
	for (const m of findKeys(doc.getText(), patterns().regexes)) {
		const info = svc.index.get(m.key);
		const at = doc.positionAt(m.matchEnd);
		(info ? normal : unknown).push({ range: new vscode.Range(at, at), renderOptions: { after: { contentText: inlineText(info, labels) } } });
	}
	return { normal, unknown };
}

export function registerKeyLens(context: vscode.ExtensionContext, svc: IndexService): void {
	const after = { margin: '0 0 0 0.6em', fontStyle: 'italic' };
	const normalType = vscode.window.createTextEditorDecorationType({ after: { ...after, color: new vscode.ThemeColor('editorCodeLens.foreground') } });
	const unknownType = vscode.window.createTextEditorDecorationType({ after: { ...after, color: new vscode.ThemeColor('editorWarning.foreground') } });
	let timer: ReturnType<typeof setTimeout> | undefined;

	const decorate = () => {
		for (const editor of vscode.window.visibleTextEditors) {
			if (vscode.languages.match(selector(), editor.document) === 0) continue;
			const d = computeDecorations(editor.document, svc);
			editor.setDecorations(normalType, d.normal);
			editor.setDecorations(unknownType, d.unknown);
		}
	};
	const schedule = () => {
		clearTimeout(timer);
		timer = setTimeout(decorate, DEBOUNCE_MS);
	};
	const warnPatternErrors = () => {
		const { errors } = patterns();
		if (errors.length) void vscode.window.showWarningMessage(vscode.l10n.t('Invalid propertiesLens.keyPatterns: {0}', errors.join('; ')));
	};

	context.subscriptions.push(
		normalType,
		unknownType,
		{ dispose: () => clearTimeout(timer) },
		vscode.window.onDidChangeVisibleTextEditors(schedule),
		vscode.workspace.onDidChangeTextDocument((e) => vscode.window.visibleTextEditors.some((ed) => ed.document === e.document) && schedule()),
		svc.onDidChange(schedule),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (!e.affectsConfiguration(SECTION)) return;
			if (e.affectsConfiguration(`${SECTION}.keyPatterns`)) warnPatternErrors();
			schedule();
		}),
		// 셀렉터 패턴은 등록 시점 값. decorateFiles 를 바꾸면 창 다시 로드가 필요하다 (장식은 즉시 반영)
		vscode.languages.registerHoverProvider(selector(), {
			provideHover(doc, pos) {
				const m = keyAt(doc, pos);
				const info = m && svc.index.get(m.key);
				if (!m || !info) return undefined;
				const md = new vscode.MarkdownString(hoverMarkdown(info, uiLabels()));
				md.isTrusted = { enabledCommands: LINK_COMMANDS };
				return new vscode.Hover(md, new vscode.Range(doc.positionAt(m.start), doc.positionAt(m.end)));
			},
		}),
		vscode.languages.registerDefinitionProvider(selector(), {
			provideDefinition(doc, pos) {
				const m = keyAt(doc, pos);
				const info = m && svc.index.get(m.key);
				// 한글 탭의 primary 줄로 바로 간다 (여러 개를 주면 원본 escape 를 peek 으로 보여 준다). 다른 언어는 hover 에 있다.
				const t = info?.primary ?? info?.translations.find((x) => x.value);
				if (!t) return undefined;
				return new vscode.Location(toDecodedUri(svc.uriOf(t.path), 'WORK'), new vscode.Position(t.line, 0));
			},
		}),
		vscode.commands.registerCommand('propertiesLens.openDefinition', (key: string) => openKeyDefinition(svc, key)),
	);

	warnPatternErrors();
	void svc.ready.then(decorate);
}
