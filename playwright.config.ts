import { defineConfig } from '@playwright/test';
if (process.platform !== 'win32')
	throw new Error(
		'Baseline environment: Windows / bundled Chromium. Use Windows to compare or update.'
	);
export default defineConfig({
	globalSetup: './.visual/environment.mjs',
	testDir: './tests/visual',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 60000,
	updateSnapshots: 'none',
	snapshotPathTemplate: '{testDir}/../../.visual/baselines/{projectName}/{arg}{ext}',
	outputDir: '.visual/results',
	reporter: [
		['list'],
		['html', { outputFolder: '.visual/report', open: 'never' }],
		['json', { outputFile: '.visual/results/results.json' }]
	],
	expect: {
		timeout: 15000,
		toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixels: 0 }
	},
	use: {
		baseURL: 'http://127.0.0.1:4178',
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		locale: 'ja-JP',
		timezoneId: 'Asia/Tokyo',
		colorScheme: 'light',
		reducedMotion: 'reduce',
		serviceWorkers: 'block',
		headless: true,
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'desktop-chromium-win32', use: { browserName: 'chromium' } }],
	webServer: {
		env: { TZ: 'Asia/Tokyo' },
		command: 'npm run dev:svelte -- --host 127.0.0.1 --port 4178 --strictPort',
		url: 'http://127.0.0.1:4178',
		reuseExistingServer: false,
		timeout: 120000
	}
});
