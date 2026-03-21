# SnapBaton 引き継ぎ資料

**最終更新**: 2026-03-20
**リポジトリ**: https://github.com/fujiruki/snapbaton

---

## プロジェクト概要

WordPress ギャラリー & SNSワークフロープラグイン。
撮影者が写真をアップして説明文を書く → SNS担当者がそれを見て投稿文を作成 → X/Instagram/Facebook/note等へ投稿。

詳細は `docs/SPEC.md` を起点に仕様書を参照。

---

## 現在の状態

### 実装済み

#### PHP（プラグイン本体）
| ファイル | 内容 |
|:--|:--|
| `snapbaton.php` | メインプラグインファイル。WPヘッダー、フック登録、`big_image_size_threshold` 無効化 |
| `includes/class-activator.php` | DB7テーブル作成（groups, tags, group_tags, images, image_tags, post_sets, post_set_images） |
| `includes/class-admin.php` | WP管理画面メニュー登録（5ページ）、Reactアプリマウント、アセット読み込み |
| `includes/class-rest-api.php` | 全REST APIエンドポイント（Groups/Images/PostSets/Tags/Share の CRUD） |
| `includes/class-permissions.php` | WPロールベースの権限管理（manage/edit/upload/delete/view） |
| `includes/class-public-upload.php` | スマホ公開アップロードページ（パスコード認証、グループ選択、ファイルアップロード） |
| `includes/class-gallery.php` | 公開ギャラリー（`[snapbaton_gallery]` ショートコード、マソンリー、ライトボックス、タグフィルタ） |

#### React（管理画面UI）
| ファイル | 内容 |
|:--|:--|
| `admin/src/api.ts` | WP REST APIクライアント（POST方式、nonce認証付き） |
| `admin/src/App.tsx` | ルーティング（groups / group-detail / post-sets） |
| `admin/src/pages/GroupList.tsx` | グループ一覧（グリッド/リスト切替、新規作成、スマホアップロード情報パネル） |
| `admin/src/pages/GroupDetail.tsx` | グループ詳細（D&Dアップロード、インライン自動保存、タグ、公開トグル、クリア履歴） |
| `admin/src/pages/PostSetList.tsx` | 投稿セット一覧（作成、SNS選択、ステータス管理、投稿文コピー） |
| `admin/src/components/TagInput.tsx` | タグ入力コンポーネント（最近のタグ10件、コンボボックス検索、新規作成） |
| `admin/src/components/Toast.tsx` | トースト通知 |
| `admin/src/hooks/useToast.ts` | トースト管理フック |
| `admin/src/styles.css` | 管理画面CSS |

### 未実装（GitHub Issues参照）
| Issue | 内容 |
|:--|:--|
| #1 | ゴミ箱画面の実装 |
| #2 | 投稿セットへの画像選択・並べ替えUI |
| #3 | CSVエクスポート機能 |
| #4 | EXIF書き込み機能 |
| #5 | 共有URL（AI連携用）の認証方式決定 |
| #6 | react-image-editor-lightbox の組み込み |

---

## 技術スタック

| レイヤー | 技術 |
|:--|:--|
| プラグイン本体 | PHP 8.0+ |
| 管理画面UI | React 19 + TypeScript + Vite 8 |
| アイコン | lucide-react |
| ビルド出力 | `admin/build/assets/index.js` |
| DB | WordPress標準DB + カスタムテーブル（`wp_snapbaton_*`） |
| 画像保存 | WPメディアライブラリ（`attachment_id` で紐づけ） |

---

## 開発環境セットアップ

```bash
# 管理画面UIの開発
cd admin
npm install
npm run dev    # ポート5180でHMR開発サーバー
npm run build  # ビルド（admin/build/ に出力）
```

WordPress側：
- `wp-content/plugins/` に本ディレクトリをシンボリックリンク or コピー
- WP管理画面 → プラグイン → SnapBaton を有効化（テーブルが自動作成される）

---

## REST APIエンドポイント一覧

| メソッド | パス | 権限 | 説明 |
|:--|:--|:--|:--|
| GET | `/wp-json/snapbaton/v1/groups` | read | グループ一覧 |
| POST | `/wp-json/snapbaton/v1/groups` | edit_posts | グループ作成 |
| GET | `/wp-json/snapbaton/v1/groups/{id}` | read | グループ詳細（タグ含む） |
| PUT | `/wp-json/snapbaton/v1/groups/{id}` | edit_posts | グループ更新 |
| DELETE | `/wp-json/snapbaton/v1/groups/{id}` | edit_others_posts | グループ論理削除 |
| GET | `/wp-json/snapbaton/v1/groups/{id}/images` | read | グループ内画像一覧 |
| POST | `/wp-json/snapbaton/v1/groups/{id}/images` | edit_posts | 画像アップロード |
| GET | `/wp-json/snapbaton/v1/images/{id}` | read | 画像詳細 |
| PUT | `/wp-json/snapbaton/v1/images/{id}` | edit_posts | 画像メタ更新 |
| DELETE | `/wp-json/snapbaton/v1/images/{id}` | edit_others_posts | 画像論理削除 |
| GET | `/wp-json/snapbaton/v1/post-sets` | read | 投稿セット一覧 |
| POST | `/wp-json/snapbaton/v1/post-sets` | edit_posts | 投稿セット作成 |
| GET | `/wp-json/snapbaton/v1/post-sets/{id}` | read | 投稿セット詳細（画像含む） |
| PUT | `/wp-json/snapbaton/v1/post-sets/{id}` | edit_posts | 投稿セット更新 |
| DELETE | `/wp-json/snapbaton/v1/post-sets/{id}` | edit_others_posts | 投稿セット削除 |
| GET | `/wp-json/snapbaton/v1/share/{id}` | 認証なし | AI連携用共有URL |
| GET | `/wp-json/snapbaton/v1/tags` | read | タグ一覧 |

---

## DBテーブル構造

テーブルプレフィックス: `{wp_prefix}snapbaton_`

- `groups` — グループ（ソフトデリート: deleted_at）
- `tags` — タグ（UNIQUE: name）
- `group_tags` — グループ×タグ中間テーブル
- `images` — 画像メタデータ（WP attachment_id で紐づけ、ソフトデリート）
- `post_sets` — 投稿セット（status: draft/posted）
- `post_set_images` — 投稿セット×画像（sort_order付き）

詳細は `docs/spec/04_データ設計.md` を参照。

---

## 設計上の重要な判断

1. **画像はWPメディアライブラリに保存** — 独自ファイル管理はしない。`attachment_id` で参照
2. **オリジナルサイズ保持** — `big_image_size_threshold` を `__return_false` で無効化
3. **ソフトデリート** — groups, images は `deleted_at` カラムで論理削除。物理削除は管理者のみ
4. **WPロールにマッピング** — 独自ロールは作らない。管理者/編集者/投稿者/購読者をそのまま使う
5. **共有URL** — `/share/{id}` は現状認証なし公開。要検討（Issue #5）
6. **EXIFは読み取りのみ実装済み** — 書き込みはPEL等のライブラリ選定が必要（Issue #4）

---

## 仕様書駆動開発ワークフロー

このプロジェクトは仕様書駆動開発で進めている。

- `docs/SPEC.md` — 仕様の目次（AIが最初に読む）
- `docs/requests.md` — 未対応の要望（晴樹さんが書く）
- `docs/request_log.md` — 全リクエスト履歴（AIが管理）
- `docs/spec/*.md` — 正式な仕様書（AIが管理）
- `/spec-sync` コマンドで requests.md を処理

ワークフローの詳細は `C:\Fujiruki\00_AI共通\仕様書駆動開発ワークフロー.md` を参照。

---

## GitHub情報

- リポジトリ: https://github.com/fujiruki/snapbaton
- アカウント: fujiruki
- ライセンス: GPL v2（予定）
- 認証: Fine-grained token（repo: Administration, Contents, Issues, Workflows, Environments 等）
