// カーソルモード（mode="cursor"）: ポインター周囲の円形の範囲だけにエフェクトをかける。
// 効果の強さ e = clamp(ease(x), 0, 1)、x = clamp(1 − 距離 / 半径, 0, 1)（縁 0、中心 1）。ease は CURSOR_EASING の cubic-bezier。
import {
	type CubicBezier,
	cubicBezier,
	EASING_PRESETS,
} from "$lib/cubicBezier";
import {
	CURSOR_CURVE_STEPS,
	CURSOR_RIPPLE_POINTS,
	CURSOR_TRAIL_POINTS,
} from "./common";

/** カーソルモードの効果範囲の半径（CSS px）。ポインターからこの距離で効果が 0 になる */
export const CURSOR_RADIUS_PX = 2000;
/** カーソルモードの縁（効果が弱い所）の格子の大きさ（CSS px） */
export const CURSOR_MIN_CELL_PX = 1;
/** カーソルモードの中心（ポインター直下）の格子の大きさ（CSS px） */
export const CURSOR_MAX_CELL_PX = 50;
/** カーソルモードのイージング曲線（CSS の cubic-bezier(x1, y1, x2, y2) と同じ4値）。縁 0 → 中心 1 の入力 x に対する効果の強さ */
export const CURSOR_EASING: CubicBezier = EASING_PRESETS.easeInExpo;
// 移動量 m（0〜1）: カーソルの速さ / CURSOR_FULL_SPEED_PX に追従する値。半径と中心の格子に掛ける。
// 静止すると速さが 0 になり、m は追従速度に従ってゆっくり 0 へ戻る（指数的に近づく）。
/** 移動量 m が 1 になるカーソルの速さ（CSS px / 秒） */
export const CURSOR_FULL_SPEED_PX = 1500;
/** 移動量 m の追従速度（1 / 秒）。大きいほど速く追従し、静止後も速く縮む。1 秒で差が e^(−値) 倍になる */
export const CURSOR_FOLLOW_SPEED = 2;
// 軌跡: カーソルが通った点を残し、各点の半径を時間とともに縮めて消す。効果は全点（と現在位置）のうち最も強いものを使う。
/** 軌跡の点を置く間隔（CSS px）。カーソルがこの距離だけ進むたびに、その時点の半径で点を置く */
export const CURSOR_TRAIL_SPACING_PX = 40;
/** 軌跡が消える速さ（1 / 秒）。各点の半径は 1 秒で e^(−値) 倍になる。0 で軌跡なし */
export const CURSOR_TRAIL_FADE_SPEED = 3;
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
/** 波紋のリングの中心線の格子の大きさ（CSS px）。カーソルの移動量によらない */
export const CURSOR_RIPPLE_CELL_PX = 48;
/** 加速度を求める前に速度を平滑化する追従速度（1 / 秒）。フレームごとの速さのばらつきを抑える */
const RIPPLE_VELOCITY_SMOOTHING = 20;
/** 波紋が出てから次の波紋を出せるまでのクールタイム（ms） */
export const CURSOR_RIPPLE_COOLDOWN_MS = 1000;

type Point = { x: number; y: number };
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
