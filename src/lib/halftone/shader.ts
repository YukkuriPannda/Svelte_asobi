// 全モード共通の WebGL2 プログラム（フルスクリーン三角形 + カラーハーフトーンのフラグメントシェーダー）
import { CURSOR_CURVE_STEPS, CURSOR_RIPPLE_POINTS, CURSOR_TRAIL_POINTS, FADE } from './common';
import { ENTRANCE_REVEAL_START } from './entrance';

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
uniform float u_transparent; // 1.0 でドットの間を透過する
uniform float u_dotScale; // 円の大きさ（格子に対する比率 0〜1）
uniform float u_maxLod;
uniform float u_entrance; // 1.0 で入場演出（u_progress は演出の時間 0〜1 として使う）
uniform float u_entranceCoarse; // 入場演出の開始時の格子（device px）
uniform float u_entranceFine; // 入場演出の終了時の格子（device px）
uniform float u_entranceDot; // 入場演出の円の直径（device px）
uniform float u_entranceWidth; // 入場演出の前線の幅
uniform float u_mode; // 0.0 はスクロール（下端からの前線）、1.0 はカーソル（ポインター周りの円）
uniform vec2 u_pointer; // カーソル位置（gl_FragCoord と同じ左下原点の device px）
uniform float u_cursorRadius; // カーソルモードの効果半径（device px）
uniform vec3 u_trail[${CURSOR_TRAIL_POINTS}]; // 軌跡の点 x, y（u_pointer と同じ座標系）, 半径（device px）
uniform int u_trailCount;
uniform vec4 u_ripples[${CURSOR_RIPPLE_POINTS}]; // 波紋の中心 x, y（u_pointer と同じ座標系）, 半径（device px）, 強さ 0〜1
uniform int u_rippleCount;
uniform float u_rippleWidth; // 波紋のリングの幅（device px）
uniform vec4 u_cursorDots; // カーソル本体のドット: 縁の格子, 中心の格子（device px、移動量 m を掛けた値）, 円の大きさ（格子に対する比率）, ボケ（色を取る元画像のぼかし半径、device px）
uniform vec4 u_trailDots; // 軌跡のドット（並びは u_cursorDots と同じ）
uniform vec4 u_rippleDots; // 波紋のドット: 幅の端の格子, リングの中心線の格子（device px）, 円の大きさ, ボケ
uniform float u_cursorCurve[${CURSOR_CURVE_STEPS + 1}]; // 効果の強さの表（入力 x = i / ${CURSOR_CURVE_STEPS} に対する e。cursorEasing を標本化）
out vec4 outColor;

const float FADE = ${FADE.toFixed(4)};
const float ANGLE = 0.78539816; // 網点格子の傾き 45°
const float ENTRANCE_REVEAL = ${ENTRANCE_REVEAL_START.toFixed(4)};

float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// 縮小段階 lod の 2×2 を補間せずに読み、キーカラー（a >= 0.5）があればその色、なければ平均を返す
vec3 cellColor(vec2 uv, float lod) {
	int level = int(clamp(floor(lod + 0.5), 0.0, u_maxLod));
	ivec2 size = textureSize(u_tex, level);
	ivec2 base = ivec2(floor(uv * vec2(size) - 0.5));
	vec3 sum = vec3(0.0);
	vec4 key = vec4(0.0);
	for (int j = 0; j < 2; j++) {
		for (int i = 0; i < 2; i++) {
			vec4 texel = texelFetch(u_tex, clamp(base + ivec2(i, j), ivec2(0), size - 1), level);
			sum += texel.rgb;
			if (texel.a > key.a) key = texel;
		}
	}
	return key.a >= 0.499 ? key.rgb : sum * 0.25;
}

// 乗算済みアルファのドット（rgb = 色 × 被覆率、a = 被覆率）
// maxRadius は最も明るい所の円の半径
// blur は色を取る元画像のぼかし半径（device px）。格子の半分より大きいと、より粗い縮小段階から読む
vec4 halftone(vec2 p, float cell, float maxRadius, float blur) {
	mat2 rot = mat2(cos(ANGLE), sin(ANGLE), -sin(ANGLE), cos(ANGLE));
	vec2 q = rot * p / cell;
	vec2 center = floor(q) + 0.5;
	vec2 centerPx = transpose(rot) * center * cell;
	vec2 uv = clamp(vec2(centerPx.x / u_rect.z, 1.0 - centerPx.y / u_rect.w), 0.0, 1.0);
	float lod = log2(max(max(cell * 0.5, blur) * u_texScale, 1.0));
	// 段階の境目で色が飛ばないよう、隣り合う2段階を混ぜる（ボケが無い所は従来どおり1段階）
	vec3 color = blur > cell * 0.5
		? mix(cellColor(uv, floor(lod)), cellColor(uv, floor(lod) + 1.0), fract(lod))
		: cellColor(uv, lod);
	// 黒地に明るい所ほど大きいドット
	float radius = maxRadius * sqrt(luminance(color));
	float dist = length(q - center) * cell;
	float coverage = 1.0 - smoothstep(radius - 0.75, radius + 0.75, dist);
	return vec4(color * coverage, coverage);
}

// 効果の強さ e に応じて、格子を minCell → maxCell の LEVELS 段階で育てる（隣接段階を混ぜて連続にする）
vec4 levelDots(vec2 p, float e, float minCell, float maxCell, float dotScale, float blur) {
	float s = e * u_levels;
	float i = floor(s);
	float ratio = maxCell / minCell;
	float cellA = minCell * pow(ratio, i / u_levels);
	float cellB = minCell * pow(ratio, min(i + 1.0, u_levels) / u_levels);
	return mix(
		halftone(p, cellA, 0.70710678 * cellA * dotScale, blur),
		halftone(p, cellB, 0.70710678 * cellB * dotScale, blur),
		s - i
	);
}

// x（縁 0 → 中心 1）を表（cursorEasing を標本化）で線形補間して e にする
float cursorEase(float x) {
	float f = x * ${CURSOR_CURVE_STEPS}.0;
	int idx = min(int(floor(f)), ${CURSOR_CURVE_STEPS - 1});
	return clamp(mix(u_cursorCurve[idx], u_cursorCurve[idx + 1], f - float(idx)), 0.0, 1.0);
}

void main() {
	vec2 p = gl_FragCoord.xy - u_rect.xy;
	if (any(lessThan(p, vec2(0.0))) || any(greaterThanEqual(p, u_rect.zw))) {
		outColor = vec4(0.0);
		return;
	}
	if (u_entrance > 0.5) {
		// 入場演出: 上端 pos=0 から下端 pos=1 へ前線が進む。局所進行度 L で格子を粗い方から細かくし、円を 0 から大きくする。
		// 原画の見せる割合は smoothstep(ENTRANCE_REVEAL, 1, L)。ドットはその残り（1 - 原画）で消していく。
		float pos = 1.0 - p.y / u_rect.w;
		float L = smoothstep(0.0, 1.0, (u_progress * (1.0 + u_entranceWidth) - pos) / u_entranceWidth);
		float fade = 1.0 - smoothstep(ENTRANCE_REVEAL, 1.0, L);
		if (L <= 0.0 || fade <= 0.0) {
			outColor = vec4(0.0);
			return;
		}
		float cell = u_entranceCoarse * pow(u_entranceFine / u_entranceCoarse, L);
		// 円は格子を超えない（半径は格子の半分まで）
		vec4 entranceDots = halftone(p, cell, min(0.5 * u_entranceDot * L, 0.5 * cell), 0.0);
		outColor = entranceDots * fade;
		return;
	}
	// 効果の強さ e（0〜1）と表示の強さ strength。スクロールは下端 d=0 から上端 d=1 へ前線が進む
	float e;
	float strength = 1.0;
	vec4 dots = vec4(u_minCell, u_maxCell, u_dotScale, 0.0);
	if (u_mode > 0.5) {
		// カーソル: 本体・軌跡・波紋はそれぞれ別のドットの設定を持ち、効果の強さ e が最も大きいものを使う（格子の大きさで比べると、格子の小さい設定が常に負けて見えなくなる）。出入りは u_progress（スムージング値）で掛ける
		// u_pointer は gl_FragCoord と同じ座標系なので、p ではなく gl_FragCoord.xy と比べる
		e = cursorEase(clamp(1.0 - length(gl_FragCoord.xy - u_pointer) / u_cursorRadius, 0.0, 1.0));
		dots = u_cursorDots;
		// 軌跡: 各点も本体と同じ式で求め、最も強い点を使う
		float tx = 0.0;
		for (int t = 0; t < ${CURSOR_TRAIL_POINTS}; t++) {
			if (t >= u_trailCount) break;
			vec3 point = u_trail[t];
			tx = max(tx, clamp(1.0 - length(gl_FragCoord.xy - point.xy) / point.z, 0.0, 1.0));
		}
		float te = cursorEase(tx);
		if (te > e) {
			e = te;
			dots = u_trailDots;
		}
		// 波紋: リングの中心線で 1、幅の端で 0。カーソルのイージングは通さない
		for (int r = 0; r < ${CURSOR_RIPPLE_POINTS}; r++) {
			if (r >= u_rippleCount) break;
			vec4 ripple = u_ripples[r];
			float ring = 1.0 - abs(length(gl_FragCoord.xy - ripple.xy) - ripple.z) / (0.5 * u_rippleWidth);
			float re = smoothstep(0.0, 1.0, ring) * ripple.w;
			if (re > e) {
				e = re;
				dots = u_rippleDots;
			}
		}
		strength = u_progress;
	} else {
		float d = p.y / u_rect.w;
		e = smoothstep(0.0, 1.0, (u_progress * (1.0 + u_width) - d) / u_width);
	}
	if (e <= 0.0) {
		outColor = vec4(0.0);
		return;
	}
	vec4 dotColor = levelDots(p, e, dots.x, dots.y, dots.z, dots.w);
	float k = clamp(e / FADE, 0.0, 1.0) * strength;
	// 黒地はセル全体を不透明にし、透過時はドットの被覆率だけを残す
	outColor = vec4(dotColor.rgb, mix(1.0, dotColor.a, u_transparent)) * k;
}`;

function compile(context: WebGL2RenderingContext, type: number, source: string) {
	const shader = context.createShader(type)!;
	context.shaderSource(shader, source);
	context.compileShader(shader);
	if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
		throw new Error(context.getShaderInfoLog(shader) ?? 'shader compile failed');
	}
	return shader;
}

/** canvas に WebGL2 のプログラムと全面を覆う三角形を用意する。使えなければ例外を投げる */
export function createHalftoneProgram(target: HTMLCanvasElement) {
	const gl = target.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
	if (!gl) throw new Error('WebGL2 is not available');
	const program = gl.createProgram()!;
	gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
	gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error(gl.getProgramInfoLog(program) ?? 'program link failed');
	}
	gl.useProgram(program);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const position = gl.getAttribLocation(program, 'a_pos');
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
	return { gl, program };
}
