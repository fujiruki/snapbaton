import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api';

interface Props {
  imageId: number;
  videoUrl: string;
  onSave: (thumbnailUrl: string) => void;
  onClose: () => void;
}

export function VideoThumbnailPicker({ imageId, videoUrl, onSave, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const video = videoRef.current;
    if (!video || saving) return;
    setSaving(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.8);
      });
      const file = new File([blob], 'thumb.jpg', { type: 'image/jpeg' });
      const result = await api.upload<{ video_thumbnail: string }>(`/images/${imageId}/video-thumbnail`, file);
      onSave(result.video_thumbnail);
    } catch {
      setError('サムネイルの設定に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sb-qr-overlay" onClick={onClose}>
      <div
        style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '480px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>サムネイルにするコマを選択</h3>
          <button className="sb-qr-close" style={{ position: 'static' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="sb-feedback-error">{error}</div>}

        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          style={{ width: '100%', maxHeight: '60vh', display: 'block', background: '#000' }}
        />

        <p style={{ fontSize: '12px', color: '#646970', margin: '8px 0 0' }}>
          再生して好きな位置で一時停止し、「このコマをサムネイルに設定」を押してください。
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button className="button" onClick={onClose} disabled={saving}>キャンセル</button>
          <button className="button button-primary" onClick={handleSave} disabled={saving}>
            {saving ? '設定中...' : 'このコマをサムネイルに設定'}
          </button>
        </div>
      </div>
    </div>
  );
}
