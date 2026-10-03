# Header の作業記録

## 対象

- ソース: `src/lib/components/Header.svelte`
- 使用route: `/`、`/blog`、`/works`、`/photo`、`/blog/[blog_id]`

## Visual検証

同じコンポーネントの表示バリエーションを以下のページで検証する。

| ページID                     | Visual component ID | セレクタ                    |
| ---------------------------- | ------------------- | --------------------------- |
| `home`                       | `header`            | `[data-visual-id="header"]` |
| `blog`                       | `header`            | `[data-visual-id="header"]` |
| `works`                      | `header`            | `[data-visual-id="header"]` |
| `photo`                      | `header`            | `[data-visual-id="header"]` |
| `blog-Claude_Vibe`           | `header`            | `[data-visual-id="header"]` |
| `blog-drive_my_car`          | `header`            | `[data-visual-id="header"]` |
| `blog-JBLT450bt01`           | `header`            | `[data-visual-id="header"]` |
| `blog-LimiT`                 | `header`            | `[data-visual-id="header"]` |
| `blog-onnnanoinai-otokotati` | `header`            | `[data-visual-id="header"]` |
| `blog-PignosePGB100`         | `header`            | `[data-visual-id="header"]` |
| `blog-TestBlog1`             | `header`            | `[data-visual-id="header"]` |

```powershell
npm run visual -- --grep 'component:(header)$'
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
