import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Upload, Grid, List, Copy, Download } from 'lucide-react';
import api from '../api';

interface Group {
  id: number;
  name: string;
  description: string;
  tags: string[];
}

interface Image {
  id: number;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  sort_order: number;
}

interface Props {
  groupId: number;
  onBack: () => void;
}

export function GroupDetail({ groupId, onBack }: Props) {
  const [group, setGroup] = useState<Group | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Group>(`/groups/${groupId}`).then(setGroup);
    api.get<Image[]>(`/groups/${groupId}/images`).then(setImages);
  }, [groupId]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const result = await api.upload<{ id: number; attachment_id: number }>(
        `/groups/${groupId}/images`,
        file
      );
      const newImage = await api.get<Image>(`/images/${result.id}`);
      setImages((prev) => [...prev, newImage]);
    }
    setUploading(false);
  };

  const handleUpdateImage = async (id: number, data: { title?: string; description?: string }) => {
    await api.put(`/images/${id}`, data);
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...data } : img)));
    setEditingId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyShareUrl = (imageId: number) => {
    const url = `${location.origin}/wp-json/snapbaton/v1/share/${imageId}`;
    navigator.clipboard.writeText(url);
  };

  if (!group) return <p>Loading...</p>;

  return (
    <div className="wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="button" onClick={onBack}><ArrowLeft size={16} /></button>
        <h1 className="wp-heading-inline">{group.name}</h1>
      </div>

      {group.description && <p style={{ color: '#666' }}>{group.description}</p>}
      {group.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {group.tags.map((tag) => (
            <span key={tag} style={{ background: '#e0e0e0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        {snapbatonData.canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <button
              className="button button-primary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Images'}
            </button>
          </>
        )}
        <button className="button" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
          {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {images.map((img) => (
            <div key={img.id} className="card" style={{ padding: '8px' }}>
              <img
                src={img.thumbnail}
                alt={img.title}
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '4px' }}
              />
              {editingId === img.id ? (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    defaultValue={img.title}
                    placeholder="Title"
                    className="regular-text"
                    style={{ width: '100%' }}
                    onBlur={(e) => handleUpdateImage(img.id, { title: e.target.value })}
                  />
                  <textarea
                    defaultValue={img.description}
                    placeholder="Description"
                    className="large-text"
                    rows={2}
                    style={{ width: '100%', marginTop: '4px' }}
                    onBlur={(e) => handleUpdateImage(img.id, { description: e.target.value })}
                  />
                </div>
              ) : (
                <div style={{ marginTop: '8px', cursor: 'pointer' }} onClick={() => setEditingId(img.id)}>
                  <strong>{img.title || 'Untitled'}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
                    {img.description || 'Click to add description'}
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button className="button button-small" onClick={() => copyToClipboard(img.description)} title="Copy description">
                  <Copy size={12} />
                </button>
                <button className="button button-small" onClick={() => copyShareUrl(img.id)} title="Copy share URL">
                  URL
                </button>
                <a href={img.url} download className="button button-small" title="Download original">
                  <Download size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Image</th>
              <th>Title</th>
              <th>Description</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id}>
                <td>
                  <img src={img.thumbnail} alt={img.title} style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                </td>
                <td>
                  <input
                    type="text"
                    defaultValue={img.title}
                    className="regular-text"
                    onBlur={(e) => handleUpdateImage(img.id, { title: e.target.value })}
                  />
                </td>
                <td>
                  <textarea
                    defaultValue={img.description}
                    className="large-text"
                    rows={2}
                    onBlur={(e) => handleUpdateImage(img.id, { description: e.target.value })}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="button button-small" onClick={() => copyToClipboard(img.description)}>
                      <Copy size={12} />
                    </button>
                    <button className="button button-small" onClick={() => copyShareUrl(img.id)}>URL</button>
                    <a href={img.url} download className="button button-small">
                      <Download size={12} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {images.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
          No images yet. Upload your first photos.
        </p>
      )}
    </div>
  );
}
