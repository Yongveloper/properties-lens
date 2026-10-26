import { Bundle, resolvePrimaryLocale } from './bundles';
import { parseProperties, PropEntry } from './parse';

export interface Translation {
	/** '' = default 파일 */
	locale: string;
	value: string;
	path: string;
	line: number;
}

export interface KeyInfo {
	key: string;
	bundle: Bundle;
	/** 표시용. default 가 어떤 locale 파일과 내용이 같으면 빠진다 */
	translations: Translation[];
	/** 키가 없거나 값이 빈 locale (default 제외) */
	missing: string[];
	/** primary locale 번역, 없거나 비면 default 번역 */
	primary?: Translation;
}

export class MessageIndex {
	private constructor(
		private readonly keys: Map<string, KeyInfo>,
		private readonly bundleByPath: Map<string, Bundle>,
		private readonly primaryByBundle: Map<Bundle, string>,
	) {}

	/** contents 값은 `bytesToText` 한 원문(escape 포함). 같은 키가 여러 번들에 있으면 앞 번들이 이긴다. */
	static build(bundles: Bundle[], contents: Map<string, string>, configuredLocale: string, uiLanguage: string): MessageIndex {
		const keys = new Map<string, KeyInfo>();
		const bundleByPath = new Map<string, Bundle>();
		const primaryByBundle = new Map<Bundle, string>();

		for (const bundle of bundles) {
			const locales = bundle.files.filter((f) => f.locale !== '').map((f) => f.locale);
			const primaryLocale = resolvePrimaryLocale(configuredLocale, uiLanguage, locales);
			primaryByBundle.set(bundle, primaryLocale);

			const defaultFile = bundle.files.find((f) => f.locale === '');
			const defaultText = defaultFile && contents.get(defaultFile.path);
			const hideDefault = defaultText !== undefined
				&& bundle.files.some((f) => f.locale !== '' && contents.get(f.path) === defaultText);

			const parsed = bundle.files.map((f) => {
				bundleByPath.set(f.path, bundle);
				const byKey = new Map<string, PropEntry>();
				for (const e of parseProperties(contents.get(f.path) ?? '')) byKey.set(e.key, e);
				return { file: f, byKey };
			});

			const allKeys = new Set<string>();
			for (const p of parsed) for (const k of p.byKey.keys()) allKeys.add(k);

			for (const key of allKeys) {
				if (keys.has(key)) continue;
				const translations: Translation[] = [];
				const missing: string[] = [];
				let primary: Translation | undefined;
				let fallback: Translation | undefined;
				for (const { file, byKey } of parsed) {
					const e = byKey.get(key);
					const t = e && { locale: file.locale, value: e.value, path: file.path, line: e.line };
					if (file.locale !== '' && !e?.value) missing.push(file.locale);
					if (t && t.value && file.locale === primaryLocale) primary = t;
					if (t && t.value && file.locale === '') fallback = t;
					if (t && !(file.locale === '' && hideDefault)) translations.push(t);
				}
				keys.set(key, { key, bundle, translations, missing, primary: primary ?? fallback });
			}
		}
		return new MessageIndex(keys, bundleByPath, primaryByBundle);
	}

	get(key: string): KeyInfo | undefined {
		return this.keys.get(key);
	}

	all(): KeyInfo[] {
		return [...this.keys.values()];
	}

	allBundleFiles(): string[] {
		return [...this.bundleByPath.keys()];
	}

	bundleOf(path: string): Bundle | undefined {
		return this.bundleByPath.get(path);
	}

	primaryLocaleOf(bundle: Bundle): string {
		return this.primaryByBundle.get(bundle) ?? '';
	}
}
