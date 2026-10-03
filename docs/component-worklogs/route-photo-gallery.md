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
| `photo`  | `tile-5`            | `[data-visual-id="photo-sonote"]`              |
| `photo`  | `tile-6`            | `[data-visual-id="photo-ugoki_houkou01 copy"]` |
| `photo`  | `tile-7`            | `[data-visual-id="photo-ugoki_houkou01"]`      |

```powershell
npm run visual -- --grep 'component:(gallery|tile-0|tile-1|tile-2|tile-3|tile-4|tile-5|tile-6|tile-7)$'
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
