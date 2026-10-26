import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/integration/**/*.test.js',
	workspaceFolder: '.vscode-test/ws',
	version: 'stable',
	launchArgs: ['--disable-extensions'],
	mocha: { ui: 'tdd', timeout: 20000 },
});
