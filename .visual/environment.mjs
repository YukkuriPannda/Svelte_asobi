import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
export function environment() {
	const fonts = fs
		.readdirSync('C:/Windows/Fonts')
		.filter((name) => /\.(ttf|ttc|otf)$/i.test(name))
		.sort();
	const hash = crypto.createHash('sha256');
	for (const font of fonts) {
		hash.update(font);
		hash.update(fs.readFileSync(`C:/Windows/Fonts/${font}`));
	}
	return {
		platform: process.platform,
		osRelease: os.release(),
		node: process.version,
		playwright: JSON.parse(fs.readFileSync('node_modules/@playwright/test/package.json', 'utf8'))
			.version,
		fontsSha256: hash.digest('hex')
	};
}
export default function () {
	const expected = JSON.parse(fs.readFileSync('.visual/environment.json', 'utf8'));
	const actual = environment();
	if (JSON.stringify(actual) !== JSON.stringify(expected))
		throw new Error(
			`Visual generation environment changed. Restore the pinned environment before comparing/updating.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
		);
}
