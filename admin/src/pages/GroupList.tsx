import { useEffect, useState } from 'react';
import { Plus, Grid, List, Image as ImageIcon } from 'lucide-react';
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

  useEffect(() => {
    api.get<Group[]>('/groups').then((data) => {
      setGroups(data);
      setLoading(false);
    });
  }, []);

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
    </div>
  );
}
