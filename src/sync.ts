import * as path from 'path';
import * as vscode from 'vscode';
import { readConfig, SECTION } from './config';
import { compareAllChanges } from './diff';
import { IndexService } from './indexService';

const TASK_TYPE = 'propertiesLens';
let running = false;
let runId = 0;
const stateEmitter = new vscode.EventEmitter<boolean>();

/** 설정의 동기화 명령을 VS Code 작업으로 실행하고 종료 코드를 돌려준다. 실행 중이거나 명령이 없으면 undefined. */
export async function runSync(svc: IndexService): Promise<number | undefined> {
	const { syncCommand, syncCwd } = readConfig();
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!syncCommand || !folder) {
		void vscode.window.showInformationMessage(vscode.l10n.t('Set propertiesLens.syncCommand to enable sync.'), vscode.l10n.t('Open Settings'))
			.then((choice) => (choice ? vscode.commands.executeCommand('workbench.action.openSettings', `${SECTION}.syncCommand`) : undefined));
		return undefined;
	}
	if (running) {
		void vscode.window.showInformationMessage(vscode.l10n.t('Sync is already running.'));
		return undefined;
	}

	running = true;
	stateEmitter.fire(true);
	try {
		const id = ++runId;
		const task = new vscode.Task({ type: TASK_TYPE, id }, folder, vscode.l10n.t('Sync messages'), 'Properties Lens',
			new vscode.ShellExecution(syncCommand, { cwd: path.join(folder.uri.fsPath, syncCwd) }));
		const ours = (task: vscode.Task) => task.definition.type === TASK_TYPE && task.definition.id === id;
		// 프로세스가 시작조차 못 하면 onDidEndTaskProcess 가 오지 않으므로 onDidEndTask 로도 끝낸다
		const exit = new Promise<number | undefined>((resolve) => {
			const subs = [
				vscode.tasks.onDidEndTaskProcess((e) => ours(e.execution.task) && done(e.exitCode)),
				vscode.tasks.onDidEndTask((e) => ours(e.execution.task) && done(undefined)),
			];
			function done(code: number | undefined) {
				subs.forEach((s) => s.dispose());
				resolve(code);
			}
		});
		await vscode.tasks.executeTask(task);
		const code = await exit;

		if (code === 0) {
			await svc.refresh();
			void vscode.window.showInformationMessage(vscode.l10n.t('Sync finished.'), vscode.l10n.t('Show changes'))
				.then((choice) => (choice ? compareAllChanges(svc) : undefined));
		} else if (code === undefined) {
			void vscode.window.showWarningMessage(vscode.l10n.t('Sync was stopped before it finished.'));
		} else {
			void vscode.window.showErrorMessage(vscode.l10n.t('Sync failed (exit {0}). See terminal.', String(code)));
		}
		return code;
	} finally {
		running = false;
		stateEmitter.fire(false);
	}
}

export function registerSync(context: vscode.ExtensionContext, svc: IndexService): void {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	item.command = 'propertiesLens.sync';
	item.tooltip = vscode.l10n.t('Run propertiesLens.syncCommand');
	const update = (busy = running) => {
		item.text = `${busy ? '$(sync~spin)' : '$(sync)'} ${vscode.l10n.t('Messages')}`;
		if (readConfig().syncCommand) item.show();
		else item.hide();
	};
	context.subscriptions.push(
		item,
		stateEmitter.event((busy) => update(busy)),
		vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration(SECTION) && update()),
		vscode.commands.registerCommand('propertiesLens.sync', () => runSync(svc)),
	);
	update();
}
