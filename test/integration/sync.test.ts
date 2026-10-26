import * as assert from 'assert';
import * as vscode from 'vscode';
import { changedBundleFiles } from '../../src/diff';
import { runSync } from '../../src/sync';
import { getSvc, restoreWs, ws } from './helpers';

async function setCfg(key: string, value: unknown): Promise<void> {
	await vscode.workspace.getConfiguration('propertiesLens').update(key, value, vscode.ConfigurationTarget.Workspace);
}

suite('sync', () => {
	teardown(async () => {
		await setCfg('syncCommand', undefined);
		restoreWs();
	});

	test('runs configured command and reports exit code', async () => {
		const svc = await getSvc();
		await setCfg('syncCommand', 'echo k9=x >> messages/msg_en.properties');
		assert.strictEqual(await runSync(svc), 0);
		assert.ok((await changedBundleFiles(svc)).some((u) => u.path === ws('messages/msg_en.properties').path));
	});

	test('failure exit code', async () => {
		await setCfg('syncCommand', 'exit 3');
		assert.strictEqual(await runSync(await getSvc()), 3);
	});

	test('second run while running is rejected', async () => {
		const svc = await getSvc();
		await setCfg('syncCommand', 'sleep 2');
		const first = runSync(svc);
		assert.strictEqual(await runSync(svc), undefined);
		assert.strictEqual(await first, 0);
	});

	test('terminated sync releases the running state', async () => {
		const svc = await getSvc();
		await setCfg('syncCommand', 'sleep 30');
		const started = new Promise<vscode.TaskExecution>((resolve) => {
			const sub = vscode.tasks.onDidStartTaskProcess((e) => {
				if (e.execution.task.definition.type !== 'propertiesLens') return;
				sub.dispose();
				resolve(e.execution);
			});
		});
		const first = runSync(svc);
		(await started).terminate();
		assert.notStrictEqual(await first, 0);
		await setCfg('syncCommand', 'exit 0');
		assert.strictEqual(await runSync(svc), 0);
	});

	test('empty command does not run', async () => {
		await setCfg('syncCommand', '');
		assert.strictEqual(await runSync(await getSvc()), undefined);
	});

	test('syncCwd is relative to the workspace folder', async () => {
		const svc = await getSvc();
		await setCfg('syncCwd', 'messages');
		try {
			await setCfg('syncCommand', 'echo k9=x >> msg_en.properties');
			assert.strictEqual(await runSync(svc), 0);
			assert.ok((await changedBundleFiles(svc)).some((u) => u.path === ws('messages/msg_en.properties').path));
		} finally {
			await setCfg('syncCwd', undefined);
		}
	});
});
