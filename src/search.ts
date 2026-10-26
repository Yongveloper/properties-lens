import * as vscode from 'vscode';
import { readConfig } from './config';
import { SearchItem, toSearchItems } from './core/searchItems';
import { toDecodedUri } from './decodedDocs';
import { IndexService } from './indexService';
import { uiLabels } from './labels';

type PickItem = vscode.QuickPickItem & { key: string };

const copyButton: vscode.QuickInputButton = { iconPath: new vscode.ThemeIcon('copy'), tooltip: vscode.l10n.t('Copy key') };
const usagesButton: vscode.QuickInputButton = { iconPath: new vscode.ThemeIcon('references'), tooltip: vscode.l10n.t('Find usages') };

export function createSearchPick(svc: IndexService): vscode.QuickPick<PickItem> {
	const pick = vscode.window.createQuickPick<PickItem>();
	pick.placeholder = vscode.l10n.t('Search messages by text or key');
	// 줄 버튼은 강조된 줄에만 작게 보여 찾기 어렵다. 입력 중에도 보이도록 제목줄에 안내한다.
	pick.title = vscode.l10n.t('Enter: open definition · Row icons: copy key / find usages');
	pick.matchOnDescription = true;
	pick.matchOnDetail = true;
	pick.items = toSearchItems(svc.index.all(), uiLabels().noText).map((i: SearchItem) => ({ ...i, buttons: [copyButton, usagesButton] }));
	pick.onDidTriggerItemButton((e) => void (e.button === copyButton ? copyKey(e.item.key) : findUsages(e.item.key)));
	pick.onDidAccept(() => {
		const item = pick.activeItems[0];
		pick.hide();
		if (item) void openKeyDefinition(svc, item.key);
	});
	pick.onDidHide(() => pick.dispose());
	return pick;
}

export async function showSearch(svc: IndexService): Promise<void> {
	await svc.ready;
	createSearchPick(svc).show();
}

/** primary 번역 줄을 한글 탭에서 연다 */
export async function openKeyDefinition(svc: IndexService, key: string): Promise<void> {
	const info = svc.index.get(key);
	const t = info?.primary ?? info?.translations[0];
	if (!t) return;
	const line = new vscode.Range(t.line, 0, t.line, 0);
	await vscode.window.showTextDocument(toDecodedUri(svc.uriOf(t.path), 'WORK'), { selection: line });
}

export async function copyKey(key: string): Promise<void> {
	await vscode.env.clipboard.writeText(key);
	vscode.window.setStatusBarMessage(vscode.l10n.t('Copied {0}', key), 2000);
}

/** VS Code 검색 패널에 키를 단어 단위로 넘긴다 (JS 등록 파일 등도 함께 나온다) */
export async function findUsages(key: string): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.findInFiles', {
		query: key,
		isRegex: false,
		matchWholeWord: true,
		isCaseSensitive: true,
		filesToInclude: readConfig().decorateFiles,
		triggerSearch: true,
	});
}
