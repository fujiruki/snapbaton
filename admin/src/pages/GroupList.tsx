import { useEffect, useState, useRef } from 'react';
import { Plus, Grid, List, Image as ImageIcon, Smartphone, Copy, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../api';

interface Group {
  id: number;
  name: string;
  description: string;
  image_count: number;
  cover_thumbnail: string | null;
  created_at: string;
}

interface Props {
  onSelectGroup: (id: number) => void;
}

export function GroupList({ onSelectGroup }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showQr, setShowQr] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api.get<Group[]>('/groups').then((data) => {
      setGroups(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (showQr && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, snapbatonData.uploadUrl, { width: 240, margin: 2 });
    }
  }, [showQr]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await api.post<{ id: number }>('/groups', {
      name: newName,
      description: newDesc,
    });
    setGroups([
      {
        id: result.id,
        name: newName,
        description: newDesc,
        image_count: 0,
        cover_thumbnail: null,
        created_at: new Date().toISOString(),
      },
      ...groups,
    ]);
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  if (loading) {
    return (
      <div className="sb-loading">
        <div className="sb-spinner" />
        読み込み中...
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="sb-header">
        <h1 className="wp-heading-inline">SnapBaton</h1>
      </div>

      <div className="sb-toolbar">
        {snapbatonData.canEdit && (
          <button className="button button-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> 新しいグループ
          </button>
        )}
        <button
          className="button"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          title={viewMode === 'grid' ? 'リスト表示' : 'グリッド表示'}
        >
          {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
        </button>
      </div>

      {snapbatonData.canManage && snapbatonData.uploadUrl && (
        <div className="sb-upload-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Smartphone size={16} />
            <strong>スマホアップロード</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ background: '#f0f0f1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>
              {snapbatonData.uploadUrl}
            </code>
            <button
              className="button button-small"
              onClick={() => {
                navigator.clipboard.writeText(snapbatonData.uploadUrl);
              }}
              title="URLをコピー"
            >
              <Copy size={12} />
            </button>
            <button
              className="button button-small"
              onClick={() => setShowQr(true)}
              title="QRコードを表示"
            >
              <QrCode size={12} />
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#646970' }}>
            パスコード: <strong>{snapbatonData.uploadPass}</strong>
            　｜　このURLをスマホに送って、ホーム画面に追加すると便利です
          </p>
        </div>
      )}

      {showCreate && (
        <div className="sb-create-form">
          <input
            type="text"
            className="regular-text"
            placeholder="グループ名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <textarea
            className="large-text"
            rows={2}
            placeholder="説明（任意）"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="sb-form-actions">
            <button className="button button-primary" onClick={handleCreate}>作成</button>
            <button className="button" onClick={() => setShowCreate(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="sb-grid">
          {groups.map((g) => (
            <div key={g.id} className="sb-group-card" onClick={() => onSelectGroup(g.id)}>
              <div className="sb-group-card-thumb">
                {g.cover_thumbnail ? (
                  <img src={g.cover_thumbnail} alt={g.name} />
                ) : (
                  <span className="sb-no-thumb">
                    <ImageIcon size={32} strokeWidth={1} />
                  </span>
                )}
              </div>
              <div className="sb-group-card-body">
                <h3>{g.name}</h3>
                <p>{g.description || '\u00A0'}</p>
              </div>
              <div className="sb-group-card-footer">
                <span>{g.image_count ?? 0} 枚</span>
                <span>{new Date(g.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <th>グループ名</th>
              <th>説明</th>
              <th style={{ width: '80px' }}>画像数</th>
              <th style={{ width: '120px' }}>作成日</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => onSelectGroup(g.id)}>
                <td><strong>{g.name}</strong></td>
                <td>{g.description || '—'}</td>
                <td>{g.image_count ?? 0} 枚</td>
                <td>{new Date(g.created_at).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {groups.length === 0 && (
        <div className="sb-empty">
          <ImageIcon size={48} strokeWidth={1} />
          <p>グループがまだありません。</p>
          <p>「新しいグループ」から最初のグループを作成しましょう。</p>
        </div>
      )}

      {showQr && (
        <div className="sb-qr-overlay" onClick={() => setShowQr(false)}>
          <div className="sb-qr-popup" onClick={(e) => e.stopPropagation()}>
            <button className="sb-qr-close" onClick={() => setShowQr(false)}>
              <X size={20} />
            </button>
            <h3>スマホでスキャン</h3>
            <canvas ref={qrCanvasRef} />
            <p className="sb-qr-url">{snapbatonData.uploadUrl}</p>
            <p className="sb-qr-pass">パスコード: <strong>{snapbatonData.uploadPass}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
}
