import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const manifest = JSON.parse(fs.readFileSync('.visual/manifest.json', 'utf8'));
const assets: { url: string; file: string; contentType: string }[] = JSON.parse(
	fs.readFileSync('.visual/assets.json', 'utf8')
);

for (const entry of manifest.pages) {
	test.describe(`page:${entry.id}`, () => {
		test.beforeEach(async ({ page }) => {
			await page.clock.setFixedTime(new Date('2026-10-03T00:00:00+09:00'));
			await page.addInitScript(() => {
				let seed = 123456;
				Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
			});
			await page.route('**/*', async (route) => {
				const url = route.request().url();
				if (url.startsWith('http://127.0.0.1:4178/')) return route.continue();
				const asset = assets.find((item) => item.url === url);
				if (asset)
					return route.fulfill({
						body: fs.readFileSync(path.resolve('.visual/assets', asset.file)),
						contentType: asset.contentType
					});
				return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
			});
			const response = await page.goto(entry.url);
			expect(response?.ok()).toBeTruthy();
			await expect(page.locator(entry.ready)).toBeVisible();
			if (entry.finalUrl) await expect(page).toHaveURL(new RegExp(entry.finalUrl));
			await page.addStyleTag({
				content:
					'*,*::before,*::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } iframe,audio,video { visibility: hidden !important; }'
			});
			await page.evaluate(async () => {
				await document.fonts.ready;
				await Promise.all(
					Array.from(document.images).map((img) =>
						img.complete
							? Promise.resolve()
							: new Promise<void>((resolve) => {
									img.onload = () => resolve();
									img.onerror = () => resolve();
								})
					)
				);
			});
			// 記事の目次は onMount で見出しから生成される。SSR直後の撮影で空の目次を固定しないよう、見出しがあれば目次の生成を待つ。
			await page.waitForFunction(() => {
				const toc = document.querySelector('.toc');
				const hasHeadings = document.querySelector('#artic h1, #artic h2, #artic h3, #artic h4, #artic h5, #artic h6') !== null;
				return !toc || !hasHeadings || toc.querySelector('li') !== null;
			});
			// External photo fixtures and local equipment images must decode.
			const broken = await page.evaluate(() =>
				Array.from(document.images)
					.filter((img) => {
						// src未指定・空のimgは対象外（README: 元から未指定の箇所はアプリの現状）。
						if (!img.getAttribute('src')) return false;
						return (
							(img.src.startsWith('https://img.rhoknov.net/') ||
								new URL(img.src).pathname.startsWith('/cameras/')) &&
							!img.naturalWidth
						);
					})
					.map((img) => img.src)
			);
			expect(broken).toEqual([]);
		});
		test('full-page', async ({ page }) => {
			await expect(page).toHaveScreenshot(`${entry.id}/page.png`, { fullPage: true });
		});
		for (const component of entry.components) {
			test(`component:${component.id}`, async ({ page }) => {
				const target = page.locator(component.selector);
				await expect(target).toHaveCount(1);
				await expect(target).toBeVisible();
				await expect(target).toHaveScreenshot(`${entry.id}/${component.id}.png`);
			});
		}
	});
}
