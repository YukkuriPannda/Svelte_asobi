# 写真ギャラリー用サムネイル

`/photo` のタイルは `static/photo-thumbnails/` に置いたWebPを読み込む。元写真は `img.rhoknov.net` に残り、写真詳細を開いたときだけ元の `img_path` を読み込む。Cloudflareの画像変換設定やキーは使わない。

## 新しい写真を追加するとき

1. `content/photos/<id>.md` に公開する写真の `img_path` を追加する。
2. 生成対象を確定するため、その写真MarkdownだけをGitに追加する: `git add content/photos/<id>.md`。
3. `npm run photos:thumbnails` を実行する。
4. `npm run check:photo-thumbnails` と `npm run build:svelte` を実行する。
5. Markdownと対応する `static/photo-thumbnails/` のWebP、`manifest.json` を一緒にレビューする。

生成器は `git ls-files content/photos/*.md` が返す追跡済みMarkdownだけを対象にする。通常のbuildではネットから写真をダウンロードしない。サムネイルは幅768px以下、縦横比を維持して拡大せず、EXIFの向きを適用し、WebP品質80で保存する。元画像は変更しない。

`npm run check:photo-thumbnails` はGitで追跡された各写真のIDと `img_path` をmanifestと照合し、ファイル不足や古いIDを検出する。Cloudflare Pagesのbuild環境でもGitコマンドを使うため、ソースcheckoutが必要。`npm run build` はMarkdown全体をJSON化するので、未追跡のローカル写真がある作業ツリーではその写真を含みうる。公開buildはclean checkoutで行い、ローカルではまず `npm run build:svelte` でSvelte側だけ確認する。サムネイル読み込みに失敗したタイルは、元画像へ切り替えずエラー表示を出す。
