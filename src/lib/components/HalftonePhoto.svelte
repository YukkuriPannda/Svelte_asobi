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

	const LEVELS = 5; // セルサイズの段階数。隣接段階を混ぜて連続的に育てる
	const MAX_TEXTURE_PX = 2048;
	const SMOOTHING = 0.25;

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
out vec4 outColor;

const float FADE = 0.05; // 原画からクロスフェードする範囲
const float ANGLE = 0.78539816; // 網点格子の傾き 45°

float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 halftone(vec2 p, float cell) {
	mat2 rot = mat2(cos(ANGLE), sin(ANGLE), -sin(ANGLE), cos(ANGLE));
	vec2 q = rot * p / cell;
	vec2 center = floor(q) + 0.5;
	vec2 centerPx = transpose(rot) * center * cell;
	vec2 uv = clamp(vec2(centerPx.x / u_rect.z, 1.0 - centerPx.y / u_rect.w), 0.0, 1.0);
	float lod = log2(max(cell * u_texScale * 0.5, 1.0));
	vec3 color = textureLod(u_tex, uv, lod).rgb;
	// 黒地に明るい所ほど大きいドット。最も明るい所でセルを埋める
	float radius = 0.70710678 * cell * sqrt(luminance(color));
	float dist = length(q - center) * cell;
	return color * (1.0 - smoothstep(radius - 0.75, radius + 0.75, dist));
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
	vec3 color = mix(halftone(p, cellA), halftone(p, cellB), s - i);
	float k = clamp(e / FADE, 0.0, 1.0);
	outColor = vec4(color * k, k);
}`;

	let canvas: HTMLCanvasElement | undefined;
	let gl: WebGL2RenderingContext | null = null;
	let program: WebGLProgram | null = null;
	let texture: WebGLTexture | null = null;
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
	$: target, maxCellPx, minCellPx, gradientWidth, schedule();

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
			resized.getContext('2d')!.drawImage(image, 0, 0, resized.width, resized.height);

			if (!texture) texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resized);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			imageSize = { width: image.width, height: image.height };
			image.close();
			textureSize = { width: resized.width, height: resized.height };
			draw();
		} catch (error) {
			// 取得・WebGLに失敗した場合は元の<img>表示のままにする
			console.warn('HalftonePhoto: effect disabled', error);
			failed = true;
			activated = false;
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
		if (shown <= 0) return;

		// <img> の object-fit: contain と同じ表示領域
		const fit = Math.min(width / imageSize.width, height / imageSize.height);
		const rectWidth = imageSize.width * fit;
		const rectHeight = imageSize.height * fit;
		const uniform = (name: string) => gl!.getUniformLocation(program!, name);
		gl.uniform4f(uniform('u_rect'), (width - rectWidth) / 2, (height - rectHeight) / 2, rectWidth, rectHeight);
		gl.uniform1f(uniform('u_texScale'), textureSize.width / rectWidth);
		gl.uniform1f(uniform('u_progress'), shown);
		gl.uniform1f(uniform('u_minCell'), minCellPx * dpr);
		gl.uniform1f(uniform('u_maxCell'), maxCellPx * dpr);
		gl.uniform1f(uniform('u_width'), Math.max(gradientWidth, 0.001));
		gl.uniform1f(uniform('u_levels'), LEVELS);
		gl.uniform1i(uniform('u_tex'), 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	onDestroy(() => {
		if (frame) cancelAnimationFrame(frame);
		resizeObserver?.disconnect();
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
