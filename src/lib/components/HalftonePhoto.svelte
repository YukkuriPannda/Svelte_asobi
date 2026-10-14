<script lang="ts">
	// object-fit: contain の写真に重ねるカラーハーフトーンの描画レイヤー。
	// 配置の基準になる親（position: relative / sticky の .photo）全体を覆い、progress が 0 の間は何も描かない。
	// 調整値と各モードの計算は src/lib/halftone/ にある（scroll / cursor / entrance、画像の縮小は image、シェーダーは shader）。
	import { onDestroy, onMount } from 'svelte';
	import { cubicBezier, type CubicBezier } from '$lib/cubicBezier';
	import { LEVELS } from '$lib/halftone/common';
	import { cachedImage, prepareImage, uploadLevels } from '$lib/halftone/image';
	import { createHalftoneProgram } from '$lib/halftone/shader';
	import {
		DOT_SCALE,
		EFFECT_EASING,
		EFFECT_END,
		GRADIENT_WIDTH,
		MAX_CELL_PX,
		MIN_CELL_PX,
		TRANSPARENT_BACKGROUND,
		scrollMask
	} from '$lib/halftone/scroll';
	import {
		CURSOR_EASING,
		CURSOR_FOLLOW_SPEED,
		CURSOR_MAX_CELL_PX,
		CURSOR_MIN_CELL_PX,
		CURSOR_RADIUS_PX,
		CURSOR_TRAIL_FADE_SPEED,
		CursorMotion,
		sampleCursorCurve
	} from '$lib/halftone/cursor';
	import {
		ENTRANCE_CELL_END_PX,
		ENTRANCE_CELL_START_PX,
		ENTRANCE_DOT_PX,
		ENTRANCE_DURATION_MS,
		ENTRANCE_GRADIENT_WIDTH,
		HIDDEN_MASK,
		entranceMask
	} from '$lib/halftone/entrance';

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
	/** 読み取り専用。実際に描いているエフェクトの強さ（0〜1）。bind:strength で受け取る */
	export let strength = 0;
	/** true なら、画像の読み込み直後に入場演出を一度だけ再生する（progress とは独立。入場中はスクロール連動を描かない） */
	export let entrance = false;
	/** 効果の求め方。scroll は進み具合（progress）による下からの前線、cursor はポインター周りの円形範囲 */
	export let mode: 'scroll' | 'cursor' = 'scroll';
	/** カーソルの位置（canvas の左上基準の CSS px）。cursor のとき、null で効果を 0 へフェードアウトする */
	export let pointer: { x: number; y: number } | null = null;
	/** カーソルモードの効果範囲の半径（CSS px） */
	export let cursorRadiusPx = CURSOR_RADIUS_PX;
	/** カーソルモードの縁の格子の大きさ（CSS px） */
	export let cursorMinCellPx = CURSOR_MIN_CELL_PX;
	/** カーソルモードの中心の格子の大きさ（CSS px） */
	export let cursorMaxCellPx = CURSOR_MAX_CELL_PX;
	/** カーソルモードの効果の強さのイージング（cubic-bezier）。縁 0 → 中心 1 の入力 x に対する効果の強さ */
	export let cursorEasing: CubicBezier = CURSOR_EASING;
	/** カーソルモードの移動量の追従速度（1 / 秒）。静止したときに半径と格子が 0 へ戻る速さも決める */
	export let cursorFollowSpeed = CURSOR_FOLLOW_SPEED;
	/** カーソルモードの軌跡が消える速さ（1 / 秒）。0 で軌跡を残さない */
	export let cursorTrailFadeSpeed = CURSOR_TRAIL_FADE_SPEED;

	const SMOOTHING = 0.25;

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
	// 入場演出: pending は画像の読み込み待ち（原画は隠す）、running は再生中、done 以降は通常の表示
	let entranceStatus: 'idle' | 'pending' | 'running' | 'done' = 'idle';
	let entranceStart = 0;
	let entranceT = 0; // 入場演出の進み具合（0〜1）
	const cursorMotion = new CursorMotion();
	let lastStepTime = 0;

	$: ease = cubicBezier(easing);
	// カーソルモードの効果の強さを入力 x = i / CURSOR_CURVE_STEPS ごとに標本化する（シェーダーは線形補間する）
	$: cursorCurve = sampleCursorCurve(cursorEasing);
	// カーソルモードは進み具合を使わず、ポインターがあれば 1、なければ 0 へ向けて shown がスムージングする
	$: target =
		mode === 'cursor'
			? pointer
				? 1
				: 0
			: ease(Math.min(Math.max(progress / Math.max(end, 0.001), 0), 1));
	// フェードアウト中も最後の位置を使うため、ポインターが来たときだけ覚えておく
	$: cursorMotion.track(pointer);

	// エフェクトを使うまでは追加の画像取得もWebGL初期化もしない
	$: if (target > 0 && !failed) activated = true;
	$: if (activated && canvas && src !== loadedSrc) loadImage(src);
	$: target,
		maxCellPx,
		minCellPx,
		gradientWidth,
		transparent,
		dotScale,
		photo,
		mode,
		pointer,
		cursorRadiusPx,
		cursorMinCellPx,
		cursorMaxCellPx,
		cursorCurve,
		schedule();
	// 読み込みを待つ間は原画を隠し、読み込みが終わってから入場演出を始める
	$: if (entranceStatus === 'pending' && photo) setPhotoMask(HIDDEN_MASK);

	onMount(() => {
		if (entrance && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			entranceStatus = 'pending';
			activated = true;
		}
	});

	function setupGl(target: HTMLCanvasElement) {
		({ gl, program } = createHalftoneProgram(target));
		resizeObserver = new ResizeObserver(() => draw());
		resizeObserver.observe(target);
	}

	async function loadImage(url: string) {
		loadedSrc = url;
		try {
			if (!gl) setupGl(canvas!);
			// カーソルモードは同じ写真のタイルを繰り返しマウントするので、取得と縮小の結果を使い回す
			const prepared = await (mode === 'cursor' ? cachedImage(url) : prepareImage(url));
			if (url !== loadedSrc || !gl) return;
			if (!texture) texture = gl.createTexture()!;
			uploadLevels(gl, texture, prepared.levels);
			maxLod = prepared.levels.length - 1;
			imageSize = prepared.imageSize;
			textureSize = prepared.textureSize;
			if (entranceStatus === 'pending') {
				entranceStatus = 'running';
				entranceStart = performance.now();
				entranceT = 0;
				schedule();
			}
			draw();
		} catch (error) {
			// 取得・WebGLに失敗した場合は元の<img>表示のままにする
			console.warn('HalftonePhoto: effect disabled', error);
			failed = true;
			activated = false;
			entranceStatus = 'done';
			clearMask();
		}
	}

	function schedule() {
		if (typeof window === 'undefined' || frame) return;
		frame = requestAnimationFrame(step);
	}

	function step() {
		frame = 0;
		const now = performance.now();
		const dt = Math.min((now - lastStepTime) / 1000, 0.1);
		lastStepTime = now;
		if (mode === 'cursor') {
			cursorMotion.update(dt, pointer, cursorRadiusPx, cursorFollowSpeed, cursorTrailFadeSpeed);
		}
		if (entranceStatus === 'running') {
			entranceT = Math.min((performance.now() - entranceStart) / ENTRANCE_DURATION_MS, 1);
			if (entranceT >= 1) entranceStatus = 'done';
			draw();
			// 演出中はスクロールの値を使わない。終わったらその時点の進み具合へ戻すため、続けて1回流す
			schedule();
			return;
		}
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		shown = reduceMotion ? target : shown + (target - shown) * SMOOTHING;
		if (Math.abs(target - shown) < 0.001) shown = target;
		strength = shown;
		draw();
		if (shown !== target || (mode === 'cursor' && cursorMotion.active)) schedule();
	}

	function clearMask() {
		photo?.style.removeProperty('mask-image');
		photo?.style.removeProperty('-webkit-mask-image');
	}

	function setPhotoMask(mask: string) {
		photo?.style.setProperty('mask-image', mask);
		photo?.style.setProperty('-webkit-mask-image', mask);
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
		const rectBottom = (height - rectHeight) / 2;
		// カーソルモードは入場演出と併用しない（entrance は無視する）
		const cursor = mode === 'cursor';
		const entering = !cursor && entranceStatus === 'running';
		// カーソルモードは原画を隠さず、ドットを上に重ねるだけにする
		if (cursor || !photo) clearMask();
		else if (entering) setPhotoMask(entranceMask(height, rectBottom, rectHeight, entranceT));
		else if (!transparent || shown <= 0) clearMask();
		else setPhotoMask(scrollMask(shown, gradientWidth, height, rectBottom, rectHeight));
		if (!entering && shown <= 0) return;

		const motion = cursorMotion.motion;
		const uniform = (name: string) => gl!.getUniformLocation(program!, name);
		gl.uniform4f(uniform('u_rect'), (width - rectWidth) / 2, rectBottom, rectWidth, rectHeight);
		gl.uniform1f(uniform('u_texScale'), textureSize.width / rectWidth);
		gl.uniform1f(uniform('u_progress'), entering ? entranceT : shown);
		gl.uniform1f(uniform('u_entrance'), entering ? 1 : 0);
		gl.uniform1f(uniform('u_entranceCoarse'), ENTRANCE_CELL_START_PX * dpr);
		gl.uniform1f(uniform('u_entranceFine'), ENTRANCE_CELL_END_PX * dpr);
		gl.uniform1f(uniform('u_entranceDot'), ENTRANCE_DOT_PX * dpr);
		gl.uniform1f(uniform('u_entranceWidth'), ENTRANCE_GRADIENT_WIDTH);
		gl.uniform1f(uniform('u_minCell'), (cursor ? cursorMinCellPx : minCellPx) * dpr);
		gl.uniform1f(
			uniform('u_maxCell'),
			(cursor ? Math.max(cursorMaxCellPx * motion, cursorMinCellPx) : maxCellPx) * dpr
		);
		gl.uniform1f(uniform('u_mode'), cursor ? 1 : 0);
		// 座標は gl_FragCoord と同じく左下原点の device px に直す
		const { lastPointer } = cursorMotion;
		gl.uniform2f(uniform('u_pointer'), lastPointer.x * dpr, height - lastPointer.y * dpr);
		gl.uniform1f(uniform('u_cursorRadius'), Math.max(cursorRadiusPx * motion * dpr, 0.001));
		gl.uniform3fv(uniform('u_trail'), cursorMotion.trailUniforms(dpr, height));
		gl.uniform1i(uniform('u_trailCount'), cursor ? cursorMotion.trail.length : 0);
		gl.uniform1fv(uniform('u_cursorCurve'), cursorCurve);
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
