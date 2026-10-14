// 入場演出（entrance を true にしたとき、画像の読み込み直後に一度だけ再生する）。
// 写真の上端から下端へ前線が進み、各行の局所進行度 L（0〜1）で格子・円・原画への切り替えを決める。
import { smoothstep } from './common';

/** 入場演出の長さ（ms） */
export const ENTRANCE_DURATION_MS = 500;
/** 入場演出の開始時の格子の大きさ（CSS px）。L = 0 の行の格子 */
export const ENTRANCE_CELL_START_PX = 64;
/** 入場演出の終了時の格子の大きさ（CSS px）。L = 1 の行の格子。格子は対数的に細かくなる */
export const ENTRANCE_CELL_END_PX = 12;
/** 入場演出の円の直径（CSS px）。L = 1 で最も明るい所の直径がこの値になる（格子を超えない） */
export const ENTRANCE_DOT_PX = 12;
/** 入場演出の前線の幅（写真の高さに対する比率）。小さいほど前線がはっきりし、大きいほど上から下へ緩やかに進む */
export const ENTRANCE_GRADIENT_WIDTH = 1;
/** 局所進行度 L がこの値を超えると、ドットの不透明度が下がり、原画が見えてくる（L = 1 で原画だけになる） */
export const ENTRANCE_REVEAL_START = 0.6;
/** 入場演出の原画のマスクを求める位置の数（写真の高さの分割数） */
const ENTRANCE_MASK_STEPS = 24;
/** 入場演出の読み込み待ちの間、原画を隠しておくマスク（全面透明） */
export const HIDDEN_MASK = 'linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0))';

// 入場演出の局所進行度 L（シェーダーと同じ式）から、原画の不透明度（smoothstep(REVEAL, 1, L)）を求める
function entranceReveal(pos: number, time: number) {
	const x = Math.min(
		Math.max((time * (1 + ENTRANCE_GRADIENT_WIDTH) - pos) / ENTRANCE_GRADIENT_WIDTH, 0),
		1
	);
	const local = smoothstep(x);
	return smoothstep((local - ENTRANCE_REVEAL_START) / (1 - ENTRANCE_REVEAL_START));
}

/** 入場演出中の原画の mask-image。上端 pos=0 から下端 pos=1 へ、ドットの後ろで原画を見せる */
export function entranceMask(
	boxHeight: number,
	rectBottom: number,
	rectHeight: number,
	time: number
) {
	const stops: string[] = [];
	for (let n = 0; n <= ENTRANCE_MASK_STEPS; n++) {
		const d = n / ENTRANCE_MASK_STEPS; // 下端 0 から上端 1
		const y = ((rectBottom + d * rectHeight) / boxHeight) * 100;
		stops.push(`rgba(0, 0, 0, ${entranceReveal(1 - d, time).toFixed(3)}) ${y.toFixed(3)}%`);
	}
	return `linear-gradient(to top, ${stops.join(', ')})`;
}
