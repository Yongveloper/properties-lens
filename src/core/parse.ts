export interface PropEntry {
	key: string;
	value: string;
	/** 키가 시작하는 물리 줄 (0부터) */
	line: number;
}

const LEADING_WS = /^[ \t\f]+/;
const ESCAPE = /\\(u[0-9a-fA-F]{4}|[\s\S])/g;
const CONTROL: Record<string, string> = { t: '\t', n: '\n', r: '\r', f: '\f' };

function unescape(raw: string): string {
	return raw.replace(ESCAPE, (_w, body: string) =>
		body.length === 5 ? String.fromCharCode(parseInt(body.slice(1), 16)) : (CONTROL[body] ?? body));
}

function endsWithOddBackslashes(s: string): boolean {
	let n = 0;
	for (let i = s.length - 1; i >= 0 && s[i] === '\\'; i--) n++;
	return n % 2 === 1;
}

function isWs(c: string): boolean {
	return c === ' ' || c === '\t' || c === '\f';
}

/** `java.util.Properties.load` 규칙으로 파싱한다. 같은 키가 여러 번 나오면 마지막 값·줄을 쓴다. */
export function parseProperties(text: string): PropEntry[] {
	const lines = text.split(/\r\n|\n|\r/);
	const entries = new Map<string, PropEntry>();

	for (let i = 0; i < lines.length; i++) {
		const start = i;
		let logical = lines[i].replace(LEADING_WS, '');
		if (logical === '' || logical[0] === '#' || logical[0] === '!') continue;
		while (endsWithOddBackslashes(logical)) {
			logical = logical.slice(0, -1);
			if (i + 1 >= lines.length) break;
			logical += lines[++i].replace(LEADING_WS, '');
		}

		let j = 0;
		while (j < logical.length) {
			const c = logical[j];
			if (c === '\\') j += 2;
			else if (c === '=' || c === ':' || isWs(c)) break;
			else j++;
		}
		const rawKey = logical.slice(0, j);
		while (j < logical.length && isWs(logical[j])) j++;
		if (logical[j] === '=' || logical[j] === ':') j++;
		while (j < logical.length && isWs(logical[j])) j++;

		const key = unescape(rawKey);
		entries.set(key, { key, value: unescape(logical.slice(j)), line: start });
	}
	return [...entries.values()];
}
