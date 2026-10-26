import * as vscode from 'vscode';
import { readConfig, SECTION } from './config';
import { groupBundles } from './core/bundles';
import { bytesToText } from './core/decode';
import { MessageIndex } from './core/messageIndex';
import { readFile } from './decodedDocs';

const DEBOUNCE_MS = 200;

/** 번들 파일을 찾아 읽고 감시하며 최신 MessageIndex 를 보유한다. */
export class IndexService implements vscode.Disposable {
	private current = MessageIndex.build([], new Map(), '', '');
	private uriByPath = new Map<string, vscode.Uri>();
	private readonly emitter = new vscode.EventEmitter<void>();
	readonly onDidChange = this.emitter.event;
	readonly ready: Promise<void>;
	private watcher?: vscode.FileSystemWatcher;
	private timer?: ReturnType<typeof setTimeout>;
	private generation = 0;
	private readonly disposables: vscode.Disposable[] = [];

	constructor() {
		this.watch();
		this.disposables.push(vscode.workspace.onDidChangeConfiguration((e) => {
			if (!e.affectsConfiguration(SECTION)) return;
			this.watch();
			this.schedule();
		}));
		this.ready = this.refresh();
	}

	get index(): MessageIndex {
		return this.current;
	}

	isBundleFile(uri: vscode.Uri): boolean {
		return uri.scheme === 'file' && this.current.bundleOf(uri.path) !== undefined;
	}

	uriOf(path: string): vscode.Uri {
		return this.uriByPath.get(path) ?? vscode.Uri.file(path);
	}

	async refresh(): Promise<void> {
		const gen = ++this.generation;
		const cfg = readConfig();
		const uris = await vscode.workspace.findFiles(cfg.bundleGlob, cfg.exclude);
		const uriByPath = new Map(uris.map((u) => [u.path, u]));
		const bundles = groupBundles([...uriByPath.keys()]);
		const contents = new Map<string, string>();
		await Promise.all(bundles.flatMap((b) => b.files).map(async (f) => {
			const bytes = await readFile(uriByPath.get(f.path)!);
			if (bytes) contents.set(f.path, bytesToText(bytes));
		}));
		if (gen !== this.generation) return;
		this.uriByPath = uriByPath;
		this.current = MessageIndex.build(bundles, contents, cfg.primaryLocale, vscode.env.language);
		this.emitter.fire();
	}

	private watch(): void {
		this.watcher?.dispose();
		this.watcher = vscode.workspace.createFileSystemWatcher(readConfig().bundleGlob);
		const onFs = () => this.schedule();
		this.watcher.onDidChange(onFs);
		this.watcher.onDidCreate(onFs);
		this.watcher.onDidDelete(onFs);
	}

	private schedule(): void {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => void this.refresh(), DEBOUNCE_MS);
	}

	dispose(): void {
		clearTimeout(this.timer);
		this.watcher?.dispose();
		this.emitter.dispose();
		this.disposables.forEach((d) => d.dispose());
	}
}
