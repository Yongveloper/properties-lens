import { describe, expect, it } from 'vitest';
import { compilePatterns, DEFAULT_KEY_PATTERNS, findKeys } from '../../src/core/keys';

const { regexes } = compilePatterns([
	...DEFAULT_KEY_PATTERNS,
	String.raw`\$\.i18n\.([A-Za-z_$][\w$]*)`,
	String.raw`\$\.i18n\[\s*["']([^"']+)["']\s*\]`,
]);

describe('findKeys', () => {
	it('finds keys from jsp and js patterns in order', () => {
		const jsp = `<spring:message code="RV05851" javaScriptEscape="true"/> <spring:message code='RV1'/> $.i18n.RV03589; $.i18n['A01.d']`;
		expect(findKeys(jsp, regexes).map((m) => m.key)).toEqual(['RV05851', 'RV1', 'RV03589', 'A01.d']);
	});
	it('reports key offsets and match end', () => {
		const m = findKeys('<spring:message code="RV9"/>', regexes)[0];
		expect([m.start, m.end, m.matchEnd]).toEqual([22, 25, 26]);
	});
	it('keys with dots and Hangul', () =>
		expect(findKeys(`<spring:message code="P05.LUMPSUM"/><spring:message code="통계"/>`, regexes).map((k) => k.key)).toEqual(['P05.LUMPSUM', '통계']));
	it('fmt:message and getMessage defaults', () =>
		expect(findKeys(`<fmt:message key="a.b"/> messageSource.getMessage("c", null, l)`, regexes).map((k) => k.key)).toEqual(['a.b', 'c']));
	it('skips dynamic EL / scriptlet keys', () =>
		expect(findKeys(`<spring:message code="\${k}"/><spring:message code="pay.method.\${m}"/><spring:message code="#{x}"/><spring:message code="<%=k%>"/><spring:message code="ok"/>`, regexes).map((k) => k.key)).toEqual(['ok']));
	it('same key matched by two patterns is reported once', () => {
		const { regexes: dup } = compilePatterns([String.raw`code="([^"]+)"`, String.raw`code="(\w+)"`]);
		expect(findKeys('code="A"', dup)).toHaveLength(1);
	});
});

describe('compilePatterns', () => {
	it('reports invalid patterns', () => {
		const r = compilePatterns(['(', 'a(b)']);
		expect(r.regexes).toHaveLength(1);
		expect(r.errors).toHaveLength(1);
	});
	it('pattern without group is an error', () => expect(compilePatterns(['abc']).errors).toHaveLength(1));
});
