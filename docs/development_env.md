# SnapBaton 開発環境

## 基本情報

| 項目 | 値 |
|:--|:--|
| プロジェクト種別 | WordPressプラグイン |
| AppID | `sb` |
| テーブルプレフィックス | `snapbaton_` |
| テキストドメイン | `snapbaton` |
| 管理画面React開発ポート | `5180` |
| GitHub | `fujiruki-dev/snapbaton`（予定） |

## 開発環境の前提

- WordPress がローカルで動作していること（Local by Flywheel / XAMPP等）
- WPの `wp-content/plugins/` に本プラグインをシンボリックリンクまたはコピー
- PHP 8.0+
- Node.js 18+

## 管理画面UIの開発

```bash
cd admin
npm install
npm run dev  # ポート5180でHMR開発サーバー起動
npm run build  # ビルド（プラグインに同梱するファイル生成）
```

## 本番デプロイ

| 項目 | 値 |
|:--|:--|
| サーバー | www1045.conoha.ne.jp（ConoHa WING、他プロジェクトと共通） |
| SSHユーザー / ポート | c6924945 / 8022 |
| SSH鍵 | `C:\Fujiruki\Secret\key-2026-03-21-18-16-ConohaforAI.pem`（共通鍵） |
| 本番WordPress本体 | `public_html/door-fujita.com/`（ドメイン直下） |
| 本番プラグイン配置先 | `public_html/door-fujita.com/wp-content/plugins/snapbaton` |
| デプロイスクリプト | `upload.ps1`（`admin`をビルドしてプラグイン一式をrsync/tar転送） |

他プロジェクト（例: Youkan）と異なり、snapbatonは`/contents/[AppID]/`配下の独立Webアプリではなく
WordPressプラグイン本体なので、デプロイ先はWordPressの`wp-content/plugins/snapbaton`になる。
