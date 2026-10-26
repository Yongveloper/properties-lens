import { describe, expect, it } from 'vitest';
import { toSearchItems } from '../../src/core/searchItems';
import { info } from './keyInfo';

describe('toSearchItems', () => {
	const sentence = '다중접속 기능을 사용하시려면 반드시 에이전트 재시작을 해주세요.';
	const [item] = toSearchItems([info('RV1', { ko: sentence, en: 'Restart agent' }, { bundle: 'ApplicationResources' })]);

	it('label is primary text, description is key', () => expect(item).toMatchObject({ label: sentence, description: 'RV1', key: 'RV1' }));
	it('detail has bundle and other locales', () => expect(item.detail).toBe('ApplicationResources · en: Restart agent'));
	it('no primary shows placeholder', () => {
		const i = info('k', {});
		expect(toSearchItems([i])[0].label).toBe('(no text)');
	});
	it('detail keeps every locale so all are searchable', () => {
		const [long] = toSearchItems([info('k', { ko: 'a', en: 'x'.repeat(300), zh_TW: '請輸入' })]);
		expect(long.detail).toContain('x'.repeat(300));
		expect(long.detail).toContain('zh_TW: 請輸入');
	});
});

describe('toSearchItems labels', () => {
	it('uses given no-text label', () => expect(toSearchItems([info('k', {})], '(문장 없음)')[0].label).toBe('(문장 없음)'));
});
