import { useEffect, useRef, useState } from 'react';
import { X, Clipboard, Send } from 'lucide-react';

interface FeedbackModalProps {
  pageKey: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_IMAGES = 5;

export function FeedbackModal({ pageKey, onClose, onSuccess }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const addImages = (files: File[]) => {
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleClipboardButton = async () => {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(new File([blob], `clipboard.${imageType.split('/')[1]}`, { type: imageType }));
        }
      }
      if (files.length > 0) {
        addImages(files);
      } else {
        setError('クリップボードに画像がありません。');
      }
    } catch {
      setError('クリップボードから画像を取得できませんでした。');
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('本文を入力してください。');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('page_key', pageKey);
      images.forEach((file) => formData.append('images[]', file));

      const res = await fetch(`${snapbatonData.apiBase}/feedback`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: '送信に失敗しました。' }));
        throw new Error(data.message ?? '送信に失敗しました。');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sb-feedback-overlay" onClick={onClose}>
      <div className="sb-feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sb-feedback-header">
          <h3>改善要望を送る</h3>
          <button className="sb-feedback-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="sb-feedback-error">{error}</div>}

        <textarea
          ref={textareaRef}
          className="sb-feedback-textarea"
          placeholder="不具合・改善要望を入力してください"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={handlePaste}
          rows={5}
        />

        <div className="sb-feedback-images">
          {images.map((file, i) => (
            <div className="sb-feedback-thumb" key={i}>
              <img src={URL.createObjectURL(file)} alt="" />
              <button className="sb-feedback-thumb-remove" onClick={() => removeImage(i)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="sb-feedback-actions-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addImages(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <button
            className="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
          >
            ＋ 画像を追加
          </button>
          <button
            className="button"
            onClick={handleClipboardButton}
            disabled={images.length >= MAX_IMAGES}
          >
            <Clipboard size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            貼り付け
          </button>
        </div>

        <div className="sb-feedback-footer">
          <button className="button" onClick={onClose} disabled={submitting}>
            キャンセル
          </button>
          <button className="button button-primary" onClick={handleSubmit} disabled={submitting}>
            <Send size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
