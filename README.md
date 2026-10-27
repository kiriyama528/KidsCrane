# ぽかぽかクレーン

3・4歳向けの、文字を読まずにタッチで遊ぶぬいぐるみクレーン。MechaBoardから独立した静的HTMLです。

## 遊ぶ

**[ぽかぽかクレーンで遊ぶ](https://kiriyama528.github.io/KidsCrane/)**

GitHub Pagesの公開版は、スマホのブラウザーでURLを開くだけで遊べます。ログインは不要です。

`dist/index.html` をブラウザーで開けば動きます。HTML・CSS・通常のJavaScript・SVGのみで、ビルド、外部素材、フォント、API、アカウントは不要です。`dist/` 全体を静的ホスティングへ置くこともできます。

同じWi-Fiのスマホで試す場合:

```powershell
node scripts/preview.mjs
```

表示される `Phone on same Wi-Fi` のURLをスマホで開きます。Windowsファイアウォールの許可状況によっては接続できません。

## 操作

1. 台の中のほしいぬいぐるみをタッチ。左右ボタンでも移動できます。
2. 中央の大きなクレーンボタンを押す。
3. 取り出し口に届いた子をタッチして受け取る。

棚は最近受け取った5体。別画面や育成はなく、続けてクレーンで遊べます。音の切り替え、一時停止、指のお手本の再表示が可能です。キー操作は左右矢印、Tab、Enter/Space、Escapeに対応します。

保存するのは音の設定と棚の5体だけです。端末内のlocalStorageへ保存し、保存が使えない場合も遊べます。途中のクレーン動作は保存しません。外部への通信、広告、課金、ユーザー投稿、解析はありません。

## 確認

```powershell
node --test tests/rules.test.mjs
node --check dist/game.js
```

設計根拠、ガイドとの対応、実機で確認する点は [DESIGN.md](DESIGN.md) を参照してください。

## GitHub Pagesの更新

`main` ブランチへpushすると、[公開ワークフロー](.github/workflows/pages.yml)がJavaScriptの構文とゲームルールを確認し、成功した場合に `dist/` をGitHub Pagesへ公開します。依存パッケージのインストールやビルドは不要です。

リポジトリの **Settings → Pages → Build and deployment → Source** は **GitHub Actions** を使います。GitHubのActions画面から手動で再公開することもできます。

端末内の保存データはブラウザーと公開URLごとに独立しています。
