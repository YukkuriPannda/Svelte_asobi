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
