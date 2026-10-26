import * as vscode from 'vscode';
import { Labels } from './core/hoverText';

export function uiLabels(): Labels {
	return {
		unknownKey: vscode.l10n.t('⚠ unknown key'),
		missing: vscode.l10n.t('⚠ missing — falls back to default at runtime'),
		locale: vscode.l10n.t('Locale'),
		text: vscode.l10n.t('Text'),
		openDefinition: vscode.l10n.t('Open definition'),
		findUsages: vscode.l10n.t('Find usages'),
		copyKey: vscode.l10n.t('Copy key'),
		noText: vscode.l10n.t('(no text)'),
	};
}
