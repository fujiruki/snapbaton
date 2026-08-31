import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api';

interface Group {
  id: number;
  name: string;
}

interface Props {
  currentGroupId: number;
  count: number;
  onClose: () => void;
  onMove: (groupId: number) => Promise<void>;
}

export function MoveImagesModal({ currentGroupId, count, onClose, onMove }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Group[]>('/groups').then((data) =>
      setGroups(data.filter((g) => g.id !== currentGroupId))
    );
  }, [currentGroupId]);

  const handleMove = async () => {
    if (busy || (!selectedId && !newName.trim())) return;
    setBusy(true);
    try {
      if (newName.trim()) {
        const result = await api.post<{ id: number }>('/groups', { name: newName.trim() });
        await onMove(result.id);
      } else if (selectedId) {
        await onMove(selectedId);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sb-qr-overlay" onClick={onClose}>
      <div
        style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '360px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{count}件の画像を移動</h3>
          <button className="sb-qr-close" style={{ position: 'static' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 6px' }}>移動先のグループを選択</p>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dcdcde', borderRadius: '4px' }}>
          {groups.map((g) => (
            <label
              key={g.id}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f1', fontSize: '13px' }}
            >
              <input
                type="radio"
                name="sb-move-target-group"
                checked={selectedId === g.id}
                onChange={() => { setSelectedId(g.id); setNewName(''); }}
              />
              {g.name}
            </label>
          ))}
          {groups.length === 0 && (
            <p style={{ padding: '8px', fontSize: '12px', color: '#a7aaad', margin: 0 }}>移動先にできるグループがありません</p>
          )}
        </div>

        <p style={{ fontSize: '13px', color: '#646970', margin: '12px 0 6px' }}>または新しいグループを作成して移動</p>
        <input
          type="text"
          className="regular-text"
          style={{ width: '100%' }}
          placeholder="新規グループ名"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); if (e.target.value) setSelectedId(null); }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button className="button" onClick={onClose} disabled={busy}>キャンセル</button>
          <button
            className="button button-primary"
            onClick={handleMove}
            disabled={busy || (!selectedId && !newName.trim())}
          >
            移動
          </button>
        </div>
      </div>
    </div>
  );
}
