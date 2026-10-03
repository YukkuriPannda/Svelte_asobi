# Visual Regression

既存の4静的ページ・7記事・8写真詳細をmanifestから81テストで検証する。写真詳細URLは実際のクライアント遷移後のDesktopモーダル初期状態を撮影する。コンポーネントは実ページ内の要素を切り出すため、親ページのCSSも検証対象。

## 実行

```powershell
npm ci
npx playwright install chromium
npm run visual
npm run visual:report
```

HTML reportで失敗対象のexpected / actual / diffとtraceを確認する。生画像・JSONは`.visual/results/`。Agentへ渡すのは失敗対象の画像だけでよい。通常実行はbaselineを自動生成・更新しない。

```powershell
npm run visual -- --grep 'page:home '
npm run visual -- --grep 'component:header'
npm run visual -- --grep 'page:blog .*component:dashboard'
npm run visual:update -- --grep 'page:home '
# 意図した全体変更
npm run visual:update
```

更新後は画像diffをレビューし、baseline・manifest・fixtureをソースと一緒に管理する。

## 構造

- `manifest.json`: version / environment / stabilization / pages。pagesはid、routeパターン、具体的なurl、readyセレクタ、components（id / selector / source）。写真はfinalUrlとstateも記録。
- `baselines/desktop-chromium-win32/<page-id>-page.png`: fullPage基準画像。
- 同ディレクトリの`<page-id>-<component-id>.png`（PlaywrightがIDの記号をハイフンに正規化）: コンポーネント基準画像。
- `assets.json`と`assets/`: 初回に保存した外部画像29件。通常実行では外部ネットワークから取得しない。
- `environment.json`と`environment.mjs`: Node / Windows release / Playwright / Windowsフォントのハッシュを照合。不一致は更新時も停止する。
- Playwright 1.56.1 / bundled Chromium 141.0.7390.37 build1194、1440×900、DPR1、ja-JP、Asia/Tokyo、headless、1 worker。

日時・乱数固定、animation/transition停止、画像とfont読み込み待ち。外部script/iframe/media通信は空レスポンスに固定し、iframe/audio/video表示を隠す。Twitter欄は埋め込み前のリンク状態を比較する。元から画像srcが未指定の箇所や存在しないローカル素材はアプリの現状として記録する。外部サービス自身のUI、動画・音声内容、Mobile、写真のホイール操作後の各状態は今回のDesktop baselineの対象外。

新規ページ・新規IDはmanifestに追加する。環境を移行する場合は固定環境を意図的に作り直し、environment.jsonを再採取したうえで全baselineを再生成する。`setup.mjs`は初回探索用のmanifest/fixture生成スクリプトで、通常の差分確認やbaseline更新には実行しない（実行すると外部画像も再取得する）。

比較方式: [Playwright公式 Visual comparisons](https://playwright.dev/docs/test-snapshots)。

外部GIF fixtureは先頭フレームのPNGへ変換済み（animation停止だけではGIFを止められないため）。初回setup.mjsを再実行する場合はffmpegが必要（VISUAL_FFMPEGで実行ファイル指定可）。
検証時のnpm run checkには既存clickToCopy.jsのimplicit anyエラー2件がある。

初回受け入れ確認（2026-10-03）: baseline生成81/81成功、通常比較81/81成功。ヘッダー背景を一時的に赤へ変更した検証で1件失敗しexpected / actual / diff生成を確認、変更を戻して全件再確認済み。

## 写真のタッチ操作回帰テスト

`npm run visual -- --grep 'swipe'` で `tests/visual/photo-swipe.spec.ts` の5件を実行する。Desktopの画像比較とは別に、390×844・Android UA・ChromiumのCDPタッチ入力で、左右切り替え、縦スクロール、短い移動、キャンセル、複数指、一覧の両端、URL同期、切り替え後のタップ閉鎖を確認する。通常のアニメーションでは指追従、左右のスライド、端での戻り、切り替え中の追加入力の抑制を検証し、動きを減らす設定ではスライドが生成されないことも確認する。次の通常操作はスライドと戻りが終わった後に送る。モバイルのスクリーンショットは `.visual/results/photo-swipe-mobile.png` と `.visual/results/photo-swipe-drag.png` に保存するが、baseline比較には含めない。物理端末・Safariの検証結果とは区別する。