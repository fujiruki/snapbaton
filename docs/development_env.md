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
