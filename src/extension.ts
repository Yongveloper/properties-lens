import * as vscode from 'vscode';
import { registerAutoOpen } from './autoOpen';
import { DecodedContentProvider, SCHEME, toDecodedUri } from './decodedDocs';
import { compareAllChanges, compareWithHead } from './diff';
import { readHead } from './git';
import { IndexService } from './indexService';
import { registerKeyLens } from './keyLens';
import { copyKey, findUsages, showSearch } from './search';
import { registerSync } from './sync';

export function activate(context: vscode.ExtensionContext) {
	const indexService = new IndexService();
	const provider = new DecodedContentProvider(readHead);
	context.subscriptions.push(
		indexService,
		provider,
		vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider),
		vscode.commands.registerCommand('propertiesLens.openDecoded', openDecoded),
		vscode.commands.registerCommand('propertiesLens.compareWithHead', compareWithHead),
		vscode.commands.registerCommand('propertiesLens.compareAllChanges', () => compareAllChanges(indexService)),
		vscode.commands.registerCommand('propertiesLens.search', () => showSearch(indexService)),
		vscode.commands.registerCommand('propertiesLens.copyKey', copyKey),
		vscode.commands.registerCommand('propertiesLens.findUsages', findUsages),
	);
	registerAutoOpen(context, indexService);
	registerKeyLens(context, indexService);
	registerSync(context, indexService);
	return { indexService };
}

export function deactivate() {}

async function openDecoded(arg?: vscode.Uri): Promise<void> {
	const file = arg ?? vscode.window.activeTextEditor?.document.uri;
	if (!file || file.scheme !== 'file') return;
	await vscode.window.showTextDocument(toDecodedUri(file, 'WORK'));
}
