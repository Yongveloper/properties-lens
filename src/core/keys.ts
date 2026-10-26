export interface KeyMatch {
	key: string;
	/** 키 자체의 offset (end 배타) */
	start: number;
	end: number;
	/** 패턴 전체 매치의 끝. inline 문장을 붙이는 위치 */
	matchEnd: number;
}

export const DEFAULT_KEY_PATTERNS: string[] = [
	String.raw`<spring:message\s[^>]*?code\s*=\s*["']([^"']+)["']`,
	String.raw`<fmt:message\s[^>]*?key\s*=\s*["']([^"']+)["']`,
	String.raw`getMessage\(\s*["']([^"']+)["']`,
];

/** 패턴마다 캡처 그룹 1 이 키다. 문법 오류나 그룹 없는 패턴은 errors 로 돌려주고 나머지는 쓴다. */
export function compilePatterns(patterns: string[]): { regexes: RegExp[]; errors: string[] } {
	const regexes: RegExp[] = [];
	const errors: string[] = [];
	for (const p of patterns) {
		try {
			const groups = new RegExp(p + '|').exec('')!.length - 1;
			if (groups < 1) {
				errors.push(`${p}: no capture group`);
				continue;
			}
			regexes.push(new RegExp(p, 'gd'));
		} catch (e) {
			errors.push(`${p}: ${(e as Error).message}`);
		}
	}
	return { regexes, errors };
}

/** `${...}`, `#{...}`, `<%= %>` 로 만드는 키는 실행 시에만 정해진다 */
const DYNAMIC = /\$\{|#\{|<%/;

export function findKeys(text: string, regexes: RegExp[]): KeyMatch[] {
	const byStart = new Map<number, KeyMatch>();
	for (const re of regexes) {
		for (const m of text.matchAll(re)) {
			const span = m.indices?.[1];
			if (!span || byStart.has(span[0]) || DYNAMIC.test(m[1])) continue;
			byStart.set(span[0], { key: m[1], start: span[0], end: span[1], matchEnd: m.index! + m[0].length });
		}
	}
	return [...byStart.values()].sort((a, b) => a.start - b.start);
}
