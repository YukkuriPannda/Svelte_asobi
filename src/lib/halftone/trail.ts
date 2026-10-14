// カーソルモードの軌跡の調整値。計算は cursor.ts の CursorMotion。
// 軌跡: カーソルが通った点を残し、各点の半径を時間とともに縮めて消す。効果は全点（と現在位置）のうち最も強いものを使う。
/** 軌跡の点を置く間隔（CSS px）。カーソルがこの距離だけ進むたびに、その時点の半径で点を置く */
export const CURSOR_TRAIL_SPACING_PX = 20;
/** 軌跡が消える速さ（1 / 秒）。各点の半径は 1 秒で e^(−値) 倍になる。0 で軌跡なし */
export const CURSOR_TRAIL_FADE_SPEED = 3;
// 軌跡のドット。効果の強さ e は本体と同じ式（CURSOR_EASING）で求め、格子は縁 → 中心へ MIN → MAX に育てる。
// MAX には本体と同じく現在の移動量 m を掛ける。本体と重なる所は効果の強さ e が大きい方を使う
/** 軌跡の縁の格子の大きさ（CSS px） */
export const CURSOR_TRAIL_MIN_CELL_PX = 1;
/** 軌跡の中心の格子の大きさ（CSS px） */
export const CURSOR_TRAIL_MAX_CELL_PX = 100;
/** 軌跡の円の大きさ（格子に対する比率 0〜1） */
export const CURSOR_TRAIL_DOT_SCALE = 0.8;
/** 軌跡のボケ（CSS px）。ドットの色を取る元画像のぼかし半径。格子の半分以下では効かない */
export const CURSOR_TRAIL_BLUR_PX = 0;
