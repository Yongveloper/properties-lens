// test/fixture 를 .vscode-test/ws 로 복사하고 git 저장소로 만든다 (HEAD diff 테스트용).
import { execFileSync } from 'child_process';
import { cpSync, rmSync } from 'fs';

const ws = '.vscode-test/ws';
rmSync(ws, { recursive: true, force: true });
cpSync('test/fixture', ws, { recursive: true });
const git = (...args) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], { cwd: ws });
git('init', '-q');
git('add', '-A');
git('commit', '-qm', 'init');
