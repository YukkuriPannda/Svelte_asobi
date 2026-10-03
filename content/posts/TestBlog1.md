---
draft: true
title: 初投稿のブログテストだよ
date: 2024-03-11
---

# 📄初投稿です。よろしく

やっとブログを作れた。
思い立ってはや2年、色々なフレームワークなどをゲーム制作の間を縫って試しつつ、やっと完成まで漕ぎ着けた

## 私について

ゲームプログラマーです。 写真も撮ります。ウェブも書きます。 デザインもします。
https://twitter.com/Rhoknov

## 🛠️ブログの技術構成について

基本的には以下のフレームワーク、パッケージを使用している。

- svelte
- sveltekit
- cloud flare
- contentlayer
- github-markdown-css
- svelte-markdown 今回はデプロイにcloud
  flareを使うため、静的なサイトにしなければいけない。
  そのため記事の内容を返すapiを作るなどの動的な機能を使うことはできない。
  そこで今回は記事の内容をmarkdownのファイルを書いて、そこからcontentlayerで記事一覧のファイルを生成するという手段を取る。

```ts
import posts__testBlog1Md from "./posts__TestBlog1.md.json" assert {
  type: "json",
};
import posts__testBlog2Md from "./posts__TestBlog2.md.json" assert {
  type: "json",
};

export const allPosts = [posts__testBlog1Md, posts__testBlog2Md];
```

生成した記事一覧ファイルを、+page.svelteでimportし、svelte-markdownでmarkdown形式のテキストをsvelteのcompornentに変換し、その上からgithub-markdown-cssを適用、表示している。
記事を投稿するときは記事のmarkdownファイルをgithubリポジトリにコミットするだけだ。
cloudflare側がコミットを検知したらリポジトリから`npm run buid`を自動的に実行し、サイトが公開される。

## ContentLayerについて

ContentLayerとは、markdown形式のファイルをjson形式のファイルにまとめ、staticなサイトでも、markdown形式で書いた記事を扱うことができるツールだ。\
Next.jsにおいては公式でサポートされているが、Svelteにおいては公式にサポートするかの投票が行われた以外の音沙汰はない。\
そのため、[こちら](https://github.com/git-no/sveltekit-contentlayer-example/tree/main)のリポジトリを参考に、`npm run buid`時に`contentlayer build`が行われるように設定した。\
上質なリポジトリでとても助かった。
