import * as vscode from 'vscode';
import { readConfig } from './config';
import { fromDecodedUri, SCHEME, toDecodedUri } from './decodedDocs';
import { IndexService } from './indexService';

const CONFLICT = /^<{7}(?: |$)/m;
const EDITOR_WAIT_MS = 300;
const SELECTION_WAIT_MS = 250;

/** 이벤트가 오거나 시간이 지나면 끝나는 대기 */
function waitEvent<T>(event: vscode.Event<T>, accept: (e: T) => boolean, ms: number): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(done, ms);
		const sub = event((e) => accept(e) && done());
		function done() {
			clearTimeout(timer);
			sub.dispose();
			resolve();
		}
	});
}

/** 탭 이벤트는 편집기보다, 편집기는 요청된 선택 위치보다 먼저 온다. 둘 다 잠깐 기다린 뒤 편집기를 돌려준다. */
async function settledEditor(key: string): Promise<vscode.TextEditor | undefined> {
	const find = () => vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === key);
	if (!find()) await waitEvent(vscode.window.onDidChangeVisibleTextEditors, () => !!find(), EDITOR_WAIT_MS);
	const editor = find();
	if (editor) await waitEvent(vscode.window.onDidChangeTextEditorSelection, (e) => e.textEditor === editor, SELECTION_WAIT_MS);
	return editor;
}

function findTab(group: vscode.TabGroup, uri: vscode.Uri): vscode.Tab | undefined {
	return group.tabs.find((t) => t.input instanceof vscode.TabInputText && t.input.uri.toString() === uri.toString());
}

function isOpenAnywhere(uri: vscode.Uri): boolean {
	return vscode.window.tabGroups.all.some((g) => findTab(g, uri));
}

/** 번들 원본 탭이 열리면 한글 탭으로 바꾼다. 원본 보기를 고른 파일은 그 탭이 다 닫힐 때까지 그대로 둔다. */
export function registerAutoOpen(context: vscode.ExtensionContext, svc: IndexService): void {
	const raw = new Set<string>();
	const inFlight = new Set<string>();

	const replace = async (tab: vscode.Tab) => {
		// diff·병합·노트북 등 다른 입력은 건드리지 않는다
		if (!(tab.input instanceof vscode.TabInputText)) return;
		const uri = tab.input.uri;
		const key = uri.toString();
		if (uri.scheme !== 'file' || tab.isDirty || raw.has(key) || inFlight.has(key) || !readConfig().autoOpenDecoded) return;
		inFlight.add(key);
		try {
			await svc.ready;
			if (!svc.isBundleFile(uri)) return;
			const group = tab.group;
			if (!findTab(group, uri)) return;
			const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === key);
			// 충돌 해결 중인 파일은 원본 그대로 둔다 (Accept Current/Incoming 등)
			if (doc && CONFLICT.test(doc.getText())) return;
			// 검색 결과·문제 패널·`파일:줄` 로 연 경우 그 위치를 유지한다
			const editor = await settledEditor(key);
			// 기다리는 사이 탭이 닫혔으면 다시 열지 않는다
			if (!findTab(group, uri)) return;
			await vscode.window.showTextDocument(toDecodedUri(uri, 'WORK'), {
				viewColumn: group.viewColumn,
				preview: tab.isPreview,
				preserveFocus: !tab.isActive,
				selection: editor?.selection,
			});
			const original = findTab(group, uri);
			if (original) {
				await vscode.window.tabGroups.close(original);
			} else if (!tab.isPreview) {
				// 고정 탭이 그사이 닫혔다 = 사용자가 닫았다. 방금 연 한글 탭도 닫는다 (미리보기 탭은 한글 탭이 대체한 것이라 제외)
				const decoded = findTab(group, toDecodedUri(uri, 'WORK'));
				if (decoded) await vscode.window.tabGroups.close(decoded);
			}
		} finally {
			inFlight.delete(key);
		}
	};

	const openRaw = async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.uri.scheme !== SCHEME) return;
		const decoded = editor.document.uri;
		const { file } = fromDecodedUri(decoded);
		const group = vscode.window.tabGroups.activeTabGroup;
		raw.add(file.toString());
		await vscode.window.showTextDocument(file, { viewColumn: group.viewColumn, preview: false });
		await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
		const decodedTab = findTab(group, decoded);
		if (decodedTab) await vscode.window.tabGroups.close(decodedTab);
	};

	context.subscriptions.push(
		vscode.window.tabGroups.onDidChangeTabs((e) => {
			for (const tab of [...e.opened, ...e.changed]) void replace(tab);
			for (const tab of e.closed) {
				if (tab.input instanceof vscode.TabInputText && !isOpenAnywhere(tab.input.uri)) raw.delete(tab.input.uri.toString());
			}
		}),
		vscode.commands.registerCommand('propertiesLens.openRaw', openRaw),
	);

	// 재시작 시 복원된 탭
	void svc.ready.then(() => vscode.window.tabGroups.all.flatMap((g) => g.tabs).forEach((t) => void replace(t)));
}
