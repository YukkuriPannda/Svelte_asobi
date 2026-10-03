# route-blog-detail の作業記録

## 対象

- ソース: `src/routes/blog/[blog_id]/+page.svelte`
- 使用route: `/blog/[blog_id]`

## Visual検証

同じコンポーネントの表示バリエーションを以下のページで検証する。

| ページID                     | Visual component ID | セレクタ         |
| ---------------------------- | ------------------- | ---------------- |
| `blog-Claude_Vibe`           | `article`           | `.markdown-body` |
| `blog-Claude_Vibe`           | `toc`               | `.toc`           |
| `blog-drive_my_car`          | `article`           | `.markdown-body` |
| `blog-drive_my_car`          | `toc`               | `.toc`           |
| `blog-JBLT450bt01`           | `article`           | `.markdown-body` |
| `blog-JBLT450bt01`           | `toc`               | `.toc`           |
| `blog-LimiT`                 | `article`           | `.markdown-body` |
| `blog-LimiT`                 | `toc`               | `.toc`           |
| `blog-onnnanoinai-otokotati` | `article`           | `.markdown-body` |
| `blog-onnnanoinai-otokotati` | `toc`               | `.toc`           |
| `blog-PignosePGB100`         | `article`           | `.markdown-body` |
| `blog-PignosePGB100`         | `toc`               | `.toc`           |
| `blog-TestBlog1`             | `article`           | `.markdown-body` |
| `blog-TestBlog1`             | `toc`               | `.toc`           |

```powershell
npm run visual -- --grep 'component:(article|toc)$'
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
