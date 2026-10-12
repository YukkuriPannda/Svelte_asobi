# 写真 Markdown テンプレート CLI

写真ファイルを渡すと、EXIFから日付と登録済みの撮影機材を読み取り、`content/photos/` 用の下書き Markdown を作ります。

```bash
npm run photos:template -- "写真へのパス.jpg"
```

標準では、リポジトリの `content/photos/` に写真ファイルと同じ名前の `.md` を作成します。たとえば `旅行 写真.JPG` なら `content/photos/旅行 写真.md` です。出力先は `--output` で変更でき、相対パスはコマンドを実行したディレクトリから解決します。

```bash
npm run photos:template -- "写真へのパス.jpg" --output "content/photos/旅行.md" --img-path "/photos/旅行.jpg"
```

`--img-path` はサイトから配信できる画像 URL 用です。元写真のローカルパスはサイトから表示できないため、指定しない場合は空欄になります。作成したテンプレートで `title` を入力し、frontmatter の閉じ区切り `---` より後に説明文を書いてください。`draft` は `true`、`tags` は空の配列で始まります。

生成後は、次のようにタイトルと説明文を記入します（日付・機材・画像 URL は実際のEXIFや指定内容に応じて入ります）。

```markdown
---
draft: true
title: '写真のタイトル'
date: ''
img_path: ''
equipments: []
tags: []
---

ここに写真の説明文を書きます。
```

日付はEXIFの `DateTimeOriginal`、なければ `CreateDate` から `YYYY-MM-DD` として設定します。日付だけを取り出すため、撮影時刻が実行環境のタイムゾーンでずれることはありません。両方ない場合は空欄です。

機材は登録済みの次の4種類だけを出力します。EXIFのカメラ名・レンズ名がこれらのモデルと一致しない場合は省略します。また、対応するPNGが `static/cameras/` にある場合だけ出力します。レンズ名はEXIFの典型的な焦点距離表記までを照合します。

- `EF-S 24mm`
- `EF-50mm`
- `Canon EOS70D`
- `Canon EOS5D`

CLIの自動テストでは、合成EXIFを入れたJPEG、EXIFのないJPEG、ファイル名に空白・日本語を含む画像、後続データを持つJPEGを確認しています。EXIF読み取りには `exifr` を使います。

既存ファイルは上書きせず、エラーで終了します。写真ファイル自体は読み取り専用です。ヘルプは次のコマンドで表示できます。

```bash
npm run photos:template -- --help
```
