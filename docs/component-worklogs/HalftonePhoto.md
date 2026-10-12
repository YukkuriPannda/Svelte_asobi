# HalftonePhoto の作業記録

## 対象

- ソース: `src/lib/components/HalftonePhoto.svelte`
- 使用コンポーネント: `PhotoDetailModal`（Desktop）、`PhotoDetailModal-mobile`（Mobile）
- 使用route: `/photo/[photo_id]`（写真詳細モーダル。`/photo` 一覧からの遷移先）

## エフェクトの定義

- カラーハーフトーン: 黒地に元写真の色の丸ドットを描く。明るい所ほどドットが大きい（半径 = 0.707×セル×√輝度）。格子は45°。
- ドットが育つ: セルサイズを 2px（`MIN_CELL_PX`）から `MAX_CELL_PX`（12px、変数）まで5段階で補間し、連続的に育てる。進み具合 e が 0.05 未満の範囲では原画からクロスフェードする。
- 進み具合: `p = clamp(wheelY/1100)`（Desktop）。Mobileは `.modalcontent` のスクロール率 `scrollTop / (scrollHeight - clientHeight)` を使い、スクロールできない場合は `clamp(wheelY/1100)` にフォールバックする。
- かかり具合のグラデーション: 下から上へ前線が進む。`e(y) = smoothstep((p(1+w) − d) / w)`。`d` は下端0・上端1の位置、`w` は `GRADIENT_WIDTH`（0.3）。
- p = 0 では従来の `<img>` のみを表示する。canvasを作らず、追加の画像通信も行わない。
- 画像は `img.rhoknov.net`（Cloudflare）から取得する。このホストはCORS設定済み（2026-10-12 GETで `Access-Control-Allow-Origin` を確認。HEADでは返らない）。
- WebGL2が使えない場合、または画像の取得に失敗した場合は、元の `<img>` 表示にフォールバックする。

## props

| prop | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `src` | `string` | 必須 | 写真URL。`<img>` とは別にCORS付きで取得する |
| `progress` | `number` | `0` | 進み具合（0〜1）。0より大きくなると描画を開始する |
| `maxCellPx` | `number` | `MAX_CELL_PX`（12） | 100%時のドット格子の大きさ（CSS px） |
| `minCellPx` | `number` | `MIN_CELL_PX`（2） | 開始直後のドット格子の大きさ（CSS px） |
| `gradientWidth` | `number` | `GRADIENT_WIDTH`（0.3） | かかり具合のグラデーション幅 |

親要素は `position: relative` である必要がある（`.photo` で設定済み）。canvasは親を `position: absolute; inset: 0` で覆い、object-fit: contain の写真領域に合わせて描く。

## 使用時の注意

- 呼び出し側の `<img>` には `crossorigin` を付けない。Visualテストのfixtureは CORS ヘッダーを持たないため、`<img>` に付けると比較対象が変わる。
- `src` は `string` 型が必要。`post.img_path` は `string | undefined` のため、呼び出し側は `post.img_path ?? ''` を渡す。

## Visual検証

HalftonePhoto単体の表示バリエーションは持たない。`progress = 0` の状態は従来の `<img>` のみであり、既存の写真詳細Visual baselineで差分がないことを確認する想定。ただし2026-10-12時点では実行環境の不一致でVisualテストが開始できず、baselineとの比較は未実施（下記の作業履歴を参照）。エフェクトの見た目（p > 0）は未確認。

```powershell
npm run visual -- --grep 'component:(modal|image)$'
npm run visual -- --grep 'swipe'
npx playwright test tests/visual/photo-images.spec.ts
```

## 記録の書き方

変更内容はこのファイルに一度だけ記録し、影響したページ・props・表示状態を併記する。新しい記録は末尾へ追記する。関連コミット欄はコミット後に記入する。

## 作業履歴

### 2026-10-12 — カラーハーフトーンの描画コンポーネント追加と写真詳細モーダルへの組み込み

- 状態: 検証済み（自動テストのみ。実機・ブラウザでのエフェクト目視は未確認）
- 目的・受け入れ条件: 写真詳細モーダルで、スクロールに連動してカラーハーフトーンへ変化すること。開始時（p = 0）は従来の表示と同じであること。
- 変更内容・対象ファイル: `src/lib/components/HalftonePhoto.svelte`（新規）。`PhotoDetailModal.svelte` と `PhotoDetailModal-mobile.svelte` に組み込み（詳細は各記録を参照）。
- props・依存コンポーネントへの影響: 新規のため既存propsへの影響なし。組み込み先の `.photo` に `position: relative` を追加した。`<img>` は変更していない。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` の写真詳細モーダル（Desktop・Mobile）。p = 0 の初期表示は従来と同じ。
- 検証コマンド・結果:
  - `npm run check`: 既存の `clickToCopy.js` のimplicit anyエラー2件のみ（今回追加のエラーなし）。警告23件。（組み込み時に出た `string | undefined` の型エラー2件は `post.img_path ?? ''` で解消）
  - `npm run build`: 成功（exit 0）。
  - `npm run visual -- --grep 'component:(modal|image)$'`、`npm run visual -- --grep 'swipe'`、`npx playwright test tests/visual/photo-images.spec.ts`: いずれも開始前に `.visual/environment.mjs` の環境照合で停止（期待: Node v25.4.0・fontsSha256 `50c75fac…`、実際: Node v20.18.0・fontsSha256 `67e79a75…`）。テストは未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし。`.visual/environment.json` も変更していない。
- 未確認事項・残課題: Visualテストは環境を揃えて再実行するまで未確認。実機・ブラウザでのエフェクト目視（p > 0 の見た目、ドットの大きさ・グラデーションの進み方）は未確認。WebGL2不可時と画像取得失敗時のフォールバックは未確認。`src/lib/generated/photo_output.json` は build で再生成されると committed 版と差分が出る（`EF 50mm`→`EF-50mm` など。commit済みの生成物が古い可能性）。今回は HEAD に戻した。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — エフェクト用画像の取得をブラウザキャッシュから切り離す

- 状態: 検証済み（ヘッドレスChromiumでの撮影まで。実機・Safari・実GPUは未確認）
- 目的・受け入れ条件: スクロールしてもエフェクトが表示されない不具合を直すこと。ユーザー環境で、Consoleに `No 'Access-Control-Allow-Origin' header` と `net::ERR_FAILED` が出ていた。
- 原因: `<img>`（crossoriginなし）の応答には `Vary: Origin` が付かず、`Cache-Control: max-age=14400` でブラウザにキャッシュされる。`crossOrigin = 'anonymous'` の `Image` がこの許可ヘッダーなしのキャッシュを再利用したため、CORSで弾かれていた。サーバー（Cloudflare）は、Origin付きのGETにキャッシュHIT時も `Access-Control-Allow-Origin` を返すことをcurlで確認した。
- 変更内容・対象ファイル: `src/lib/components/HalftonePhoto.svelte`。画像の取得を `new Image()` から `fetch(url, { mode: 'cors', cache: 'reload' })` と `createImageBitmap` に変更した。
- props・依存コンポーネントへの影響: なし。
- 影響するページ・表示バリエーション: 写真詳細モーダルの p > 0 の状態。p = 0 は変わらない。
- 検証コマンド・結果: 実装担当（Haiku 5.5）が実施した。`npm run visual` 全件 93 passed（修正後に再実行）。一時スクリプト（リポジトリ外）で、Desktop 1440×900（gakusou・rot）の 0 / 約27 / 約55 / 100% と、Mobile 390×844（gakusou）の 50 / 100% を撮影した。canvasが生成され、Consoleに `HalftonePhoto: effect disabled` が出ないことを確認した。親Agentも撮影画像を目視し、下から上へのグラデーション、45°格子、明るい所ほど大きいドットを確認した。
- Visual Diffの確認・baseline更新の有無: p = 0 のbaselineに差分はなく、更新なし。
- 未確認事項・残課題: 実機・Safari・実GPUでの描画は未確認。WebGL2が使えない場合のフォールバックも未確認。Mobileの100%は写真が画面外にあるため、視認できない。ユーザー環境での修正後の再確認は未実施。
- 関連コミット・PR: 未コミット。
