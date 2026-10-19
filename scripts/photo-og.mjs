import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photosPath = path.join(root, 'src', 'lib', 'generated', 'photo_output.json');
const templatePath = path.join(root, 'scripts', 'photo-og.html');
const outputDirectory = path.join(root, 'static', 'photo-og');
const width = 1200;
const height = 630;

async function generate() {
	const photos = JSON.parse(await readFile(photosPath, 'utf8'));
	const template = await readFile(templatePath, 'utf8');
	for (const photo of photos) {
		if (typeof photo.img_path !== 'string' || !/^https?:\/\//i.test(photo.img_path)) {
			throw new Error(
				`${photo.id}: img_path must be an http(s) URL in ${path.relative(root, photosPath)}`
			);
		}
	}

	await mkdir(outputDirectory, { recursive: true });
	const browser = await chromium.launch();
	const records = [];
	try {
		for (const photo of photos) {
			const page = await browser.newPage({
				viewport: { width, height },
				deviceScaleFactor: 1
			});
			try {
				await page.setContent(template, { waitUntil: 'networkidle' });
				await page.evaluate(
					([src, title]) => {
						document.getElementById('photo').src = src;
						document.getElementById('background').src = src;
						document.getElementById('title').textContent = title;
					},
					[photo.img_path, photo.title ?? '']
				);
				await page.evaluate(async () => {
					await document.getElementById('photo').decode();
					await document.getElementById('background').decode();
					// Force layout so the font starts loading for the new title, then wait for it.
					document.getElementById('title').offsetWidth;
					await document.fonts.ready;
					if (
						![...document.fonts].some(
							(face) => face.family.includes('Hina Mincho') && face.status === 'loaded'
						)
					) {
						throw new Error('Hina Mincho did not load');
					}
				});
				const filename = `${encodeURIComponent(photo.id)}.jpg`;
				await page.screenshot({
					path: path.join(outputDirectory, filename),
					type: 'jpeg',
					quality: 90,
					clip: { x: 0, y: 0, width, height }
				});
				records.push(filename);
				console.log(`${photo.id} → static/photo-og/${filename}`);
			} catch (error) {
				throw new Error(`${photo.id}: ${error instanceof Error ? error.message : error}`, {
					cause: error
				});
			} finally {
				await page.close();
			}
		}
	} finally {
		await browser.close();
	}

	const currentFiles = new Set(records);
	for (const filename of await readdir(outputDirectory)) {
		if (filename.endsWith('.jpg') && !currentFiles.has(filename)) {
			await rm(path.join(outputDirectory, filename));
		}
	}
	console.log(`Generated ${records.length} OGP images in ${path.relative(root, outputDirectory)}`);
}

async function check() {
	const photos = JSON.parse(await readFile(photosPath, 'utf8'));
	const missing = [];
	for (const photo of photos) {
		try {
			await stat(path.join(outputDirectory, `${encodeURIComponent(photo.id)}.jpg`));
		} catch {
			missing.push(photo.id);
		}
	}
	if (missing.length) {
		console.error(`Missing OGP images:\n- ${missing.join('\n- ')}\nRun npm run photos:og to generate them.`);
		process.exitCode = 1;
		return;
	}
	console.log(`OGP images OK (${photos.length})`);
}

const mode = process.argv[2];
if (mode === 'check') await check();
else if (mode === undefined) await generate();
else throw new Error('Usage: node scripts/photo-og.mjs [check]');
