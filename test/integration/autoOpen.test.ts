import * as assert from 'assert';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { toDecodedUri } from '../../src/decodedDocs';
import { closeAll, getSvc, openTabUris, restoreWs, sleep, waitFor, WS, ws } from './helpers';

function bundleHashes(): string {
	const dir = path.join(WS, 'messages');
	return readdirSync(dir).sort().map((f) => createHash('sha256').update(readFileSync(path.join(dir, f))).digest('hex')).join(',');
}

const activeScheme = () => vscode.window.activeTextEditor?.document.uri.scheme;

suite('auto open decoded view', () => {
	let before: string;
	suiteSetup(async () => {
		await getSvc();
		before = bundleHashes();
	});
	teardown(async () => {
		await closeAll();
		restoreWs();
	});

	test('opening bundle file shows decoded tab', async () => {
		await vscode.window.showTextDocument(ws('messages/msg_ko.properties'));
		await waitFor(() => activeScheme() === 'properties-lens');
		await waitFor(() => !openTabUris().some((u) => u.scheme === 'file' && u.path.endsWith('msg_ko.properties')));
	});

	test('keeps the requested line when swapping to decoded', async () => {
		await vscode.window.showTextDocument(ws('messages/msg_ko.properties'), { selection: new vscode.Range(2, 0, 2, 0) });
		await waitFor(() => activeScheme() === 'properties-lens');
		assert.strictEqual(vscode.window.activeTextEditor!.selection.start.line, 2);
	});

	test('file with merge conflict markers stays raw', async () => {
		writeFileSync(ws('messages/msg_en.properties').fsPath, '<<<<<<< HEAD\nk1=a\n=======\nk1=b\n>>>>>>> other\n');
		await vscode.window.showTextDocument(ws('messages/msg_en.properties'));
		await sleep(500);
		assert.strictEqual(activeScheme(), 'file');
	});

	test('dirty raw tab is not swapped', async () => {
		const cfg = vscode.workspace.getConfiguration('propertiesLens');
		await cfg.update('autoOpenDecoded', false, vscode.ConfigurationTarget.Workspace);
		const editor = await vscode.window.showTextDocument(ws('messages/msg_en.properties'));
		await editor.edit((b) => b.insert(new vscode.Position(0, 0), '#'));
		await cfg.update('autoOpenDecoded', undefined, vscode.ConfigurationTarget.Workspace);
		await vscode.window.showTextDocument(ws('config/application.properties'));
		await vscode.window.showTextDocument(editor.document);
		await sleep(500);
		assert.strictEqual(activeScheme(), 'file');
		assert.ok(vscode.window.activeTextEditor!.document.isDirty);
		await vscode.commands.executeCommand('workbench.action.files.revert');
	});

	test('closing a bundle tab right after opening does not reopen it', async () => {
		await vscode.window.showTextDocument(ws('messages/msg_en.properties'), { preview: false });
		await closeAll();
		await sleep(800);
		assert.strictEqual(openTabUris().length, 0);
	});

	test('non-bundle properties stays raw', async () => {
		await vscode.window.showTextDocument(ws('config/application.properties'));
		await sleep(500);
		assert.strictEqual(activeScheme(), 'file');
	});

	test('openRaw opens readonly original and keeps it', async () => {
		await vscode.window.showTextDocument(ws('messages/msg_en.properties'));
		await waitFor(() => activeScheme() === 'properties-lens');
		await vscode.commands.executeCommand('propertiesLens.openRaw');
		await waitFor(() => activeScheme() === 'file');
		await sleep(500);
		const editor = vscode.window.activeTextEditor!;
		assert.strictEqual(editor.document.uri.scheme, 'file');
		await editor.edit((b) => b.insert(new vscode.Position(0, 0), 'x'));
		assert.ok(!editor.document.isDirty, 'raw tab must be readonly');
		assert.ok(!openTabUris().some((u) => u.scheme === 'properties-lens'), 'decoded tab closed');
	});

	test('does not hijack diff editors', async () => {
		const f = ws('messages/msg_ko.properties');
		await vscode.commands.executeCommand('vscode.diff', toDecodedUri(f, 'WORK'), f, 't');
		await sleep(500);
		assert.ok(vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputTextDiff);
	});

	test('autoOpenDecoded=false keeps raw', async () => {
		const cfg = vscode.workspace.getConfiguration('propertiesLens');
		await cfg.update('autoOpenDecoded', false, vscode.ConfigurationTarget.Workspace);
		try {
			await vscode.window.showTextDocument(ws('messages/msg_ko.properties'));
			await sleep(500);
			assert.strictEqual(activeScheme(), 'file');
		} finally {
			await cfg.update('autoOpenDecoded', undefined, vscode.ConfigurationTarget.Workspace);
		}
	});

	test('never writes original', () => assert.strictEqual(bundleHashes(), before));
});
