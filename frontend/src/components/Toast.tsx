import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200',
  error:   'border-rose-500/40   bg-rose-950/90   text-rose-200',
  info:    'border-sky-500/40    bg-sky-950/90    text-sky-200',
  warning: 'border-amber-500/40  bg-amber-950/90  text-amber-200',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/20 text-emerald-400',
  error:   'bg-rose-500/20   text-rose-400',
  info:    'bg-sky-500/20    text-sky-400',
  warning: 'bg-amber-500/20  text-amber-400',
};

const AUTO_DISMISS_MS = 5000;

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on mount
    const enter = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, AUTO_DISMISS_MS);

    return () => {
      clearTimeout(enter);
      clearTimeout(dismiss);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md',
        'transition-all duration-300',
        STYLES[toast.type],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
          ICON_STYLES[toast.type],
        ].join(' ')}
      >
        {ICONS[toast.type]}
      </span>
      <p className="text-sm leading-relaxed">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="ml-auto flex-shrink-0 text-current opacity-50 transition-opacity hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

/** Fixed bottom-right container — always visible regardless of scroll position. */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex w-80 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook — useToast
// ---------------------------------------------------------------------------

let _counter = 0;
function uid() {
  _counter += 1;
  return `toast-${Date.now()}-${_counter}`;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function push(message: string, type: ToastType = 'info') {
    setToasts((prev) => [...prev, { id: uid(), type, message }]);
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return {
    toasts,
    dismiss,
    success: (msg: string) => push(msg, 'success'),
    error:   (msg: string) => push(msg, 'error'),
    info:    (msg: string) => push(msg, 'info'),
    warning: (msg: string) => push(msg, 'warning'),
  };
}
