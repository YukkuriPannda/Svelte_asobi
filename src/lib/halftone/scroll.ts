// スクロールモード（mode="scroll"）: 進み具合 progress に合わせて、写真の下端から上端へ前線が進む。
// 透過時は元写真の、エフェクトがかかった範囲を mask-image で隠す。
import { EASING_PRESETS, type CubicBezier } from '$lib/cubicBezier';
import { FADE, smoothstep } from './common';

// スクロールの進み具合 p（0〜1）からエフェクトのかかり具合への変換:
//   かかり具合 = EFFECT_EASING( clamp(p / EFFECT_END, 0, 1) )
/** イージング曲線。CSS の cubic-bezier(x1, y1, x2, y2) と同じ4値（EASING_PRESETS か任意の値） */
export const EFFECT_EASING: CubicBezier = EASING_PRESETS.easeOut;
/** スクロール全体のうち、エフェクトが100%に達する地点（0〜1。0.6 なら冒頭から60%の地点で完了） */
export const EFFECT_END = 0.7;
/** 100%時のドット格子の大きさ（CSS px） */
export const MAX_CELL_PX = 16;
/** エフェクト開始直後のドット格子の大きさ（CSS px） */
export const MIN_CELL_PX = 12;
/** 下→上へ進むかかり具合のグラデーション幅（写真の高さに対する比率） */
export const GRADIENT_WIDTH = 5;
/** true でドットの間を透過する（false は黒地）。透過時は photo に渡した元写真をエフェクト範囲だけマスクで隠す */
export const TRANSPARENT_BACKGROUND = true;
/** 円の大きさ（格子に対する比率 0〜1）。1 で最も明るい所がセルを埋める。隣のセルとは重ならない。カーソルモードも同じ値を使う */
export const DOT_SCALE = 0.8;

const MASK_STEPS = 8;

/**
 * シェーダーの k(d) と同じ前線で、元写真の不透明度 1 − k を下→上のグラデーションにした mask-image。
 * 寸法は canvas の device px（rectBottom は表示領域の下端までの距離）
 */
export function scrollMask(
	shown: number,
	gradientWidth: number,
	boxHeight: number,
	rectBottom: number,
	rectHeight: number
) {
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
	return `linear-gradient(to top, ${stops.join(', ')})`;
}
