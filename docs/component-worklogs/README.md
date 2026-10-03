# コンポーネント別作業記録

Svelteコンポーネントのソースごとに一つの記録を持つ。propsや記事ID・写真IDが違っても同じ実装の記録にまとめる。route内のUIは独立コンポーネントとして切り出されていないため、routeのソース単位で記録する。

コンポーネント追加・削除・分割時は記録と索引を更新する。各記録の使用ページとVisual対象は `.visual/manifest.json` とソースに合わせて維持する。

| コンポーネント          | ソース                                              | 作業記録                           |
| ----------------------- | --------------------------------------------------- | ---------------------------------- |
| App                     | `src/lib/components/App.svelte`                     | [記録](App.md)                     |
| BlogDashboard           | `src/lib/components/BlogDashboard.svelte`           | [記録](BlogDashboard.md)           |
| BlogPanel               | `src/lib/components/BlogPanel.svelte`               | [記録](BlogPanel.md)               |
| Header                  | `src/lib/components/Header.svelte`                  | [記録](Header.md)                  |
| PhotoDetailModal-mobile | `src/lib/components/PhotoDetailModal-mobile.svelte` | [記録](PhotoDetailModal-mobile.md) |
| PhotoDetailModal        | `src/lib/components/PhotoDetailModal.svelte`        | [記録](PhotoDetailModal.md)        |
| Scene                   | `src/lib/components/Scene.svelte`                   | [記録](Scene.md)                   |
| UnderConstruction       | `src/lib/components/UnderConstruction.svelte`       | [記録](UnderConstruction.md)       |
| WorkPanels-Procont      | `src/lib/components/WorkPanels/Procont.svelte`      | [記録](WorkPanels-Procont.md)      |
| route-blog-detail       | `src/routes/blog/[blog_id]/+page.svelte`            | [記録](route-blog-detail.md)       |
| route-photo-gallery     | `src/routes/photo/+page.svelte`                     | [記録](route-photo-gallery.md)     |
| route-works-gallery     | `src/routes/works/+page.svelte`                     | [記録](route-works-gallery.md)     |
