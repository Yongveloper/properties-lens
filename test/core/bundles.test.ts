import { describe, expect, it } from 'vitest';
import { groupBundles, resolvePrimaryLocale, splitLocale } from '../../src/core/bundles';

describe('splitLocale', () => {
	it('language and country', () => expect(splitLocale('ApplicationResources_zh_CN.properties')).toEqual({ base: 'ApplicationResources', locale: 'zh_CN' }));
	it('language only', () => expect(splitLocale('A_ko.properties')).toEqual({ base: 'A', locale: 'ko' }));
	it('no locale', () => expect(splitLocale('application-local.properties')).toEqual({ base: 'application-local', locale: '' }));
	it('environment suffixes are not locales', () => {
		for (const f of ['jdbc_dev.properties', 'jdbc_prd.properties', 'app_qa.properties', 'config_new.properties', 'config_bak.properties']) {
			expect(splitLocale(f).locale).toBe('');
		}
	});
	it('three-letter language without two-letter code is a locale', () => expect(splitLocale('M_fil.properties').locale).toBe('fil'));
	it('underscore in base without locale', () => expect(splitLocale('Common_Code.properties')).toEqual({ base: 'Common_Code', locale: '' }));
});

describe('groupBundles', () => {
	it('keeps only groups with a locale file, default first', () => {
		const b = groupBundles(['/m/A.properties', '/m/A_ko.properties', '/m/A_en.properties', '/m/jasypt.properties', '/r/application.properties', '/r/application-local.properties']);
		expect(b).toEqual([{
			id: '/m/A', name: 'A', dir: '/m',
			files: [{ path: '/m/A.properties', locale: '' }, { path: '/m/A_en.properties', locale: 'en' }, { path: '/m/A_ko.properties', locale: 'ko' }],
		}]);
	});
	it('same name in different folders are different bundles', () =>
		expect(groupBundles(['/a/M_ko.properties', '/b/M_ko.properties']).map((x) => x.id)).toEqual(['/a/M', '/b/M']));
});

describe('resolvePrimaryLocale', () => {
	it('configured wins', () => expect(resolvePrimaryLocale('ko', 'en', ['en', 'ko'])).toBe('ko'));
	it('ui language with country', () => expect(resolvePrimaryLocale('', 'zh-cn', ['zh_CN', 'ko'])).toBe('zh_CN'));
	it('ui language prefix', () => expect(resolvePrimaryLocale('', 'ko-kr', ['ko'])).toBe('ko'));
	it('falls back to default', () => expect(resolvePrimaryLocale('fr', 'de', ['ko'])).toBe(''));
});
