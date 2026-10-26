import { execFile } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * HEAD 의 파일 내용. 저장소가 아니거나 HEAD 에 없으면 undefined.
 * `--filters` 로 checkout 변환(autocrlf, eol 속성)을 적용해 작업본과 같은 형태로 받는다.
 */
export function readHead(file: vscode.Uri): Promise<Uint8Array | undefined> {
	return new Promise((resolve) => {
		execFile('git', ['cat-file', '--filters', `HEAD:./${path.basename(file.fsPath)}`],
			{ cwd: path.dirname(file.fsPath), encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
			(err, stdout) => resolve(err ? undefined : new Uint8Array(stdout)));
	});
}
