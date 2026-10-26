import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const ko = JSON.parse(readFileSync('l10n/bundle.l10n.ko.json', 'utf8'));

describe('manifest', () => {
	it('limits untrusted workspaces and restricts the sync command', () => {
		const u = pkg.capabilities?.untrustedWorkspaces;
		expect(u?.supported).toBe('limited');
		expect(u?.restrictedConfigurations).toEqual(['propertiesLens.syncCommand', 'propertiesLens.syncCwd']);
	});
	it('every runtime string has a Korean translation', () => {
		const src = ['src/search.ts', 'src/sync.ts', 'src/diff.ts', 'src/keyLens.ts', 'src/labels.ts'].map((f) => readFileSync(f, 'utf8')).join('\n');
		const keys = [...src.matchAll(/l10n\.t\('([^']+)'/g)].map((m) => m[1]);
		expect(keys.filter((k) => !(k in ko))).toEqual([]);
	});
	it('status bar label is localized', () => expect(readFileSync('src/sync.ts', 'utf8')).not.toMatch(/'\$\(sync[^']*\) Messages'/));
});
