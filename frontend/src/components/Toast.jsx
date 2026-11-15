import { CheckCircle, X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Toast notification – auto-dismisses after `duration` ms.
 * Props:
 *  - message    {string}
 *  - onDismiss  {function}
 *  - duration   {number}  default 3500
 */
export default function Toast({ message, onDismiss, duration = 3500 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl shadow-slate-950/15 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto"
    >
      <CheckCircle size={15} className="text-emerald-400 shrink-0" />
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-1 text-slate-400 hover:text-white transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}
