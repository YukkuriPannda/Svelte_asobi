# HalftonePhoto の作業記録

## 対象

- ソース: `src/lib/components/HalftonePhoto.svelte`
- 使用コンポーネント: `PhotoDetailModal-mobile`（Mobileのみ。Desktopの `PhotoDetailModal` からは外した）
- 使用route: `/photo/[photo_id]`（写真詳細モーダル。`/photo` 一覧からの遷移先）

## エフェクトの定義

- カラーハーフトーン: 黒地に元写真の色の丸ドットを描く。明るい所ほどドットが大きい（半径 = 0.707×セル×√輝度）。格子は45°。
- ドットが育つ: セルサイズを 2px（`MIN_CELL_PX`）から `MAX_CELL_PX`（12px、変数）まで5段階で補間し、連続的に育てる。進み具合 e が 0.05 未満の範囲では原画からクロスフェードする。
- 進み具合: `p = .modalcontent` のスクロール率 `scrollTop / (scrollHeight - clientHeight)`（0〜1）。スクロールできない場合は 0。
- スクロールとの対応: `かかり具合 = EFFECT_EASING(clamp(p / EFFECT_END, 0, 1))`。`EFFECT_EASING` は CSS の `cubic-bezier(x1, y1, x2, y2)` と同じ4値で、`src/lib/cubicBezier.ts` の `EASING_PRESETS`（linear / ease / easeIn / easeOut / easeInOut / easeOutExpo）か任意の値を指定する。`EFFECT_END` は、スクロール全体のうちエフェクトが100%に達する地点（0〜1）。現在の設定は easeOutExpo（`[0.16, 1, 0.3, 1]`）・1。
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
| `easing` | `CubicBezier` | `EFFECT_EASING`（easeOutExpo） | スクロールに対するイージング曲線（cubic-bezier の4値） |
| `end` | `number` | `EFFECT_END`（1） | エフェクトが100%に達するスクロール地点（0〜1） |

親要素は `position: relative` または `sticky` である必要がある（Mobileの `.photo` は sticky）。canvasは親を `position: absolute; inset: 0` で覆い、object-fit: contain の写真領域に合わせて描く。

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

### 2026-10-12 — スクロールに対する変化をイージングと終点で定義できるようにする

- 状態: 検証済み（自動テストと数値確認のみ。ブラウザでの見た目は未確認）
- 目的・受け入れ条件: スクロールに対するエフェクトの変化を、イージング曲線（cubic-bezier の4値）と、冒頭から何%の地点で完了するか、の2つの値で定義できること。既定値では変更前と同じ動きになること。
- 変更内容・対象ファイル: `src/lib/cubicBezier.ts` を新規作成した（`CubicBezier` 型、`EASING_PRESETS`、CSS と同じ解き方の `cubicBezier()`）。`HalftonePhoto.svelte` に定数 `EFFECT_EASING`・`EFFECT_END` と props `easing`・`end` を追加し、`progress` を変換した値でスムージングと描画を行うようにした。
- props・依存コンポーネントへの影響: props `easing`・`end` を追加した（省略可）。呼び出し側（PhotoDetailModal・PhotoDetailModal-mobile）は変更していない。PC版・スマホ版とも、定数で指定した値が使われる。
- 影響するページ・表示バリエーション: 写真詳細モーダルの p > 0 の状態。既定値は linear・1 なので、見た目は変わらない。
- 検証コマンド・結果:
  - `npm run check`: 既存の `clickToCopy.js` の2件のみで、今回追加したエラーはない。
  - `npx tsx` で `cubicBezier` の値を確認した。ease(0.5)=0.8024、easeInOut(0.25)=0.1292、easeInOut(0.5)=0.5000、linear(0.3)=0.3000 で、CSS の値と一致した。
  - `npm run visual -- --grep 'component:(modal|image)$'`（Node v25.4.0）: 18 passed。
- Visual Diffの確認・baseline更新の有無: 差分なし。更新なし。
- 未確認事項・残課題: 既定値以外（例: easeInOut・0.6）の見た目は、ブラウザでは未確認。y が 0〜1 を超える曲線（オーバーシュート）では、かかり具合が 1 を超える。その場合は描画側で飽和するだけで、ドットが逆に戻る動きにはならない。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — スクロールに対するイージングを easeOutExpo にする

- 状態: 実装（自動テストのみ。ブラウザでの見た目は未確認）
- 目的・受け入れ条件: ユーザーの指定により、スクロールに対するエフェクトの変化を easeOutExpo にすること。
- 変更内容・対象ファイル: `src/lib/cubicBezier.ts` の `EASING_PRESETS` に `easeOutExpo: [0.16, 1, 0.3, 1]`（easings.net の cubic-bezier 近似）を追加した。`HalftonePhoto.svelte` の `EFFECT_EASING` を `EASING_PRESETS.easeOutExpo` に変更した。`EFFECT_END` は 1 のまま。
- props・依存コンポーネントへの影響: なし（既定値の変更のみ）。
- 影響するページ・表示バリエーション: 写真詳細モーダルの p > 0 の状態。スクロールの序盤で急にかかり、終盤はゆっくり100%に近づく。p = 0 は変わらない。
- 検証コマンド・結果: `npm run check` は既存の `clickToCopy.js` の2件のみ。`cubicBezier(easeOutExpo)` の値: 0.05→0.281、0.1→0.494、0.25→0.826、0.5→0.972、0.75→0.998。
- Visual Diffの確認・baseline更新の有無: p = 0 のbaselineは対象外の変更のため、更新なし。
- 未確認事項・残課題: ブラウザでの見た目は未確認。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — モバイル限定化・文章を写真の上に重ねる表示（sticky）

- 状態: 検証済み（Visualの自動テストと Chromium での撮影。実機・Safari・実GPUは未確認）
- 目的・受け入れ条件: エフェクトをモバイルだけにし、PCでは行わないこと。モバイルでは写真を上端に固定し、文章がドット化した写真の上にせり上がって重なること。冒頭は写真だけが見え、100%で写真全体がドット化していること。
- 変更内容・対象ファイル: `PhotoDetailModal.svelte` から HalftonePhoto の import・配置と `effectProgress` を外した（呼び出しは Mobile のみ）。`PhotoDetailModal-mobile.svelte` の `.photo` を `position: sticky; top: 0` にし、進み具合を実スクロール率のみにした（wheelY フォールバック削除）。`HalftonePhoto.svelte` はコメント文言のみ変更（コード・定数値は未変更。ユーザーの未コミット値 MAX_CELL_PX=64、MIN_CELL_PX=12、easeOutExpo を保持）。
- props・依存コンポーネントへの影響: HalftonePhoto の props は変更なし。呼び出し側は Mobile の1箇所のみ。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細。PCの写真詳細はエフェクトなし（baseline の初期表示と同じ）。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: エラー2件（`clickToCopy.js` の implicit any、既存）、警告23件。今回追加のエラーなし。
  - `npm run visual -- --grep 'component:(modal|image)$'`: 18 passed。
  - `npm run visual -- --grep 'swipe'`: 5 passed。
  - `npx playwright test tests/visual/photo-images.spec.ts`: 3 passed。
  - 撮影（390×844 Mobile、`/photo/gakusou` と `/photo/rot`、scrollTop 0/25/50/75/100%）: 写真の top は常に 28px で固定。0%は写真のみ（ドットなし）。25%以降は文章が下から入って写真に重なり、読める。100%で写真全体がドット化。pageerror なし。WebGL のソフトウェア描画の警告のみ。
  - 撮影（PC 1440×900、`/photo/gakusou` をホイールで最後まで）: `.halftone` なし。
- Visual Diffの確認・baseline更新の有無: 差分なし。baseline更新なし。
- 未確認事項・残課題: 実機（iOS Safari・Android Chrome）でのタッチスクロールとsticky の挙動は未確認。`rot` の 0%・25%・75% は撮影のみで目視は未実施。`GRADIENT_WIDTH` が未コミットの変更で 5 になっている（記録の既定値 0.3 と異なる）。意図どおりか確認が必要。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — エフェクト用画像を一覧用サムネイルに変更

- 状態: 実装（型チェックのみ。Visual・ブラウザは未確認）
- 目的・受け入れ条件: ハーフトーンの反映が遅い問題を減らすこと。元画像（4〜12MB）を毎回キャッシュなしで取り直していたのが主因。
- 変更内容・対象ファイル: `PhotoDetailModal-mobile.svelte` で `src` を `photoThumbnailUrl(post.id)`（`static/photo-thumbnails/<id>.webp`、長辺768px・20〜30KB程度、同一オリジン）に変更。`HalftonePhoto.svelte` は、同一オリジンのURLでは `cache: 'default'` で取得するようにした（一覧で読み込み済みのサムネイルをそのまま使う）。別オリジンは従来どおり `cache: 'reload'`。
- props・依存コンポーネントへの影響: props の型は変更なし。`src` には同一オリジンかCORS許可済みのURLを渡す。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細の p > 0 の状態。
- 検証コマンド・結果: `npm run check`（Node v20.18.0）はエラー2件（既存の `clickToCopy.js` の implicit any）・警告23件で、今回追加したエラーはない。`npm run visual -- --grep 'component:(modal|image)$'` と `npx playwright test tests/visual/photo-images.spec.ts` は、この環境に Node v25.4.0 がないため未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし（p = 0 では canvas を作らないため、初期表示は変わらない想定）。
- 未確認事項・残課題: ブラウザ・実機での読み込み速度と見た目（解像度の低下が目立たないか）は未確認。サムネイルのない写真（`npm run photos:thumbnails` 未実行）は404でエフェクトなしにフォールバックする。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — ドットの間（背景）を透過できるようにする

- 状態: 実装（型チェックのみ。Visual・ブラウザは未確認）
- 目的・受け入れ条件: ドットレンダリングの背景（ドットの間の黒地）を透過できること。透過した部分から元写真が見えないこと。
- 変更内容・対象ファイル: `HalftonePhoto.svelte` に定数 `TRANSPARENT_BACKGROUND`（true）と props `transparent`・`photo` を追加した。シェーダーのドットを乗算済みアルファ（a = 被覆率）で返すようにし、透過時はドット以外を alpha 0 にする。黒地（false）は従来と同じ出力。透過時は、`photo` に渡した要素に `mask-image`（`-webkit-` 付き）を設定し、エフェクトがかかった範囲を隠す。マスクは、シェーダーと同じ前線 `k(d) = clamp(smoothstep(x)/FADE)` から、下→上の linear-gradient として毎フレーム計算する。進み具合が 0 のとき、画像取得の失敗時、破棄時にはマスクを外す。`PhotoDetailModal-mobile.svelte` は `<img>` を `bind:this` して `photo` に渡す。
- props・依存コンポーネントへの影響: `transparent`（既定 `TRANSPARENT_BACKGROUND` = true）と `photo`（省略可）を追加した。`photo` を渡さずに透過すると、ドットの間から元写真が見える。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細の p > 0 の状態。ドットの間から、モーダルの背後が見える。p = 0 は変わらない（canvas・マスクなし）。
- 検証コマンド・結果: `npm run check`（Node v20.18.0）はエラー2件（既存の `clickToCopy.js` の implicit any）、警告23件。今回追加したエラーはない。`npm run visual -- --grep 'component:(modal|image)$'` は `.visual/environment.mjs` の環境照合で停止した（Node v20.18.0。期待値は v25.4.0）。テストは未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし。
- 未確認事項・残課題: ブラウザ・実機での見た目は未確認（マスクの境界とクロスフェードのずれ、iOS Safari の `-webkit-mask-image`）。背後の色は呼び出し側の背景に依存する。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — コントラストの高いキーカラーを縮小の最後まで1画素として保持

- 状態: 実装（型チェックのみ。Visual・ブラウザは未確認）
- 目的・受け入れ条件: 色の差が大きい画素（キーカラー）を周りと混ぜず、縮小の最後まで1画素として残すこと。ドットの色にキーカラーが反映されること。Visualの既存baselineに影響しないこと（未確認）。
- 判定方法: 2×2 の中の各画素について、残り3画素の平均との Oklab 色差を求める。最大の色差が `KEY_THRESHOLD`（0.25）を超えた画素をキーカラーとして、親画素にそのまま採用する。超えなければ4画素の平均を採用する。色差だけで判定するため、明暗の境目も対象になる（ユーザーの選択）。ドットの大きさは従来どおり明るさで決まる（ユーザーの選択）。
- 変更内容・対象ファイル: `src/lib/components/HalftonePhoto.svelte` のみ。
  - 縮小段階（元サイズから 1×1 まで）を `buildLevels` で自前に作る。色差は a = 色差 / (2 × 閾値) としてアルファに入れ、シェーダーは a >= 0.5 の画素をキーカラーとして扱う。
  - シェーダーの `cellColor(uv, lod)` は、`textureLod` の代わりに `texelFetch` で 2×2 を補間なしに読む。キーカラーがあればその色、なければ平均を返す。
  - 転送は `texImage2D` を段階ごとに行う。`UNPACK_PREMULTIPLY_ALPHA_WEBGL` と `UNPACK_FLIP_Y_WEBGL` は false、`UNPACK_ALIGNMENT` は 1。フィルタは `NEAREST_MIPMAP_NEAREST` / `NEAREST`、`TEXTURE_MAX_LEVEL` は段階数 − 1。
  - 段階数 − 1 を `maxLod` に保存し、`draw()` で `u_maxLod` に渡す。同じテクスチャへ全段階を上書きするため、再読み込み時に古い段階は残らない。
  - 2D canvas は `willReadFrequently: true` で作り、`getImageData` で画素を読む。
- props・依存コンポーネントへの影響: なし。`PRESERVE_KEY_COLORS`（true）と `KEY_THRESHOLD`（0.25）は module script の定数で、props には追加していない。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細の p > 0 の状態。p = 0 は canvas を作らないため変わらない想定。
- 検証コマンド・結果:
  - `npm run check`（Node v20.18.0）: エラー2件（既存の `clickToCopy.js` の implicit any）、警告23件。今回追加したエラーはない。HalftonePhoto に関する指摘もない。
  - `npm run build`: 未実行（ロジックの変更のみで、ビルド確認は今回の依頼範囲外）。
  - `npm run visual`: この環境の Node が v20.18.0（必要なのは v25.4.0）のため未実行。
- Visual Diffの確認・baseline更新の有無: 未実施。baseline更新なし。
- 未確認事項・残課題: ブラウザ・実GPUでの描画は未確認。WebGL2 の `texelFetch` と多段階の `texImage2D` が対象環境で動くかは未確認。キーカラーの閾値（0.25）と、明暗の境目までキーカラーにすることの見た目は未確認。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — 円の大きさを格子の大きさから分離

- 状態: 実装（型チェックのみ。Visual・ブラウザは未確認）
- 目的・受け入れ条件: 格子（セル）の大きさと円（ドット）の大きさを別々に調整できること。円の大きさは格子に対する比率（0〜1）で指定し、円は隣のセルと重ならないこと。既定値 1 では、これまでと同じ見た目になること。
- 変更内容・対象ファイル: `src/lib/components/HalftonePhoto.svelte` のみ。
  - module script に定数 `DOT_SCALE`（1）を追加した。
  - props に `dotScale`（既定 `DOT_SCALE`）を追加した。`gradientWidth`・`transparent` と並べた。
  - フラグメントシェーダーに `uniform float u_dotScale;` を追加し、半径を `0.70710678 * cell * u_dotScale * sqrt(luminance(color))` にした。
  - `draw()` で `u_dotScale` に `Math.min(Math.max(dotScale, 0), 1)` を渡す。
  - `dotScale` の変更で再描画されるよう、リアクティブ文に `dotScale` を加えた。
  - キーカラー保持、透過、マスクの処理は変更していない。
- props・依存コンポーネントへの影響: `dotScale` を追加した（省略可。既定 1 でこれまでと同じ見た目）。呼び出し側の変更は不要。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細（`HalftonePhoto` の呼び出し元）。`dotScale` を省略した既定の表示は変わらない想定。`dotScale` < 1 の表示は未使用。
- 検証コマンド・結果:
  - `npm run check`（Node v20.18.0）: エラー2件（既存の `clickToCopy.js` の implicit any）、警告23件。件数は既知のとおりで、今回追加したエラーはない。`HalftonePhoto` に関する指摘はなし。
  - `npm run visual`: Node が v20.18.0（必要なのは v25.4.0）のため未実行。
- Visual Diffの確認・baseline更新の有無: 未実施。baseline更新なし。
- 未確認事項・残課題: ブラウザ・実GPUでの描画は未確認。`dotScale` を 1 未満にしたときの見た目（円が隣と離れること、明るい所の円が小さくなること）は未確認。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — 実際のエフェクトの強さを `strength` で外に出す

- 状態: 実装（型チェックのみ）
- 目的・受け入れ条件: 親コンポーネントが、描画中のエフェクトの強さ（スムージング後の値）に合わせて別の表示を変えられること。
- 変更内容・対象ファイル: `HalftonePhoto.svelte`。読み取り専用の `export let strength = 0` を追加し、描画ループで `shown` と同じ値（0〜1）を入れるようにした。
- props・依存コンポーネントへの影響: 追加のみ。`bind:strength` しない使用箇所（Desktopの `PhotoDetailModal`）の表示は変わらない。`PhotoDetailModal-mobile` が写真を暗くするのに使う。
- 検証コマンド・結果: `npm run check` は既存のエラー2件・警告23件のみ。
- 未確認事項・残課題: Visual・実機は未確認。
- 関連コミット・PR: 未コミット。

### 2026-10-13 — 画像の読み込み直後に一度だけ入場演出を再生する（`entrance`）

- 状態: 検証済み（型チェック・Chromium での目視、既存 baseline の写真範囲との画素比較。Visual suite は環境照合で未実行）
- 目的・受け入れ条件: 写真詳細を開いた直後に 0.2 秒、写真の上端から下端へ前線が進むこと。冒頭は格子 64px・円の大きさ 0 で写真は見えず、円が育つと同時に格子が細かくなり、最後は原画になること。`prefers-reduced-motion` では再生しないこと。
- 変更内容・対象ファイル: `HalftonePhoto.svelte` のみ。
  - props `entrance`（既定 false）を追加。true のとき、画像の読み込み成功後に一度だけ再生する。読み込み前は `photo` の原画を全面マスクで隠す（pending）。
  - 定数（module script）: `ENTRANCE_DURATION_MS`（200）、`ENTRANCE_CELL_START_PX`（64）、`ENTRANCE_CELL_END_PX`（12）、`ENTRANCE_DOT_PX`（12、円の直径。格子の半分まで）、`ENTRANCE_GRADIENT_WIDTH`（1）、`ENTRANCE_REVEAL_START`（0.6）。
  - 局所進行度 L = smoothstep(clamp((t × (1 + 幅) − 上端からの位置) / 幅))。格子は `64 × (12/64)^L`（対数的に細かく）。円の半径は `min(0.5 × 直径 × L, 0.5 × 格子)` に明るさの平方根をかける。ドットの不透明度は `1 − smoothstep(0.6, 1, L)` で、原画の不透明度（`photo` のマスク）はその補数。L = 1 で原画だけになる。
  - 時間は `performance.now()` と rAF で進める。終わると通常のスクロール連動の処理へ戻る（演出中のスクロール値は使わない）。
  - シェーダーの `halftone()` は最大半径を引数で受けるように変えた。既存のスクロール側は `0.70710678 × cell × u_dotScale` を渡し、従来と同じ式になる。
- props・依存コンポーネントへの影響: `entrance` を追加（省略可、既定 false で従来と同じ）。`progress`・`strength`・`transparent`・`photo` の既存の動きは変えていない。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` の PC（`PhotoDetailModal.svelte`）と Mobile（`PhotoDetailModal-mobile.svelte`）で、モーダルを開いた直後。Mobile のスクロール演出は、入場が終わるまで描画に反映されない。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: エラー2件（既存の `clickToCopy.js` の implicit any）、警告23件。今回追加したエラー・警告はない。
  - Chromium（Playwright 1.56.1 の同梱版、`/photo` から写真を開く、`performance.now` を一時的な仮想時計に差し替え。リポジトリには残していない）で、PC 1440×900 と Mobile 390×844（iPhone UA）を 0 / 50 / 100 / 150 / 200 / 260 ms で撮影。スクリーンショットは scratchpad の `pc-*ms.png` / `mobile-*ms.png`。
    - 0 ms: 写真は見えない（モーダルの黒い背景とギャラリーだけ）。
    - 50 ms: 写真の上端付近に小さなドットが現れる。
    - 100 ms: 上側は原画、中央付近はドット、下側はまだ隠れている。
    - 150 ms: 下端の一部だけドットが残る。
    - 200 ms 以降: 原画のみ（以降の 260 ms も同じ）。
  - 読み込み後に `prefers-reduced-motion: reduce` で開くと、canvas もマスクも作られず、写真がそのまま見える（`reduce.cjs` で確認）。
  - 既存 baseline（`photo-0-gakusou-image.png` と `photo-5-rot-image.png`）と、撮影した `.modal:not(.hide) .photo` を比べた。写真の範囲（画面の y = 250〜650）の画素差は 0。ギャラリーの背景は直接読み込みの状態の差で、今回の変更とは無関係。
  - `npm run visual -- --grep 'component:(modal|image)$'`: 環境照合で停止（`.visual/environment.json` の `fontsSha256` が、このマシンの Windows フォントと一致しない）。`.visual/environment.json` は変更していない。
- Visual Diffの確認・baseline更新の有無: Playwright の差分確認は未実施。baseline は更新していない。上の画素比較は参考値。
- 未確認事項・残課題:
  - 実機・Safari・実 GPU での描画は未確認。WebGL2 が使えない環境では従来どおり原画を表示する（`failed` 経路）。ただし読み込み待ちの間は原画を隠すため、失敗時は `clearMask` で表示を戻す。
  - 「円の大きさ 0 → 約 12px」を直径 12px（CSS px）として解釈した。半径としての解釈なら `ENTRANCE_DOT_PX` を 24 にする。
  - `ENTRANCE_GRADIENT_WIDTH`（1）、格子の終点（12px）、`ENTRANCE_REVEAL_START`（0.6）は目視での仮の値。
  - 入場 0.2 秒と、`.modal` の opacity（0.3 秒のフェード）が重なる。
  - 写真の切り替え（スワイプ・矢印）では `{#key open_photo_id}` によりコンポーネントが作り直されるため、切り替えごとに入場演出が再生される。
- 関連コミット・PR: 未コミット。

### 2026-10-14 — カーソルモード（ポインター周りの円形範囲だけにエフェクト）

- 状態: 実装（型チェックと開発サーバーでの Chromium 確認のみ。Visual は環境照合で未実行）
- 目的・受け入れ条件: `mode="cursor"` のとき、ポインター周りの円形の範囲だけにハーフトーンをかける。ポインター直下ほど格子が大きく、半径の外では原画が見えること。効果は写真の表示領域の内側に限ること。既定のスクロールモードの挙動は変えないこと。
- 変更内容・対象ファイル: `src/lib/components/HalftonePhoto.svelte` のみ。
  - module script に定数 `CURSOR_RADIUS_PX`（110）・`CURSOR_MIN_CELL_PX`（4）・`CURSOR_MAX_CELL_PX`（18）を追加。
  - props に `mode`（既定 `'scroll'`）・`pointer`（既定 null）・`cursorRadiusPx`・`cursorMinCellPx`・`cursorMaxCellPx` を追加。
  - cursor のとき target = pointer ? 1 : 0 とし、既存の shown のスムージングで出入りする。progress・easing・end は使わない。`pointer` が変わると再描画する。
  - シェーダーに uniform `u_mode`・`u_pointer`（gl_FragCoord と同じ左下原点の device px）・`u_cursorRadius` を追加。cursor の効果の強さは e = 1 − smoothstep(0, 1, |gl_FragCoord.xy − u_pointer| / 半径)、表示の強さは u_progress（= shown）で、k = clamp(e / FADE) × 表示の強さ。格子は既存の cellA/cellB の段階混合を cursor 用の minCell→maxCell で使い、円は既存の式（0.70710678 × cell × dotScale）。`halftone()`・`cellColor()` は変更なし。
  - カーソルモードでは原画にマスクをかけず、ドットを原画の上に重ねるだけにする（ユーザー指示で放射状マスクを撤去。`photo` には `clearMask()` だけを行う）。`updateMask` / `updateEntranceMask` は変更なし。
  - cursor のとき `entrance` は無視する（入場演出とは併用しない）。
- props・依存コンポーネントへの影響: 追加のみ。既定値（`mode = 'scroll'`）では従来と同じ描画経路。`PhotoDetailModal.svelte` と `PhotoDetailModal-mobile.svelte` は変更なし。
- 影響するページ・表示バリエーション: `/photo` 一覧で、マウスが乗っているタイル（`route-photo-gallery.md` 参照）。写真詳細モーダルの表示は変更なし。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: エラー2件（既存の `clickToCopy.js` の implicit any）、警告23件。件数は変更前と同じで、HalftonePhoto に関する指摘はなし。
  - `npm run visual -- --grep 'page:photo(?: |-)'`: 実行前の環境照合で停止。`fontsSha256` が固定値 `67e79a…` と一致せず、このマシンでは `50c75f…`。テストは未実行。`.visual/environment.json` と baseline は変更していない。
  - 開発サーバー（vite dev、127.0.0.1:5199）と Playwright Chromium（1440×900、DPR 1）で `/photo` を確認。タイルの中心にホバーすると canvas が1つ、大きさはタイルと一致。中心と縁のスクリーンショットで、円形の範囲だけに格子が出て、格子は中心ほど大きく、写真の外には出ないことを目視確認。reduced motion とタッチ入力（CDP）では canvas は0。pageerror と console.error はなし。
  - 写真詳細モーダルの表示は、この確認の対象外。
- Visual Diffの確認・baseline更新の有無: 未実施（上記の環境照合で停止）。baseline 更新なし。
- 未確認事項・残課題:
  - 実機（iOS Safari・Android Chrome）と実 GPU での描画は未確認。
  - `CURSOR_*` の値（半径 110、格子 4〜18px）は目視での仮の値。
  - 透過時、円の隙間には一覧の背景（白）が見える。
  - ポインターを動かさずにスクロールしたときに円の位置が追従するかは未確認（route 側で `pointerenter` の再発火に依存）。
  - `u_pointer` は gl_FragCoord と同じ座標系で持ち、距離も gl_FragCoord.xy と比べる。契約の `p − u_pointer` を、この座標系の差として実装した。
- 関連コミット・PR: 未コミット。

### 2026-10-14 — カーソル円の効果の強さを cubic-bezier で指定（`cursorEasing`）、同じ写真の縮小結果をキャッシュ

- 状態: 実装（型チェック、node での表の確認、開発サーバーの Chromium 確認。Visual は環境照合で未実行）
- 目的・受け入れ条件: カーソルモードで、中心からの距離による効果の強さのイージングを cubic-bezier で指定できること（既定は `EASING_PRESETS.easeInOut`）。複数のタイルを繰り返しマウントしても、同じ写真の取得と縮小を繰り返さないこと。スクロールモード・入場演出・既存 props の既定値は変えないこと。
- 変更内容・対象ファイル: `src/lib/components/HalftonePhoto.svelte` のみ。
  - module script に `CURSOR_EASING`（`EASING_PRESETS.easeInOut`）を追加した。props に `cursorEasing`（既定 `CURSOR_EASING`）を追加した。
  - カーソルの効果の強さを、x = clamp(1 − 距離 / 半径, 0, 1)（縁 0、中心 1）、e = clamp(ease(x), 0, 1) に変えた。従来の `1 − smoothstep(0, 1, 距離 / 半径)` は置き換えた。
  - `sampleCursorCurve(cursorEasing)` が、x = i / 32（i = 0〜32）の 33 点を既存の `cubicBezier()` で標本化し、`uniform float u_cursorCurve[33]` として渡す。シェーダーは x × 32 の位置を線形補間して e を求める。`cursorEasing` が変わると表を作り直して再描画する。
  - 取得と縮小を `prepareImage`（fetch → createImageBitmap → 縮小 → `buildLevels`）に分けた。`mode="cursor"` のときだけ module の `cursorImageCache`（src → Promise）を使う。キャッシュがあれば fetch と `buildLevels` を省略し、テクスチャ転送だけ行う。取得に失敗したものはキャッシュから外し、次回に取り直す。Promise を保持するので、同じ src を同時に読むインスタンスがあっても取得は1回になる。scroll モードと入場演出は従来どおり毎回取得する。
  - 前回の記録の定数値（`CURSOR_RADIUS_PX` 110、`CURSOR_MIN_CELL_PX` 4、`CURSOR_MAX_CELL_PX` 18）と、現在のコードの値（500 / 1 / 10）が一致していなかった。この記録は現在のコードの値を前提にしている。値を変えた経緯は未確認。
- props・依存コンポーネントへの影響: `cursorEasing` を追加した。既存 props の既定値と、scroll・入場演出の描画経路は変更なし。`PhotoDetailModal.svelte` と `PhotoDetailModal-mobile.svelte` は変更なし。
- 影響するページ・表示バリエーション: `/photo` 一覧のカーソル円（`route-photo-gallery.md` の 2026-10-14 の記録を参照）。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: エラー2件（既存の `clickToCopy.js` の implicit any のみ）、警告23件。`HalftonePhoto.svelte` の警告は0件。`photo/+page.svelte` の警告は5件で、いずれもモーダルの `on:click` 要素（a11y 警告2組）と未使用セレクタ `n :global(body)`。今回の変更で増えたものはない。
  - 表の確認（node。`cubicBezier.ts` を esbuild で変換して実行）: easeInOut・easeOut・easeOutExpo・linear の 33 点はいずれも単調増加で、端点は 0 と 1。x = 0.5 の e は easeInOut が 0.5000、easeOutExpo が 0.9718 で、異なる値になることを確認。x = 0.1 の e は easeInOut 0.0201、easeOutExpo 0.4925。
  - 開発サーバー（vite dev、127.0.0.1:5199）と Playwright Chromium（1440×900、DPR 1）で `/photo` を確認。同じ写真に出入りを2回しても `fetch` は1回だった（キャッシュ有効）。`cursorEasing` を実際に変えたブラウザ確認は行っていない（表の数値のみ）。
- Visual Diffの確認・baseline更新の有無: 未実施（環境照合で停止）。baseline 更新なし。
- 未確認事項・残課題:
  - 実機（iOS Safari・Android Chrome）と実 GPU での描画は未確認。
  - 縮小結果のキャッシュはページの生存中保持し、上限を設けていない。件数が多い場合のメモリは未評価。
  - 既定の easeInOut での見た目（効果の強さの形）は目視していない。
- 関連コミット・PR: 未コミット。

## 2026-10-14 カーソルモードの半径と格子をカーソルの移動量に追従させる

- 変更: カーソルの速さ / `CURSOR_FULL_SPEED_PX`（1500 px/秒）を目標値とする移動量 m（0〜1）を追加し、`cursorRadiusPx` と `cursorMaxCellPx` に掛ける（格子は `cursorMinCellPx` を下限にする）。m は追従速度 `cursorFollowSpeed`（既定 `CURSOR_FOLLOW_SPEED` = 2 / 秒）で指数的に近づき、静止すると 0 へゆっくり戻る。m が 0 になるまで描画を続ける。
- 影響ページ: `/photo`（cursor モードの使用箇所）。scroll モードと入場演出は変更なし。
- 検証: `npm run check` は 2 errors / 23 warnings で変更前と同じ件数。目視・Visual比較は未実施。
- 関連コミット・PR: 未コミット。

## 2026-10-14 カーソルモードに軌跡を追加

- 変更: カーソルが `CURSOR_TRAIL_SPACING_PX`（40px）進むたびに、その時点の半径（`cursorRadiusPx` × 移動量 m）で軌跡の点を置く（最大32点）。各点の半径は `cursorTrailFadeSpeed`（既定 `CURSOR_TRAIL_FADE_SPEED` = 3 / 秒）で指数的に縮み、1px未満で捨てる。シェーダーは現在位置と軌跡の全点のうち最も強い効果を使う。中心の格子は全点共通で、移動量 m による。
- 影響ページ: `/photo`（cursor モード）。scroll モード・入場演出は変更なし。
- 検証: `npm run check` は 2 errors / 23 warnings で変更前と同じ件数。目視・Visual比較は未実施。
- 関連コミット・PR: 未コミット。

## 2026-10-14 モードごとにモジュールを分割

- 変更: 777行あった `HalftonePhoto.svelte` から、調整値と計算を `src/lib/halftone/` へ移した。コンポーネントは props・状態・描画の組み立てだけを持つ（約290行）。props と表示は変更なし。
  - `scroll.ts`: スクロールモードの調整値（`EFFECT_*`、`MAX/MIN_CELL_PX`、`GRADIENT_WIDTH`、`TRANSPARENT_BACKGROUND`、`DOT_SCALE`）と元写真のマスク。
  - `cursor.ts`: カーソルモードの調整値（`CURSOR_*`）、効果の強さの表、移動量と軌跡を更新する `CursorMotion`。
  - `entrance.ts`: 入場演出の調整値（`ENTRANCE_*`）と原画のマスク。
  - `image.ts`: 画像の取得、キーカラーを保持する縮小段階、キャッシュ、テクスチャ転送。
  - `shader.ts`: WebGL2 のシェーダーとプログラムの作成。`common.ts`: 共有する値と smoothstep。
- 調整値の import 元が変わった。`/photo` の `CURSOR_RADIUS_PX` は `$lib/halftone/cursor` から読む。
- 影響ページ: `/photo`（cursor）、写真詳細のPC・モバイル（entrance / scroll）。
- 検証: `npm run check` は 2 errors / 23 warnings で変更前と同じ件数。`npm run build` 成功。ブラウザでの目視・Visual比較は未実施（`.visual/environment.json` のフォント照合で停止する既知の問題）。
- 関連コミット・PR: 未コミット。

## 2026-10-14 カーソルモードに加速度で発生する波紋を追加

- 変更: カーソルの加速度が閾値を超えた瞬間に、その位置からリング状のハーフトーン（波紋）を広げる。発生の判定は使う側（`/photo`）が行い、`HalftonePhoto` は渡された波紋を描くだけにした（複数の写真で同じ波紋をそろえるため。`route-photo-gallery.md` の同日の記録を参照）。
  - `cursor.ts`: 調整値 `CURSOR_RIPPLE_SPEED_PX`（半径が広がる速度、1200 px/秒）・`CURSOR_RIPPLE_THRESHOLD`（加速度の閾値、20000 px/秒²）・`CURSOR_RIPPLE_WIDTH_PX`（リングの幅、120px）を追加した。ほかに `CURSOR_RIPPLE_MAX_RADIUS_PX`（消える半径、1000px。強さは半径 0 で 1、この半径で 0）と `CURSOR_RIPPLE_CELL_PX`（リングの中心線の格子、48px）を置いた。
  - `cursor.ts`: `RippleDetector` を追加した。1フレームの移動から速度ベクトルを平滑化し（追従速度 20 / 秒）、その変化量を加速度とする。急発進・急停止・急な方向転換のどれでも出る。一度出たら、加速度が閾値の半分を下回るまで次は出さない。
  - props `ripples`（`{ x, y, time }[]`。中心は canvas の左上基準の CSS px、time は発生時の `performance.now()`）・`cursorRippleSpeedPx`・`cursorRippleWidthPx` を追加した。半径は `(現在時刻 − time) × 速度` で各インスタンスが求める。生きている波紋がある間は描画を続ける。
  - シェーダー: `u_ripples[8]`（中心・半径・強さ）・`u_rippleWidth`・`u_rippleCell` を追加した。リングの強さは中心線で 1、幅の端で 0（smoothstep）。カーソルのイージング（`cursorEasing`）は通さない。格子は移動量 m によらず `u_rippleCell` まで育てる。カーソル・軌跡と重なる所では、格子が大きくなる方を使う。格子を段階的に育てる処理は `levelDots()` に分けた（スクロールモードの計算結果は変えていない）。
- 影響ページ: `/photo`（cursor モード）。scroll モード・入場演出・写真詳細モーダルは変更なし。
- 検証:
  - `npm run check`（Node v25.4.0）: 2 errors / 23 warnings で、変更前と同じ件数（既存の `clickToCopy.js`）。`git diff --check` は問題なし。
  - `RippleDetector` の判定（tsx で、60fps と 120fps の合成入力）: 静止、一定 600px/s と 1500px/s（移動量に ±30% のばらつき）、0.5 秒かけた加速、0→800px/s の急発進では出ない。0→2000px/s の急発進、1500px/s からの急停止、1000px/s での左右の反転では、その瞬間に1回だけ出る。60fps と 120fps で結果は同じ。
  - 開発サーバー（vite dev、127.0.0.1:5199）と Playwright Chromium（headless、1440×900、DPR 1、SwiftShader）で `/photo` を確認した。この環境では1フレームに100ms以上かかるため、`page.clock` で時間を止めて 17ms ずつ進めた。
    - 写真を `visibility: hidden` にしてドットだけを撮ると、4秒静止したあとの急発進（1フレーム 50px）でリングが広がる。写真の境目をまたいでも同じ円の続きとして描かれる（150ms・350ms）。
    - マウスを動かさずに1フレーム 100px ずつスクロールしても、リングは出ない（ポインター位置のカーソル円だけ）。
    - ギャラリーの外へ出て別の位置から戻っても、リングは出ない。
    - console.error・pageerror・`effect disabled` は出ていない。
  - 写真を表示した状態では、効果がかなり淡く写る。急発進から 150ms 後に、効果なしの画面から 12 階調以上変わった画素は 1,831 個（格子 24px・幅 80px では 343 個）。カーソル円そのものも同じ条件で 114 個で、原画の上に同じ色のドットを重ねる仕様によるもの。
- 未確認事項: 実 GPU・実機での見た目と、閾値・速度・幅の既定値の調整（目視で決めた仮の値）。Visual 比較は未実施（`.visual/environment.json` のフォント照合で停止する既知の問題）。
- 関連コミット・PR: 未コミット。

## 2026-10-14 波紋に限界半径とイージングを追加

- 変更: 波紋の進み具合 u = 経過時間 × 速度 / 限界半径（0〜1）とし、半径 = 限界半径 × ease(u)、強さ = 1 − u にした。u が 1（限界半径に到達）で消える。速度は限界半径に着くまでの平均の速さになる。従来は半径 = 経過時間 × 速度で、`CURSOR_RIPPLE_MAX_RADIUS_PX` は消える半径として内部でだけ使っていた。
  - `cursor.ts`: `CURSOR_RIPPLE_MAX_RADIUS_PX`（1000px）を限界半径として扱い、`CURSOR_RIPPLE_EASING`（既定 `EASING_PRESETS.easeOut`）を追加した。`rippleRadius` を `rippleProgress` に置き換え、`rippleAlive` と `rippleUniforms` は限界半径とイージングを受け取るようにした。
  - props `cursorRippleMaxRadiusPx`・`cursorRippleEasing` を追加した。`/photo` で古い波紋を捨てる判定も限界半径を使う。
- 影響ページ: `/photo`（cursor モード）。既定値では、波紋が消える時刻（833ms）と最後の大きさ（1000px）は前回と同じで、出だしが速く終わりが遅くなる。
- 検証:
  - `npm run check`: 2 errors / 23 warnings で変更前と同じ件数。`git diff --check` は問題なし。
  - `rippleUniforms` の値（tsx）: 速度 1200・限界半径 1000 で、200ms の半径は linear 240px、easeOut 364px、easeOutExpo 813px。強さはどれも 0.76。833ms で半径 1000px・強さ 0、834ms で消える。速度か限界半径が 0 のときは描かない。
  - Playwright Chromium（`page.clock` で時間を止めて撮影、ドットだけ表示）: 急発進から 150ms 後のリングが3枚の写真にまたがって1つの円として描かれた。console.error・pageerror はなし。
- 未確認事項: 実機・実 GPU での見た目と、イージングの既定値の好み。Visual 比較は未実施（環境照合の既知の問題）。
- 関連コミット・PR: 未コミット。

## 2026-10-14 波紋にクールタイムを追加

- 変更: `cursor.ts` に `CURSOR_RIPPLE_COOLDOWN_MS`（500ms）を追加した。`RippleDetector` は最後に波紋を出した時刻を持ち、そこから 500ms 経つまでは閾値を超えても次を出さない。従来の「加速度が閾値の半分を下回るまで出さない」条件もそのまま残している。経過時間は `performance.now()` で数えるので、静止して判定ループが止まっている間も進む。`update()` の引数に現在時刻 `now` を追加し、`/photo` から渡す。ポインターが外れたとき（`reset()`）はクールタイムも解除する。
- 影響ページ: `/photo`（cursor モード）。
- 検証: `npm run check` は 2 errors / 23 warnings で変更前と同じ件数。tsx で、1500px/s のまま左右の反転を繰り返す入力を試した。反転周期 150ms で発生は 150・750・1350・1950ms（クールタイムなしでは 150・317・750ms…）、300ms で 300・900・1500ms、600ms で 600・1200・1800ms。発生から 400ms 後の急発進では出ず、600ms 後では出る。ブラウザでの確認は未実施。
- 関連コミット・PR: 未コミット。

## 2026-10-14 波紋と軌跡の調整値を別モジュールに分割

- 状態: リファクタリング（型チェックのみ。挙動・値の変更なし）
- 目的・受け入れ条件: カーソルモードの基本・波紋・軌跡の調整値を、別々のファイルで調整できるようにすること。
- 変更内容・対象ファイル:
  - `src/lib/halftone/ripple.ts`（新規）: 波紋の調整値（`CURSOR_RIPPLE_*`）、`CursorRipple`、`rippleProgress`・`rippleAlive`・`RippleDetector`・`rippleUniforms`。
  - `src/lib/halftone/trail.ts`（新規）: 軌跡の調整値（`CURSOR_TRAIL_SPACING_PX`・`CURSOR_TRAIL_FADE_SPEED`）。軌跡の計算は `cursor.ts` の `CursorMotion` に残す（移動量 m と一緒に更新するため）。
  - `src/lib/halftone/cursor.ts`: 上記を除いた残り。`Point` を export。
  - import 先の変更: `src/lib/components/HalftonePhoto.svelte`、`src/routes/photo/+page.svelte`。
- 影響するページ・表示バリエーション: なし（値と処理は移動しただけ）。
- 検証: `npm run check` は既存の2エラー（`clickToCopy` の暗黙 any）のみ。Visual は環境照合エラーで未実行。
- 関連コミット・PR: 未コミット。

## 2026-10-14 カーソル本体・軌跡・波紋のドットの設定を分割

- 状態: 実装（型チェックのみ。シェーダーのコンパイルと見た目は未確認）
- 目的・受け入れ条件: ドットの格子・円の大きさを、カーソル本体・軌跡・波紋で別々に調整できること。既定値では今までと同じ見た目になること。
- 変更内容・対象ファイル:
  - 調整値: `cursor.ts` に `CURSOR_DOT_SCALE`、`trail.ts` に `CURSOR_TRAIL_MIN_CELL_PX`・`CURSOR_TRAIL_MAX_CELL_PX`・`CURSOR_TRAIL_DOT_SCALE`、`ripple.ts` に `CURSOR_RIPPLE_MIN_CELL_PX`・`CURSOR_RIPPLE_DOT_SCALE`（中心線の格子は既存の `CURSOR_RIPPLE_CELL_PX`）。既定値は本体と同じ（1 / 50 / 0.8、波紋の中心線は 48）。
  - props: `cursorDotScale`、`cursorTrailMinCellPx`・`cursorTrailMaxCellPx`・`cursorTrailDotScale`、`cursorRippleMinCellPx`・`cursorRippleCellPx`・`cursorRippleDotScale`。
  - シェーダー（`shader.ts`）: `u_cursorDots`・`u_trailDots`・`u_rippleDots`（縁の格子, 中心の格子, 円の大きさ）を追加し、`u_rippleCell` を廃止。本体・軌跡・波紋の e をそれぞれ求め、格子が最も大きくなるものを使う。`u_minCell`・`u_maxCell`・`u_dotScale` はスクロールモード専用になった。
  - 挙動の差: これまでカーソルモードの円の大きさは `dotScale` を使っていたが、`cursorDotScale` などを使う。本体と軌跡は、同じ設定なら従来（x の最大を取る）と同じ結果。
- 影響するページ・表示バリエーション: `/photo` 一覧のカーソルモード。
- 検証: `npm run check` は既存の2エラーのみ。
- 未確認事項: ブラウザでのシェーダーのコンパイルと見た目、Visual。
- 関連コミット・PR: 未コミット。
