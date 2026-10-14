// ハーフトーン用の画像の取得と縮小段階（キーカラーを保持する自前の mipmap）の作成、WebGL への転送

/** true でコントラストの高いキーカラーを周りと混ぜず、縮小の最後まで1画素として残す */
export const PRESERVE_KEY_COLORS = true;
/** キーカラーとみなす、2×2の残り3画素の平均との色差（Oklab の距離。白と黒の差が 1） */
export const KEY_THRESHOLD = 0.25;

const MAX_TEXTURE_PX = 2048;

/** 縮小段階（2 の累乗で縮めた画素）。シェーダーに渡す1段階分 */
interface PreparedLevel {
	width: number;
	height: number;
	pixels: Uint8Array;
}
/** 取得と縮小が終わった画像。WebGL に転送する前の値 */
export interface PreparedImage {
	levels: PreparedLevel[];
	imageSize: { width: number; height: number };
	textureSize: { width: number; height: number };
}

// 取得・縮小した画像のキャッシュ（src → 結果）。同じ写真のタイルを繰り返しマウントしても、取得と縮小は一度だけにする
const imageCache = new Map<string, Promise<PreparedImage>>();

const SRGB_TO_LINEAR = Array.from({ length: 256 }, (_, n) => {
	const c = n / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

function toOklab(pixels: Uint8Array, count: number) {
	const lab = new Float32Array(count * 3);
	for (let n = 0; n < count; n++) {
		const r = SRGB_TO_LINEAR[pixels[n * 4]];
		const g = SRGB_TO_LINEAR[pixels[n * 4 + 1]];
		const b = SRGB_TO_LINEAR[pixels[n * 4 + 2]];
		const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
		const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
		const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
		lab[n * 3] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
		lab[n * 3 + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
		lab[n * 3 + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	}
	return lab;
}

// 1/2 ずつ縮小した全段階を作る。2×2 の中で残り3画素の平均との色差が KEY_THRESHOLD を超える画素は
// 混ぜずにそのまま親画素にし、超えなければ平均する。色差は a = 色差 / (2 × 閾値) としてアルファに入れ、
// シェーダーは a >= 0.5 の画素をキーカラーとして扱う
function buildLevels(source: Uint8ClampedArray, width: number, height: number) {
	const threshold = PRESERVE_KEY_COLORS ? KEY_THRESHOLD : Infinity;
	const levels: PreparedLevel[] = [];
	let pixels = new Uint8Array(source);
	for (;;) {
		const lab = toOklab(pixels, width * height);
		const keyness = new Float32Array(width * height);
		const nextWidth = Math.max(1, Math.floor(width / 2));
		const nextHeight = Math.max(1, Math.floor(height / 2));
		const next = new Uint8Array(nextWidth * nextHeight * 4);
		for (let by = 0; by < Math.ceil(height / 2); by++) {
			for (let bx = 0; bx < Math.ceil(width / 2); bx++) {
				const x0 = bx * 2;
				const y0 = by * 2;
				const x1 = Math.min(x0 + 1, width - 1);
				const y1 = Math.min(y0 + 1, height - 1);
				const block = [y0 * width + x0, y0 * width + x1, y1 * width + x0, y1 * width + x1];
				let best = block[0];
				for (const n of block) {
					let dl = 0;
					let da = 0;
					let db = 0;
					for (const o of block) {
						if (o === n) continue;
						dl += lab[o * 3];
						da += lab[o * 3 + 1];
						db += lab[o * 3 + 2];
					}
					const others = block.filter((o) => o !== n).length || 1;
					const distance = Math.hypot(
						lab[n * 3] - dl / others,
						lab[n * 3 + 1] - da / others,
						lab[n * 3 + 2] - db / others
					);
					keyness[n] = Math.max(keyness[n], distance);
					if (keyness[n] > keyness[best]) best = n;
				}
				// 奇数辺の端のブロックは親画素を持たない（GL の縮小サイズは切り捨て）
				if (bx >= nextWidth || by >= nextHeight) continue;
				const target = (by * nextWidth + bx) * 4;
				for (let c = 0; c < 3; c++) {
					next[target + c] =
						keyness[best] > threshold
							? pixels[best * 4 + c]
							: Math.round(
									(pixels[block[0] * 4 + c] +
										pixels[block[1] * 4 + c] +
										pixels[block[2] * 4 + c] +
										pixels[block[3] * 4 + c]) /
										4
								);
				}
			}
		}
		for (let n = 0; n < width * height; n++) {
			pixels[n * 4 + 3] = Number.isFinite(threshold)
				? Math.min(255, Math.round((keyness[n] / (2 * threshold)) * 255))
				: 0;
		}
		levels.push({ width, height, pixels });
		if (width === 1 && height === 1) return levels;
		pixels = next;
		width = nextWidth;
		height = nextHeight;
	}
}

/** 画像を取得して縮小段階を作る（WebGL は使わない） */
export async function prepareImage(url: string): Promise<PreparedImage> {
	// 画素を読むためCORS付きで取得する。別オリジンの場合、<img>がCORSなしで取得した応答
	// （Vary: Origin なし）がキャッシュされているとCORSで弾かれるため、キャッシュを通さずに取り直す。
	// 同一オリジン（一覧用サムネイルなど）はキャッシュをそのまま使う。
	const sameOrigin = new URL(url, location.href).origin === location.origin;
	const response = await fetch(url, { mode: 'cors', cache: sameOrigin ? 'default' : 'reload' });
	if (!response.ok) throw new Error(`image fetch failed: ${response.status}`);
	const image = await createImageBitmap(await response.blob());
	try {
		const scale = Math.min(1, MAX_TEXTURE_PX / Math.max(image.width, image.height));
		const resized = document.createElement('canvas');
		resized.width = Math.max(1, Math.round(image.width * scale));
		resized.height = Math.max(1, Math.round(image.height * scale));
		const context = resized.getContext('2d', { willReadFrequently: true })!;
		context.drawImage(image, 0, 0, resized.width, resized.height);
		// 縮小段階は自前で作り、キーカラーの情報をアルファに入れて転送する
		const levels = buildLevels(
			context.getImageData(0, 0, resized.width, resized.height).data,
			resized.width,
			resized.height
		);
		return {
			levels,
			imageSize: { width: image.width, height: image.height },
			textureSize: { width: resized.width, height: resized.height }
		};
	} finally {
		image.close();
	}
}

/** 同じ src の結果を使い回す（取得と縮小を省略する）。失敗した取得は残さず、次回に取り直す */
export function cachedImage(url: string): Promise<PreparedImage> {
	let prepared = imageCache.get(url);
	if (!prepared) {
		const created = prepareImage(url);
		imageCache.set(url, created);
		created.catch(() => {
			if (imageCache.get(url) === created) imageCache.delete(url);
		});
		prepared = created;
	}
	return prepared;
}

/** 縮小段階をそのまま mipmap として texture に転送する */
export function uploadLevels(
	gl: WebGL2RenderingContext,
	texture: WebGLTexture,
	levels: PreparedLevel[]
) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	// アルファはキーカラーらしさなので、乗算済みへの変換や上下反転をさせない
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	levels.forEach((level, lod) => {
		gl.texImage2D(
			gl.TEXTURE_2D,
			lod,
			gl.RGBA,
			level.width,
			level.height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			level.pixels
		);
	});
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, levels.length - 1);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
