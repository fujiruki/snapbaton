import { useEffect, useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import api from '../api';

interface PostSet {
  id: number;
  title: string;
  body: string;
  sns_target: string;
  status: string;
  created_at: string;
}

const SNS_OPTIONS = ['x', 'instagram', 'facebook', 'note', 'other'] as const;

export function PostSetList() {
  const [postSets, setPostSets] = useState<PostSet[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', sns_target: 'x' });

  useEffect(() => {
    api.get<PostSet[]>('/post-sets').then(setPostSets);
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
  };

  const handleStatusToggle = async (ps: PostSet) => {
    const newStatus = ps.status === 'draft' ? 'posted' : 'draft';
    await api.put(`/post-sets/${ps.id}`, { status: newStatus });
    setPostSets((prev) =>
      prev.map((p) => (p.id === ps.id ? { ...p, status: newStatus } : p))
    );
  };

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Post Sets</h1>

      {snapbatonData.canEdit && (
        <button
          className="button button-primary"
          style={{ marginLeft: '8px' }}
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> New Post Set
        </button>
      )}

      {showCreate && (
        <div className="card" style={{ padding: '16px', margin: '16px 0' }}>
          <input
            type="text"
            className="regular-text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <br />
          <select
            value={form.sns_target}
            onChange={(e) => setForm({ ...form, sns_target: e.target.value })}
            style={{ marginTop: '8px' }}
          >
            {SNS_OPTIONS.map((sns) => (
              <option key={sns} value={sns}>{sns.charAt(0).toUpperCase() + sns.slice(1)}</option>
            ))}
          </select>
          <br />
          <textarea
            className="large-text"
            rows={4}
            placeholder="Post text"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            style={{ marginTop: '8px' }}
          />
          <br />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button className="button button-primary" onClick={handleCreate}>Create</button>
            <button className="button" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="wp-list-table widefat fixed striped" style={{ marginTop: '16px' }}>
        <thead>
          <tr>
            <th>Title</th>
            <th>SNS</th>
            <th>Post Text</th>
            <th>Status</th>
            <th style={{ width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {postSets.map((ps) => (
            <tr key={ps.id}>
              <td><strong>{ps.title}</strong></td>
              <td>{ps.sns_target}</td>
              <td>{ps.body.length > 80 ? ps.body.substring(0, 80) + '...' : ps.body}</td>
              <td>
                <button
                  className={`button button-small ${ps.status === 'posted' ? '' : 'button-primary'}`}
                  onClick={() => handleStatusToggle(ps)}
                >
                  {ps.status === 'draft' ? 'Draft' : 'Posted'}
                </button>
              </td>
              <td>
                <button
                  className="button button-small"
                  onClick={() => navigator.clipboard.writeText(ps.body)}
                  title="Copy post text"
                >
                  <Copy size={12} />
                </button>
              </td>
            </tr>
          ))}
          {postSets.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                No post sets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
