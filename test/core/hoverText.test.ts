import { describe, expect, it } from 'vitest';
import { EN_LABELS, hoverMarkdown, inlineText } from '../../src/core/hoverText';
import { info } from './keyInfo';

describe('inlineText', () => {
	it('unknown key', () => expect(inlineText(undefined)).toBe('⚠ unknown key'));
	it('truncates to 40 chars', () => expect(inlineText(info('k', { ko: 'ㄱ'.repeat(50) }))).toBe('ㄱ'.repeat(39) + '…'));
	it('short text unchanged', () => expect(inlineText(info('k', { ko: '필수 입력' }))).toBe('필수 입력'));
});

describe('hoverMarkdown', () => {
	const md = hoverMarkdown(info('RV1', { ko: '가|나', en: 'Ga' }, { missing: ['ja'], bundle: 'App' }));
	it('header has key and bundle', () => expect(md.split('\n')[0]).toBe('**`RV1`** · App'));
	it('escapes pipes in values', () => expect(md).toContain('| ko | 가\\|나 |'));
	it('lists missing locale with fallback note', () => expect(md).toContain('| ja | ⚠ missing — falls back to default at runtime |'));
	it('has command links with encoded key', () => {
		const arg = encodeURIComponent(JSON.stringify(['RV1']));
		expect(md).toContain(`(command:propertiesLens.openDefinition?${arg})`);
		expect(md).toContain(`(command:propertiesLens.findUsages?${arg})`);
		expect(md).toContain(`(command:propertiesLens.copyKey?${arg})`);
	});
	it('markdown-escapes values so entities and tags show as stored', () => {
		const md = hoverMarkdown(info('k', { ko: '&lt;br /&gt; <b>*a*</b> _x_' }));
		expect(md).toContain('| ko | \\&lt;br /\\&gt; \\<b\\>\\*a\\*\\</b\\> \\_x\\_ |');
	});
	it('newlines in values do not break the table', () => expect(hoverMarkdown(info('k', { ko: 'a\nb' }))).toContain('| ko | a b |'));
});

describe('labels', () => {
	const ko = { ...EN_LABELS, unknownKey: '⚠ 없는 키', missing: '⚠ 누락', openDefinition: '정의 열기', locale: '언어', text: '문장' };
	it('inlineText uses given labels', () => expect(inlineText(undefined, ko)).toBe('⚠ 없는 키'));
	it('hoverMarkdown uses given labels', () => {
		const md = hoverMarkdown(info('k', { ko: 'a' }, { missing: ['en'] }), ko);
		expect(md).toContain('| 언어 | 문장 |');
		expect(md).toContain('| en | ⚠ 누락 |');
		expect(md).toContain('[정의 열기](command:');
	});
});
