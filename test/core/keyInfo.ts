import type { KeyInfo, Translation } from '../../src/core/messageIndex';

/** 테스트용 KeyInfo. 첫 locale 이 primary. */
export function info(key: string, values: Record<string, string>, opts: { missing?: string[]; bundle?: string } = {}): KeyInfo {
	const translations: Translation[] = Object.entries(values).map(([locale, value], line) => ({ locale, value, path: `/m/${opts.bundle ?? 'A'}_${locale}.properties`, line }));
	return {
		key,
		bundle: { id: `/m/${opts.bundle ?? 'A'}`, name: opts.bundle ?? 'A', dir: '/m', files: [] },
		translations,
		missing: opts.missing ?? [],
		primary: translations[0],
	};
}
