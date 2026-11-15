import { useState } from 'react';
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
} from 'lucide-react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin, notice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin({ email: normalizedEmail, password });
    } catch (error) {
      const message = error.response?.data?.message;
      setErrorMessage(
        typeof message === 'string'
          ? message
          : 'Unable to sign in. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <section className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <div className="bg-[#111827] px-7 py-7 sm:px-9">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-semibold tracking-tight text-white">QueuePilot</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Queue operations
              </p>
            </div>
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-[-0.03em] text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to manage your service queues.
          </p>
        </div>

        <form className="space-y-5 px-7 py-7 sm:px-9" onSubmit={handleSubmit} noValidate>
          {notice && (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800"
              role="status"
            >
              {notice}
            </p>
          )}
          {errorMessage && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Email address
            </label>
            <div className="relative">
              <Mail
                size={17}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errorMessage)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="you@company.com"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <LockKeyhole
                size={17}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errorMessage)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={17} strokeWidth={1.9} aria-hidden="true" />
                Sign in
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500">
            Manager access to your QueuePilot workspace
          </p>
        </form>
      </section>
    </main>
  );
}
