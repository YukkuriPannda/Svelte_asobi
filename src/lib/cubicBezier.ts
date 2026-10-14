/** CSS の cubic-bezier(x1, y1, x2, y2) と同じ4値 */
export type CubicBezier = readonly [x1: number, y1: number, x2: number, y2: number];

/** よく使うイージング（CSS のキーワードと同じ値） */
export const EASING_PRESETS = {
	linear: [0, 0, 1, 1],
	ease: [0.25, 0.1, 0.25, 1],
	easeIn: [0.42, 0, 1, 1],
	easeOut: [0, 0, 0.58, 1],
	easeInOut: [0.42, 0, 0.58, 1],
	/** easings.net の easeOutExpo の cubic-bezier 近似 */
	easeOutExpo: [0.16, 1, 0.3, 1],
	/** easings.net の easeInExpo の cubic-bezier 近似 */
	easeInExpo: [0.7, 0, 0.84, 0]
} as const satisfies Record<string, CubicBezier>;

/** 0〜1 の入力を cubic-bezier で 0〜1 付近の出力へ写す関数を返す（CSS と同じ解き方） */
export function cubicBezier([rawX1, y1, rawX2, y2]: CubicBezier): (x: number) => number {
	// x は単調でなければならないため、CSS と同様に制御点の x を 0〜1 に収める
	const x1 = Math.min(Math.max(rawX1, 0), 1);
	const x2 = Math.min(Math.max(rawX2, 0), 1);
	const curve = (a: number, b: number, t: number) =>
		3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
	const slope = (a: number, b: number, t: number) =>
		3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t ** 2;

	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		// Newton法で x(t) = x となる t を求め、収束しなければ二分法に切り替える
		let t = x;
		for (let i = 0; i < 8; i++) {
			const error = curve(x1, x2, t) - x;
			if (Math.abs(error) < 1e-6) return curve(y1, y2, t);
			const d = slope(x1, x2, t);
			if (Math.abs(d) < 1e-6) break;
			t -= error / d;
		}
		let low = 0;
		let high = 1;
		t = x;
		for (let i = 0; i < 30; i++) {
			const value = curve(x1, x2, t);
			if (Math.abs(value - x) < 1e-6) break;
			if (value < x) low = t;
			else high = t;
			t = (low + high) / 2;
		}
		return curve(y1, y2, t);
	};
}
