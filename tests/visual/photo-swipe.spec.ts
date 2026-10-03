import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const assets = JSON.parse(fs.readFileSync('.visual/assets.json', 'utf8'));

test.use({
	viewport: { width: 390, height: 844 },
	hasTouch: true,
	isMobile: true,
	userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36'
});

test.beforeEach(async ({ page }) => {
	await page.route('**/*', async (route) => {
		if (route.request().url().startsWith('http://127.0.0.1:4178/')) return route.continue();
		const asset = assets.find((item: { url: string }) => item.url === route.request().url());
		return route.fulfill(asset
			? { body: fs.readFileSync(`.visual/assets/${asset.file}`), contentType: asset.contentType }
			: { status: 200, body: '' });
	});
});

async function openPhoto(page: Page, id: string) {
	await page.goto(`/photo/${encodeURIComponent(id)}`);
	await expect(page.locator('.modal:not(.hide) .modalcontent')).toBeVisible();
	await expect(page).toHaveURL(new RegExp(`/photo/${encodeURIComponent(id)}$`));
}

async function dispatchSwipe(page: Page, dx: number, dy = 0, cancel = false) {
	const session = await page.context().newCDPSession(page);
	const x = dx > 0 ? 80 : 310;
	const y = 330;
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
	for (let step = 1; step <= 6; step++) {
		await session.send('Input.dispatchTouchEvent', {
			type: 'touchMove', touchPoints: [{ x: x + dx * step / 6, y: y + dy * step / 6 }]
		});
	}
	await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
	await session.detach();
}

async function swipe(page: Page, dx: number, dy = 0, cancel = false) {
	await dispatchSwipe(page, dx, dy, cancel);
	const modal = page.locator('.modal:not(.hide)');
	await expect(modal).toHaveAttribute('data-swipe-animating', 'false');
	await expect(modal.locator('.modalwindow')).toHaveCSS('translate', '0px');
}

async function installAnimationProbe(page: Page) {
	await page.addInitScript(() => {
		const state = ((window as any).__photoSwipeProbe = {
			records: [] as Array<{ translate: string[] }>,
			pauseNext: false,
			paused: null as Animation | null
		});
		const prototype = Element.prototype as unknown as { animate: (...args: any[]) => Animation };
		const originalAnimate = prototype.animate;
		prototype.animate = function (this: Element, keyframes: any, options?: any) {
			const animation = originalAnimate.call(this, keyframes, options);
			if (this instanceof HTMLElement && this.classList.contains('modalwindow')) {
				const frames = Array.isArray(keyframes) ? keyframes : [];
				state.records.push({
					translate: frames.map((frame: any) => frame.translate as string)
				});
				if (state.pauseNext) {
					state.pauseNext = false;
					state.paused = animation;
					animation.pause();
				}
			}
			return animation;
		};
	});
}

test('swipe moves next and previous, keeps the modal open and resets scroll', async ({ page }) => {
	await openPhoto(page, 'gakusou');
	await swipe(page, -220);
	await expect(page).toHaveURL(/\/photo\/gyokou$/);
	await expect(page.locator('.modal:not(.hide) h1')).toHaveText('"漁港"');
	await page.locator('.modal:not(.hide) .modalcontent').evaluate((element) => { element.scrollTop = 250; });
	await swipe(page, -220);
	await expect(page).toHaveURL(/\/photo\/hikari_kage01$/);
	await expect(page.locator('.modal:not(.hide) .modalcontent')).toHaveJSProperty('scrollTop', 0);
	await swipe(page, 220);
	await expect(page).toHaveURL(/\/photo\/gyokou$/);
	await swipe(page, -220);
	await swipe(page, -220);
	await expect(page).toHaveURL(/\/photo\/kasa$/);
	await expect(page.locator('.modal:not(.hide) h1')).toHaveText('"雨"');
	await page.screenshot({ path: '.visual/results/photo-swipe-mobile.png' });
});

test('vertical scroll, short swipe, cancellation and boundaries do not change photo', async ({ page }) => {
	await openPhoto(page, 'gakusou');
	await swipe(page, 220);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await swipe(page, -25);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await swipe(page, -220, 0, true);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await swipe(page, -10, -180);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await expect.poll(() => page.locator('.modal:not(.hide) .modalcontent').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
	await openPhoto(page, 'ugoki_houkou01');
	await swipe(page, -220);
	await expect(page).toHaveURL(/\/photo\/ugoki_houkou01$/);
	await swipe(page, 220);
	await expect(page).toHaveURL(/\/photo\/ugoki_houkou01%20copy$/);
	await expect(page.locator('.modal:not(.hide) h1')).toHaveText('"出口、または入口"');
	const session = await page.context().newCDPSession(page);
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 300, id: 1 }, { x: 250, y: 300, id: 2 }] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 30, y: 300, id: 1 }, { x: 180, y: 300, id: 2 }] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await session.detach();
	await expect(page).toHaveURL(/\/photo\/ugoki_houkou01%20copy$/);
	await page.touchscreen.tap(195, 330);
	await expect(page).toHaveURL(/\/photo\/$/);
	await expect(page.locator('.modal:not(.hide)')).toHaveCount(0);
});

test('swipe animation follows the finger, slides and snaps back at the boundary', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await installAnimationProbe(page);
	await openPhoto(page, 'gakusou');
	const modal = page.locator('.modal:not(.hide)');
	const window = modal.locator('.modalwindow');
	await window.locator('.photo img').evaluate(async (img: HTMLImageElement) => { await img.decode(); });
	const session = await page.context().newCDPSession(page);
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 310, y: 330 }] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150, y: 330 }] });
	await expect.poll(() => window.evaluate((element) => parseFloat(getComputedStyle(element).translate))).toBeLessThan(-100);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await page.screenshot({ path: '.visual/results/photo-swipe-drag.png' });
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(modal).toHaveAttribute('data-swipe-animating', 'true');
	await expect(page).toHaveURL(/\/photo\/gyokou$/);
	await expect(modal).toHaveAttribute('data-swipe-animating', 'false');
	await expect(window).toHaveCSS('translate', '0px');
	await expect(modal.locator('h1')).toHaveText('"漁港"');
	await expect.poll(() => page.evaluate(() => (window as any).__photoSwipeProbe.records.length)).toBe(2);
	const leftAnimations = await page.evaluate(() => (window as any).__photoSwipeProbe.records);
	const leftTranslate = leftAnimations.map((animation: any) => animation.translate.map((value: string) => parseFloat(value)));
	expect(leftTranslate[0][0]).toBeLessThan(0);
	expect(leftTranslate[0][1]).toBeLessThan(leftTranslate[0][0]);
	expect(leftTranslate[1][0]).toBeGreaterThan(0);
	expect(leftTranslate[1][1]).toBe(0);
	await swipe(page, 220);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await expect(modal).toHaveAttribute('data-swipe-animating', 'false');
	const bothDirections = await page.evaluate(() => (window as any).__photoSwipeProbe.records);
	const rightTranslate = bothDirections.slice(2).map((animation: any) => animation.translate.map((value: string) => parseFloat(value)));
	expect(rightTranslate[0][0]).toBeGreaterThan(0);
	expect(rightTranslate[0][1]).toBeGreaterThan(rightTranslate[0][0]);
	expect(rightTranslate[1][0]).toBeLessThan(0);
	expect(rightTranslate[1][1]).toBe(0);
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 80, y: 330 }] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 280, y: 330 }] });
	const offset = await window.evaluate((element) => parseFloat(getComputedStyle(element).translate));
	expect(offset).toBeGreaterThan(0);
	expect(offset).toBeLessThan(200);
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(window).toHaveCSS('translate', '0px');
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	await session.detach();
});

test('reduced motion changes the photo without slide animations', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await installAnimationProbe(page);
	await openPhoto(page, 'gakusou');
	await swipe(page, -220);
	await expect(page).toHaveURL(/\/photo\/gyokou$/);
	await expect(page.locator('.modal:not(.hide)')).toHaveAttribute('data-swipe-animating', 'false');
	await expect(page.locator('.modal:not(.hide) .modalwindow')).toHaveCSS('translate', '0px');
	expect(await page.evaluate(() => (window as any).__photoSwipeProbe.records)).toEqual([]);
});

test('ignores another swipe while the active transition is running', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await installAnimationProbe(page);
	await openPhoto(page, 'gakusou');
	await page.evaluate(() => { (window as any).__photoSwipeProbe.pauseNext = true; });
	const firstSwipe = await page.context().newCDPSession(page);
	await firstSwipe.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 310, y: 330 }] });
	await firstSwipe.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 90, y: 330 }] });
	await firstSwipe.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(page.locator('.modal:not(.hide)')).toHaveAttribute('data-swipe-animating', 'true');
	await expect.poll(() => page.evaluate(() => (window as any).__photoSwipeProbe.records.length)).toBe(1);

	await dispatchSwipe(page, -220);
	await expect(page).toHaveURL(/\/photo\/gakusou$/);
	expect(await page.evaluate(() => (window as any).__photoSwipeProbe.records.length)).toBe(1);

	await page.evaluate(() => { (window as any).__photoSwipeProbe.paused.play(); });
	await expect(page).toHaveURL(/\/photo\/gyokou$/);
	await expect(page.locator('.modal:not(.hide)')).toHaveAttribute('data-swipe-animating', 'false');
	await expect(page.locator('.modal:not(.hide) h1')).toHaveText('"漁港"');
	await firstSwipe.detach();
});
