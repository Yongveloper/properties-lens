import * as assert from 'assert';
import * as vscode from 'vscode';
import { computeDecorations } from '../../src/keyLens';
import { closeAll, getSvc, waitFor, ws } from './helpers';

function hoverText(hovers: vscode.Hover[]): string {
	return hovers.flatMap((h) => h.contents).map((c) => (typeof c === 'string' ? c : (c as vscode.MarkdownString).value)).join('\n');
}

suite('key lens', () => {
	teardown(closeAll);

	test('decorations: one known, one unknown key in page.jsp', async () => {
		const svc = await getSvc();
		const doc = await vscode.workspace.openTextDocument(ws('web/page.jsp'));
		const d = computeDecorations(doc, svc);
		assert.strictEqual(d.normal.length, 1);
		assert.strictEqual(d.unknown.length, 1);
		assert.strictEqual(d.normal[0].renderOptions?.after?.contentText, '필수 입력');
		assert.strictEqual(d.normal[0].range.start.character, '<div><spring:message code="k1"'.length);
	});

	test('hover shows all locales', async () => {
		await getSvc();
		const h = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', ws('web/page.jsp'), new vscode.Position(0, 28));
		assert.match(hoverText(h), /\| ko \| 필수 입력 \|/);
		assert.match(hoverText(h), /\| en \| Required input \|/);
	});

	test('hover on js key shows missing locale', async () => {
		await getSvc();
		const h = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', ws('web/app.js'), new vscode.Position(0, 14));
		assert.match(hoverText(h), /\| en \| ⚠ missing/);
	});

	test('definition returns the decoded primary line', async () => {
		await getSvc();
		const l = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', ws('web/page.jsp'), new vscode.Position(0, 28));
		assert.strictEqual(l.length, 1);
		assert.strictEqual(l[0].uri.scheme, 'properties-lens');
		assert.ok(l[0].uri.path.endsWith('msg_ko.properties'));
		assert.strictEqual(l[0].range.start.line, 1);
	});

	test('F12 jumps to the decoded primary line', async () => {
		await getSvc();
		const editor = await vscode.window.showTextDocument(ws('web/page.jsp'));
		editor.selection = new vscode.Selection(0, 28, 0, 28);
		await vscode.commands.executeCommand('editor.action.revealDefinition');
		await waitFor(() => vscode.window.activeTextEditor?.document.uri.scheme === 'properties-lens');
		const active = vscode.window.activeTextEditor!;
		assert.ok(active.document.uri.path.endsWith('msg_ko.properties'));
		assert.strictEqual(active.selection.start.line, 1);
	});

	test('no hover outside key', async () => {
		await getSvc();
		const h = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', ws('web/page.jsp'), new vscode.Position(0, 8));
		assert.strictEqual(hoverText(h).includes('필수'), false);
	});
});
