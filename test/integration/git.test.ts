import * as assert from 'assert';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { readHead } from '../../src/git';

suite('git HEAD', () => {
	test('applies checkout filters so CRLF checkouts compare equal', async () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'plens-'));
		const git = (...a: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd: dir });
		git('init', '-q');
		writeFileSync(path.join(dir, '.gitattributes'), '*.properties text eol=crlf\n');
		writeFileSync(path.join(dir, 'm_ko.properties'), 'a=1\nb=2\n');
		git('add', '-A');
		git('commit', '-qm', 'init');
		git('rm', '-q', '--cached', 'm_ko.properties');
		git('reset', '-q', '--hard');
		const file = vscode.Uri.file(path.join(dir, 'm_ko.properties'));
		const work = readFileSync(file.fsPath);
		assert.ok(work.includes('\r\n'), 'working copy is CRLF');
		assert.deepStrictEqual(Buffer.from((await readHead(file))!), work);
	});
});
