# PhotoDetailModal の作業記録

## 対象

- ソース: `src/lib/components/PhotoDetailModal.svelte`
- 使用route: `/photo/[photo_id]`

## Visual検証

同じコンポーネントの表示バリエーションを以下のページで検証する。

| ページID                      | Visual component ID | セレクタ                   |
| ----------------------------- | ------------------- | -------------------------- |
| `photo-0-gakusou`             | `modal`             | `.modal:not(.hide)`        |
| `photo-0-gakusou`             | `image`             | `.modal:not(.hide) .photo` |
| `photo-1-gyokou`              | `modal`             | `.modal:not(.hide)`        |
| `photo-1-gyokou`              | `image`             | `.modal:not(.hide) .photo` |
| `photo-2-hikari_kage01`       | `modal`             | `.modal:not(.hide)`        |
| `photo-2-hikari_kage01`       | `image`             | `.modal:not(.hide) .photo` |
| `photo-3-kasa`                | `modal`             | `.modal:not(.hide)`        |
| `photo-3-kasa`                | `image`             | `.modal:not(.hide) .photo` |
| `photo-4-minimal_and_accent`  | `modal`             | `.modal:not(.hide)`        |
| `photo-4-minimal_and_accent`  | `image`             | `.modal:not(.hide) .photo` |
| `photo-5-rot`                 | `modal`             | `.modal:not(.hide)`        |
| `photo-5-rot`                 | `image`             | `.modal:not(.hide) .photo` |
| `photo-6-sonote`              | `modal`             | `.modal:not(.hide)`        |
| `photo-6-sonote`              | `image`             | `.modal:not(.hide) .photo` |
| `photo-7-ugoki_houkou01-copy` | `modal`             | `.modal:not(.hide)`        |
| `photo-7-ugoki_houkou01-copy` | `image`             | `.modal:not(.hide) .photo` |
| `photo-8-ugoki_houkou01`      | `modal`             | `.modal:not(.hide)`        |
| `photo-8-ugoki_houkou01`      | `image`             | `.modal:not(.hide) .photo` |

```powershell
npm run visual -- --grep 'component:(modal|image)$'
```

## 記録の書き方

変更内容はこのファイルに一度だけ記録し、影響したページ・props・表示状態を併記する。新しい記録は末尾へ追記する。関連コミット欄はコミット後に記入する。

## 作業履歴

まだ個別の変更記録はありません。以下をコピーして追記してください。

```markdown
### YYYY-MM-DD — 作業名

- 状態: 調査 / 計画 / 実装 / 検証済み
- 目的・受け入れ条件:
- 変更内容・対象ファイル:
- props・依存コンポーネントへの影響:
- 影響するページ・表示バリエーション:
- 検証コマンド・結果:
- Visual Diffの確認・baseline更新の有無:
- 未確認事項・残課題:
- 関連コミット・PR:
```

### 2026-10-03 — 「雨」の機材画像の参照修正

- 状態: 検証済み
- 目的・受け入れ条件: 写真「雨」のレンズ画像が404にならず読み込まれること。全写真詳細の機材画像にも読み込み失敗がないこと。
- 原因: `EF 50mm` から生成された `/cameras/EF50mm.png` は存在せず、実ファイルは `EF-50mm.png`。
- 変更内容・対象ファイル: `content/photos/kasa.md` の機材名を既存の「漁港」と同じ `EF-50mm` に修正し、`npm run build:parse-data` で `src/lib/generated/photo_output.json` を再生成。表示コンポーネントの実装変更なし。
- props・依存コンポーネントへの影響: 写真ID・propsの変更なし。DesktopとMobileは同じ機材データを参照するため両方に修正が反映される。
- 影響するページ・表示バリエーション: `/photo/kasa` の機材欄（Desktopのstate3、Mobileの詳細欄）。
- 回帰検証: `tests/visual/visual.spec.ts` の画像読み込み判定に `/cameras/` を追加。非表示のMobileモーダル内も含め、機材画像の `naturalWidth` が0の場合は失敗させる。
- 検証コマンド・結果: `npm run build:parse-data` 成功。`npm run visual -- --grep 'component:modal$'` は全8写真で8/8成功。`npm run visual -- --grep 'page:photo-3-kasa '` は3/3成功。`npm run check` は既存 `clickToCopy.js` のimplicit anyエラー2件、警告24件で失敗（今回追加のエラーなし）。`git diff --check` 成功。
- Visual Diffの確認・baseline更新の有無: 初期モーダルと親ページの比較は差分なし。baseline更新なし。
- 未確認事項・残課題: Desktopのホイール操作後の見た目、Mobileの表示状態・実機ブラウザーは未確認。画像読み込みはChromium上で検証済み。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — 写真詳細のスクロール連動カラーハーフトーン組み込み

- 状態: 実装（検証未完了。Visualテストは環境不一致で未実行）
- 目的・受け入れ条件: ホイール量に応じて写真がカラーハーフトーンへ変化すること。開始時（進み具合0）は従来の表示と同じであること。
- 変更内容・対象ファイル: `src/lib/components/PhotoDetailModal.svelte`。`HalftonePhoto` を `.photo` 内の `<img>` の後ろに配置。`effectProgress = clamp(wheelY / WHEEL_MAX)`、`WHEEL_MAX = state2_wheelY + 500`（handleWheelの既存上限と同じ値）。`.photo` に `position: relative` を追加。`<img>` は変更なし。
- props・依存コンポーネントへの影響: `HalftonePhoto` を新規に使用。`src={post.img_path ?? ''}`、`progress={effectProgress}`。既存propsへの変更なし。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のDesktop写真詳細モーダル。初期状態（wheelY = 0）は `<img>` のみで従来と同じ。ホイール操作後の状態に変化が出る（`photo-*` の `modal` / `image` の初期状態baselineは変化しない想定）。
- 検証コマンド・結果:
  - `npm run check`: 既存 `clickToCopy.js` のimplicit anyエラー2件のみ。今回追加のエラーなし（組み込み時の `string | undefined` エラー2件は `?? ''` で解消）。
  - `npm run build`: 成功（exit 0）。
  - `npm run visual -- --grep 'component:(modal|image)$'`: 環境照合（Node v25.4.0 / fontsSha256 `50c75fac…` を期待、実際は Node v20.18.0 / `67e79a75…`）で開始前に停止。テストは未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし。
- 未確認事項・残課題: Visual比較（初期状態で差分なしの確認）未実施。ホイール後のエフェクトの見た目、ブラウザ・実機での目視は未確認。環境を揃えて再実行が必要。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — スクロール連動ハーフトーンのVisual比較とエフェクト確認

- 状態: 検証済み（Visual比較・エフェクト目視）
- 目的・受け入れ条件: 進み具合0で従来と同じ表示、進むにつれてカラーハーフトーンが下から上へ広がること。
- 変更内容・対象ファイル: 今回はコード変更なし（テストのみ）。写真 `rot` を manifest に追加し、写真詳細IDを `photo-5-rot` / `photo-6-sonote` / `photo-7-ugoki_houkou01-copy` / `photo-8-ugoki_houkou01` に繰り下げ（上の Visual検証表を更新）。
- 検証コマンド・結果: メインで `npm run visual -- --grep 'component:(modal|image)$'` 18/18 pass、全件 93/93 pass（baselineは HEAD 環境との差分ゼロではなく、環境移行に伴い再生成した値との比較）。
- エフェクト確認（一時スクリプト、リポジトリ外。dev server 4179、Chromium のSwiftShader WebGL2。親が `fetch` + `createImageBitmap` へ修正した後のコードで撮影）: Desktop 1440×900 `/photo/gakusou` と `/photo/rot`、Mobile 390×844 `/photo/gakusou`。
  - Desktop 0%（wheelY 0）: canvasなし、従来表示。
  - Desktop 約27%（wheelY 300）: canvasあり。写真の下側のみドット化。ただし wheelY 300 は `state1` の境界（`> 300` で幅60%へ変化）のため、写真幅は従来どおり100%。
  - Desktop 約55%（wheelY 600）: 写真幅は state2 の既存CSS（幅60%）で縮小。ハーフトーンは写真の表示矩形に追従し、中央付近に大きめのドット。
  - Desktop 約109%（wheelY 1200）: 最大のドット。黒地は小さいドットで実質無地。
  - Mobile 50%（scrollTop 最大の50%）: canvasあり。写真の上部までドットが広がる。
  - Mobile 100%: canvasは存在するが、スクロールで写真が画面外のため視認できない。
  - console: `HalftonePhoto: effect disabled` は出ず、pageerror なし。出たのは Chrome のソフトウェアWebGL（SwiftShader）に関する警告のみ。
- Visual Diffの確認・baseline更新の有無: 既存の初期状態baseline（`photo-*-modal` / `image`）は全件一致。
- 未確認事項・残課題: 実機・Safari・実GPU環境での描画は未確認。WebGL2不可時のフォールバックは未確認。Mobileの視覚確認は100%時に写真が見えない位置のため、50%のみ確認。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — Mobile限定化に伴い PC のエフェクトを除去

- 状態: 検証済み（Visualの自動テストと Chromium での撮影。実機は未確認）
- 目的・受け入れ条件: PCの写真詳細にはハーフトーン効果をかけないこと。PCの見た目は、エフェクト導入前（0%）と同じであること。
- 変更内容・対象ファイル: `PhotoDetailModal.svelte` から HalftonePhoto の import・配置、`effectProgress`、`.photo` の `position: relative` を除去した。`WHEEL_MAX` と handleWheel は残す。
- props・依存コンポーネントへの影響: なし。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のDesktop写真詳細。ホイールで最後まで送っても `.halftone` は生成されない（1440×900 で確認）。
- 検証コマンド・結果: `npm run check` は既存の2件のみ。`npm run visual -- --grep 'component:(modal|image)$'` 18 passed。
- Visual Diffの確認・baseline更新の有無: 差分なし。baseline更新なし。
- 未確認事項・残課題: 実機での確認は対象外（PCのため）。
- 関連コミット・PR: 未コミット。

### 2026-10-13 — 開いた直後にドット化の入場演出を一度だけ再生する

- 状態: 検証済み（型チェック・Chromium での目視、既存 baseline の写真範囲との画素比較。Visual suite は環境照合で未実行）
- 目的・受け入れ条件: PC の写真詳細でも、モーダルを開いた直後に 0.2 秒の入場演出（`HalftonePhoto` の `entrance`）を再生すること。スクロール連動のエフェクトは PC に戻さないこと。
- 変更内容・対象ファイル: `PhotoDetailModal.svelte`。
  - `HalftonePhoto` を再び import し、縮小版（`photoThumbnailUrl(post.id)`）から `entrance` 付きで重ねた。`progress` は渡さない（既定 0）。
  - 原画を `.photoImage` で囲み、そのラッパーを `photo` に渡す（マスクで原画だけを隠すため。`mask-image` を `.photo` 自体にかけると canvas も隠れる）。
  - `.photo` に `position: relative` を戻し、`.photoImage` を 100% × 100% にした。
- props・依存コンポーネントへの影響: なし（`HalftonePhoto` の既存 props と `entrance` の追加のみを使用）。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` の PC 写真詳細。開いた直後の 0.2 秒だけ演出が見え、その後は従来と同じ原画表示。ホイールで送っても、この component はスクロール連動を描かない（`progress` は 0 のまま）。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: 既存の2件・警告23件のみ。今回の追加はない（`PhotoDetailModal.svelte` の `img` の a11y 警告は元からある行の移動）。
  - Chromium での撮影（`pc-0〜260ms.png`）: 0 ms は写真が見えず、50〜150 ms で上から順にドットが現れ、200 ms 以降は原画。詳細は [HalftonePhoto.md](HalftonePhoto.md) の同日の記録を参照。
  - 既存 baseline `photo-0-gakusou-image.png` / `photo-5-rot-image.png` と、写真の範囲（y = 250〜650）の画素差は 0（参考値）。
  - `npm run visual -- --grep 'component:(modal|image)$'`: 環境照合で停止。baseline は更新していない。
- Visual Diffの確認・baseline更新の有無: Playwright の差分確認は未実施。baseline 更新なし。
- 未確認事項・残課題: 実機・Safari での見え方。`.modal` の 0.3 秒フェードとの重なりの見え方。ホイール操作後に入場演出の余韻が残らないかは目視していない。
- 関連コミット・PR: 未コミット。
