import { useEffect, useState } from 'react';
import { Plus, Grid, List } from 'lucide-react';
import api from '../api';

interface Group {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface Props {
  onSelectGroup: (id: number) => void;
}

export function GroupList({ onSelectGroup }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    api.get<Group[]>('/groups').then(setGroups);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await api.post<{ id: number }>('/groups', {
      name: newName,
      description: newDesc,
    });
    setGroups([{ id: result.id, name: newName, description: newDesc, created_at: new Date().toISOString() }, ...groups]);
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  };

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">SnapBaton</h1>

      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        {snapbatonData.canEdit && (
          <button className="button button-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Group
          </button>
        )}
        <button className="button" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
          {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <input
            type="text"
            className="regular-text"
            placeholder="Group name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <br />
          <textarea
            className="large-text"
            rows={2}
            placeholder="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{ marginTop: '8px' }}
          />
          <br />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button className="button button-primary" onClick={handleCreate}>Create</button>
            <button className="button" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {groups.map((g) => (
            <div
              key={g.id}
              className="card"
              style={{ padding: '16px', cursor: 'pointer' }}
              onClick={() => onSelectGroup(g.id)}
            >
              <h3 style={{ margin: '0 0 8px' }}>{g.name}</h3>
              <p style={{ margin: 0, color: '#666' }}>{g.description || 'No description'}</p>
              <small style={{ color: '#999' }}>{new Date(g.created_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      ) : (
        <table className="wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => onSelectGroup(g.id)}>
                <td><strong>{g.name}</strong></td>
                <td>{g.description || '—'}</td>
                <td>{new Date(g.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {groups.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
          No groups yet. Create your first group to get started.
        </p>
      )}
    </div>
  );
}
