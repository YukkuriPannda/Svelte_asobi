// カーソルモード（mode="cursor"）: ポインター周囲の円形の範囲だけにエフェクトをかける。
// 効果の強さ e = clamp(ease(x), 0, 1)、x = clamp(1 − 距離 / 半径, 0, 1)（縁 0、中心 1）。ease は CURSOR_EASING の cubic-bezier。
import {
	type CubicBezier,
	cubicBezier,
	EASING_PRESETS,
} from "$lib/cubicBezier";
import { CURSOR_CURVE_STEPS, CURSOR_TRAIL_POINTS } from "./common";
import { CURSOR_TRAIL_SPACING_PX } from "./trail";

/** カーソルモードの効果範囲の半径（CSS px）。ポインターからこの距離で効果が 0 になる */
export const CURSOR_RADIUS_PX = 2000;
/** カーソルモードの縁（効果が弱い所）の格子の大きさ（CSS px） */
export const CURSOR_MIN_CELL_PX = 1;
/** カーソルモードの中心（ポインター直下）の格子の大きさ（CSS px） */
export const CURSOR_MAX_CELL_PX = 50;
/** カーソルモードの円の大きさ（格子に対する比率 0〜1） */
export const CURSOR_DOT_SCALE = 0.8;
/** カーソルモードのボケ（CSS px）。ドットの色を取る元画像のぼかし半径。格子の半分以下では効かない */
export const CURSOR_BLUR_PX = 0;
/** カーソルモードのイージング曲線（CSS の cubic-bezier(x1, y1, x2, y2) と同じ4値）。縁 0 → 中心 1 の入力 x に対する効果の強さ */
export const CURSOR_EASING: CubicBezier = EASING_PRESETS.easeInExpo;
// 移動量 m（0〜1）: カーソルの速さ / CURSOR_FULL_SPEED_PX に追従する値。半径と中心の格子に掛ける。
// 静止すると速さが 0 になり、m は追従速度に従ってゆっくり 0 へ戻る（指数的に近づく）。
/** 移動量 m が 1 になるカーソルの速さ（CSS px / 秒） */
export const CURSOR_FULL_SPEED_PX = 1500;
/** 移動量 m の追従速度（1 / 秒）。大きいほど速く追従し、静止後も速く縮む。1 秒で差が e^(−値) 倍になる */
export const CURSOR_FOLLOW_SPEED = 2;

export type Point = { x: number; y: number };

/** cursorEasing を入力 x = i / CURSOR_CURVE_STEPS（0〜1）ごとに標本化する（u_cursorCurve）。値は 0〜1 に収める */
export function sampleCursorCurve(curve: CubicBezier) {
	const ease = cubicBezier(curve);
	const table = new Float32Array(CURSOR_CURVE_STEPS + 1);
	for (let i = 0; i <= CURSOR_CURVE_STEPS; i++) {
		table[i] = Math.min(Math.max(ease(i / CURSOR_CURVE_STEPS), 0), 1);
	}
	return table;
}

/** ポインターの移動量 m と軌跡の点を、フレームごとに更新する */
export class CursorMotion {
	/** 最後にあったポインターの位置（フェードアウト中も使う） */
	lastPointer: Point = { x: 0, y: 0 };
	/** 移動量 m（0〜1）。半径と中心の格子に掛ける */
	motion = 0;
	/** 軌跡の点（CSS px、新しい順）。r は時間とともに縮む */
	trail: (Point & { r: number })[] = [];
	private hasPointer = false; // lastPointer が実際の位置か（最初の1回は移動量に数えない）
	private movedPx = 0; // 前のフレームからポインターが動いた距離（CSS px）
	private readonly trailUniform = new Float32Array(CURSOR_TRAIL_POINTS * 3);

	/** 動きが残っている間（m が 0 でない、または軌跡がある）は描画を続ける */
	get active() {
		return this.motion > 0 || this.trail.length > 0;
	}

	/** ポインターが来たときに位置と移動距離を記録する（null は無視して最後の位置を残す） */
	track(next: Point | null) {
		if (!next) return;
		if (this.hasPointer) {
			this.movedPx += Math.hypot(
				next.x - this.lastPointer.x,
				next.y - this.lastPointer.y,
			);
		}
		this.lastPointer = next;
		this.hasPointer = true;
	}

	/** dt 秒ぶん進める。速さ（移動量 / 経過時間）に m を追従させ、軌跡を縮めて新しい点を置く */
	update(
		dt: number,
		pointer: Point | null,
		radiusPx: number,
		followSpeed: number,
		trailFadeSpeed: number,
	) {
		// 静止中は速さ 0 なので m はゆっくり 0 へ戻る
		const speed = dt > 0 ? this.movedPx / dt : 0;
		this.movedPx = 0;
		const goal = Math.min(speed / Math.max(CURSOR_FULL_SPEED_PX, 1), 1);
		this.motion += (goal - this.motion) *
			(1 - Math.exp(-Math.max(followSpeed, 0) * dt));
		if (goal === 0 && this.motion < 0.001) this.motion = 0;
		this.updateTrail(dt, pointer, radiusPx * this.motion, trailFadeSpeed);
	}

	// 既存の点を縮めて小さくなったものを捨て、前の点から間隔以上進んでいれば現在の半径で点を置く
	private updateTrail(
		dt: number,
		pointer: Point | null,
		radius: number,
		fadeSpeed: number,
	) {
		const decay = Math.exp(-Math.max(fadeSpeed, 0) * dt);
		this.trail = this.trail
			.map((point) => ({ ...point, r: point.r * decay }))
			.filter((point) => point.r >= 1);
		if (fadeSpeed <= 0 || !pointer) return;
		const last = this.trail[0];
		const far = !last ||
			Math.hypot(pointer.x - last.x, pointer.y - last.y) >=
				CURSOR_TRAIL_SPACING_PX;
		if (far && radius >= 1) {
			this.trail.unshift({ x: pointer.x, y: pointer.y, r: radius });
			if (this.trail.length > CURSOR_TRAIL_POINTS) {
				this.trail.length = CURSOR_TRAIL_POINTS;
			}
		}
	}

	/** u_trail の値（gl_FragCoord と同じ左下原点の device px）。height は canvas の device px の高さ */
	trailUniforms(dpr: number, height: number) {
		this.trail.forEach((point, i) => {
			this.trailUniform[i * 3] = point.x * dpr;
			this.trailUniform[i * 3 + 1] = height - point.y * dpr;
			this.trailUniform[i * 3 + 2] = point.r * dpr;
		});
		return this.trailUniform;
	}
}
