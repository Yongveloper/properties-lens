import * as assert from 'assert';
import * as vscode from 'vscode';
import { createSearchPick } from '../../src/search';
import { closeAll, getSvc, waitFor } from './helpers';

suite('multilingual search', () => {
	teardown(closeAll);

	test('items contain decoded sentence and key', async () => {
		const pick = createSearchPick(await getSvc());
		const item = pick.items.find((i) => i.key === 'k1');
		pick.dispose();
		assert.strictEqual(item?.label, '필수 입력');
		assert.match(item!.detail!, /en: Required input/);
	});

	test('title explains Enter and the row icons', async () => {
		const pick = createSearchPick(await getSvc());
		pick.dispose();
		assert.strictEqual(pick.title, 'Enter: open definition · Row icons: copy key / find usages');
	});

	test('accept opens decoded definition line', async () => {
		const pick = createSearchPick(await getSvc());
		pick.show();
		pick.value = '나';
		await waitFor(() => pick.activeItems[0]?.key === 'k2');
		await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
		await waitFor(() => vscode.window.activeTextEditor?.document.uri.scheme === 'properties-lens');
		const editor = vscode.window.activeTextEditor!;
		assert.strictEqual(editor.selection.start.line, 2);
		assert.match(editor.document.lineAt(2).text, /k2=나/);
	});

	test('copyKey writes clipboard', async () => {
		await vscode.commands.executeCommand('propertiesLens.copyKey', 'k1');
		assert.strictEqual(await vscode.env.clipboard.readText(), 'k1');
	});

	test('findUsages runs without error', async () => {
		await vscode.commands.executeCommand('propertiesLens.findUsages', 'k1');
	});
});
