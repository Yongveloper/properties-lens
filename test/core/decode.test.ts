import { describe, expect, it } from 'vitest';
import { bytesToText, decodeUnicodeEscapes } from '../../src/core/decode';

describe('decodeUnicodeEscapes', () => {
	it('decodes \\uXXXX', () => expect(decodeUnicodeEscapes('\\uD544\\uC218')).toBe('필수'));
	it('keeps url encoding', () => expect(decodeUnicodeEscapes('a/%EB%A6%AC%EB')).toBe('a/%EB%A6%AC%EB'));
	it('keeps other escapes', () => expect(decodeUnicodeEscapes('\\"x\\" &lt;br/&gt;')).toBe('\\"x\\" &lt;br/&gt;'));
	it('escaped backslash is not an escape', () => expect(decodeUnicodeEscapes('C:\\\\uD544')).toBe('C:\\\\uD544'));
	it('merges surrogate pairs', () => expect(decodeUnicodeEscapes('\\uD83D\\uDE0D')).toBe('😍'));
	it('keeps control characters escaped so lines stay aligned', () => expect(decodeUnicodeEscapes('a\\u000Ab\\u0009c')).toBe('a\\u000Ab\\u0009c'));
	it('keeps unusual line terminators and C1 controls escaped', () => expect(decodeUnicodeEscapes('a\\u2028b\\u2029c\\u0085d\\u009Fe\\u00A0f')).toBe('a\\u2028b\\u2029c\\u0085d\\u009Fe\u00A0f'));
	it('lower-case hex', () => expect(decodeUnicodeEscapes('\\uac00')).toBe('가'));
});

describe('bytesToText', () => {
	it('latin1', () => expect(bytesToText(Uint8Array.from([0x41, 0xe9]))).toBe('Aé'));
	it('latin1 is ISO-8859-1, not windows-1252', () => expect(bytesToText(Uint8Array.from([0x80, 0xff]))).toBe('\u0080\u00ff'));
	it('utf8', () => expect(bytesToText(new TextEncoder().encode('가'))).toBe('가'));
});
