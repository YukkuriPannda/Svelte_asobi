<script context="module" lang="ts">
	import { EASING_PRESETS, type CubicBezier } from '$lib/cubicBezier';

	// スクロールの進み具合 p（0〜1）からエフェクトのかかり具合への変換:
	//   かかり具合 = EFFECT_EASING( clamp(p / EFFECT_END, 0, 1) )
	/** イージング曲線。CSS の cubic-bezier(x1, y1, x2, y2) と同じ4値（EASING_PRESETS か任意の値） */
	export const EFFECT_EASING: CubicBezier = EASING_PRESETS.easeOut;
	/** スクロール全体のうち、エフェクトが100%に達する地点（0〜1。0.6 なら冒頭から60%の地点で完了） */
	export const EFFECT_END = 1;
	/** 100%時のドット格子の大きさ（CSS px） */
	export const MAX_CELL_PX = 64;
	/** エフェクト開始直後のドット格子の大きさ（CSS px） */
	export const MIN_CELL_PX = 12;
	/** 下→上へ進むかかり具合のグラデーション幅（写真の高さに対する比率） */
	export const GRADIENT_WIDTH = 5;
	/** true でドットの間を透過する（false は黒地）。透過時は photo に渡した元写真をエフェクト範囲だけマスクで隠す */
	export const TRANSPARENT_BACKGROUND = true;
	/** true でコントラストの高いキーカラーを周りと混ぜず、縮小の最後まで1画素として残す */
	export const PRESERVE_KEY_COLORS = true;
	/** キーカラーとみなす、2×2の残り3画素の平均との色差（Oklab の距離。白と黒の差が 1） */
	export const KEY_THRESHOLD = 0.25;
	/** 円の大きさ（格子に対する比率 0〜1）。1 で最も明るい所がセルを埋める。隣のセルとは重ならない */
	export const DOT_SCALE = 1;
</script>

<script lang="ts">
	// object-fit: contain の写真に重ねるカラーハーフトーンの描画レイヤー。
	// 配置の基準になる親（position: relative / sticky の .photo）全体を覆い、progress が 0 の間は何も描かない。
	import { onDestroy } from 'svelte';
	import { cubicBezier } from '$lib/cubicBezier';

	export let src: string;
	/** スクロール量から求めた全体の進み具合（0〜1） */
	export let progress = 0;
	export let easing: CubicBezier = EFFECT_EASING;
	export let end = EFFECT_END;
	export let maxCellPx = MAX_CELL_PX;
	export let minCellPx = MIN_CELL_PX;
	export let gradientWidth = GRADIENT_WIDTH;
	export let transparent = TRANSPARENT_BACKGROUND;
	export let dotScale = DOT_SCALE;
	/** 下に重なっている元写真。透過時、エフェクトがかかった範囲を mask-image で隠す */
	export let photo: HTMLElement | undefined = undefined;

	const LEVELS = 5; // セルサイズの段階数。隣接段階を混ぜて連続的に育てる
	const MAX_TEXTURE_PX = 2048;
	const SMOOTHING = 0.25;
	const FADE = 0.05; // 原画からクロスフェードする範囲（シェーダーと同じ値）
	const MASK_STEPS = 8;

	const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

	const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec4 u_rect; // 写真の表示領域 x, y(下端), w, h（device px）
uniform float u_texScale; // 1 device px あたりのテクセル数
uniform float u_progress;
uniform float u_minCell;
uniform float u_maxCell;
uniform float u_width;
uniform float u_levels;
uniform float u_transparent; // 1.0 でドットの間を透過する
uniform float u_dotScale; // 円の大きさ（格子に対する比率 0〜1）
uniform float u_maxLod;
out vec4 outColor;

const float FADE = ${FADE.toFixed(4)};
const float ANGLE = 0.78539816; // 網点格子の傾き 45°

float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// 縮小段階 lod の 2×2 を補間せずに読み、キーカラー（a >= 0.5）があればその色、なければ平均を返す
vec3 cellColor(vec2 uv, float lod) {
	int level = int(clamp(floor(lod + 0.5), 0.0, u_maxLod));
	ivec2 size = textureSize(u_tex, level);
	ivec2 base = ivec2(floor(uv * vec2(size) - 0.5));
	vec3 sum = vec3(0.0);
	vec4 key = vec4(0.0);
	for (int j = 0; j < 2; j++) {
		for (int i = 0; i < 2; i++) {
			vec4 texel = texelFetch(u_tex, clamp(base + ivec2(i, j), ivec2(0), size - 1), level);
			sum += texel.rgb;
			if (texel.a > key.a) key = texel;
		}
	}
	return key.a >= 0.499 ? key.rgb : sum * 0.25;
}

// 乗算済みアルファのドット（rgb = 色 × 被覆率、a = 被覆率）
vec4 halftone(vec2 p, float cell) {
	mat2 rot = mat2(cos(ANGLE), sin(ANGLE), -sin(ANGLE), cos(ANGLE));
	vec2 q = rot * p / cell;
	vec2 center = floor(q) + 0.5;
	vec2 centerPx = transpose(rot) * center * cell;
	vec2 uv = clamp(vec2(centerPx.x / u_rect.z, 1.0 - centerPx.y / u_rect.w), 0.0, 1.0);
	float lod = log2(max(cell * u_texScale * 0.5, 1.0));
	vec3 color = cellColor(uv, lod);
	// 黒地に明るい所ほど大きいドット。最も明るい所でセルを埋める
	float radius = 0.70710678 * cell * u_dotScale * sqrt(luminance(color));
	float dist = length(q - center) * cell;
	float coverage = 1.0 - smoothstep(radius - 0.75, radius + 0.75, dist);
	return vec4(color * coverage, coverage);
}

void main() {
	vec2 p = gl_FragCoord.xy - u_rect.xy;
	if (any(lessThan(p, vec2(0.0))) || any(greaterThanEqual(p, u_rect.zw))) {
		outColor = vec4(0.0);
		return;
	}
	// 下端 d=0 から上端 d=1 へ前線が進む
	float d = p.y / u_rect.w;
	float e = smoothstep(0.0, 1.0, (u_progress * (1.0 + u_width) - d) / u_width);
	if (e <= 0.0) {
		outColor = vec4(0.0);
		return;
	}
	float s = e * u_levels;
	float i = floor(s);
	float ratio = u_maxCell / u_minCell;
	float cellA = u_minCell * pow(ratio, i / u_levels);
	float cellB = u_minCell * pow(ratio, min(i + 1.0, u_levels) / u_levels);
	vec4 dots = mix(halftone(p, cellA), halftone(p, cellB), s - i);
	float k = clamp(e / FADE, 0.0, 1.0);
	// 黒地はセル全体を不透明にし、透過時はドットの被覆率だけを残す
	outColor = vec4(dots.rgb, mix(1.0, dots.a, u_transparent)) * k;
}`;

	let canvas: HTMLCanvasElement | undefined;
	let gl: WebGL2RenderingContext | null = null;
	let program: WebGLProgram | null = null;
	let texture: WebGLTexture | null = null;
	let maxLod = 0; // 縮小段階の最大番号（段階数 − 1）
	let imageSize = { width: 0, height: 0 };
	let textureSize = { width: 0, height: 0 };
	let loadedSrc = '';
	let activated = false;
	let failed = false;
	let shown = 0;
	let frame = 0;
	let resizeObserver: ResizeObserver | undefined;

	$: ease = cubicBezier(easing);
	$: target = ease(Math.min(Math.max(progress / Math.max(end, 0.001), 0), 1));

	// エフェクトを使うまでは追加の画像取得もWebGL初期化もしない
	$: if (target > 0 && !failed) activated = true;
	$: if (activated && canvas && src !== loadedSrc) loadImage(src);
	$: target, maxCellPx, minCellPx, gradientWidth, transparent, dotScale, photo, schedule();

	function compile(context: WebGL2RenderingContext, type: number, source: string) {
		const shader = context.createShader(type)!;
		context.shaderSource(shader, source);
		context.compileShader(shader);
		if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
			throw new Error(context.getShaderInfoLog(shader) ?? 'shader compile failed');
		}
		return shader;
	}

	function setupGl(target: HTMLCanvasElement) {
		const context = target.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
		if (!context) throw new Error('WebGL2 is not available');
		const linked = context.createProgram()!;
		context.attachShader(linked, compile(context, context.VERTEX_SHADER, VERTEX_SHADER));
		context.attachShader(linked, compile(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER));
		context.linkProgram(linked);
		if (!context.getProgramParameter(linked, context.LINK_STATUS)) {
			throw new Error(context.getProgramInfoLog(linked) ?? 'program link failed');
		}
		context.useProgram(linked);
		const buffer = context.createBuffer();
		context.bindBuffer(context.ARRAY_BUFFER, buffer);
		context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW);
		const position = context.getAttribLocation(linked, 'a_pos');
		context.enableVertexAttribArray(position);
		context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
		gl = context;
		program = linked;
		resizeObserver = new ResizeObserver(() => draw());
		resizeObserver.observe(target);
	}

	const SRGB_TO_LINEAR = Array.from({ length: 256 }, (_, n) => {
		const c = n / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});

	function toOklab(pixels: Uint8Array, count: number) {
		const lab = new Float32Array(count * 3);
		for (let n = 0; n < count; n++) {
			const r = SRGB_TO_LINEAR[pixels[n * 4]];
			const g = SRGB_TO_LINEAR[pixels[n * 4 + 1]];
			const b = SRGB_TO_LINEAR[pixels[n * 4 + 2]];
			const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
			const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
			const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
			lab[n * 3] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
			lab[n * 3 + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
			lab[n * 3 + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
		}
		return lab;
	}

	// 1/2 ずつ縮小した全段階を作る。2×2 の中で残り3画素の平均との色差が KEY_THRESHOLD を超える画素は
	// 混ぜずにそのまま親画素にし、超えなければ平均する。色差は a = 色差 / (2 × 閾値) としてアルファに入れ、
	// シェーダーは a >= 0.5 の画素をキーカラーとして扱う
	function buildLevels(source: Uint8ClampedArray, width: number, height: number) {
		const threshold = PRESERVE_KEY_COLORS ? KEY_THRESHOLD : Infinity;
		const levels: { width: number; height: number; pixels: Uint8Array }[] = [];
		let pixels = new Uint8Array(source);
		for (;;) {
			const lab = toOklab(pixels, width * height);
			const keyness = new Float32Array(width * height);
			const nextWidth = Math.max(1, Math.floor(width / 2));
			const nextHeight = Math.max(1, Math.floor(height / 2));
			const next = new Uint8Array(nextWidth * nextHeight * 4);
			for (let by = 0; by < Math.ceil(height / 2); by++) {
				for (let bx = 0; bx < Math.ceil(width / 2); bx++) {
					const x0 = bx * 2;
					const y0 = by * 2;
					const x1 = Math.min(x0 + 1, width - 1);
					const y1 = Math.min(y0 + 1, height - 1);
					const block = [y0 * width + x0, y0 * width + x1, y1 * width + x0, y1 * width + x1];
					let best = block[0];
					for (const n of block) {
						let dl = 0;
						let da = 0;
						let db = 0;
						for (const o of block) {
							if (o === n) continue;
							dl += lab[o * 3];
							da += lab[o * 3 + 1];
							db += lab[o * 3 + 2];
						}
						const others = block.filter((o) => o !== n).length || 1;
						const distance = Math.hypot(
							lab[n * 3] - dl / others,
							lab[n * 3 + 1] - da / others,
							lab[n * 3 + 2] - db / others
						);
						keyness[n] = Math.max(keyness[n], distance);
						if (keyness[n] > keyness[best]) best = n;
					}
					// 奇数辺の端のブロックは親画素を持たない（GL の縮小サイズは切り捨て）
					if (bx >= nextWidth || by >= nextHeight) continue;
					const target = (by * nextWidth + bx) * 4;
					for (let c = 0; c < 3; c++) {
						next[target + c] =
							keyness[best] > threshold
								? pixels[best * 4 + c]
								: Math.round((pixels[block[0] * 4 + c] + pixels[block[1] * 4 + c] + pixels[block[2] * 4 + c] + pixels[block[3] * 4 + c]) / 4);
					}
				}
			}
			for (let n = 0; n < width * height; n++) {
				pixels[n * 4 + 3] = Number.isFinite(threshold) ? Math.min(255, Math.round((keyness[n] / (2 * threshold)) * 255)) : 0;
			}
			levels.push({ width, height, pixels });
			if (width === 1 && height === 1) return levels;
			pixels = next;
			width = nextWidth;
			height = nextHeight;
		}
	}

	async function loadImage(url: string) {
		loadedSrc = url;
		try {
			if (!gl) setupGl(canvas!);
			// 画素を読むためCORS付きで取得する。別オリジンの場合、<img>がCORSなしで取得した応答
			// （Vary: Origin なし）がキャッシュされているとCORSで弾かれるため、キャッシュを通さずに取り直す。
			// 同一オリジン（一覧用サムネイルなど）はキャッシュをそのまま使う。
			const sameOrigin = new URL(url, location.href).origin === location.origin;
			const response = await fetch(url, { mode: 'cors', cache: sameOrigin ? 'default' : 'reload' });
			if (!response.ok) throw new Error(`image fetch failed: ${response.status}`);
			const image = await createImageBitmap(await response.blob());
			if (url !== loadedSrc || !gl) {
				image.close();
				return;
			}

			const scale = Math.min(1, MAX_TEXTURE_PX / Math.max(image.width, image.height));
			const resized = document.createElement('canvas');
			resized.width = Math.max(1, Math.round(image.width * scale));
			resized.height = Math.max(1, Math.round(image.height * scale));
			const context = resized.getContext('2d', { willReadFrequently: true })!;
			context.drawImage(image, 0, 0, resized.width, resized.height);
			// 縮小段階は自前で作り、キーカラーの情報をアルファに入れて転送する
			const levels = buildLevels(context.getImageData(0, 0, resized.width, resized.height).data, resized.width, resized.height);

			if (!texture) texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			// アルファはキーカラーらしさなので、乗算済みへの変換や上下反転をさせない
			gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			levels.forEach((level, lod) => {
				gl!.texImage2D(gl!.TEXTURE_2D, lod, gl!.RGBA, level.width, level.height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, level.pixels);
			});
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, levels.length - 1);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			maxLod = levels.length - 1;
			imageSize = { width: image.width, height: image.height };
			image.close();
			textureSize = { width: resized.width, height: resized.height };
			draw();
		} catch (error) {
			// 取得・WebGLに失敗した場合は元の<img>表示のままにする
			console.warn('HalftonePhoto: effect disabled', error);
			failed = true;
			activated = false;
			clearMask();
		}
	}

	function schedule() {
		if (typeof window === 'undefined' || frame) return;
		frame = requestAnimationFrame(step);
	}

	function step() {
		frame = 0;
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		shown = reduceMotion ? target : shown + (target - shown) * SMOOTHING;
		if (Math.abs(target - shown) < 0.001) shown = target;
		draw();
		if (shown !== target) schedule();
	}

	function smoothstep(x: number) {
		const t = Math.min(Math.max(x, 0), 1);
		return t * t * (3 - 2 * t);
	}

	function clearMask() {
		photo?.style.removeProperty('mask-image');
		photo?.style.removeProperty('-webkit-mask-image');
	}

	// シェーダーの k(d) と同じ前線で、元写真の不透明度 1 − k を下→上のグラデーションにする
	function updateMask(boxHeight: number, rectBottom: number, rectHeight: number) {
		if (!photo) return;
		if (!transparent || shown <= 0) return clearMask();
		const width = Math.max(gradientWidth, 0.001);
		// smoothstep(x) = FADE となる x（ここで k が 1 になる）
		let lo = 0;
		let hi = 1;
		for (let n = 0; n < 20; n++) {
			const mid = (lo + hi) / 2;
			if (smoothstep(mid) < FADE) lo = mid;
			else hi = mid;
		}
		const stops: string[] = [];
		for (let n = MASK_STEPS; n >= 0; n--) {
			const x = (hi * n) / MASK_STEPS;
			const d = shown * (1 + width) - x * width;
			const k = Math.min(smoothstep(x) / FADE, 1);
			const y = ((rectBottom + d * rectHeight) / boxHeight) * 100;
			stops.push(`rgba(0, 0, 0, ${(1 - k).toFixed(3)}) ${y.toFixed(3)}%`);
		}
		const mask = `linear-gradient(to top, ${stops.join(', ')})`;
		photo.style.setProperty('mask-image', mask);
		photo.style.setProperty('-webkit-mask-image', mask);
	}

	function draw() {
		if (!gl || !program || !canvas || !texture || !imageSize.width) return;
		const dpr = window.devicePixelRatio || 1;
		const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
		const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
		gl.viewport(0, 0, width, height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// <img> の object-fit: contain と同じ表示領域
		const fit = Math.min(width / imageSize.width, height / imageSize.height);
		const rectWidth = imageSize.width * fit;
		const rectHeight = imageSize.height * fit;
		updateMask(height, (height - rectHeight) / 2, rectHeight);
		if (shown <= 0) return;

		const uniform = (name: string) => gl!.getUniformLocation(program!, name);
		gl.uniform4f(uniform('u_rect'), (width - rectWidth) / 2, (height - rectHeight) / 2, rectWidth, rectHeight);
		gl.uniform1f(uniform('u_texScale'), textureSize.width / rectWidth);
		gl.uniform1f(uniform('u_progress'), shown);
		gl.uniform1f(uniform('u_minCell'), minCellPx * dpr);
		gl.uniform1f(uniform('u_maxCell'), maxCellPx * dpr);
		gl.uniform1f(uniform('u_width'), Math.max(gradientWidth, 0.001));
		gl.uniform1f(uniform('u_levels'), LEVELS);
		gl.uniform1f(uniform('u_transparent'), transparent ? 1 : 0);
		gl.uniform1f(uniform('u_dotScale'), Math.min(Math.max(dotScale, 0), 1));
		gl.uniform1f(uniform('u_maxLod'), maxLod);
		gl.uniform1i(uniform('u_tex'), 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	onDestroy(() => {
		if (frame) cancelAnimationFrame(frame);
		resizeObserver?.disconnect();
		clearMask();
		gl?.getExtension('WEBGL_lose_context')?.loseContext();
	});
</script>

{#if activated}
	<canvas class="halftone" bind:this={canvas} aria-hidden="true"></canvas>
{/if}

<style>
	.halftone {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
