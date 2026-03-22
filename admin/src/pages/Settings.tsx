import { useEffect, useState } from 'react';
import { ExternalLink, BookOpen, Copy } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

interface GalleryPage {
  id: number;
  title: string;
  status: string;
  url: string;
  edit: string;
}

export function Settings() {
  const [pages, setPages] = useState<GalleryPage[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<GalleryPage[]>('/gallery-pages').then((data) => {
      setPages(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const copyShortcode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.show('ショートコードをコピーしました');
  };

  return (
    <div className="wrap">
      <div className="sb-header">
        <h1 className="wp-heading-inline">設定・ヘルプ</h1>
      </div>

      {/* ギャラリー挿入ヘルプ */}
      <div className="sb-card-section">
        <h2><BookOpen size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />ギャラリーの挿入方法</h2>

        <div className="sb-help-steps">
          <div className="sb-help-step">
            <div className="sb-help-step-num">1</div>
            <div>
              <strong>グループを「公開」にする</strong>
              <p>SnapBaton → グループ詳細 → 「非公開」ボタンをクリックして「公開中」にする</p>
            </div>
          </div>
          <div className="sb-help-step">
            <div className="sb-help-step-num">2</div>
            <div>
              <strong>固定ページにショートコードを貼り付ける</strong>
              <p>WP管理画面 → 固定ページ → 編集 → 本文に以下を貼り付け：</p>
              <div className="sb-code-block">
                <code>[snapbaton_gallery]</code>
                <button className="button button-small" onClick={() => copyShortcode('[snapbaton_gallery]')}>
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>
          <div className="sb-help-step">
            <div className="sb-help-step-num">3</div>
            <div>
              <strong>ページを公開・更新する</strong>
              <p>公開中のグループがマソンリーグリッドで表示されます</p>
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: '20px' }}>ショートコードのオプション</h3>
        <table className="wp-list-table widefat fixed" style={{ marginTop: '8px' }}>
          <thead>
            <tr>
              <th style={{ width: '200px' }}>属性</th>
              <th>説明</th>
              <th style={{ width: '120px' }}>デフォルト</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>columns</code></td>
              <td>PCでのカラム数（1〜6）</td>
              <td>3</td>
              <td></td>
            </tr>
            <tr>
              <td><code>group_id</code></td>
              <td>特定のグループのみ表示（カンマ区切りで複数可）</td>
              <td>全公開グループ</td>
              <td></td>
            </tr>
            <tr>
              <td><code>contact_url</code></td>
              <td>「問い合わせる」ボタンのリンク先URL</td>
              <td>なし</td>
              <td></td>
            </tr>
            <tr>
              <td><code>show_description</code></td>
              <td>グループ名・説明文の表示（true/false）</td>
              <td>true</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ marginTop: '16px' }}>使用例</h3>
        <div className="sb-code-block" style={{ marginTop: '8px' }}>
          <code>[snapbaton_gallery columns="2" contact_url="/contact/"]</code>
          <button className="button button-small" onClick={() => copyShortcode('[snapbaton_gallery columns="2" contact_url="/contact/"]')}>
            <Copy size={12} />
          </button>
        </div>
        <div className="sb-code-block" style={{ marginTop: '6px' }}>
          <code>[snapbaton_gallery group_id="1,3" show_description="false"]</code>
          <button className="button button-small" onClick={() => copyShortcode('[snapbaton_gallery group_id="1,3" show_description="false"]')}>
            <Copy size={12} />
          </button>
        </div>
      </div>

      {/* ギャラリー挿入状況 */}
      <div className="sb-card-section" style={{ marginTop: '24px' }}>
        <h2>ギャラリーが挿入されているページ</h2>

        {loading ? (
          <div className="sb-loading"><div className="sb-spinner" /> 読み込み中...</div>
        ) : pages.length === 0 ? (
          <p style={{ color: '#a7aaad', padding: '16px 0' }}>
            まだどのページにもギャラリーが挿入されていません。
          </p>
        ) : (
          <table className="wp-list-table widefat fixed striped" style={{ marginTop: '8px' }}>
            <thead>
              <tr>
                <th>ページ名</th>
                <th style={{ width: '80px' }}>状態</th>
                <th style={{ width: '180px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      background: p.status === 'publish' ? '#edfaef' : '#f0f0f1',
                      color: p.status === 'publish' ? '#00a32a' : '#646970',
                    }}>
                      {p.status === 'publish' ? '公開中' : p.status === 'draft' ? '下書き' : p.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={p.url} target="_blank" rel="noopener" className="button button-small">
                        <ExternalLink size={12} /> 表示
                      </a>
                      <a href={p.edit} className="button button-small">
                        編集
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Toast message={toast.message} />
    </div>
  );
}
