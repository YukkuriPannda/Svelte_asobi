# route-photo-gallery の作業記録

## 対象

- ソース: `src/routes/photo/+page.svelte`
- 使用route: `/photo`

## Visual検証

同じコンポーネントの表示バリエーションを以下のページで検証する。

| ページID | Visual component ID | セレクタ                                       |
| -------- | ------------------- | ---------------------------------------------- |
| `photo`  | `gallery`           | `[data-visual-id="photo-gallery"]`             |
| `photo`  | `tile-0`            | `[data-visual-id="photo-gakusou"]`             |
| `photo`  | `tile-1`            | `[data-visual-id="photo-gyokou"]`              |
| `photo`  | `tile-2`            | `[data-visual-id="photo-hikari_kage01"]`       |
| `photo`  | `tile-3`            | `[data-visual-id="photo-kasa"]`                |
| `photo`  | `tile-4`            | `[data-visual-id="photo-minimal_and_accent"]`  |
| `photo`  | `tile-5`            | `[data-visual-id="photo-rot"]`                 |
| `photo`  | `tile-6`            | `[data-visual-id="photo-sonote"]`              |
| `photo`  | `tile-7`            | `[data-visual-id="photo-ugoki_houkou01 copy"]` |
| `photo`  | `tile-8`            | `[data-visual-id="photo-ugoki_houkou01"]`      |

```powershell
npm run visual -- --grep 'component:(gallery|tile-0|tile-1|tile-2|tile-3|tile-4|tile-5|tile-6|tile-7|tile-8)$'
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

### 2026-10-03 — 写真ギャラリーの中央配置修正

- 状態: 検証済み
- 目的・受け入れ条件: 写真の各行が画面中央に配置され、狭い画面でも写真がはみ出さない。
- 変更内容・対象ファイル: `src/routes/photo/+page.svelte` の折り返しFlexに `justify-content: center` を指定。タイルの最大幅を余白込みで制限し、600px以下ではギャラリー幅を100%にする。
- props・依存コンポーネントへの影響: props・モーダル開閉処理・共有コンポーネントに変更なし。
- 影響するページ・表示バリエーション: `/photo` 一覧、写真詳細モーダル背面のギャラリー。
- 検証コマンド・結果: `npm run check` は既存 `clickToCopy.js` のimplicit anyエラー2件・既存警告24件で失敗。今回追加のエラーなし。`npm run visual -- --grep 'page:photo '` は旧基準に対して全体・ギャラリーの2件が意図した配置差分、残り9件成功。
- 画面幅別検証: 一時Playwrightスクリプトで320 / 390 / 600 / 768 / 1024 / 1440 / 1920pxを測定。ギャラリーと各行の中心ずれは最大0.016px、写真の画面外へのはみ出しなし。Desktopと390pxの画像も目視確認。一時スクリプトは削除済み。
- Visual Diffの確認・baseline更新の有無: ギャラリーのactual / diffとページ全体、代表写真詳細を確認し、`npm run visual:update -- --grep 'page:photo(?: |-)'` でphoto関連の基準を更新。通常比較 `npm run visual -- --grep 'page:photo(?: |-)'` は35/35成功。比較閾値の変更なし。
- 未確認事項・残課題: 実機ブラウザーは未確認。既存の型エラー、写真詳細の `/cameras/EF50mm.png` の404は今回の範囲外。
- 関連コミット・PR: 未コミット。

### 2026-10-03 — ギャラリー写真のWebPサムネイル

- 状態: 検証済み
- 目的・受け入れ条件: `/photo` の一覧では軽量サムネイルだけを取得し、写真を開いたDesktop / Mobile詳細とスワイプ切り替えでは元の `img_path` を取得する。失敗したタイルは元画像にフォールバックせずエラー表示を保つ。
- 変更内容・対象ファイル: `scripts/photo-thumbnails.mjs` で追跡済み写真のWebPを生成し `static/photo-thumbnails/manifest.json` にsource URLと寸法・容量を記録。`src/lib/photo-thumbnails.ts` と一覧ページは静的ファイルを参照。利用手順は `docs/photo-thumbnails.md`。
- 画像設定: sharpでEXIF回転、幅768px以下、縦横比保持、拡大なし、WebP品質80。現在の8枚を生成し、原本合計61,076,412 bytesから合計220,504 bytesへ圧縮（99.64%減）。原本ファイルは変更なし。
- props・依存コンポーネントへの影響: `PhotoPost` と詳細モーダルのpropsは変更なし。追加依存はdevDependencyのsharp。
- 影響するページ・表示バリエーション: `/photo`一覧、Desktop / Mobile詳細の元画像読み込み、写真一覧の失敗タイル。
- 検証コマンド・結果: `npm run photos:thumbnails`・`npm run check:photo-thumbnails`・`npm run build:svelte` 成功。`node node_modules/@playwright/test/cli.js test photo-images.spec.ts` はDesktop一覧→詳細、Mobile詳細、初回サムネイル404の3/3成功。親Agentの独立確認では画像通信とスワイプが8/8成功、写真Visual比較も35/35成功。`npm run check` は既存clickToCopy.jsのimplicit anyエラー2件・既存警告23件で失敗、今回の追加エラーなし。`git diff --check` 成功。
- Visual Diffの確認・baseline更新の有無: 初回比較で一覧9件に圧縮由来の差分。詳細page/modal/imageの背面にもぼかしたギャラリーが含まれるため、同じタイル差分が出ることを確認し、親Agentが意図した差分と確認。photo関連baseline35件を更新後、`npm run visual -- --grep 'page:photo(?: |-)'` は35/35成功。写真詳細の元画像表示領域自体は変わらず、背面のぼけたサムネイルが変化。
- 未確認事項・残課題: Cloudflare Pagesの本番build/deployは未実施。未追跡の `content/photos/rot.md` は生成スクリプト対象外。詳細は `docs/photo-thumbnails.md`。
- 関連コミット・PR: 未コミット。

### 2026-10-03 — 写真詳細の左右スワイプ切り替え

- 状態: 検証済み
- 目的・受け入れ条件: 写真詳細で左スワイプすると一覧順の次、右スワイプすると前の写真を表示する。縦スクロールと通常タップを保ち、先頭・末尾では停止する。
- 変更内容・対象ファイル: `src/routes/photo/+page.svelte` のDesktop・Mobileモーダルにタッチ判定を追加。移動開始10pxで方向を固定し、横60px以上かつ横移動が縦移動の1.2倍を超える操作で切り替える。横移動中は標準操作を抑制し、派生clickによるモーダル閉鎖を防ぐ。複数指・touchcancelは切り替えない。
- props・依存コンポーネントへの影響: props変更なし。写真IDをkeyとして両モーダルを再生成し、写真切り替え時にスクロール・Desktop表示段階を初期化する。URLはエンコードした写真IDでreplaceStateし、切り替えごとの履歴追加を避ける。
- 影響するページ・表示バリエーション: `/photo` から開く写真詳細、全写真詳細URL。タッチ可能なDesktopとMobileのモーダル。
- 検証コマンド・結果: `npm run build` 成功。`npm run check` は既存のclickToCopy.jsエラー2件・警告24件で失敗、今回の追加エラーなし。`npm run visual -- --grep 'swipe|page:photo(?: |-)'` のDesktop比較35/35成功。新規タッチテストは初回2件失敗（直接query URLの既存router初期化エラー）、一覧クリック入口もhydration前に操作して失敗したため、既存Visualと同じ写真詳細URLからの遷移に修正。最終 `npm run visual -- --grep 'swipe'` は2/2成功。
- タッチ検証: `tests/visual/photo-swipe.spec.ts` で390×844・Android UA・ChromiumのCDP実タッチ入力を使用。次／前、タイトル・URL同期、スクロール初期化、縦スクロール、短い移動、cancel、複数指、先頭／末尾、空白を含む写真ID、切り替え後の通常タップ閉鎖を確認。
- Visual Diffの確認・baseline更新の有無: Desktop比較は差分なし・baseline更新なし。`.visual/results/photo-swipe-mobile.png` の切り替え後の写真を目視確認。
- 未確認事項・残課題: 物理スマートフォン・iPad・Safariでのタッチ挙動は未確認。Desktopタッチの操作テストは未実施。今回変更していない直接query URLのrouter初期化問題とhydration前クリックは別課題。
- 関連コミット・PR: 未コミット。
### 2026-10-03 — スワイプアニメーションの追加

- 状態: 検証済み
- 目的・受け入れ条件: 写真が横スワイプ中に指へ追従し、離した後に次／前の写真へスライドする。短い操作・キャンセル・一覧の端では中央へ戻る。縦スクロールを保ち、動きを減らす設定ではスライドを省く。
- 変更内容・対象ファイル: `src/routes/photo/+page.svelte` にドラッグのtranslateと180msの戻り、160msの退場・220msの入場を追加。端のドラッグ距離は1/4に抑える。切り替え中は追加入力を無視し、破棄時にAnimationをcancelする。`touch-action: pan-y` を指定。props・データ構造は変更なし。
- 委任: `gpt-6-luna` / reasoning effort `max` がrouteと `tests/visual/photo-swipe.spec.ts` の仕上げ・操作検証を担当。親Agentが差分レビューと受け入れ検証を独立に実行。初期試作は親Agentが実装した後、ユーザーの指摘に従いLunaへ引き継いだ。
- 影響するページ・表示バリエーション: 全写真詳細のタッチ操作。Desktop静止状態・一覧の配置変更なし。
- 調査結果: 初期の連続操作・縦スクロールテストは、切り替え／snapback完了前に次の操作を送り失敗。イベント記録で縦操作が背景に当たっていることを確認。通常操作ヘルパーは切り替えフラグ解除とtranslate中央復帰を待つよう修正し、追加入力の抑制は別テストで検証する。
- 検証コマンド・結果: Lunaの `npm run visual -- --grep 'swipe'` は5/5成功。親Agentの `npm run visual -- --grep 'swipe|component:modal$'` は13/13成功（操作5・全写真Desktopモーダル8）。親Agentの `npm run build:svelte` 成功。`npm run check` は既存clickToCopy.jsのimplicit anyエラー2件・警告24件のみ。`git diff --check` 成功。
- 検証範囲: Chromium・390×844・Android UAのCDPタッチ入力で次／前、縦スクロール、URL同期、cancel、複数指、一覧両端、タップ閉鎖、指追従、左右アニメーション方向、中央復帰、reduced motion、切り替え中の追加入力を確認。
- Visual Diffの確認・baseline更新の有無: 静止モーダル8件の差分なし。`.visual/results/photo-swipe-drag.png` を目視確認。baseline更新なし。
- 未確認事項・残課題: 物理スマホ・iPad・Safari・Desktopタッチ操作は未確認。追加されているユーザーの `content/photos/rot.md` を変更・生成処理へ巻き込まず、Svelteのみをビルドした。
- 関連コミット・PR: 未コミット。

### 2026-10-03 — rotの画像URLとサムネイル不足を修正

- 目的: Cloudflareビルドを止めていた `rot: thumbnail is missing` を解消する。
- 変更: `content/photos/rot.md` の画像URLをR2のキーに合わせて `photos/IMG_3700.jpg` に修正。既存設定（最大768px、WebP品質80）でrotのサムネイルとmanifestを追加し、元データから写真JSONを再生成。
- 検証: 公開画像URLはHTTP 200、image/jpeg。既存作業プロセスのファイルロックを避けた一時コピーで、npm 9.6.7の `npm ci --no-audit --no-fund` 成功、修正後の `npm run build` 成功（Cloudflareアダプターを含む）。`npm run check` は既存clickToCopy.jsのimplicit anyエラー2件・警告23件で失敗。
- 未確認: Cloudflare上の再デプロイ、ブラウザー表示、Visual比較は未実施。写真IDは既存コンテンツのため今回の追加ではない。
- 関連コミット: 未コミット。

### 2026-10-12 — Visual検証の環境移行とrotの追加（テストID・一覧tileの繰り下げ）

- 状態: 検証済み
- 目的・受け入れ条件: Visual環境を固定値（Node v25.4.0）に揃えて全baselineを再生成し、manifestのrot追加後も全件passすること。
- 変更内容・対象ファイル: `.visual/manifest.json` に写真 `rot` を追加。一覧の `tile-5` を rot、旧 `tile-5〜7` を `tile-6〜8` へ繰り下げ（写真詳細IDも `photo-5-rot` 追加に伴い `photo-6-sonote` / `photo-7-ugoki_houkou01-copy` / `photo-8-ugoki_houkou01` へ繰り下げ）。`.visual/assets.json` と `.visual/assets/` に rot のfixture（IMG_3700.jpg）を追加。`tests/visual/visual.spec.ts`（src未指定imgの除外、目次生成の待機）と `tests/visual/photo-images.spec.ts`（モーダルが開くまでのclick再試行）を修正。`src/lib/generated/photo_output.json` は親が `npm run build:parse-data` で更新済み（rotの equipments `EF-50mm` と説明文）。
- props・依存コンポーネントへの影響: props変更なし。
- 影響するページ・表示バリエーション: `/photo` 一覧（tile 9件）。
- 検証コマンド・結果: worktree（HEAD + 上記変更）で `npm run visual:update` → `npm run visual` 全件 93/93 pass。メインで `npm run visual -- --grep 'component:(modal|image)$'` 18/18、`--grep 'page:photo-'` 27/27、全件 93/93 pass。
- Visual Diffの確認・baseline更新の有無: 環境移行に伴い全baselineを再生成（HEAD環境とフォントハッシュが違うため）。目視で `photo-page.png`（一覧9件）、`photo-5-rot-modal.png`、`blog-TestBlog1-article.png`（目次あり）を確認。`blog-LimiT-toc.png` は目次生成前に撮影されて空になっていたため、目次の待機を入れて再生成。
- 未確認事項・残課題: 物理端末・実ブラウザでの表示は未確認。
- 関連コミット・PR: 未コミット。

### 2026-10-13 — 写真モーダルの開閉フェードを削除

- 状態: 検証済み（未コミット）
- 目的・受け入れ条件: 写真モーダルの開閉を即時に切り替え、0.3秒のopacity / visibility / background-colorフェードをなくす。HalftonePhotoの入場演出（0.2秒）だけが見えること。
- 変更内容・対象ファイル: `src/routes/photo/+page.svelte` の `.modal` から `transition`（opacity / visibility / background-color 0.3s）を削除。`.modal :global(.modalwindow)` のスワイプ用translate transitionと `.hide` の状態定義は変更なし。
- props・依存コンポーネントへの影響: props変更なし。`HalftonePhoto.svelte`・`PhotoDetailModal*.svelte` は未変更。
- 影響するページ・表示バリエーション: `/photo` から開く写真詳細のDesktop / Mobileモーダルの開閉。全写真詳細URL。
- 検証コマンド・結果: `npm run check` は既存のclickToCopy.jsのimplicit anyエラー2件・警告23件のみ（今回の追加エラーなし）。開発サーバー（vite dev、ポート5199）で Playwright（Chromium）を使い、CDP screencastでフレームを記録。
  - Desktop 1440×900: 開いた直後から `.modal` のopacityは1、背景は `rgba(0, 0, 0, 0.75)` の最終値。約0.5秒後に写真の入場演出（ハーフトーン）を確認。閉じるクリック直後に `.modal.hide` は opacity 0 / visibility hidden / 背景透明となり、最初の撮影フレームでモーダルは消えている。
  - Mobile 390×844（Android UA）: 開いた直後から背景は最終値。約0.37秒後に写真と入場演出の途中を確認、約0.56秒後に写真が表示。閉じた直後にモーダルは消えている。
- Visual Diffの確認・baseline更新の有無: `npm run visual` は `.visual/environment.json` のフォント照合で止まるため未実行。baseline更新なし。
- スクリーンショット: scratchpad の `nofade-*` 系。
- 未確認事項・残課題:
  - 背面ギャラリーのぼかし（`.body` の `filter: blur(3px) saturate(10%)`、`transition: filter 0.3s`）は残っており、開閉とも約0.3秒かけて変化する。今回の依頼範囲外のため未変更。ぼかしも即時にする場合は別途判断が必要。
  - Desktopでは写真本体が表示されるのが開いた後約0.5秒。写真の読み込みに依存する既存の挙動で、今回は変更していない。
  - 物理端末・Safari・iPadでの表示は未確認。

### 2026-10-14 — 一覧のマウス位置にだけカーソル用ドットエフェクトを重ねる

- 状態: 実装（型チェックと開発サーバーでの Chromium 確認のみ。Visual は環境照合で未実行）
- 目的・受け入れ条件: `/photo` 一覧で、マウスが乗っているタイルの写真にだけ、ポインター周りの円形の範囲でハーフトーンをかける。写真の表示領域の外には出さない。詳細モーダル表示中・動きを減らす設定・タッチ入力・読み込み失敗タイルでは出さない。タイルの見た目、クリックで詳細を開く挙動、スワイプ処理は変えない。
- 変更内容・対象ファイル: `src/routes/photo/+page.svelte`。
  - 各タイルの `img` を `position: relative` の `.thumbnail` で包み、マウスが乗ったタイルだけ `HalftonePhoto`（`mode="cursor"`、`pointer` はタイル左上基準）をマウントする。同時にマウントするのは1タイルだけ。
  - ポインターが離れると `pointer` を null にし、400ms のフェードアウト後にアンマウントする。アンマウント時は HalftonePhoto の onDestroy が mask を外す。
  - 仮実装（`GalleryCursorDots` の import と使用、`svelte:window` の scroll、`.body` の pointer ハンドラー、hover 用の状態）を削除。
  - `src/lib/components/GalleryCursorDots.svelte` を削除。このファイルは未追跡だったため、コミット履歴には影響しない。索引（README）への追加はしていない。
- props・依存コンポーネントへの影響: `HalftonePhoto` を一覧でも使うようになった（既存の利用は詳細モーダルの2箇所）。`HalftonePhoto` の既存 props の挙動は変更なし。詳細モーダルとスワイプ処理は変更なし。
- 影響するページ・表示バリエーション: `/photo` 一覧（マウス操作時にホバーしているタイル）。静止時も、各タイルは `img` を `.thumbnail`（`display: block`）で包んだ構造になる。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: エラー2件（既存の `clickToCopy.js` の implicit any）、警告23件。件数は変更前と同じ。photo/+page の警告3件（modal の click 系、未使用セレクタ `n :global(body)`）は既存で、行番号のみ変わった。
  - `npm run visual -- --grep 'page:photo(?: |-)'`: 実行前の環境照合で停止（`fontsSha256` 不一致）。テストは未実行。
  - 開発サーバー（vite dev、127.0.0.1:5199）と Playwright Chromium（1440×900）:
    - タイル1の中心にホバーで canvas が1つ。canvas の大きさはタイルと一致（256×384）。
    - タイル2へ移動すると、タイル1の canvas は0、総数は1。
    - ページ外へ出て 900ms 後、canvas は0で、タイルの mask も解除されている。
    - reduced motion（`reducedMotion: 'reduce'`）とタッチ入力（CDP）では canvas は0。
    - pageerror と console.error はなし。
  - 写真詳細モーダルの表示中は、モーダルがタイルを覆うため操作できない。`$: if (detail_modal) releaseCursorTile()` で、モーダルを開いた時点で解除することをコードで確認したのみ（ブラウザでは未確認）。
- Visual Diffの確認・baseline更新の有無: 未実施（環境照合で停止）。baseline 更新なし。
- 未確認事項・残課題:
  - 静止時の一覧の見た目が `.thumbnail` の追加で変わっていないことは未確認。環境照合の通る環境で `npm run visual -- --grep 'page:photo(?: |-)'` を実行して確認する必要がある。
  - 実機（iOS Safari・Android Chrome）でのホバーとタッチの扱いは未確認。
  - スクロール中に円の位置が更新されるかは未確認（ポインターを動かさない場合）。
- 関連コミット・PR: 未コミット。

### 2026-10-14 — カーソル円を隣の写真にもかからせる（ギャラリー全体でポインターを追跡）

- 状態: 実装（型チェックと開発サーバーでの Chromium 確認。Visual は環境照合で未実行）
- 目的・受け入れ条件: ポインター周りの円（半径 `CURSOR_RADIUS_PX`）が隣の写真の範囲にもかかること。円が複数の写真にまたがるとき、それぞれの写真の範囲内だけにドットが出て、写真の間の余白には出ないこと。ポインターがギャラリー外へ出たら消えること。ポインターを動かさずにスクロールしても、円がポインター位置に留まること。
- 変更内容・対象ファイル: `src/routes/photo/+page.svelte` のみ。
  - `.body` で `pointermove` と `pointerleave` を追跡する（マウス以外の入力は外れ扱い）。`window` の scroll と resize でも再判定する。判定は `requestAnimationFrame` で1フレームに1回にまとめる。
  - 判定: 読み込み済みの各写真の `img` の矩形と、ポインターとの最短距離が `CURSOR_RADIUS_PX` 未満なら、その写真に `HalftonePhoto`（`mode="cursor"`）をマウントする。`pointer` は写真の左上基準の値で、負の値や幅を超える値もそのまま渡す。範囲の外になった写真は `pointer` を null にして 400ms かけてフェードアウトし、その後アンマウントする。範囲に戻ったらタイマーを取り消す。
  - 出さない条件: 詳細モーダル表示中、`prefers-reduced-motion`、マウス以外の入力、読み込みに失敗した写真。
  - タイルごとの `pointerenter` / `pointermove` / `pointerleave` は削除し、`.body` 側の追跡に置き換えた。
  - `.thumbnail` の中の `img` に `display: block` を付けた。静止時のレイアウトは、包む前（img が button 直下）と img・button の位置と大きさが一致することを計測して確認した。
  - 契約外の追加: `resize` でも再判定する（ウィンドウの幅が変わると写真の矩形が動くため）。
- props・依存コンポーネントへの影響: `HalftonePhoto` の props は変更なし（`pointer` は写真の左上基準で渡す）。詳細モーダル、スワイプ処理、クリックで詳細を開く挙動は変更なし。
- 影響するページ・表示バリエーション: `/photo` 一覧（マウスが乗っている付近の写真）。静止時の見た目は、上記の計測で包む前と一致した。
- 検証コマンド・結果:
  - `npm run check`（Node v25.4.0）: エラー2件（既存の `clickToCopy.js`）、警告23件で、増加なし。
  - `git diff --check`: 問題なし。
  - 開発サーバー（vite dev、127.0.0.1:5199）と Playwright Chromium（headless、1440×900、DPR 1）で `/photo` を確認:
    - 隣り合う2枚の間の余白（幅 40px）の中央にポインターを置くと、canvas は4枚で、期待集合（ポインターから半径内の写真を独立に計算したもの）と一致した。各 canvas は自分の写真の表示領域と同じ位置・大きさだった。
    - 写真を `visibility: hidden` にして、ドットだけを撮った画像で確認した。余白の帯の非白画素は 0。左右の写真の内側には非白画素があった（44,862 px と 28,109 px）。
    - ビューポート右下にポインターを置いた場合も、期待集合と一致した（4枚）。
    - ギャラリー外へ出ると、400ms 後に canvas は 0 になり、写真の mask も解除されていた。
    - ポインターを動かさずに window を 120px・300px 下へ、さらに 420px 上へスクロールした各時点で、canvas の集合は「ポインターから半径内の写真」と一致した（7・6・6 枚）。
    - 動きを減らす設定、タッチ入力（CDP）、詳細モーダル表示中の canvas は 0 だった。
    - pageerror と console.error はなし。console.warning は、SwiftShader への WebGL フォールバックの案内と ReadPixels の GPU 警告だけで、この環境によるものと判断した（アプリのコードは出していない）。
  - スクリーンショット（scratchpad）: `cursor_gap_full.png`、`cursor_gap_clip.png`、`cursor_gap_dots_only.png`、`cursor_after_scroll.png`、`cursor_baseline.png`。
- Visual Diffの確認・baseline更新の有無: 未実施（環境照合で停止）。baseline 更新なし。
- 未確認事項・残課題:
  - 静止時の Visual 比較（`.thumbnail` の追加と `img` の `display: block`）は、環境照合の通る環境で `npm run visual -- --grep 'page:photo(?: |-)'` を実行して確認する必要がある。
  - 実機（iOS Safari・Android Chrome）のホバーとタッチ、実 GPU での描画は未確認。
  - 同時にマウントされるのは、観測した範囲で最大7枚（9枚の一覧、半径 500）。実機での負荷は未確認。
  - `resize` での再判定は契約外の追加（上記）。
- 関連コミット・PR: 未コミット。
