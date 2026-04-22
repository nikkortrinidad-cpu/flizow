import { useEffect, useRef, useState } from 'react';
import { useBoard } from '../store/useStore';
import { store } from '../store/boardStore';
import { useAuth } from '../contexts/AuthContext';

/**
 * Account modal — identity, appearance, and board-data stewardship.
 * Single scrollable surface, no Save button (edits persist in place),
 * Escape to close, focus lands on the Close button.
 */
export function AccountModal({ onClose }: { onClose: () => void }) {
  const { state } = useBoard();
  const { user } = useAuth();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Resolve the signed-in user's view across Firebase + our own member record
  const me = state.members.find(m => m.id === store.getCurrentMemberId());
  const displayName = me?.name || user?.displayName || 'You';
  const email = user?.email || me?.email || '';
  const photo = user?.photoURL || me?.avatar || '';
  const initials = (displayName || 'U').charAt(0).toUpperCase();

  // Escape closes + focus the safe dismissal target on mount (HIG safety default)
  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (confirmReset) {
          setConfirmReset(false);
          setResetInput('');
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, confirmReset]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleExport = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-board-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Board exported');
  };

  const handleReset = () => {
    if (resetInput !== 'RESET') return;
    store.resetBoard();
    setConfirmReset(false);
    setResetInput('');
    showToast('Board reset');
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-title"
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl shadow-black/20 w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e8ed] dark:border-[#38383a] flex items-center justify-between shrink-0">
          <h2 id="account-title" className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Account</h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close account settings"
            className="text-[#86868b] hover:text-[#6e6e73] dark:hover:text-[#aeaeb2] p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Identity */}
          <section aria-labelledby="account-identity">
            <h3 id="account-identity" className="sr-only">Identity</h3>
            <div className="flex items-start gap-4 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0071e3]/10 text-[#0071e3] text-xl font-bold flex items-center justify-center">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* Google glyph */}
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <p className="text-xs text-[#86868b] truncate">{email}</p>
                </div>
                <p className="text-[11px] text-[#86868b] mt-2 leading-relaxed">
                  Signed in with Google.{' '}
                  <a
                    href="https://myaccount.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0071e3] hover:underline inline-flex items-center gap-0.5"
                  >
                    Manage in Google Account
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section aria-labelledby="account-appearance">
            <h3 id="account-appearance" className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">Appearance</h3>
            <div className="flex items-center justify-between bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-4">
              <div>
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">Theme</p>
                <p className="text-xs text-[#86868b] mt-0.5">Light or dark mode</p>
              </div>
              <div className="flex items-center bg-[#e8e8ed] dark:bg-[#3a3a3c] rounded-full p-0.5">
                <button
                  onClick={() => store.setTheme('light')}
                  aria-pressed={state.theme === 'light'}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    state.theme === 'light'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#86868b] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-[#e5e5ea]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light
                </button>
                <button
                  onClick={() => store.setTheme('dark')}
                  aria-pressed={state.theme === 'dark'}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    state.theme === 'dark'
                      ? 'bg-[#1c1c1e] text-white shadow-sm'
                      : 'text-[#86868b] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-[#e5e5ea]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark
                </button>
              </div>
            </div>
          </section>

          {/* Board data */}
          <section aria-labelledby="account-data">
            <h3 id="account-data" className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">Board data</h3>
            <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl divide-y divide-[#e8e8ed] dark:divide-[#38383a]">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">Export as JSON</p>
                  <p className="text-xs text-[#86868b] mt-0.5">Download a copy of everything on your board.</p>
                </div>
                <button
                  onClick={handleExport}
                  className="shrink-0 text-xs font-medium px-4 py-2 rounded-full border border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3]/5 transition"
                >
                  Export
                </button>
              </div>
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#e5e5ea]">Reset board</p>
                  <p className="text-xs text-[#86868b] mt-0.5">Delete every card, list, and comment. Can't be undone.</p>
                </div>
                <button
                  onClick={() => setConfirmReset(true)}
                  className="shrink-0 text-xs font-medium px-4 py-2 rounded-full text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/5 transition"
                >
                  Reset&hellip;
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Typed-RESET confirm — nested dialog */}
        {confirmReset && (
          <div
            className="absolute inset-0 bg-black/40 flex items-center justify-center p-6"
            onClick={() => { setConfirmReset(false); setResetInput(''); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <div
              className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 id="reset-title" className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Reset board?</h3>
              <p className="text-xs text-[#86868b] mt-1.5 leading-relaxed">
                This deletes every card, list, comment, and attachment. It can't be undone.
              </p>
              <label htmlFor="reset-confirm" className="block text-xs text-[#86868b] mt-3">
                Type <span className="font-mono font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">RESET</span> to confirm.
              </label>
              <input
                id="reset-confirm"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && resetInput === 'RESET') handleReset(); }}
                className="mt-2 w-full text-sm px-3 py-2 rounded-lg border border-[#d2d2d7] dark:border-[#424245] bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => { setConfirmReset(false); setResetInput(''); }}
                  className="text-xs font-medium px-4 py-2 rounded-full text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetInput !== 'RESET'}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-[#ff3b30] text-white hover:bg-[#d70015] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Reset board
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline toast */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1d1d1f] text-white text-xs px-4 py-2 rounded-full shadow-lg"
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
