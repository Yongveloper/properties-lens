import { describe, expect, it } from 'vitest';
import { groupBundles } from '../../src/core/bundles';
import { MessageIndex } from '../../src/core/messageIndex';

const bundle = groupBundles(['/m/A.properties', '/m/A_ko.properties', '/m/A_en.properties', '/m/A_ja.properties'])[0];
const ko = 'k1=\\uAC00\nk2=\\uB098\nonlyDefault=';
const contents = new Map([
	['/m/A.properties', ko],
	['/m/A_ko.properties', ko],
	['/m/A_en.properties', 'k1=Ga\nk2='],
	['/m/A_ja.properties', 'k1=ガ'],
]);
const idx = MessageIndex.build([bundle], contents, 'ko', 'en');

describe('MessageIndex', () => {
	it('hides default identical to a locale file', () => expect(idx.get('k1')!.translations.map((t) => t.locale)).toEqual(['en', 'ja', 'ko']));
	it('primary is the configured locale', () => expect(idx.get('k1')!.primary!.value).toBe('가'));
	it('translations carry path and line', () => expect(idx.get('k2')!.translations.find((t) => t.locale === 'ko')).toEqual({ locale: 'ko', value: '나', path: '/m/A_ko.properties', line: 1 }));
	it('missing lists empty and absent locales', () => expect(idx.get('k2')!.missing).toEqual(['en', 'ja']));
	it('shows default when it differs', () => {
		const c = new Map(contents);
		c.set('/m/A.properties', 'k1=Ga');
		expect(MessageIndex.build([bundle], c, 'ko', 'en').get('k1')!.translations[0].locale).toBe('');
	});
	it('falls back to default', () => {
		const c = new Map(contents);
		c.set('/m/A.properties', 'x=def');
		c.set('/m/A_ko.properties', 'k1=\\uAC00');
		expect(MessageIndex.build([bundle], c, 'ko', 'en').get('x')!.primary!.value).toBe('def');
	});
	it('bundleOf finds the bundle of a file', () => expect(idx.bundleOf('/m/A_en.properties')).toBe(bundle));
	it('allBundleFiles lists every file of every bundle', () => expect(idx.allBundleFiles().sort()).toEqual(['/m/A.properties', '/m/A_en.properties', '/m/A_ja.properties', '/m/A_ko.properties']));
	it('unknown key is undefined', () => expect(idx.get('nope')).toBeUndefined());
	it('primaryLocaleOf resolves per bundle', () => expect(idx.primaryLocaleOf(bundle)).toBe('ko'));
	it('first bundle wins for duplicate keys', () => {
		const other = groupBundles(['/n/B_ko.properties'])[0];
		const c = new Map(contents);
		c.set('/n/B_ko.properties', 'k1=other');
		expect(MessageIndex.build([bundle, other], c, 'ko', 'en').get('k1')!.bundle).toBe(bundle);
	});
	it('missing file content is treated as empty', () => expect(() => MessageIndex.build([bundle], new Map(), 'ko', 'en')).not.toThrow());
	it('builds 10k-key bundle under 300ms', () => {
		const lines = Array.from({ length: 10000 }, (_, i) => `RV${i}=\\uAC00\\uB098 ${i}`).join('\n');
		const big = groupBundles(['/b/M_ko.properties', '/b/M_en.properties'])[0];
		const t0 = performance.now();
		const built = MessageIndex.build([big], new Map([['/b/M_ko.properties', lines], ['/b/M_en.properties', lines]]), 'ko', 'en');
		expect(performance.now() - t0).toBeLessThan(300);
		expect(built.all()).toHaveLength(10000);
	});
});
