# BlogPanel の作業記録

## 対象

- ソース: `src/lib/components/BlogPanel.svelte`
- 使用route: `/blog`

## Visual検証

同じコンポーネントの表示バリエーションを以下のページで検証する。

| ページID | Visual component ID          | セレクタ                                             |
| -------- | ---------------------------- | ---------------------------------------------------- |
| `blog`   | `card-Claude_Vibe`           | `[data-visual-id="blog-card-Claude_Vibe"]`           |
| `blog`   | `card-drive_my_car`          | `[data-visual-id="blog-card-drive_my_car"]`          |
| `blog`   | `card-JBLT450bt01`           | `[data-visual-id="blog-card-JBLT450bt01"]`           |
| `blog`   | `card-LimiT`                 | `[data-visual-id="blog-card-LimiT"]`                 |
| `blog`   | `card-onnnanoinai-otokotati` | `[data-visual-id="blog-card-onnnanoinai-otokotati"]` |
| `blog`   | `card-PignosePGB100`         | `[data-visual-id="blog-card-PignosePGB100"]`         |
| `blog`   | `card-TestBlog1`             | `[data-visual-id="blog-card-TestBlog1"]`             |

```powershell
npm run visual -- --grep 'component:(card-Claude_Vibe|card-drive_my_car|card-JBLT450bt01|card-LimiT|card-onnnanoinai-otokotati|card-PignosePGB100|card-TestBlog1)$'
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
