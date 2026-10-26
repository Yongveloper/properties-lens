import { KeyInfo } from './messageIndex';

const INLINE_MAX = 40;

/** core 는 vscode 를 모르므로 화면 문구를 인자로 받는다. 기본값은 영어. */
export interface Labels {
	unknownKey: string;
	missing: string;
	locale: string;
	text: string;
	openDefinition: string;
	findUsages: string;
	copyKey: string;
	noText: string;
}

export const EN_LABELS: Labels = {
	unknownKey: '⚠ unknown key',
	missing: '⚠ missing — falls back to default at runtime',
	locale: 'Locale',
	text: 'Text',
	openDefinition: 'Open definition',
	findUsages: 'Find usages',
	copyKey: 'Copy key',
	noText: '(no text)',
};

export function inlineText(info: KeyInfo | undefined, labels: Labels = EN_LABELS): string {
	if (!info) return labels.unknownKey;
	const text = info.primary?.value ?? '';
	return text.length > INLINE_MAX ? text.slice(0, INLINE_MAX - 1) + '…' : text;
}

/** 저장된 그대로 보이도록 CommonMark 문장부호를 escape (`&lt;` 가 `<` 로, `<b>` 가 사라지는 것 방지) */
function cell(value: string): string {
	return value.replace(/\r?\n|\r/g, ' ').replace(/[\\`*_{}[\]()#+\-.!<>&|]/g, '\\$&');
}

function commandLink(label: string, command: string, key: string): string {
	return `[${label}](command:${command}?${encodeURIComponent(JSON.stringify([key]))})`;
}

/** 키·번들, locale 별 문장 표, 누락 locale, 명령 링크 */
export function hoverMarkdown(info: KeyInfo, labels: Labels = EN_LABELS): string {
	const rows = info.translations
		.filter((t) => t.value)
		.map((t) => `| ${t.locale || 'default'} | ${cell(t.value)} |`);
	for (const locale of info.missing) rows.push(`| ${locale} | ${labels.missing} |`);
	return [
		`**\`${info.key}\`** · ${info.bundle.name}`,
		'',
		`| ${labels.locale} | ${labels.text} |`,
		'|---|---|',
		...rows,
		'',
		[
			commandLink(labels.openDefinition, 'propertiesLens.openDefinition', info.key),
			commandLink(labels.findUsages, 'propertiesLens.findUsages', info.key),
			commandLink(labels.copyKey, 'propertiesLens.copyKey', info.key),
		].join(' · '),
	].join('\n');
}
