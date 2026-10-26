import { EN_LABELS } from './hoverText';
import { KeyInfo } from './messageIndex';

export interface SearchItem {
	label: string;
	description: string;
	detail: string;
	key: string;
}

/** label = primary 문장, description = 키, detail = 번들 · 다른 언어 문장. QuickPick 이 셋 다 검색하므로 detail 은 자르지 않는다 (표시는 QuickPick 이 줄인다). */
export function toSearchItems(infos: KeyInfo[], noText = EN_LABELS.noText): SearchItem[] {
	return infos.map((info) => {
		const others = info.translations
			.filter((t) => t !== info.primary && t.value)
			.map((t) => `${t.locale || 'default'}: ${t.value}`);
		return {
			label: info.primary?.value || noText,
			description: info.key,
			detail: [info.bundle.name, ...others].join(' · '),
			key: info.key,
		};
	});
}
