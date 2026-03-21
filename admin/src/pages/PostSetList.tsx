import { useEffect, useState } from 'react';
import { Plus, Copy, FileText } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

interface PostSet {
  id: number;
  title: string;
  body: string;
  sns_target: string;
  status: string;
  created_at: string;
}

const SNS_OPTIONS = [
  { value: 'x', label: 'X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'note', label: 'note' },
  { value: 'other', label: 'その他' },
] as const;

export function PostSetList() {
  const [postSets, setPostSets] = useState<PostSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', sns_target: 'x' });
  const toast = useToast();

  useEffect(() => {
    api.get<PostSet[]>('/post-sets').then((data) => {
      setPostSets(data);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const result = await api.post<{ id: number }>('/post-sets', form);
    setPostSets([
      { ...form, id: result.id, status: 'draft', created_at: new Date().toISOString() },
      ...postSets,
    ]);
    setForm({ title: '', body: '', sns_target: 'x' });
    setShowCreate(false);
    toast.show('投稿セットを作成しました');
  };

  const handleStatusToggle = async (ps: PostSet) => {
    const newStatus = ps.status === 'draft' ? 'posted' : 'draft';
    try {
      await api.put(`/post-sets/${ps.id}`, { status: newStatus });
      setPostSets((prev) =>
        prev.map((p) => (p.id === ps.id ? { ...p, status: newStatus } : p))
      );
      toast.show(newStatus === 'posted' ? '投稿済みにしました' : '下書きに戻しました');
    } catch {
      toast.show('ステータス変更に失敗しました');
    }
  };

  const copyBody = (body: string) => {
    navigator.clipboard.writeText(body);
    toast.show('投稿文をコピーしました');
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
        <h1 className="wp-heading-inline">投稿セット</h1>
      </div>

      <div className="sb-toolbar">
        {snapbatonData.canEdit && (
          <button className="button button-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> 新しい投稿セット
          </button>
        )}
      </div>

      {showCreate && (
        <div className="sb-create-form">
          <input
            type="text"
            placeholder="タイトル"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <select
            value={form.sns_target}
            onChange={(e) => setForm({ ...form, sns_target: e.target.value })}
          >
            {SNS_OPTIONS.map((sns) => (
              <option key={sns.value} value={sns.value}>{sns.label}</option>
            ))}
          </select>
          <textarea
            rows={4}
            placeholder="投稿文"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <div className="sb-form-actions">
            <button className="button button-primary" onClick={handleCreate}>作成</button>
            <button className="button" onClick={() => setShowCreate(false)}>キャンセル</button>
          </div>
        </div>
      )}

      <table className="wp-list-table widefat fixed striped">
        <thead>
          <tr>
            <th>タイトル</th>
            <th style={{ width: '100px' }}>SNS</th>
            <th>投稿文</th>
            <th style={{ width: '90px' }}>ステータス</th>
            <th style={{ width: '80px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {postSets.map((ps) => (
            <tr key={ps.id}>
              <td><strong>{ps.title}</strong></td>
              <td>
                <span className={`sb-sns-badge sb-sns-${ps.sns_target}`}>
                  {SNS_OPTIONS.find((s) => s.value === ps.sns_target)?.label ?? ps.sns_target}
                </span>
              </td>
              <td style={{ color: '#646970', fontSize: '13px' }}>
                {ps.body.length > 80 ? ps.body.substring(0, 80) + '...' : ps.body}
              </td>
              <td>
                <span
                  className={`sb-status-badge sb-status-${ps.status}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleStatusToggle(ps)}
                  title="クリックでステータス切替"
                >
                  {ps.status === 'draft' ? '下書き' : '投稿済み'}
                </span>
              </td>
              <td>
                <button
                  className="button button-small"
                  onClick={() => copyBody(ps.body)}
                  title="投稿文をコピー"
                >
                  <Copy size={12} />
                </button>
              </td>
            </tr>
          ))}
          {postSets.length === 0 && (
            <tr>
              <td colSpan={5}>
                <div className="sb-empty">
                  <FileText size={48} strokeWidth={1} />
                  <p>投稿セットがまだありません。</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Toast message={toast.message} />
    </div>
  );
}
