import * as path from 'path';

export interface BundleFile {
	path: string;
	/** '' = default 파일 (locale 접미사 없음) */
	locale: string;
}

export interface Bundle {
	/** dir + '/' + name */
	id: string;
	name: string;
	dir: string;
	files: BundleFile[];
}

const LOCALE_FILE = /^(.*)_([a-z]{2,3}(?:_[A-Z]{2})?)\.properties$/;

const languageNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' });
/** `config_new` 처럼 언어 이름이 붙는 흔한 접미사 */
const NOT_LANGUAGE = new Set(['new']);

/** `_dev`, `_qa`, `_bak` 같은 환경·백업 접미사를 locale 로 오인하지 않게 실제 언어 코드만 인정한다. 2글자 코드가 있는 3글자 코드(bak→ba)는 제외. */
function isLanguage(lang: string): boolean {
	return !NOT_LANGUAGE.has(lang) && languageNames.of(lang) !== undefined && Intl.getCanonicalLocales(lang)[0] === lang;
}

export function splitLocale(fileName: string): { base: string; locale: string } {
	const m = LOCALE_FILE.exec(fileName);
	return m && isLanguage(m[2].split('_')[0]) ? { base: m[1], locale: m[2] } : { base: fileName.replace(/\.properties$/, ''), locale: '' };
}

/** 경로는 POSIX(`Uri.path`). locale 파일이 하나 이상 있는 묶음만 번들로 본다. */
export function groupBundles(paths: string[]): Bundle[] {
	const groups = new Map<string, Bundle>();
	for (const p of paths) {
		const dir = path.posix.dirname(p);
		const { base, locale } = splitLocale(path.posix.basename(p));
		const id = `${dir}/${base}`;
		let b = groups.get(id);
		if (!b) groups.set(id, (b = { id, name: base, dir, files: [] }));
		b.files.push({ path: p, locale });
	}
	return [...groups.values()]
		.filter((b) => b.files.some((f) => f.locale !== ''))
		.map((b) => ({ ...b, files: b.files.sort((x, y) => (x.locale === '' ? -1 : y.locale === '' ? 1 : x.locale.localeCompare(y.locale))) }))
		.sort((x, y) => x.id.localeCompare(y.id));
}

function match(candidate: string, locales: string[]): string | undefined {
	if (!candidate) return undefined;
	const [lang, country] = candidate.replace('-', '_').split('_');
	const full = country ? `${lang.toLowerCase()}_${country.toUpperCase()}` : lang.toLowerCase();
	return locales.find((l) => l === full) ?? locales.find((l) => l === lang.toLowerCase());
}

/** 설정값 → VSCode 표시 언어 → '' (default 파일) 순. 언어부(`ko-kr` → `ko`)만 맞아도 인정. */
export function resolvePrimaryLocale(configured: string, uiLanguage: string, locales: string[]): string {
	return match(configured, locales) ?? match(uiLanguage, locales) ?? '';
}
