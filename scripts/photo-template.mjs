#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { mkdir, stat, writeFile, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import exifr from 'exifr';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptDirectory, '..');

const usage = `Usage: npm run photos:template -- <photo-path> [options]

Options:
  --output <path>    Write to this Markdown file (relative to the current directory)
  --img-path <url>   Set the public image URL for the photo page
  -h, --help         Show this help

Without --output, creates content/photos/<photo-basename>.md in the repository.
The output file is created exclusively; an existing file is never overwritten.`;

const registeredCameras = new Map([
	['70d', 'Canon EOS70D'],
	['5d', 'Canon EOS5D']
]);

function cliError(message) {
	const error = new Error(message);
	error.isCliError = true;
	return error;
}

export function parseArguments(args) {
	const parsed = { inputPath: undefined, outputPath: undefined, imgPath: '', help: false };
	const positional = [];
	const seenOptions = new Set();
	let positionalOnly = false;

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (!positionalOnly && argument === '--') {
			positionalOnly = true;
			continue;
		}
		if (!positionalOnly && (argument === '--help' || argument === '-h')) {
			parsed.help = true;
			continue;
		}
		if (!positionalOnly && (argument === '--output' || argument === '--img-path')) {
			if (seenOptions.has(argument)) {
				throw cliError(`Option ${argument} may only be specified once.`);
			}
			seenOptions.add(argument);
			const value = args[index + 1];
			if (!value || value === '--' || value.startsWith('--')) {
				throw cliError(`Option ${argument} requires a value.`);
			}
			if (argument === '--output') parsed.outputPath = value;
			else parsed.imgPath = value;
			index += 1;
			continue;
		}
		if (!positionalOnly && argument.startsWith('-')) {
			throw cliError(`Unknown option: ${argument}`);
		}
		positional.push(argument);
	}

	if (parsed.help) return parsed;
	if (positional.length !== 1) {
		throw cliError('Provide exactly one photo path.');
	}
	parsed.inputPath = positional[0];
	return parsed;
}

function hasImageSignature(header) {
	if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
		return true;
	}
	if (
		header.length >= 8 &&
		header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	) {
		return true;
	}
	if (
		header.length >= 4 &&
		(header.subarray(0, 4).equals(Buffer.from('II*\0', 'binary')) ||
			header.subarray(0, 4).equals(Buffer.from('MM\0*', 'binary')))
	) {
		return true;
	}
	if (header.length >= 12 && header.toString('ascii', 4, 8) === 'ftyp') {
		const brand = header.toString('ascii', 8, 12);
		return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis', 'crx '].includes(brand);
	}
	return false;
}

async function readImageMetadata(imagePath) {
	let imageStat;
	try {
		imageStat = await stat(imagePath);
	} catch (error) {
		if (error?.code === 'ENOENT') throw cliError(`Photo not found: ${imagePath}`);
		throw error;
	}
	if (!imageStat.isFile()) throw cliError(`Photo path is not a file: ${imagePath}`);

	const file = await open(imagePath, 'r');
	let header;
	try {
		header = Buffer.alloc(12);
		const { bytesRead } = await file.read(header, 0, header.length, 0);
		header = header.subarray(0, bytesRead);
		if (!hasImageSignature(header)) {
			throw cliError(`Not a supported image file: ${imagePath}`);
		}

		if (header[0] === 0xff && header[1] === 0xd8) {
			if (imageStat.size < 4) throw cliError(`Image file is incomplete or invalid: ${imagePath}`);
		} else if (
			header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
		) {
			if (imageStat.size < 20) throw cliError(`Image file is incomplete or invalid: ${imagePath}`);
		} else if (
			header.toString('binary', 0, 2) === 'II' ||
			header.toString('binary', 0, 2) === 'MM'
		) {
			const isLittleEndian = header.toString('binary', 0, 2) === 'II';
			const magic = isLittleEndian ? header.readUInt16LE(2) : header.readUInt16BE(2);
			const ifdOffset = isLittleEndian ? header.readUInt32LE(4) : header.readUInt32BE(4);
			if (magic !== 42 || ifdOffset < 8 || ifdOffset + 2 > imageStat.size) {
				throw cliError(`Image file is incomplete or invalid: ${imagePath}`);
			}
			const entryCountBuffer = Buffer.alloc(2);
			await file.read(entryCountBuffer, 0, entryCountBuffer.length, ifdOffset);
			const entryCount = isLittleEndian
				? entryCountBuffer.readUInt16LE(0)
				: entryCountBuffer.readUInt16BE(0);
			if (ifdOffset + 2 + entryCount * 12 + 4 > imageStat.size) {
				throw cliError(`Image file is incomplete or invalid: ${imagePath}`);
			}
		}
	} finally {
		await file.close();
	}

	try {
		return (
			(await exifr.parse(imagePath, {
				ifd0: ['Make', 'Model'],
				exif: ['DateTimeOriginal', 'CreateDate', 'LensModel'],
				reviveValues: false
			})) ?? {}
		);
	} catch (error) {
		throw cliError(`Could not read EXIF metadata from ${imagePath}: ${error.message}`);
	}
}

function twoDigits(value) {
	return String(value).padStart(2, '0');
}

function validCalendarDate(year, month, day) {
	if (year < 1 || month < 1 || month > 12 || day < 1) return false;
	const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return day <= monthLengths[month - 1];
}

function normalizeExifDate(value) {
	if (value instanceof Date && !Number.isNaN(value.valueOf())) {
		const year = value.getFullYear();
		const month = value.getMonth() + 1;
		const day = value.getDate();
		return validCalendarDate(year, month, day)
			? `${year}-${twoDigits(month)}-${twoDigits(day)}`
			: undefined;
	}
	if (typeof value !== 'string') return undefined;
	const match = value
		.trim()
		.match(
			/^(\d{4})[:\-](\d{2})[:\-](\d{2})(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i
		);
	if (!match) return undefined;
	const [, yearText, monthText, dayText] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	if (!validCalendarDate(year, month, day)) return undefined;
	return `${yearText}-${monthText}-${dayText}`;
}

function registeredCamera(make, model) {
	const makeText = typeof make === 'string' ? make.trim() : '';
	const modelText = typeof model === 'string' ? model.trim().replace(/\s+/g, ' ') : '';
	const modelOnly = modelText.replace(/^canon\s+/i, '').trim();
	const isCanon = /^canon(?:\s+inc\.?)?$/i.test(makeText) || /^canon\s+/i.test(modelText);
	if (!isCanon) return undefined;
	for (const [suffix, alias] of registeredCameras) {
		const pattern = new RegExp(`^eos\\s*${suffix}$`, 'i');
		if (pattern.test(modelOnly)) return alias;
	}
	return undefined;
}

function registeredLens(value) {
	if (typeof value !== 'string') return undefined;
	const lensText = value.trim().replace(/\s+/g, ' ');
	const withoutCanon = lensText.replace(/^canon\s+/i, '');
	if (/^ef-s\s*24\s*mm\b/i.test(withoutCanon)) return 'EF-S 24mm';
	if (/^ef(?:-|\s)?50\s*mm\b/i.test(withoutCanon)) return 'EF-50mm';
	return undefined;
}

export function equipmentFromExif(
	metadata = {},
	cameraAssetNames = readdirSync(path.join(repositoryRoot, 'static', 'cameras'))
) {
	const availableAssets = new Set(cameraAssetNames);
	const candidates = [];
	const lens = registeredLens(metadata.LensModel);
	const camera = registeredCamera(metadata.Make, metadata.Model);
	if (lens) candidates.push(lens);
	if (camera) candidates.push(camera);
	return candidates.filter((equipment) => {
		const iconFilename = `${equipment.replace(' ', '')}.png`;
		return availableAssets.has(iconFilename);
	});
}

export function dateFromExif(metadata = {}) {
	return (
		normalizeExifDate(metadata.DateTimeOriginal) ?? normalizeExifDate(metadata.CreateDate) ?? ''
	);
}

export function defaultOutputPath(inputPath, root = repositoryRoot) {
	const basename = path.parse(inputPath).name;
	return path.resolve(root, 'content', 'photos', `${basename}.md`);
}

export function renderTemplate({ date = '', imgPath = '', equipments = [] }) {
	return [
		'---',
		'draft: true',
		'title: ""',
		`date: ${JSON.stringify(date)}`,
		`img_path: ${JSON.stringify(imgPath)}`,
		`equipments: ${JSON.stringify(equipments)}`,
		'tags: []',
		'---',
		''
	].join('\n');
}

async function createPhotoTemplate(options) {
	const inputPath = path.resolve(options.inputPath);
	const metadata = await readImageMetadata(inputPath);
	const outputPath = options.outputPath
		? path.resolve(options.outputPath)
		: defaultOutputPath(options.inputPath);
	const template = renderTemplate({
		date: dateFromExif(metadata),
		imgPath: options.imgPath,
		equipments: equipmentFromExif(metadata)
	});

	await mkdir(path.dirname(outputPath), { recursive: true });
	try {
		await writeFile(outputPath, template, { encoding: 'utf8', flag: 'wx' });
	} catch (error) {
		if (error?.code === 'EEXIST') throw cliError(`Output already exists: ${outputPath}`);
		throw error;
	}
	return outputPath;
}

async function main(args = process.argv.slice(2)) {
	try {
		const options = parseArguments(args);
		if (options.help) {
			console.log(usage);
			return 0;
		}
		const outputPath = await createPhotoTemplate(options);
		console.log(`Photo template created: ${path.relative(process.cwd(), outputPath) || '.'}`);
		return 0;
	} catch (error) {
		console.error(`Error: ${error.message}`);
		if (error.isCliError) console.error(`\n${usage}`);
		return 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	process.exitCode = await main();
}
