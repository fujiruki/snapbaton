import { useEffect, useState, useRef, DragEvent } from 'react';
import { ArrowLeft, Upload, Grid, List, Copy, Download, Link, Image as ImageIcon } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

interface Group {
  id: number;
  name: string;
  description: string;
  tags: string[];
}

interface ImageItem {
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
  const [images, setImages] = useState<ImageItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<Group>(`/groups/${groupId}`).then(setGroup);
    api.get<ImageItem[]>(`/groups/${groupId}/images`).then(setImages);
  }, [groupId]);

  const handleUpload = async (files: FileList) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadCount({ done: 0, total: fileArray.length });

    for (let i = 0; i < fileArray.length; i++) {
      const result = await api.upload<{ id: number; attachment_id: number }>(
        `/groups/${groupId}/images`,
        fileArray[i]!
      );
      const newImage = await api.get<ImageItem>(`/images/${result.id}`);
      setImages((prev) => [...prev, newImage]);
      setUploadCount({ done: i + 1, total: fileArray.length });
    }

    setUploading(false);
    toast.show(`${fileArray.length}枚の画像をアップロードしました`);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleUpdateImage = async (id: number, data: { title?: string; description?: string }) => {
    await api.put(`/images/${id}`, data);
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...data } : img)));
    setEditingId(null);
    toast.show('保存しました');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.show(`${label}をコピーしました`);
  };

  const copyShareUrl = (imageId: number) => {
    const url = `${location.origin}/wp-json/snapbaton/v1/share/${imageId}`;
    copyToClipboard(url, '共有URL');
  };

  if (!group) {
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
        <button className="button" onClick={onBack} title="グループ一覧に戻る">
          <ArrowLeft size={16} />
        </button>
        <h1 className="wp-heading-inline">{group.name}</h1>
      </div>

      {group.description && (
        <p style={{ color: '#646970', margin: '4px 0 0' }}>{group.description}</p>
      )}

      {group.tags?.length > 0 && (
        <div className="sb-tags" style={{ marginTop: '8px' }}>
          {group.tags.map((tag) => (
            <span key={tag} className="sb-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="sb-toolbar">
        <button
          className="button"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          title={viewMode === 'grid' ? 'リスト表示' : 'グリッド表示'}
        >
          {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
        </button>
        <span style={{ color: '#a7aaad', fontSize: '13px' }}>
          {images.length} 枚
        </span>
      </div>

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
          <div
            className={`sb-dropzone${dragOver ? ' sb-drag-over' : ''}${uploading ? ' sb-uploading' : ''}`}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={28} strokeWidth={1.5} />
            {uploading ? (
              <>
                アップロード中... ({uploadCount.done} / {uploadCount.total})
                <div className="sb-progress">
                  <div
                    className="sb-progress-bar"
                    style={{ width: `${(uploadCount.done / uploadCount.total) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <>ここに画像をドラッグ&ドロップ、またはクリックして選択</>
            )}
          </div>
        </>
      )}

      {viewMode === 'grid' ? (
        <div className="sb-image-grid">
          {images.map((img) => (
            <div key={img.id} className="sb-image-card">
              <img src={img.thumbnail || img.url} alt={img.title} />
              <div className="sb-image-card-body">
                {editingId === img.id ? (
                  <div className="sb-inline-edit">
                    <input
                      type="text"
                      defaultValue={img.title}
                      placeholder="タイトル"
                      autoFocus
                      onBlur={(e) => handleUpdateImage(img.id, { title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <textarea
                      defaultValue={img.description}
                      placeholder="説明文"
                      rows={2}
                      style={{ marginTop: '4px' }}
                      onBlur={(e) => handleUpdateImage(img.id, { description: e.target.value })}
                    />
                  </div>
                ) : (
                  <div onClick={() => snapbatonData.canEdit && setEditingId(img.id)}>
                    <p className="sb-image-title">{img.title || '無題'}</p>
                    <p className="sb-image-desc">
                      {img.description || (snapbatonData.canEdit ? 'クリックして説明を追加' : '')}
                    </p>
                  </div>
                )}
              </div>
              <div className="sb-image-card-actions">
                <button
                  className="button button-small"
                  onClick={() => copyToClipboard(img.description || '', '説明文')}
                  title="説明文をコピー"
                >
                  <Copy size={12} />
                </button>
                <button
                  className="button button-small"
                  onClick={() => copyShareUrl(img.id)}
                  title="共有URLをコピー"
                >
                  <Link size={12} />
                </button>
                <a href={img.url} download className="button button-small" title="オリジナルをダウンロード">
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
              <th style={{ width: '80px' }}>画像</th>
              <th>タイトル</th>
              <th>説明文</th>
              <th style={{ width: '140px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id}>
                <td>
                  <img
                    src={img.thumbnail || img.url}
                    alt={img.title}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '2px' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    defaultValue={img.title}
                    placeholder="タイトル"
                    className="regular-text"
                    style={{ width: '100%' }}
                    onBlur={(e) => handleUpdateImage(img.id, { title: e.target.value })}
                  />
                </td>
                <td>
                  <textarea
                    defaultValue={img.description}
                    placeholder="説明文"
                    className="large-text"
                    rows={2}
                    style={{ width: '100%' }}
                    onBlur={(e) => handleUpdateImage(img.id, { description: e.target.value })}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="button button-small"
                      onClick={() => copyToClipboard(img.description || '', '説明文')}
                      title="説明文をコピー"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className="button button-small"
                      onClick={() => copyShareUrl(img.id)}
                      title="共有URL"
                    >
                      <Link size={12} />
                    </button>
                    <a href={img.url} download className="button button-small" title="DL">
                      <Download size={12} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {images.length === 0 && !uploading && (
        <div className="sb-empty">
          <ImageIcon size={48} strokeWidth={1} />
          <p>まだ画像がありません。</p>
          <p>上のエリアに画像をドラッグ&ドロップしてアップロードしましょう。</p>
        </div>
      )}

      <Toast message={toast.message} />
    </div>
  );
}
