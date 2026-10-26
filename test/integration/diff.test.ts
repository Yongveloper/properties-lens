import * as assert from 'assert';
import { appendFileSync, writeFileSync } from 'fs';
import * as vscode from 'vscode';
import { toDecodedUri } from '../../src/decodedDocs';
import { changedBundleFiles } from '../../src/diff';
import { closeAll, getSvc, restoreWs, waitFor, ws } from './helpers';

suite('decoded diff', () => {
	teardown(async () => {
		await closeAll();
		restoreWs();
	});

	test('HEAD decoded content', async () => {
		const d = await vscode.workspace.openTextDocument(toDecodedUri(ws('messages/msg_ko.properties'), 'HEAD'));
		assert.match(d.getText(), /k1=필수 입력/);
	});

	test('changedBundleFiles detects edits', async () => {
		const svc = await getSvc();
		assert.deepStrictEqual(await changedBundleFiles(svc), []);
		appendFileSync(ws('messages/msg_en.properties').fsPath, 'k9=new\n');
		const changed = await changedBundleFiles(svc);
		assert.deepStrictEqual(changed.map((u) => u.path), [ws('messages/msg_en.properties').path]);
	});

	test('new untracked bundle file counts as changed with empty HEAD', async () => {
		const svc = await getSvc();
		const ja = ws('messages/msg_ja.properties');
		writeFileSync(ja.fsPath, 'k1=\\u5FC5\\u9808\n');
		await waitFor(() => svc.isBundleFile(ja));
		assert.ok((await changedBundleFiles(svc)).some((u) => u.path === ja.path));
		const head = await vscode.workspace.openTextDocument(toDecodedUri(ja, 'HEAD'));
		assert.strictEqual(head.getText(), '');
	});

	test('compareWithHead opens diff tab', async () => {
		await vscode.commands.executeCommand('propertiesLens.compareWithHead', ws('messages/msg_ko.properties'));
		await waitFor(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputTextDiff);
	});

	test('compareWithHead accepts an SCM resource state', async () => {
		await vscode.commands.executeCommand('propertiesLens.compareWithHead', { resourceUri: ws('messages/msg_en.properties') });
		await waitFor(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputTextDiff);
	});

	test('compareAllChanges opens multi-file diff titled for bundles', async () => {
		await getSvc();
		appendFileSync(ws('messages/msg_en.properties').fsPath, 'k9=new\n');
		await vscode.commands.executeCommand('propertiesLens.compareAllChanges');
		// VS Code 가 제목 뒤에 ' (1 file)' 을 붙인다
		await waitFor(() => vscode.window.tabGroups.activeTabGroup.activeTab?.label.startsWith('Message bundle changes (decoded)') ?? false);
	});
});
