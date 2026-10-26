import * as vscode from 'vscode';
import { bytesToText, decodeUnicodeEscapes } from './core/decode';

export const SCHEME = 'properties-lens';
export type Ref = 'WORK' | 'HEAD';
export type ReadHead = (file: vscode.Uri) => Promise<Uint8Array | undefined>;

/** 경로를 그대로 써서 `.properties` 확장자로 언어가 properties 로 잡히게 한다. */
export function toDecodedUri(file: vscode.Uri, ref: Ref): vscode.Uri {
	return vscode.Uri.from({ scheme: SCHEME, path: file.path, query: `ref=${ref}` });
}

export function fromDecodedUri(uri: vscode.Uri): { file: vscode.Uri; ref: Ref } {
	return { file: vscode.Uri.from({ scheme: 'file', path: uri.path }), ref: uri.query === 'ref=HEAD' ? 'HEAD' : 'WORK' };
}

/** 디코딩한 읽기 전용 문서. 원본에 쓰는 경로는 없다. */
export class DecodedContentProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {
	private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this.emitter.event;
	private readonly watcher = vscode.workspace.createFileSystemWatcher('**/*.properties');

	constructor(private readonly readHead: ReadHead) {
		for (const on of [this.watcher.onDidChange, this.watcher.onDidCreate, this.watcher.onDidDelete]) {
			on((uri) => this.fire(uri));
		}
	}

	fire(file: vscode.Uri): void {
		for (const doc of vscode.workspace.textDocuments) {
			if (doc.uri.scheme !== SCHEME) continue;
			const d = fromDecodedUri(doc.uri);
			if (d.ref === 'WORK' && d.file.path === file.path) this.emitter.fire(doc.uri);
		}
	}

	async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
		const { file, ref } = fromDecodedUri(uri);
		const bytes = ref === 'HEAD' ? await this.readHead(file) : await readFile(file);
		return bytes ? decodeUnicodeEscapes(bytesToText(bytes)) : '';
	}

	dispose(): void {
		this.watcher.dispose();
		this.emitter.dispose();
	}
}

export async function readFile(file: vscode.Uri): Promise<Uint8Array | undefined> {
	try {
		return await vscode.workspace.fs.readFile(file);
	} catch {
		return undefined;
	}
}
