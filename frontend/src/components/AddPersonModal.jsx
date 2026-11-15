import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function AddPersonModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function closeModal() {
    if (isSubmitting) return;
    setName('');
    setPhone('');
    setError('');
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Person's name is required.");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Person's name must be 100 characters or fewer.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, '');
      if (
        trimmedPhone.length > 20 ||
        !/^[+0-9\s().-]+$/.test(trimmedPhone) ||
        digits.length < 7 ||
        digits.length > 15
      ) {
        setError('Enter a valid phone number with 7 to 15 digits.');
        return;
      }
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onAdd(trimmedName, trimmedPhone);
      setName('');
      setPhone('');
      onClose();
    } catch (submitError) {
      setError(
        typeof submitError?.message === 'string'
          ? submitError.message
          : 'Unable to add this person. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onClick={closeModal}
      aria-modal="true"
      role="dialog"
      aria-labelledby="add-person-title"
    >
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="add-person-title" className="text-base font-semibold tracking-tight text-slate-900">
              Add person to queue
            </h2>
            <p className="mt-1 text-xs text-slate-500">Enter the person's details to generate a token.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label htmlFor="person-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Person name <span className="text-red-500">*</span>
              </label>
              <input
                id="person-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                maxLength={100}
                autoFocus
                placeholder="e.g. Jamie Smith"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'add-person-error' : undefined}
                className={`min-h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
                  error
                    ? 'border-red-400 ring-1 ring-red-300'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
                }`}
              />
            </div>
            <div>
              <label htmlFor="person-phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Phone number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="person-phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError('');
                }}
                maxLength={20}
                placeholder="e.g. (555) 123-4567"
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            {error && (
              <p id="add-person-error" className="flex items-center gap-1 text-xs font-medium text-red-600" role="alert">
                <AlertCircle size={12} />
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-10 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Adding…' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
