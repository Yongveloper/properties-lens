import * as path from 'path';
import * as vscode from 'vscode';
import { fromDecodedUri, readFile, SCHEME, toDecodedUri } from './decodedDocs';
import { readHead } from './git';
import { IndexService } from './indexService';

type Target = vscode.Uri | { resourceUri: vscode.Uri } | undefined;

function toFile(arg: Target): vscode.Uri | undefined {
	const uri = arg instanceof vscode.Uri ? arg : arg?.resourceUri ?? vscode.window.activeTextEditor?.document.uri;
	if (!uri) return undefined;
	return uri.scheme === SCHEME ? fromDecodedUri(uri).file : uri;
}

export async function compareWithHead(arg?: Target): Promise<void> {
	const file = toFile(arg);
	if (!file) return;
	const title = vscode.l10n.t('{0} (HEAD ↔ Working, decoded)', path.basename(file.path));
	await vscode.commands.executeCommand('vscode.diff', toDecodedUri(file, 'HEAD'), toDecodedUri(file, 'WORK'), title);
}

function sameBytes(a: Uint8Array | undefined, b: Uint8Array | undefined): boolean {
	if (!a || !b) return a === b;
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** HEAD 와 바이트가 다른 번들 파일 (HEAD 에 없는 새 파일 포함) */
export async function changedBundleFiles(svc: IndexService): Promise<vscode.Uri[]> {
	const files = svc.index.allBundleFiles().map((p) => svc.uriOf(p));
	const changed = await Promise.all(files.map(async (f) => (sameBytes(await readHead(f), await readFile(f)) ? undefined : f)));
	return changed.filter((f): f is vscode.Uri => !!f);
}

export async function compareAllChanges(svc: IndexService): Promise<void> {
	const changed = await changedBundleFiles(svc);
	if (changed.length === 0) {
		void vscode.window.showInformationMessage(vscode.l10n.t('No changes in message bundles.'));
		return;
	}
	await vscode.commands.executeCommand('vscode.changes', vscode.l10n.t('Message bundle changes (decoded)'),
		changed.map((f) => [f, toDecodedUri(f, 'HEAD'), toDecodedUri(f, 'WORK')]));
}
