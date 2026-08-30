import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useToast } from '../hooks/useToast';
import { Toast } from './Toast';

export function FeedbackButton({ pageKey }: { pageKey: string }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  if (!snapbatonData.canManage) {
    return null;
  }

  return (
    <>
      <button className="sb-feedback-fab" onClick={() => setOpen(true)} title="改善要望を送る">
        <MessageSquarePlus size={20} />
      </button>

      {open && (
        <FeedbackModal
          pageKey={pageKey}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            toast.show('要望を送信しました');
          }}
        />
      )}

      <Toast message={toast.message} />
    </>
  );
}
