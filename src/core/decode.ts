const ESCAPE = /\\(\\|u([0-9a-fA-F]{4}))/g;

/**
 * `\uXXXX` 만 문자로 바꾼다. `\\` 는 리터럴 백슬래시라 뒤의 `u` 를 escape 로 보지 않는다.
 * 서로게이트 쌍은 UTF-16 문자열로 이어 붙이면 자연히 한 글자가 된다.
 * 제어 문자(C0, DEL, C1)와 LS/PS(U+2028/2029)는 escape 그대로 둔다.
 * 풀면 줄이 밀리거나 VS Code 가 "비정상적인 줄 종결자" 경고를 띄운다.
 */
export function decodeUnicodeEscapes(text: string): string {
	return text.replace(ESCAPE, (whole, _body, hex) => {
		const code = hex ? parseInt(hex, 16) : -1;
		return keepEscaped(code) ? whole : String.fromCharCode(code);
	});
}

function keepEscaped(code: number): boolean {
	return code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029;
}

const utf8 = new TextDecoder('utf-8', { fatal: true });
/** 비ASCII 를 escape 없이 담은 UTF-8 properties(Java 9+) 는 UTF-8 로, 그 외는 Java 기본인 ISO-8859-1 로 읽는다. */
export function bytesToText(bytes: Uint8Array): string {
	if (bytes.some((b) => b > 0x7f)) {
		try {
			return utf8.decode(bytes);
		} catch {
			// 유효한 UTF-8 아님
		}
	}
	// TextDecoder('latin1') 은 WHATWG 상 windows-1252 라 0x80~0x9F 가 달라진다. 바이트 = 코드포인트로 직접 변환.
	let out = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return out;
}
