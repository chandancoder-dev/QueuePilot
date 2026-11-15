import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

/**
 * CreateQueueModal
 * Props:
 *  - isOpen      {boolean}
 *  - onClose     {function}
 *  - onCreate    {function(name: string)}
 */
export default function CreateQueueModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Queue name is required.');
      return;
    }
    onCreate(trimmed);
    setName('');
    setError('');
    onClose();
  }

  function handleClose() {
    setName('');
    setError('');
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-base font-semibold tracking-tight text-slate-900">
              Create a queue
            </h2>
            <p className="mt-1 text-xs text-slate-500">Set up a new service line for your customers.</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label
                htmlFor="queue-name"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Queue Name <span className="text-red-500">*</span>
              </label>
              <input
                id="queue-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="e.g. Medical Consultation"
                autoFocus
                className={`min-h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400
                  ${error
                    ? 'border-red-400 ring-1 ring-red-300 focus:border-red-400 focus:ring-red-300'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                  }`}
                aria-describedby={error ? 'queue-name-error' : undefined}
                aria-invalid={!!error}
              />
              {error && (
                <p id="queue-name-error" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <AlertCircle size={12} />
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              Create Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
