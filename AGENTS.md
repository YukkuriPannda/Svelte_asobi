# エージェント向け作業ルール

## 作業の入口

- Git操作は [docs/git_rule.md](docs/git_rule.md) に従う。
- 対象コンポーネントの [作業記録](docs/component-worklogs/README.md) と関連ソースを読んでから変更する。
- 作業前に `git status --short` と現在のブランチを確認し、他の作業の変更を保持する。
- 依頼の範囲と受け入れ条件を整理し、必要なファイルだけを変更する。共有コンポーネントの変更は使用している全ページへの影響を確認する。

## 構成と編集対象

- `src/routes/`: SvelteKitのページ。ブログ詳細は `/blog/[blog_id]`、写真詳細は `/photo/[photo_id]`。
- `src/lib/components/`: 共有コンポーネント。
- `content/posts/`、`content/photos/`: 記事・写真の元データ。
- `scripts/PostDataPaser.ts`: 元データの変換。`src/lib/generated/` は生成物なので、内容を変更するときは元データを編集して `npm run build:parse-data` を実行する。
- `.visual/manifest.json`: ページと主要コンポーネントの検証対象。ページ・記事ID・写真IDを追加・削除したらmanifestと関連コンポーネントの使用ページ情報を更新する。コンポーネント追加・削除・分割時は作業記録の索引も更新する。

## 検証

- ロジック・Svelteの変更は `npm run check`、ビルドに関わる変更は `npm run build` で確認する。
- UI変更はまず `npm run visual -- --grep 'component:<id>$'` で対象を絞る。親ページへの影響は `npm run visual -- --grep 'page:<id> '` で確認する。共有コンポーネント変更は関連ページ、広範な変更は全件 `npm run visual` を実行する。
- 画像比較はPlaywright Testの `toHaveScreenshot()` に任せ、Agentは差分が発生した対象だけを確認する。
- 差分は `npm run visual:report` でexpected / actual / diffを確認する。baseline更新は意図した変更を確認してから `npm run visual:update` を使う。失敗を隠すための更新・比較閾値緩和はしない。
- 実行環境、外部fixture、対象限定コマンドは [.visual/README.md](.visual/README.md) を参照する。通常検証で `.visual/setup.mjs` は実行しない。
- 既存エラーと今回追加したエラーを区別し、実行コマンド・結果・未確認事項を記録する。

## 記録と完了

- コンポーネントを変更したら対象の `docs/component-worklogs/<component-name>.md` に追記する。共有コンポーネントは一つの記録にまとめ、影響したページ・props・表示状態を併記する。route内の未分離UIは対応するrouteの記録へ追記する。
- 調査だけの結果、実行していないテスト、実機未確認を成功として記録しない。
- ドキュメントとコミット説明は日本語を基本とする。
- ファイル変更を伴うタスクの完了報告では、[コミット命名規則](docs/git_rule.md#コミット命名規則)に沿ったコミットメッセージ案を必ず提示する。提案は今回の変更範囲に限定し、独立した目的が複数ある場合はコミットを分けた案を示す。変更がない場合は提案不要。すでにコミットした場合は実際のコミットメッセージを報告する。メッセージの提案だけでコミットを実行しない。
- 委任する場合はモデル・effort・担当範囲を事前に明示し、共有契約と編集境界を固定する。他の作業者の変更を戻さず、親Agentが差分と検証結果を確認する。
- コミット、push、merge、タグ、公開はユーザーの依頼範囲を確認する。コミット依頼だけでpushやmergeまで進めない。
