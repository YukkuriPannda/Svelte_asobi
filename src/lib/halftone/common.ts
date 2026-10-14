// 各モードとシェーダーで共有する値

/** セルサイズの段階数。隣接段階を混ぜて連続的に育てる */
export const LEVELS = 5;
/** 原画からクロスフェードする範囲（シェーダーと同じ値） */
export const FADE = 0.05;
/** 軌跡として残す点の最大数（u_trail の長さ） */
export const CURSOR_TRAIL_POINTS = 32;
/** カーソルモードの効果の強さの表の分割数（入力 x を 1/32 刻みで標本化する） */
export const CURSOR_CURVE_STEPS = 32;

export function smoothstep(x: number) {
	const t = Math.min(Math.max(x, 0), 1);
	return t * t * (3 - 2 * t);
}
