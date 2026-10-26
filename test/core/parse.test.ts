import { describe, expect, it } from 'vitest';
import { parseProperties } from '../../src/core/parse';

describe('parseProperties', () => {
	it('parses separators, comments, continuation and escapes', () => {
		const t = 'a = 1\n# c\n! c\nb:2\nc 3\nd = x\\\n    y\ne=\\uAC00\\t\\=\nf\n';
		expect(parseProperties(t)).toEqual([
			{ key: 'a', value: '1', line: 0 },
			{ key: 'b', value: '2', line: 3 },
			{ key: 'c', value: '3', line: 4 },
			{ key: 'd', value: 'xy', line: 5 },
			{ key: 'e', value: '가\t=', line: 7 },
			{ key: 'f', value: '', line: 8 },
		]);
	});
	it('handles CRLF', () =>
		expect(parseProperties('a=1\r\nb=x\\\r\n  y\r\nc=3')).toEqual([
			{ key: 'a', value: '1', line: 0 },
			{ key: 'b', value: 'xy', line: 1 },
			{ key: 'c', value: '3', line: 3 },
		]));
	it('escaped separator in key', () => expect(parseProperties('a\\=b=1')[0]).toEqual({ key: 'a=b', value: '1', line: 0 }));
	it('value keeps url and html', () => expect(parseProperties('u=%EB%A6 &lt;br /&gt;')[0].value).toBe('%EB%A6 &lt;br /&gt;'));
	it('same key twice keeps last', () => expect(parseProperties('a=1\na=2')).toEqual([{ key: 'a', value: '2', line: 1 }]));
	it('even backslashes at end are not continuation', () =>
		expect(parseProperties('a=x\\\\\nb=1')).toEqual([{ key: 'a', value: 'x\\', line: 0 }, { key: 'b', value: '1', line: 1 }]));
	it('comment line ending in backslash does not continue', () =>
		expect(parseProperties('# c\\\nb=1')).toEqual([{ key: 'b', value: '1', line: 1 }]));
});
