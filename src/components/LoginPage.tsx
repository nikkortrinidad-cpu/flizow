import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Login screen. One card, one action.
 *
 * The previous layout had the brand block floating above a separate card
 * with a redundant "Sign in to continue" heading, and "Powered by Firebase"
 * orphaned below — three disconnected islands on a gray sea. This version
 * collapses brand + action into a single composition so the user's eye
 * lands on one thing: the button that actually does the job.
 */
export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        {/* Unified card: brand anchors the action, microcopy closes the trust loop.
            Layered shadow (crisp edge + soft ambient) makes the card read cleanly
            against #f5f5f7 without needing a border. */}
        <div className="bg-white rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)] px-10 py-12">
          <div className="flex flex-col items-center">
            {/* App mark — 72px is Apple's typical icon size for sign-in cards;
                soft drop shadow adds depth without competing with the CTA. */}
            <div
              className="w-[72px] h-[72px] bg-[#1d1d1f] rounded-[18px] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
              aria-hidden="true"
            >
              <svg
                className="w-9 h-9 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>

            {/* Brand pair — 28/15, tight tracking on the h1, 4px gap to the subtitle
                so they read as one unit (Gestalt proximity). */}
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f] leading-[1.1]">
              Flizow
            </h1>
            <p className="mt-1 text-[15px] text-[#86868b] leading-normal">
              Project Management
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-8 px-3.5 py-2.5 bg-[#ff3b30]/8 text-[#c41e14] text-[13px] rounded-xl text-center leading-snug"
            >
              {error}
            </div>
          )}

          {/* Primary and only action. Pill button, 48px tall — comfortable thumb
              target and matches Apple's App Store / Settings button height. */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-busy={loading}
            className="mt-10 w-full h-12 flex items-center justify-center gap-2.5 bg-[#1d1d1f] text-white rounded-full text-[15px] font-medium hover:bg-[#333336] active:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {loading ? (
              <>
                <span
                  className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none motion-reduce:border-t-white/70"
                  aria-hidden="true"
                />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Trust microcopy — single line, 12px, muted. Closes the question
              "what happens when I sign in" without hijacking attention. */}
          <p className="mt-5 text-[12px] text-[#86868b] text-center leading-relaxed">
            Your data syncs securely across all your devices.
          </p>
        </div>

        {/* Meta footer — tracked slightly, smaller than microcopy, sits outside
            the card because it's about the service, not the sign-in action. */}
        <p className="mt-6 text-[11px] text-[#86868b] text-center tracking-wide">
          Powered by Firebase · Hosted on GitHub Pages
        </p>
      </div>
    </div>
  );
}
