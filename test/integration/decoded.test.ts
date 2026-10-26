import * as assert from 'assert';
import { writeFileSync, rmSync } from 'fs';
import * as vscode from 'vscode';
import { toDecodedUri } from '../../src/decodedDocs';
import { getSvc, restoreWs, waitFor, ws } from './helpers';

suite('decoded documents', () => {
	teardown(restoreWs);

	test('decoded doc shows Hangul and keeps url', async () => {
		const doc = await vscode.workspace.openTextDocument(toDecodedUri(ws('messages/msg_ko.properties'), 'WORK'));
		assert.match(doc.getText(), /k1=필수 입력/);
		assert.match(doc.getText(), /%EB%A6%AC/);
		assert.strictEqual(doc.languageId, 'properties');
	});

	test('index excludes non-bundle properties', async () => {
		const svc = await getSvc();
		assert.ok(!svc.isBundleFile(ws('config/application.properties')));
		assert.ok(svc.isBundleFile(ws('messages/msg_en.properties')));
		assert.strictEqual(svc.index.get('k1')?.primary?.value, '필수 입력');
	});

	test('refreshes decoded doc on change', async () => {
		const file = ws('messages/msg_en.properties');
		const doc = await vscode.workspace.openTextDocument(toDecodedUri(file, 'WORK'));
		writeFileSync(file.fsPath, 'k1=\\uBC14\\uB01C\n');
		await waitFor(() => doc.getText().includes('k1=바뀜'));
	});

	test('index refreshes on change', async () => {
		const svc = await getSvc();
		writeFileSync(ws('messages/msg_en.properties').fsPath, 'k1=Changed\n');
		await waitFor(() => svc.index.get('k1')?.translations.some((t) => t.value === 'Changed') ?? false);
	});

	test('deleted file yields empty content', async () => {
		const file = ws('messages/msg_en.properties');
		const doc = await vscode.workspace.openTextDocument(toDecodedUri(file, 'WORK'));
		rmSync(file.fsPath);
		await waitFor(() => doc.getText() === '');
	});

	test('openDecoded command opens decoded tab for non-bundle file', async () => {
		await vscode.commands.executeCommand('propertiesLens.openDecoded', ws('config/application.properties'));
		const doc = vscode.window.activeTextEditor!.document;
		assert.strictEqual(doc.uri.scheme, 'properties-lens');
		assert.match(doc.getText(), /greeting=안녕/);
	});
});
