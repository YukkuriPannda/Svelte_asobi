# PhotoDetailModal-mobile の作業記録

## 対象

- ソース: `src/lib/components/PhotoDetailModal-mobile.svelte`
  使用ページは `/photo` および写真詳細URLからの遷移先。Mobile用であり、現在のDesktop Visual Testには含まれない。

## Visual検証

Desktopのbaselineは未登録。未実施の検証を成功として記録しない。

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


### 2026-10-12 — 写真詳細のスクロール連動カラーハーフトーン組み込み

- 状態: 実装（検証未完了。Mobileの自動テストはなし）
- 目的・受け入れ条件: `.modalcontent` のスクロールに連動して写真がカラーハーフトーンへ変化すること。開始時（進み具合0）は従来の表示と同じであること。タッチ操作の既存処理は変更しない。
- 変更内容・対象ファイル: `src/lib/components/PhotoDetailModal-mobile.svelte`。`HalftonePhoto` を `.photo` 内の `<img>` の後ろに配置。`.modalcontent` に `bind:this` と `on:scroll={handleScroll}` を追加。進み具合は `maxScroll > 0 ? clamp(scrollTop / maxScroll) : clamp(wheelY / (state2_wheelY + 500))`（maxScroll = scrollHeight - clientHeight）。`.photo` に `position: relative` を追加。タッチハンドラは変更なし。
- props・依存コンポーネントへの影響: `HalftonePhoto` を新規に使用。`src={post.img_path ?? ''}`、`progress={effectProgress}`。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細モーダル（`.modalcontent` が縦スクロールする状態）。スクロール前は `<img>` のみで従来と同じ。
- 検証コマンド・結果: `npm run check` と `npm run build` は PhotoDetailModal.md の記録と同じ（同一実行）。Mobileに対応する自動テストはないため、Visual比較は実施なし。
- Visual Diffの確認・baseline更新の有無: 比較なし。baseline更新なし。
- 未確認事項・残課題: スクロール連動の見た目、スクロール可能量が0の場合のタッチフォールバック、実機ブラウザ（iOS Safari・Android Chrome）での表示は未確認。`maxScroll` は scroll イベントでのみ更新するため、画像読み込み後などにコンテンツの高さが変わった場合は次のスクロールまで古い値を使う。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — 写真を sticky で固定し、文章を重ねて表示

- 状態: 検証済み（Visualの自動テストと Chromium での撮影。実機は未確認。Mobileの自動テストは対象外）
- 目的・受け入れ条件: 写真がスクロールで流れず上端に固定され、説明文・機材がその上に下から重なって出てくること。冒頭は写真のみが見えること。タッチ・スワイプの既存処理は変更しない。
- 変更内容・対象ファイル: `PhotoDetailModal-mobile.svelte`。
  - `.photo`: `position: relative` → `position: sticky; top: 0; z-index: 0`。
  - `.detail`: `position: relative; z-index: 1; margin: -100vh 0 0; padding: 100vh 0 50px;` と文字の `text-shadow`（背景の板は付けない）。既存の `margin: 50px 0` は置き換えた。
  - 進み具合: `maxScroll > 0 ? clamp(scrollTop / maxScroll) : 0`（wheelY へのフォールバックを削除）。
- props・依存コンポーネントへの影響: `HalftonePhoto` の呼び出しは変更なし。`<p>mobile</p>`、タッチハンドラ、スワイプ処理は変更なし。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細（`.modalcontent` が縦スクロールする状態）。
- 検証コマンド・結果: 前記の `HalftonePhoto.md` の 2026-10-12 の記録と同じ（同一実行）。`npm run visual -- --grep 'swipe'` 5 passed。撮影（390×844、gakusou・rot の0〜100%）で photo の top は 28px で固定、detail は下から上へ移動。
- Visual Diffの確認・baseline更新の有無: 差分なし。baseline更新なし。
- 未確認事項・残課題: 実機のスマホ（iOS Safari・Android Chrome）での sticky とスクロールの挙動、タッチ量とのずれは未確認。`maxScroll` は scroll イベントでのみ更新する（従来どおり）。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — HalftonePhoto に一覧用サムネイルを渡す

- 状態: 実装（型チェックのみ。Visual・ブラウザは未確認）
- 目的・受け入れ条件: ハーフトーンの反映を速くすること。詳細は `HalftonePhoto.md` の同日の記録を参照。
- 変更内容・対象ファイル: `PhotoDetailModal-mobile.svelte`。`HalftonePhoto` の `src` を `post.img_path ?? ''` から `photoThumbnailUrl(post.id)` に変更。表示用の `<img>` は元画像のまま。
- props・依存コンポーネントへの影響: `$lib/photo-thumbnails` を新たに import。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細の p > 0 の状態。
- 検証コマンド・結果: `npm run check`（Node v20.18.0）はエラー2件（既存の `clickToCopy.js` の implicit any）・警告23件で、今回追加したエラーはない。`npm run visual -- --grep 'component:(modal|image)$'` と `npx playwright test tests/visual/photo-images.spec.ts` は、この環境に Node v25.4.0 がないため未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし（p = 0 では canvas を作らないため、初期表示は変わらない想定）。
- 未確認事項・残課題: ブラウザ・実機での読み込み速度と見た目（解像度の低下が目立たないか）は未確認。サムネイルのない写真（`npm run photos:thumbnails` 未実行）は404でエフェクトなしにフォールバックする。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — 最後までスクロールするとタイトルが上端20pxまで来るようにする

- 状態: 実装（型チェックとChromiumでの数値計測のみ。Visual・実機は未確認）
- 目的・受け入れ条件: 最後までスクロールしたとき、タイトルと説明文がスクロール領域の上端から約20pxの位置まで上がること。本文が短く、画面が縦に長い端末ではタイトルが画面の中ほどで止まっていた。
- 変更内容・対象ファイル: `PhotoDetailModal-mobile.svelte` の `.detail` に `box-sizing: border-box; min-height: calc(200vh + 30px)` を追加した（上余白 100vh + 本文 100vh − 20px + 下余白 50px）。このページでは全体の指定で `border-box` になっているため、余白を含む値で指定し、`box-sizing` も明示した。本文が長い場合は従来どおり、本文の最後まで読める位置までスクロールする（タイトルは画面の上へ抜ける）。
- props・依存コンポーネントへの影響: なし。`HalftonePhoto` の進み具合は、スクロール量が増えた分だけ緩やかになる。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細の最大スクロール時。初期表示（scrollTop = 0）は変わらない。
- 検証コマンド・結果: `npm run check` は既存の `clickToCopy.js` のエラー2件・警告23件のみ。`vite dev` と Playwright（Chromium、iPhone 13 相当、幅390px）の一時スクリプトで、高さ 664 / 844 / 1000px・gakusou / rot / gyokou の最大スクロール時のタイトル上端を測り、すべて 20px だった。変更前は 664px で 37〜77px、1000px で 373〜413px だった。Visualテストは Node v25.4.0 がないため未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし。
- 未確認事項・残課題: 実機（iOS Safariのアドレスバーの伸縮で `100vh` がずれる場合）は未確認。
- 関連コミット・PR: 未コミット。

### 2026-10-12 — 圧縮版（一覧用サムネイル）の上に元データを重ねて表示する

- 状態: 実装（型チェックのみ。Visual・ブラウザは未確認）
- 目的・受け入れ条件: 元データ（4〜12MB）の読み込み中も、軽い圧縮版で写真が先に表示されること。読み込み後は元データが上に重なり、見た目が従来と同じであること。
- 変更内容・対象ファイル: `PhotoDetailModal-mobile.svelte`。`<img>` をラッパー `.photoImage` で囲んだ。ラッパーには、`photoThumbnailUrl(post.id)` を `background-image`（`background-size: contain`、中央寄せ）として敷いた。圧縮版はテストの `.photo img` が1つという前提を崩さないよう、`<img>` を増やさずに背景にした。`<img>` に `display: block` を追加し、ラッパー内で行ボックスの余白が出ないようにした。
- props・依存コンポーネントへの影響: `HalftonePhoto` の `photo` には、`<img>` ではなくラッパーを渡すように変えた。透過時のマスクで、圧縮版と元データの両方を隠す。
- 影響するページ・表示バリエーション: `/photo/[photo_id]` のMobile写真詳細。元データの読み込み中は圧縮版が見える。読み込み後は従来と同じ表示になる想定。
- 検証コマンド・結果: `npm run check`（Node v20.18.0）は既存の `clickToCopy.js` のエラー2件・警告23件のみ。Visualテストは Node v25.4.0 がないため未実行。
- Visual Diffの確認・baseline更新の有無: 比較は未実施。baseline更新なし。
- 未確認事項・残課題: 元データの読み込み後、写真の縁に圧縮版がはみ出して見えないかは未確認（縦横比が同じなら一致するはず）。`display: block` の追加による初期表示の差分も未確認。サムネイルがない写真では背景が空になり、従来と同じ表示になる。
- 関連コミット・PR: 未コミット。
