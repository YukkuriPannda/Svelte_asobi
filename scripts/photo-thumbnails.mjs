import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photosDirectory = path.join(root, 'content', 'photos');
const outputDirectory = path.join(root, 'static', 'photo-thumbnails');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const width = 768;
const quality = 80;

function trackedPhotoFiles() {
	const result = execFileSync('git', ['ls-files', '--', 'content/photos/*.md'], {
		cwd: root,
		encoding: 'utf8'
	});
	return result.split(/\r?\n/).filter(Boolean).sort();
}

async function photoSources() {
	const photos = [];
	for (const relativePath of trackedPhotoFiles()) {
		const absolutePath = path.join(root, relativePath);
		const source = matter(await readFile(absolutePath, 'utf8')).data;
		if (typeof source.img_path !== 'string' || !/^https?:\/\//i.test(source.img_path)) {
			throw new Error(`${relativePath} must contain an http(s) img_path`);
		}
		photos.push({ id: path.basename(relativePath, '.md'), sourceUrl: source.img_path });
	}
	return photos;
}

async function generate() {
	const photos = await photoSources();
	await mkdir(outputDirectory, { recursive: true });
	const records = [];
	for (const photo of photos) {
		const response = await fetch(photo.sourceUrl);
		if (!response.ok) {
			throw new Error(`Failed to download ${photo.sourceUrl}: HTTP ${response.status}`);
		}
		const sourceBytes = Buffer.from(await response.arrayBuffer());
		const { data, info } = await sharp(sourceBytes)
			.rotate()
			.resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
			.webp({ quality })
			.toBuffer({ resolveWithObject: true });
		const filename = `${encodeURIComponent(photo.id)}.webp`;
		await writeFile(path.join(outputDirectory, filename), data);
		records.push({
			id: photo.id,
			sourceUrl: photo.sourceUrl,
			filename,
			width: info.width,
			height: info.height,
			sourceBytes: sourceBytes.length,
			thumbnailBytes: data.length
		});
		console.log(`${photo.id}: ${sourceBytes.length} → ${data.length} bytes (${info.width}×${info.height})`);
	}
	const currentFiles = new Set(records.map((photo) => photo.filename));
	for (const filename of await readdir(outputDirectory)) {
		if (filename.endsWith('.webp') && !currentFiles.has(filename)) {
			await rm(path.join(outputDirectory, filename));
		}
	}
	await writeFile(manifestPath, `${JSON.stringify({ width, quality, format: 'webp', photos: records }, null, 2)}\n`);
	console.log(`Generated ${records.length} thumbnails in ${path.relative(root, outputDirectory)}`);
}

async function check() {
	const photos = await photoSources();
	let manifest;
	try {
		manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
	} catch {
		throw new Error('Thumbnail manifest is missing. Run npm run photos:thumbnails.');
	}
	if (manifest.width !== width || manifest.quality !== quality || manifest.format !== 'webp') {
		throw new Error('Thumbnail settings changed. Run npm run photos:thumbnails.');
	}
	if (!Array.isArray(manifest.photos)) throw new Error('Thumbnail manifest has no photos array.');
	const records = new Map(manifest.photos.map((photo) => [photo.id, photo]));
	const failures = [];
	for (const photo of photos) {
		const record = records.get(photo.id);
		if (!record) {
			failures.push(`${photo.id}: thumbnail is missing`);
			continue;
		}
		if (record.sourceUrl !== photo.sourceUrl) failures.push(`${photo.id}: source URL changed`);
		const expectedFilename = `${encodeURIComponent(photo.id)}.webp`;
		if (record.filename !== expectedFilename) failures.push(`${photo.id}: unexpected thumbnail filename`);
		if (record.width > width || record.height > width) failures.push(`${photo.id}: dimensions exceed ${width}px`);
		try {
			const image = await stat(path.join(outputDirectory, expectedFilename));
			if (image.size === 0) failures.push(`${photo.id}: thumbnail is empty`);
		} catch {
			failures.push(`${photo.id}: file ${expectedFilename} is missing`);
		}
	}
	for (const id of records.keys()) {
		if (!photos.some((photo) => photo.id === id)) failures.push(`${id}: stale manifest entry`);
	}
	if (failures.length) throw new Error(`Photo thumbnail check failed:\n- ${failures.join('\n- ')}`);
	console.log(`Photo thumbnails are current (${photos.length} files).`);
}

const mode = process.argv[2];
if (mode === 'generate') await generate();
else if (mode === 'check') await check();
else throw new Error('Usage: node scripts/photo-thumbnails.mjs <generate|check>');
