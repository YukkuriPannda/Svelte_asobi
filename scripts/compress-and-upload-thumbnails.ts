/**
 * 既存の写真を圧縮し、<元ファイル名>_thum.jpg としてR2にアップロードするスクリプト
 *
 * 実行前に以下の環境変数を設定してください:
 *   R2_ACCOUNT_ID      - Cloudflare Account ID
 *   R2_ACCESS_KEY_ID   - R2 API Token の Access Key ID
 *   R2_SECRET_ACCESS_KEY - R2 API Token の Secret Access Key
 *   R2_BUCKET_NAME     - アップロード先のバケット名
 *
 * 実行方法:
 *   R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=yyy R2_SECRET_ACCESS_KEY=zzz R2_BUCKET_NAME=bbb npx tsx scripts/compress-and-upload-thumbnails.ts
 */

import sharp from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- 設定 ---
const THUMB_MAX_WIDTH = 800;   // サムネイルの最大横幅 (px)
const THUMB_QUALITY = 75;      // JPEG品質 (0-100)
const THUMB_SUFFIX = '_thum';  // サフィックス

// --- 環境変数チェック ---
const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`❌ 環境変数 ${key} が設定されていません`);
    process.exit(1);
  }
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// --- photo_output.json から img_path を取得 ---
const photoOutputPath = path.resolve(__dirname, '../src/lib/generated/photo_output.json');
const photos: Array<{ img_path?: string; id: string }> = JSON.parse(
  fs.readFileSync(photoOutputPath, 'utf-8')
);

const imageUrls = photos
  .map((p) => p.img_path)
  .filter((url): url is string => !!url);

console.log(`\n📷 対象画像: ${imageUrls.length} 枚\n`);

// --- URL からR2上のキー (パス) を推定 ---
function urlToR2Key(url: string): string {
  // "https://img.rhoknov.net/blog_imgs/IMG_0854.jpg" → "blog_imgs/IMG_0854.jpg"
  const parsed = new URL(url);
  return parsed.pathname.replace(/^\//, '');
}

// --- サムネイルのキーを生成 ---
function toThumbKey(originalKey: string): string {
  const ext = path.extname(originalKey);          // ".jpg"
  const base = originalKey.slice(0, -ext.length); // "blog_imgs/IMG_0854"
  return `${base}${THUMB_SUFFIX}.jpg`;             // "blog_imgs/IMG_0854_thum.jpg"
}

// --- R2上に既に存在するか確認 ---
async function existsOnR2(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// --- メイン処理 ---
async function processImage(url: string): Promise<void> {
  const originalKey = urlToR2Key(url);
  const thumbKey = toThumbKey(originalKey);
  const filename = path.basename(url);

  console.log(`▶ ${filename}`);
  console.log(`  元のキー    : ${originalKey}`);
  console.log(`  サムネキー  : ${thumbKey}`);

  // 既存チェック
  if (await existsOnR2(thumbKey)) {
    console.log(`  ⏭  既に存在するためスキップ\n`);
    return;
  }

  // 元画像をダウンロード
  console.log(`  ⬇  ダウンロード中...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // sharp で圧縮
  console.log(`  🗜  圧縮中 (max ${THUMB_MAX_WIDTH}px, quality ${THUMB_QUALITY})...`);
  const compressed = await sharp(buffer)
    .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY, progressive: true })
    .toBuffer();

  const originalKB = Math.round(buffer.byteLength / 1024);
  const compressedKB = Math.round(compressed.byteLength / 1024);
  const ratio = Math.round((1 - compressed.byteLength / buffer.byteLength) * 100);
  console.log(`  📦 ${originalKB} KB → ${compressedKB} KB (${ratio}% 削減)`);

  // R2 にアップロード
  console.log(`  ⬆  R2 へアップロード中...`);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: thumbKey,
      Body: compressed,
      ContentType: 'image/jpeg',
    })
  );

  console.log(`  ✅ 完了: ${thumbKey}\n`);
}

// --- 全画像を順番に処理 ---
(async () => {
  let successCount = 0;
  let failCount = 0;

  for (const url of imageUrls) {
    try {
      await processImage(url);
      successCount++;
    } catch (err) {
      console.error(`  ❌ エラー: ${url}`);
      console.error(`     ${err instanceof Error ? err.message : err}\n`);
      failCount++;
    }
  }

  console.log(`\n=============================`);
  console.log(`✅ 成功: ${successCount} 枚`);
  if (failCount > 0) console.log(`❌ 失敗: ${failCount} 枚`);
  console.log(`=============================\n`);

  if (failCount > 0) process.exit(1);
})();
