import { execFileSync } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import type { IndexService } from '../../src/indexService';

export const WS = path.resolve(__dirname, '../../../.vscode-test/ws');

export function ws(rel: string): vscode.Uri {
	return vscode.Uri.file(path.join(WS, rel));
}

export async function getSvc(): Promise<IndexService> {
	const ext = vscode.extensions.all.find((e) => e.packageJSON.name === 'properties-lens')!;
	const api = (await ext.activate()) as { indexService: IndexService };
	await api.indexService.ready;
	return api.indexService;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(cond: () => boolean | Promise<boolean>, timeout = 10000): Promise<void> {
	const end = Date.now() + timeout;
	while (Date.now() < end) {
		if (await cond()) return;
		await sleep(50);
	}
	throw new Error('waitFor timed out');
}

/** 테스트가 바꾼 작업 사본을 커밋 상태로 되돌린다 */
export function restoreWs(): void {
	execFileSync('git', ['checkout', '-q', '--', '.'], { cwd: WS });
	execFileSync('git', ['clean', '-qfd'], { cwd: WS });
}

export async function closeAll(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

export function openTabUris(): vscode.Uri[] {
	return vscode.window.tabGroups.all.flatMap((g) => g.tabs)
		.map((t) => (t.input instanceof vscode.TabInputText ? t.input.uri : undefined))
		.filter((u): u is vscode.Uri => !!u);
}
