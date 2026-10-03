import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const photos = JSON.parse(fs.readFileSync('src/lib/generated/photo_output.json', 'utf8')) as Array<{
	id: string;
	title: string;
	img_path: string;
}>;
const assets = JSON.parse(fs.readFileSync('.visual/assets.json', 'utf8')) as Array<{
	url: string;
	file: string;
	contentType: string;
}>;
const baseUrl = 'http://127.0.0.1:4178';

async function installImageFixtures(context: BrowserContext, originalRequests: string[]) {
	await context.route('**/*', async (route) => {
		const url = route.request().url();
		if (url.startsWith('https://img.rhoknov.net/')) originalRequests.push(url);
		if (url.startsWith(`${baseUrl}/`)) return route.continue();
		const asset = assets.find((item) => item.url === url);
		if (asset) {
			return route.fulfill({
				body: fs.readFileSync(path.resolve('.visual/assets', asset.file)),
				contentType: asset.contentType
			});
		}
		return route.fulfill({ status: 404, body: '' });
	});
}

async function expectFullPhoto(page: Page, photo: (typeof photos)[number], originalRequests: string[]) {
	await expect(page.locator('.modal:not(.hide) .photo img')).toHaveAttribute('src', photo.img_path);
	await expect.poll(() => originalRequests.includes(photo.img_path)).toBe(true);
	await expect.poll(() => page.locator('.modal:not(.hide) .photo img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
}

test('gallery requests thumbnails only; opening a desktop detail requests the original', async ({ page }) => {
	const originalRequests: string[] = [];
	await installImageFixtures(page.context(), originalRequests);
	await page.goto('/photo');
	const galleryImages = page.locator('.photoPost img');
	await expect(galleryImages).toHaveCount(photos.length);
	for (let index = 0; index < photos.length; index++) {
		await expect(galleryImages.nth(index)).toHaveAttribute(
			'src',
			`/photo-thumbnails/${encodeURIComponent(`${encodeURIComponent(photos[index].id)}.webp`)}`
		);
	}
	await expect.poll(() => galleryImages.evaluateAll((images) => images.every((element) => {
		const image = element as HTMLImageElement;
		return image.complete && image.naturalWidth > 0;
	}))).toBe(true);
	await page.waitForLoadState('networkidle');
	expect(originalRequests).toEqual([]);
	await page.locator('.photoPost button').first().click();
	await expectFullPhoto(page, photos[0], originalRequests);
});

test('opening a mobile detail requests the original photo', async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		userAgent:
			'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36'
	});
	const page = await context.newPage();
	const originalRequests: string[] = [];
	await installImageFixtures(context, originalRequests);
	await page.goto('/photo');
	await expect.poll(() => page.locator('.photoPost img').evaluateAll((images) => images.every((element) => {
		const image = element as HTMLImageElement;
		return image.complete && image.naturalWidth > 0;
	}))).toBe(true);
	await page.waitForLoadState('networkidle');
	expect(originalRequests).toEqual([]);
	await page.locator('.photoPost button').first().click();
	await expectFullPhoto(page, photos[0], originalRequests);
	await context.close();
});

test('thumbnail failure shows an error tile without requesting the original photo', async ({ page }) => {
	const originalRequests: string[] = [];
	await installImageFixtures(page.context(), originalRequests);
	await page.route('**/photo-thumbnails/gakusou.webp', (route) => route.fulfill({ status: 404 }));
	await page.goto('/photo');
	await expect(page.getByRole('img', { name: '額窓のサムネイルを読み込めません' })).toBeVisible();
	expect(originalRequests).toEqual([]);
});
