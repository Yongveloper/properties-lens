import * as vscode from 'vscode';
import { DEFAULT_KEY_PATTERNS } from './core/keys';

export interface LensConfig {
	bundleGlob: string;
	exclude: string;
	primaryLocale: string;
	keyPatterns: string[];
	decorateFiles: string;
	syncCommand: string;
	syncCwd: string;
	autoOpenDecoded: boolean;
}

export const SECTION = 'propertiesLens';

export function readConfig(): LensConfig {
	const c = vscode.workspace.getConfiguration(SECTION);
	return {
		bundleGlob: c.get('bundleGlob', '**/*.properties'),
		exclude: c.get('exclude', '**/{target,build,node_modules,out,dist,.git}/**'),
		primaryLocale: c.get('primaryLocale', ''),
		keyPatterns: c.get('keyPatterns', DEFAULT_KEY_PATTERNS),
		decorateFiles: c.get('decorateFiles', '**/*.{jsp,jspf,tag,js,ts,html,java}'),
		syncCommand: c.get('syncCommand', ''),
		syncCwd: c.get('syncCwd', ''),
		autoOpenDecoded: c.get('autoOpenDecoded', true),
	};
}
