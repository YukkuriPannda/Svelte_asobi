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
| `photo-5-sonote`              | `modal`             | `.modal:not(.hide)`        |
| `photo-5-sonote`              | `image`             | `.modal:not(.hide) .photo` |
| `photo-6-ugoki_houkou01-copy` | `modal`             | `.modal:not(.hide)`        |
| `photo-6-ugoki_houkou01-copy` | `image`             | `.modal:not(.hide) .photo` |
| `photo-7-ugoki_houkou01`      | `modal`             | `.modal:not(.hide)`        |
| `photo-7-ugoki_houkou01`      | `image`             | `.modal:not(.hide) .photo` |

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
