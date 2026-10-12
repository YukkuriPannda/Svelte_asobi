import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';
import { defaultOutputPath, equipmentFromExif } from '../scripts/photo-template.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repositoryRoot, 'scripts', 'photo-template.mjs');

function asciiEntry(tag, value) {
	return { tag, type: 2, count: Buffer.byteLength(value, 'ascii') + 1, value };
}

function longEntry(tag, value) {
	return { tag, type: 4, count: 1, value };
}

function makeExifJpeg({ make, model, dateTimeOriginal, createDate, lensModel } = {}) {
	const imageEntries = [];
	if (make) imageEntries.push(asciiEntry(0x010f, make));
	if (model) imageEntries.push(asciiEntry(0x0110, model));
	const exifEntries = [];
	if (dateTimeOriginal) exifEntries.push(asciiEntry(0x9003, dateTimeOriginal));
	if (createDate) exifEntries.push(asciiEntry(0x9004, createDate));
	if (lensModel) exifEntries.push(asciiEntry(0xa434, lensModel));

	const exifIfdOffset = 8 + 2 + (imageEntries.length + 1) * 12 + 4;
	imageEntries.push(longEntry(0x8769, exifIfdOffset));
	const exifIfdSize = 2 + exifEntries.length * 12 + 4;
	let stringOffset = exifIfdOffset + exifIfdSize;
	for (const entry of [...imageEntries, ...exifEntries]) {
		if (entry.type === 2) {
			entry.offset = stringOffset;
			stringOffset += entry.count;
		}
	}

	const tiff = Buffer.alloc(stringOffset);
	tiff.write('II', 0, 'binary');
	tiff.writeUInt16LE(42, 2);
	tiff.writeUInt32LE(8, 4);

	function writeIfd(entries, offset) {
		tiff.writeUInt16LE(entries.length, offset);
		let entryOffset = offset + 2;
		for (const entry of entries) {
			tiff.writeUInt16LE(entry.tag, entryOffset);
			tiff.writeUInt16LE(entry.type, entryOffset + 2);
			tiff.writeUInt32LE(entry.count, entryOffset + 4);
			tiff.writeUInt32LE(entry.type === 2 ? entry.offset : entry.value, entryOffset + 8);
			entryOffset += 12;
		}
		tiff.writeUInt32LE(0, entryOffset);
	}

	writeIfd(imageEntries, 8);
	writeIfd(exifEntries, exifIfdOffset);
	for (const entry of [...imageEntries, ...exifEntries]) {
		if (entry.type === 2) tiff.write(`${entry.value}\0`, entry.offset, 'ascii');
	}

	const exifPayload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
	const app1 = Buffer.alloc(4 + exifPayload.length);
	app1[0] = 0xff;
	app1[1] = 0xe1;
	app1.writeUInt16BE(exifPayload.length + 2, 2);
	exifPayload.copy(app1, 4);
	return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, Buffer.from([0xff, 0xd9])]);
}

async function makeValidExifJpeg(metadata) {
	const jpeg = await sharp({
		create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } }
	})
		.jpeg()
		.toBuffer();
	if (!metadata) return jpeg;

	const exifJpeg = makeExifJpeg(metadata);
	const exifSegmentEnd = 4 + exifJpeg.readUInt16BE(4);
	const exifSegment = exifJpeg.subarray(2, exifSegmentEnd);
	const output = Buffer.concat([jpeg.subarray(0, 2), exifSegment, jpeg.subarray(2)]);
	await sharp(output).metadata();
	return output;
}

function runCli(args, cwd = repositoryRoot) {
	return spawnSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8' });
}

async function createScratch(t) {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'photo-template-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	return directory;
}

test('creates a compatible Markdown template from EXIF without changing the local capture date', async (t) => {
	const directory = await createScratch(t);
	const inputPath = path.join(directory, '写真 旅行.jpg');
	const outputPath = path.join(directory, '出力 フォルダー', '新しい写真.md');
	const sourceBytes = await makeValidExifJpeg({
		make: 'Canon',
		model: 'EOS 70D',
		dateTimeOriginal: '2025:01:02 23:57:30',
		createDate: '2025:01:03 00:01:00',
		lensModel: 'EF-S24mm f/2.8 STM'
	});
	const sourceWithTrailingData = Buffer.concat([sourceBytes, Buffer.from('trailing metadata')]);
	const decodedMetadata = await sharp(sourceWithTrailingData).metadata();
	assert.equal(decodedMetadata.width, 1);
	assert.equal(decodedMetadata.height, 1);
	await writeFile(inputPath, sourceWithTrailingData);

	const result = runCli([inputPath, '--output', outputPath, '--img-path', '/photos/写真.jpg']);
	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(await readFile(inputPath), sourceWithTrailingData);
	const markdown = await readFile(outputPath, 'utf8');
	const parsed = matter(markdown);
	assert.deepEqual(parsed.data, {
		draft: true,
		title: '',
		date: '2025-01-02',
		img_path: '/photos/写真.jpg',
		equipments: ['EF-S 24mm', 'Canon EOS70D'],
		tags: []
	});
	assert.equal(parsed.content.trim(), '');
});

test('uses CreateDate when DateTimeOriginal is absent and omits an unregistered lens', async (t) => {
	const directory = await createScratch(t);
	const inputPath = path.join(directory, 'capture.jpg');
	const outputPath = path.join(directory, 'capture.md');
	await writeFile(
		inputPath,
		await makeValidExifJpeg({
			make: 'Canon',
			model: 'EOS 5D',
			createDate: '2024:12:31 23:30:00',
			lensModel: 'EF 85mm f/1.8 USM'
		})
	);

	const result = runCli([inputPath, '--output', outputPath]);
	assert.equal(result.status, 0, result.stderr);
	const { data } = matter(await readFile(outputPath, 'utf8'));
	assert.equal(data.date, '2024-12-31');
	assert.deepEqual(data.equipments, ['Canon EOS5D']);
	assert.equal(data.img_path, '');
});

test('leaves the date and equipment blank when a valid JPEG has no EXIF data', async (t) => {
	const directory = await createScratch(t);
	const inputPath = path.join(directory, 'no-exif.jpg');
	const outputPath = path.join(directory, 'no-exif.md');
	await writeFile(inputPath, await makeValidExifJpeg());

	const result = runCli([inputPath, '--output', outputPath]);
	assert.equal(result.status, 0, result.stderr);
	const { data } = matter(await readFile(outputPath, 'utf8'));
	assert.equal(data.date, '');
	assert.deepEqual(data.equipments, []);
	assert.equal(data.title, '');
	assert.deepEqual(data.tags, []);
});

test('emits only equipment whose registered camera icon exists', () => {
	assert.deepEqual(
		equipmentFromExif(
			{
				Make: 'Canon',
				Model: 'EOS 70D',
				LensModel: 'EF-S 24mm f/2.8 STM'
			},
			['CanonEOS70D.png']
		),
		['Canon EOS70D']
	);
});

test('default output uses the source basename under the repository photo directory', () => {
	assert.equal(
		defaultOutputPath(path.join('some folder', '写真 sample.JPG')),
		path.join(repositoryRoot, 'content', 'photos', '写真 sample.md')
	);
});

test('refuses to overwrite an existing output file', async (t) => {
	const directory = await createScratch(t);
	const inputPath = path.join(directory, 'photo.jpg');
	const outputPath = path.join(directory, 'existing.md');
	await writeFile(inputPath, await makeValidExifJpeg({}));
	await writeFile(outputPath, 'keep this file');

	const result = runCli([inputPath, '--output', outputPath]);
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Output already exists/);
	assert.equal(await readFile(outputPath, 'utf8'), 'keep this file');
});

test('rejects missing, non-image, and truncated JPEG inputs', async (t) => {
	const directory = await createScratch(t);
	const missingPath = path.join(directory, 'missing.jpg');
	const textPath = path.join(directory, 'not-image.jpg');
	const truncatedPath = path.join(directory, 'truncated.jpg');
	await writeFile(textPath, 'not an image');
	await writeFile(truncatedPath, Buffer.from([0xff, 0xd8, 0xff]));

	const missing = runCli([missingPath, '--output', path.join(directory, 'missing.md')]);
	assert.notEqual(missing.status, 0);
	assert.match(missing.stderr, /Photo not found/);

	const nonImage = runCli([textPath, '--output', path.join(directory, 'not-image.md')]);
	assert.notEqual(nonImage.status, 0);
	assert.match(nonImage.stderr, /Not a supported image file/);

	const truncated = runCli([truncatedPath, '--output', path.join(directory, 'truncated.md')]);
	assert.notEqual(truncated.status, 0);
	assert.match(truncated.stderr, /incomplete or invalid/);
});

test('prints help and rejects unknown flags or a missing photo argument', () => {
	const help = runCli(['--help']);
	assert.equal(help.status, 0);
	assert.match(help.stdout, /--img-path/);

	const unknown = runCli(['--unexpected']);
	assert.notEqual(unknown.status, 0);
	assert.match(unknown.stderr, /Unknown option/);

	const missingArgument = runCli([]);
	assert.notEqual(missingArgument.status, 0);
	assert.match(missingArgument.stderr, /exactly one photo path/);
});
