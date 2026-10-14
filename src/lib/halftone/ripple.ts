// カーソルモードの波紋の調整値と計算。
import { type CubicBezier, EASING_PRESETS } from "$lib/cubicBezier";
import { CURSOR_RIPPLE_POINTS } from "./common";
import type { Point } from "./cursor";

// 波紋: カーソルの加速度が閾値を超えた瞬間に、その位置からリング状のハーフトーンを広げる。
// 加速度は平滑化した速度ベクトルの変化から求めるので、急発進・急停止・急な方向転換のどれでも出る。
// 波紋は複数の写真にまたがるので、判定は一覧（/photo）で1回だけ行い、発生位置と時刻を各写真に渡す。
// 半径は各写真が時刻から求めるため、どの写真でも同じ大きさになる。
// 進み具合 u = 経過時間 × 速度 / 限界半径（0〜1）に対して、半径 = 限界半径 × ease(u)、強さ = 1 − u。u が 1 で消える。
/** 波紋の半径が広がる速度（CSS px / 秒）。限界半径に着くまでの平均の速さで、途中の速さは CURSOR_RIPPLE_EASING で変わる */
export const CURSOR_RIPPLE_SPEED_PX = 50;
/** 波紋が出るカーソルの加速度の閾値（CSS px / 秒²）。一度出たら、加速度が閾値の半分を下回るまで次は出さない */
export const CURSOR_RIPPLE_THRESHOLD = 30000;
/** 波紋のリングの幅（CSS px） */
export const CURSOR_RIPPLE_WIDTH_PX = 120;
/** 波紋の限界半径（CSS px）。ここまで広がると消える */
export const CURSOR_RIPPLE_MAX_RADIUS_PX = 400;
/** 波紋の広がり方のイージング（cubic-bezier の4値）。進み具合 0〜1 に対する、限界半径に対する半径の比 */
export const CURSOR_RIPPLE_EASING: CubicBezier = EASING_PRESETS.easeOutExpo;
/** 波紋のリングの幅の端の格子の大きさ（CSS px） */
export const CURSOR_RIPPLE_MIN_CELL_PX = 1;
/** 波紋のリングの中心線の格子の大きさ（CSS px）。カーソルの移動量によらない */
export const CURSOR_RIPPLE_CELL_PX = 10;
/** 波紋の円の大きさ（格子に対する比率 0〜1） */
export const CURSOR_RIPPLE_DOT_SCALE = 0.8;
/** 加速度を求める前に速度を平滑化する追従速度（1 / 秒）。フレームごとの速さのばらつきを抑える */
const RIPPLE_VELOCITY_SMOOTHING = 20;
/** 波紋が出てから次の波紋を出せるまでのクールタイム（ms） */
export const CURSOR_RIPPLE_COOLDOWN_MS = 1000;

/** 波紋の中心と発生時刻（performance.now() の ms）。HalftonePhoto には写真の左上基準の CSS px で渡す */
export type CursorRipple = Point & { time: number };

/** time（ms）時点の波紋の進み具合 u（0〜1）。広がらない設定（速度・限界半径が 0 以下）では 1（消えた扱い） */
export function rippleProgress(
	ripple: CursorRipple,
	time: number,
	speedPx: number,
	maxRadiusPx: number,
) {
	if (speedPx <= 0 || maxRadiusPx <= 0) return 1;
	return Math.min(
		((Math.max(time - ripple.time, 0) / 1000) * speedPx) / maxRadiusPx,
		1,
	);
}

/** time 時点でまだ限界半径に達していない波紋か */
export function rippleAlive(
	ripple: CursorRipple,
	time: number,
	speedPx: number,
	maxRadiusPx: number,
) {
	return rippleProgress(ripple, time, speedPx, maxRadiusPx) < 1;
}

/** フレームごとの移動からカーソルの加速度を求め、波紋を出す瞬間を判定する */
export class RippleDetector {
	private velocity: Point = { x: 0, y: 0 }; // 平滑化した速度（CSS px / 秒）
	private armed = true; // 加速度が閾値の半分を下回ったら、次の波紋を出せる
	private lastSpawn = -Infinity; // 最後に波紋を出した時刻（performance.now() の ms）

	/** 平滑化した速度が残っている間は、静止した瞬間の減速を拾うためにフレームを進め続ける */
	get moving() {
		return Math.hypot(this.velocity.x, this.velocity.y) > 1;
	}

	/** ポインターが外れたときに速度を捨てる（戻ってきた位置との差を動きとして数えない） */
	reset() {
		this.velocity = { x: 0, y: 0 };
		this.armed = true;
		this.lastSpawn = -Infinity;
	}

	/** dt 秒の間に moved（CSS px）動いたとして速度を更新し、波紋を出すなら true を返す。now は現在の performance.now()（ms） */
	update(
		dt: number,
		moved: Point,
		threshold: number,
		now: number,
		cooldownMs = CURSOR_RIPPLE_COOLDOWN_MS,
	) {
		if (dt <= 0) return false;
		const previous = this.velocity;
		const follow = 1 - Math.exp(-RIPPLE_VELOCITY_SMOOTHING * dt);
		this.velocity = {
			x: previous.x + (moved.x / dt - previous.x) * follow,
			y: previous.y + (moved.y / dt - previous.y) * follow,
		};
		const acceleration =
			Math.hypot(this.velocity.x - previous.x, this.velocity.y - previous.y) /
			dt;
		if (acceleration < threshold / 2) this.armed = true;
		// クールタイム中は閾値を超えても出さない
		if (
			!this.armed || now - this.lastSpawn < cooldownMs ||
			acceleration < threshold
		) {
			return false;
		}
		this.armed = false;
		this.lastSpawn = now;
		return true;
	}
}

/** u_ripples の値（中心 x, y は gl_FragCoord と同じ左下原点の device px、半径は device px、w は強さ 0〜1）と個数 */
export function rippleUniforms(
	ripples: CursorRipple[],
	time: number,
	shape: { speedPx: number; maxRadiusPx: number; ease: (x: number) => number },
	dpr: number,
	height: number,
) {
	const values = new Float32Array(CURSOR_RIPPLE_POINTS * 4);
	let count = 0;
	for (const ripple of ripples) {
		if (count >= CURSOR_RIPPLE_POINTS) break;
		const u = rippleProgress(ripple, time, shape.speedPx, shape.maxRadiusPx);
		if (u >= 1) continue;
		const radius = shape.maxRadiusPx * Math.max(shape.ease(u), 0);
		values.set(
			[ripple.x * dpr, height - ripple.y * dpr, radius * dpr, 1 - u],
			count * 4,
		);
		count++;
	}
	return { values, count };
}
