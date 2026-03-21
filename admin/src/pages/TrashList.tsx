import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, Image as ImageIcon } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

interface TrashItem {
  id: number;
  type: 'image' | 'group';
  title?: string;
  name?: string;
  description?: string;
  group_name?: string;
  thumbnail?: string;
  deleted_at: string;
}

export function TrashList() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get<TrashItem[]>('/trash').then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const handleRestore = async (item: TrashItem) => {
    try {
      await api.post(`/trash/restore/${item.type}/${item.id}`, {});
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)));
      toast.show(item.type === 'group' ? 'グループを復元しました' : '画像を復元しました');
    } catch {
      toast.show('復元に失敗しました');
    }
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
        <h1 className="wp-heading-inline">ゴミ箱</h1>
      </div>

      {items.length === 0 ? (
        <div className="sb-empty">
          <Trash2 size={48} strokeWidth={1} />
          <p>ゴミ箱は空です。</p>
        </div>
      ) : (
        <table className="wp-list-table widefat fixed striped" style={{ marginTop: '16px' }}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}></th>
              <th>名前</th>
              <th style={{ width: '80px' }}>種類</th>
              <th>元のグループ</th>
              <th style={{ width: '140px' }}>削除日</th>
              <th style={{ width: '80px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.type}-${item.id}`}>
                <td>
                  {item.type === 'image' && item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '2px' }}
                    />
                  ) : (
                    <ImageIcon size={24} style={{ color: '#a7aaad' }} />
                  )}
                </td>
                <td>
                  <strong>{item.type === 'group' ? item.name : (item.title || '無題')}</strong>
                  {item.description && (
                    <p style={{ margin: '2px 0 0', color: '#646970', fontSize: '12px' }}>
                      {item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description}
                    </p>
                  )}
                </td>
                <td>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    background: item.type === 'group' ? '#fcf0e1' : '#f0f0f1',
                    color: item.type === 'group' ? '#9a6700' : '#646970',
                  }}>
                    {item.type === 'group' ? 'グループ' : '画像'}
                  </span>
                </td>
                <td style={{ color: '#646970', fontSize: '13px' }}>
                  {item.type === 'image' ? item.group_name || '—' : '—'}
                </td>
                <td style={{ fontSize: '12px', color: '#a7aaad' }}>
                  {new Date(item.deleted_at).toLocaleDateString('ja-JP')}
                </td>
                <td>
                  <button
                    className="button button-small"
                    onClick={() => handleRestore(item)}
                    title="復元"
                  >
                    <RotateCcw size={12} /> 復元
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Toast message={toast.message} />
    </div>
  );
}
