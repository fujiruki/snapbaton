import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number>(0);

  const show = useCallback((msg: string) => {
    window.clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = window.setTimeout(() => setMessage(null), 2000);
  }, []);

  return { message, show };
}
