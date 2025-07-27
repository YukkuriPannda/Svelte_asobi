---
draft: true
title: ワイヤレスヘッドフォンJBL T450BTを改造してみよう#その１
date: 2025-02-04
thumnail_path: https://img.rhoknov.net/thumnail.png
description: 1. バッテリーの交換 2. 有線モードの追加 3. オレンジのアクセントカラーを入れる 4. リケーブルへの対応 5. ヘッドバンドの追加
---

## ワイヤレスヘッドフォンを入手した

ワイヤレスヘッドフォンが自宅に落ちていた。

バッテリーがへたっていたためバッテリー交換をしようと思う。

でも、それだけじゃつまらんじゃん？ いろいろ改造したいよね

## 今回改造していくヘッドフォンについて

![JBLT450BT](https://img.rhoknov.net/450BT_black_angle_01-1606x1606px.jpg)

**JBL T450BT**
JBLから2017年にリリースされた5000円中盤の**ワイヤレスヘッドフォン**で低音に強いのが特徴だ。

同社から発売されたT450のBluetoothバージョンとなっている。

ドライバ径は32mmで重量は320gと軽量だ。

公称では11時間充電が持つが、長年の酷使により１時間ともたない高級耳当てと化した。

## どのような改造をしたいか

どのような改造をしていこう

1. バッテリーの交換
2. 有線モードの追加
3. オレンジのアクセントカラーを入れる
4. リケーブルへの対応
5. ヘッドバンドの追加

1については当然必要だ。これがないと動かない。

2以降は完全に趣味である。最近**MOON DROP dawn
pro**というポータブルオーディオDACを購入した。

こいつを使い倒したいのである。

moon drop dawn
proは4.4mmバランス接続に対応しているため、バランス接続してみたら面白そうだ

4は単純にかっこいいからである。

最近黒とオレンジの色の組み合わせにはまっている。ただそれだけだ。

5はヘッドバンドがあるだけで高見えするから。男の子って単純ね。

## 分解してみよう

とりあえず参考にこの動画を見る

<iframe width="560" height="315" src="https://www.youtube.com/embed/j61LaWcByOM?si=ijVutsoRyQFQPIFw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

なになにイヤーパッドを外すとネジが3つ出てきて...?そこをあけると...?

![1](https://img.rhoknov.net/AP1GczPQciAPTBr3llkXB1FfrY6dmsA4.png)

おおバッテリーと基盤が出てきた

ふた側はドライバーユニットとなっており、二つの電極のみが露出している。

その電極と基盤側の電極を触れ合わせると回路が導通するようだ。

~~いいんか...こんなんで...~~

![2](https://img.rhoknov.net/AP1GczN8Vk2DZXuQ2-V1S5XWFTMB0To6.png)

バッテリーはこんな感じ

安全回路つきの3.7Vリポバッテリーだ。

## 音、出してみよう

いったんドライバユニットも出てきたところだし音声波形を流して音を出してみたい。

ということで用意したのはこの二つ
![3](https://img.rhoknov.net/AP1GczMeXMCEd9omSydB1eVsNcZYeGQx.png)
**我が家の中でいちばん壊れてもどうにかなる音声波形を出力してくれる装置～～～～**
![4](https://img.rhoknov.net/AP1GczNgfkbssdZNZn8cH7VIzUt_mzmu.png)
**そこらへんに落ちてた3.5mmの延長ケーブルをぶった切って芯線をひねり出して無理やりワニ口にはんだでくっつけたやつ～～～～～**

~~なんか画像では片方ちぎれてるけど～～～～~~

**こいつを～～～～～～～？？？？？**

![5](https://img.rhoknov.net/plboq-pdiik.gif)

**刺す～～～～～～～～！！！！！**

![6](https://img.rhoknov.net/IMG_3205.gif)

**鳴らす～～～～～～～！！！！！**

**！！！！！**

**！！！！！**

**鳴る～～～～～～～！！！！！**

ということで、なった。 ここに電流を流すことで音が流れることがわかった。

## もう一段階分解しつつ寸法を図る

![7](https://img.rhoknov.net/AP1GczMnjcqh6DyxjNZNiwV2cdjXJxyW.png)

/ ﾊﾟｶ \

超シンプル。

どうやら緑の基盤の電極に電流を流せばいいようだ。

今回は有線モードとBluetoothモード両方選択できるようにしたいので新規に基盤を作る必要がある。

ということで基盤のサイズの制限を調べるために完成予想図を下記ながら寸法を調べていこう。

![8](https://img.rhoknov.net/AP1GczOThvdHdA1B1WZyXk0Y6KTXlWKX.png)

こんなかんじの構造で作ればいけそう。

オレンジが3.5mmジャック、緑が基盤あとはまあノリだ。

ネジは一つぶち抜く必要がありそう。

## To be contenue...

今日はつかれたのでここまで。

次回は回路図を書いて部品選定を行い、組んでみようともっている。

割と長期シリーズになる気がする
