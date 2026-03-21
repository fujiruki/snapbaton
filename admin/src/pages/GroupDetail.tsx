import { useEffect, useState, useRef, DragEvent } from 'react';
import { ArrowLeft, Upload, Grid, List, Copy, Download, Link, Image as ImageIcon, Tag, Eraser, Globe } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { TagInput } from '../components/TagInput';

interface Group {
  id: number;
  name: string;
  description: string;
  tags: string[];
  is_public: number;
}

interface ImageItem {
  id: number;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  sort_order: number;
  tags: string[];
}

interface Props {
  groupId: number;
  onBack: () => void;
}

export function GroupDetail({ groupId, onBack }: Props) {
  const [group, setGroup] = useState<Group | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [showGroupTags, setShowGroupTags] = useState(false);
  const [expandedTagId, setExpandedTagId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<Group>(`/groups/${groupId}`).then(setGroup);
    api.get<ImageItem[]>(`/groups/${groupId}/images`).then(setImages);
  }, [groupId]);

  const handleUpload = async (files: FileList) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
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

  // フォーカス外れで自動保存（タイトル）
  const handleSaveTitle = async (id: number, value: string) => {
    const img = images.find((i) => i.id === id);
    if (!img || img.title === value) return;
    try {
      await api.put(`/images/${id}`, { title: value });
      setImages((prev) => prev.map((i) => (i.id === id ? { ...i, title: value } : i)));
      toast.show('保存しました');
    } catch {
      toast.show('保存に失敗しました');
    }
  };

  // フォーカス外れで自動保存（説明文）
  const handleSaveDescription = async (id: number, value: string) => {
    const img = images.find((i) => i.id === id);
    if (!img || img.description === value) return;
    try {
      await api.put(`/images/${id}`, { description: value });
      setImages((prev) => prev.map((i) => (i.id === id ? { ...i, description: value } : i)));
      toast.show('保存しました');
    } catch {
      toast.show('保存に失敗しました');
    }
  };

  // 画像タグ保存
  const handleSaveImageTags = async (id: number, tags: string[]) => {
    try {
      await api.put(`/images/${id}`, { tags });
      setImages((prev) => prev.map((i) => (i.id === id ? { ...i, tags } : i)));
      toast.show('タグを更新しました');
    } catch {
      toast.show('タグの保存に失敗しました');
    }
  };

  // 公開トグル
  const handleTogglePublic = async () => {
    if (!group) return;
    const newVal = Number(group.is_public) ? 0 : 1;
    try {
      await api.put(`/groups/${groupId}`, { is_public: newVal });
      setGroup({ ...group, is_public: newVal });
      toast.show(newVal ? 'ギャラリーに公開しました' : '非公開にしました');
    } catch {
      toast.show('変更に失敗しました');
    }
  };

  // グループタグ保存
  const handleSaveGroupTags = async (tags: string[]) => {
    if (!group) return;
    try {
      await api.put(`/groups/${groupId}`, { tags });
      setGroup({ ...group, tags });
      toast.show('グループタグを更新しました');
    } catch {
      toast.show('グループタグの保存に失敗しました');
    }
  };

  // クリア（履歴に保存してからテキストエリアをクリア）
  const handleClearDescription = async (img: ImageItem) => {
    if (!img.description && !img.title) return;
    // 履歴に保存
    const history = JSON.parse(localStorage.getItem('sb_clear_history') || '[]');
    history.unshift({
      imageId: img.id,
      title: img.title,
      description: img.description,
      groupName: group?.name ?? '',
      clearedAt: new Date().toISOString(),
    });
    // 最大100件保持
    if (history.length > 100) history.length = 100;
    localStorage.setItem('sb_clear_history', JSON.stringify(history));
    // DBをクリア
    try {
      await api.put(`/images/${img.id}`, { title: '', description: '' });
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, title: '', description: '' } : i)));
      toast.show('履歴に保存してクリアしました');
    } catch {
      toast.show('クリアに失敗しました');
    }
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

      {/* グループタグ */}
      <div style={{ margin: '8px 0' }}>
        {group.tags?.length > 0 && !showGroupTags && (
          <div className="sb-tags" style={{ marginBottom: '4px' }}>
            {group.tags.map((tag) => (
              <span key={tag} className="sb-tag">{tag}</span>
            ))}
          </div>
        )}
        {snapbatonData.canEdit && (
          <>
            <button
              className="button button-small"
              onClick={() => setShowGroupTags(!showGroupTags)}
              style={{ fontSize: '12px' }}
            >
              <Tag size={12} /> {showGroupTags ? 'タグを閉じる' : 'グループタグを編集'}
            </button>
            <button
              className={`button button-small${Number(group.is_public) ? ' sb-btn-public-on' : ''}`}
              onClick={handleTogglePublic}
              style={{ fontSize: '12px', marginLeft: '4px' }}
              title={Number(group.is_public) ? '公開ギャラリーに表示中' : '非公開'}
            >
              <Globe size={12} /> {Number(group.is_public) ? '公開中' : '非公開'}
            </button>
          </>
        )}
        {showGroupTags && (
          <TagInput tags={group.tags ?? []} onChange={handleSaveGroupTags} />
        )}
      </div>

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
            accept="image/*,video/*"
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
            <div key={`${img.id}-${img.title}-${img.description}`} className="sb-image-card">
              <img src={img.thumbnail || img.url} alt={img.title} />
              <div className="sb-image-card-body">
                <input
                  type="text"
                  defaultValue={img.title}
                  placeholder="タイトル"
                  className="sb-autosave-input"
                  style={{ width: '100%', fontWeight: 600, fontSize: '13px', border: '1px solid transparent', padding: '2px 4px', borderRadius: '2px' }}
                  onFocus={(e) => e.target.style.borderColor = '#2271b1'}
                  onBlur={(e) => { e.target.style.borderColor = 'transparent'; handleSaveTitle(img.id, e.target.value); }}
                  readOnly={!snapbatonData.canEdit}
                />
                <textarea
                  defaultValue={img.description}
                  placeholder={snapbatonData.canEdit ? '説明文を入力...' : ''}
                  rows={2}
                  style={{ width: '100%', fontSize: '12px', color: '#646970', border: '1px solid transparent', padding: '2px 4px', borderRadius: '2px', resize: 'vertical', marginTop: '2px' }}
                  onFocus={(e) => e.target.style.borderColor = '#2271b1'}
                  onBlur={(e) => { e.target.style.borderColor = 'transparent'; handleSaveDescription(img.id, e.target.value); }}
                  readOnly={!snapbatonData.canEdit}
                />
                {/* 画像タグ */}
                {img.tags?.length > 0 && expandedTagId !== img.id && (
                  <div className="sb-tags" style={{ marginTop: '4px', marginBottom: '0' }}>
                    {img.tags.map((tag) => (
                      <span key={tag} className="sb-tag" style={{ fontSize: '10px', padding: '1px 6px' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {snapbatonData.canEdit && (
                  <div style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      className="sb-tag-other"
                      style={{ fontSize: '10px', padding: '1px 6px' }}
                      onClick={() => setExpandedTagId(expandedTagId === img.id ? null : img.id)}
                    >
                      <Tag size={10} /> {expandedTagId === img.id ? '閉じる' : 'タグ'}
                    </button>
                  </div>
                )}
                {expandedTagId === img.id && (
                  <TagInput tags={img.tags ?? []} onChange={(tags) => handleSaveImageTags(img.id, tags)} />
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
                  onClick={() => handleClearDescription(img)}
                  title="履歴に保存してクリア"
                >
                  <Eraser size={12} />
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
              <th style={{ width: '150px' }}>タグ</th>
              <th style={{ width: '140px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={`${img.id}-${img.title}-${img.description}`}>
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
                    onBlur={(e) => handleSaveTitle(img.id, e.target.value)}
                    readOnly={!snapbatonData.canEdit}
                  />
                </td>
                <td>
                  <textarea
                    defaultValue={img.description}
                    placeholder="説明文"
                    className="large-text"
                    rows={2}
                    style={{ width: '100%' }}
                    onBlur={(e) => handleSaveDescription(img.id, e.target.value)}
                    readOnly={!snapbatonData.canEdit}
                  />
                </td>
                <td>
                  {img.tags?.length > 0 && expandedTagId !== img.id && (
                    <div className="sb-tags" style={{ marginBottom: '4px' }}>
                      {img.tags.map((tag) => (
                        <span key={tag} className="sb-tag" style={{ fontSize: '10px', padding: '1px 6px' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {snapbatonData.canEdit && (
                    <>
                      <button
                        type="button"
                        className="sb-tag-other"
                        style={{ fontSize: '10px' }}
                        onClick={() => setExpandedTagId(expandedTagId === img.id ? null : img.id)}
                      >
                        <Tag size={10} /> {expandedTagId === img.id ? '閉じる' : 'タグ編集'}
                      </button>
                      {expandedTagId === img.id && (
                        <TagInput tags={img.tags ?? []} onChange={(tags) => handleSaveImageTags(img.id, tags)} />
                      )}
                    </>
                  )}
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
                      onClick={() => handleClearDescription(img)}
                      title="クリア"
                    >
                      <Eraser size={12} />
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
