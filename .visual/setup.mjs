import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const blog = JSON.parse(fs.readFileSync('src/lib/generated/blog_output.json'));
const photo = JSON.parse(fs.readFileSync('src/lib/generated/photo_output.json'));
const c = (id, selector, source) => ({ id, selector, source });
const header = c('header', '[data-visual-id="header"]', 'src/lib/components/Header.svelte');
const pages = [
	{
		id: 'home',
		route: '/',
		url: '/',
		ready: header.selector,
		components: [
			header,
			c('profile', '.RhoknovLogo', 'src/lib/components/App.svelte'),
			c('awards', '.Awards', 'src/lib/components/App.svelte'),
			c('timeline', '.timeline', 'src/lib/components/App.svelte')
		]
	},
	{
		id: 'blog',
		route: '/blog',
		url: '/blog',
		ready: header.selector,
		components: [
			header,
			c(
				'dashboard',
				'[data-visual-id="blog-dashboard"]',
				'src/lib/components/BlogDashboard.svelte'
			),
			...blog.map((p) =>
				c(
					`card-${p.id}`,
					`[data-visual-id="blog-card-${p.id}"]`,
					'src/lib/components/BlogPanel.svelte'
				)
			)
		]
	},
	{
		id: 'works',
		route: '/works',
		url: '/works',
		ready: header.selector,
		components: [header, c('gallery', '.gallery', 'src/routes/works/+page.svelte')]
	},
	{
		id: 'photo',
		route: '/photo',
		url: '/photo',
		ready: header.selector,
		components: [
			header,
			c('gallery', '[data-visual-id="photo-gallery"]', 'src/routes/photo/+page.svelte'),
			...photo.map((p, i) =>
				c(`tile-${i}`, `[data-visual-id="photo-${p.id}"]`, 'src/routes/photo/+page.svelte')
			)
		]
	},
	...blog.map((p) => ({
		id: `blog-${p.id}`,
		route: '/blog/[blog_id]',
		url: `/blog/${encodeURIComponent(p.id)}`,
		ready: '.markdown-body',
		components: [
			header,
			c('article', '.markdown-body', 'src/routes/blog/[blog_id]/+page.svelte'),
			c('toc', '.toc', 'src/routes/blog/[blog_id]/+page.svelte')
		].filter((x) => x.id !== 'toc' || p.content.includes('<h'))
	})),
	...photo.map((p, i) => ({
		id: `photo-${i}-${p.id.replaceAll(' ', '-')}`,
		route: '/photo/[photo_id]',
		url: `/photo/${encodeURIComponent(p.id)}`,
		finalUrl: '/photo/',
		ready: '.modal:not(.hide) .modalwindow',
		state: 'redirect to gallery, desktop modal initial state0',
		components: [
			c('modal', '.modal:not(.hide)', 'src/lib/components/PhotoDetailModal.svelte'),
			c('image', '.modal:not(.hide) .photo', 'src/lib/components/PhotoDetailModal.svelte')
		]
	}))
];
fs.writeFileSync(
	'.visual/manifest.json',
	JSON.stringify(
		{
			version: 1,
			environment: {
				os: 'win32',
				playwright: '1.56.1',
				browser: 'bundled chromium',
				viewport: { width: 1440, height: 900 },
				locale: 'ja-JP',
				timezone: 'Asia/Tokyo',
				deviceScaleFactor: 1
			},
			stabilization: {
				time: '2026-10-03T00:00:00+09:00',
				randomSeed: 123456,
				animations: 'disabled',
				remoteImages: 'checked-in fixtures',
				externalEmbeds: 'network blocked; iframe/audio/video hidden'
			},
			pages
		},
		null,
		2
	) + '\n'
);
const urls = new Set();
for (const p of [...blog, ...photo]) {
	for (const value of [p.img_path, p.thumnail_path, p.content, p.explanation]) {
		for (const match of (value || '').matchAll(/https:\/\/img\.rhoknov\.net\/[^"\s<>]+/g))
			if (!match[0].endsWith('.mp3')) urls.add(match[0]);
	}
}
fs.mkdirSync('.visual/assets', { recursive: true });
const assets = [];
for (const url of urls) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${response.status}: ${url}`);
	let file = crypto.createHash('sha256').update(url).digest('hex') + pathExtension(url);
	fs.writeFileSync(`.visual/assets/${file}`, Buffer.from(await response.arrayBuffer()));
	let contentType = response.headers.get('content-type') || 'image/jpeg';
	if (contentType.includes('gif')) {
		const frozen = file.replace(/\.gif$/, '.png');
		const result = spawnSync(process.env.VISUAL_FFMPEG || 'ffmpeg', [
			'-loglevel',
			'error',
			'-y',
			'-i',
			'.visual/assets/' + file,
			'-frames:v',
			'1',
			'.visual/assets/' + frozen
		]);
		if (result.status !== 0)
			throw new Error('GIF freeze failed: install ffmpeg or set VISUAL_FFMPEG');
		fs.unlinkSync('.visual/assets/' + file);
		file = frozen;
		contentType = 'image/png';
	}
	assets.push({ url, file, contentType });
}
function pathExtension(url) {
	return new URL(url).pathname.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.bin';
}
fs.writeFileSync('.visual/assets.json', JSON.stringify(assets, null, 2) + '\n');
console.log(`${pages.length} pages, ${assets.length} asset fixtures`);
