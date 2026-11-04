import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, KeyRound, Mail, User as UserIcon, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateAuthInput } from '../utils/ecellLogic';
import { HeroPopArtIllustration } from './PopArtGraphics';

export interface AuthScreenProps {
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailRegister: (fullName: string, email: string, password: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
  authError: string | null;
  authSuccess: string | null;
  clearMessages: () => void;
  isSubmitting: boolean;
  showProviderSetupGuide?: boolean;
}

export function AuthScreen({
  onEmailLogin,
  onEmailRegister,
  onGoogleLogin,
  onPasswordReset,
  authError,
  authSuccess,
  clearMessages,
  isSubmitting,
  showProviderSetupGuide,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const switchMode = (nextMode: 'login' | 'register' | 'reset') => {
    setMode(nextMode);
    setFieldErrors({});
    clearMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const validation = validateAuthInput(mode, { fullName, email, password });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});

    if (mode === 'login') {
      await onEmailLogin(email.trim(), password);
    } else if (mode === 'register') {
      await onEmailRegister(fullName.trim(), email.trim(), password);
    } else {
      await onPasswordReset(email.trim());
    }
  };

  return (
    <div className="min-h-screen bg-halftone-light text-[#0F0F0F] flex flex-col justify-between">
      {/* Top Identity Strip */}
      <header className="w-full border-b-2 border-[#0F0F0F] bg-[#FFFDF7] px-6 py-4 flex items-center justify-between gap-8">
        <div className="font-display font-extrabold text-xl tracking-tight text-[#0F0F0F] whitespace-nowrap shrink-0">
          AURORA E-CELL
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-mono font-bold text-neutral-700">
          <span>AURORA DEGREE &amp; PG COLLEGE</span>
          <span aria-hidden="true">·</span>
          <span>ENTREPRENEURSHIP CELL PORTAL</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="px-4 py-2 text-xs font-display font-bold bg-[#FACC15] text-[#0F0F0F] border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FF5722] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {mode === 'login' ? 'New Member? Register' : 'Existing Member? Sign In'}
          </button>
        </div>
      </header>

      {/* Main Split-Screen Auth Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* Left Column: Desi Pop-Art Visual Identity & Poster */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 md:p-8 pop-shadow-lg">
            <h1
              className="font-display font-extrabold text-[#0F0F0F] tracking-tight leading-[1.06] mb-4"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
            >
              Where Campus Ideas Turn Into Real Ventures.
            </h1>

            <p className="text-base text-neutral-800 leading-relaxed max-w-2xl">
              Welcome to the official Entrepreneurship Cell portal of Aurora Degree &amp; PG College.
              Sign in to explore upcoming events, student achievements, and active incubating startups.
            </p>
          </div>

          <div className="flex-1 flex flex-col">
            <HeroPopArtIllustration />
          </div>
        </div>

        {/* Right Column: Custom Authentication Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-6 sm:p-8 pop-shadow-lg">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#0F0F0F] rounded-lg mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2 px-4 text-xs font-display font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#FACC15] text-[#0F0F0F]'
                    : 'text-[#FFFDF7] hover:text-[#FACC15]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 px-4 text-xs font-display font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#FF5722] text-[#0F0F0F]'
                    : 'text-[#FFFDF7] hover:text-[#FF5722]'
                }`}
              >
                Register Account
              </button>
            </div>

            <div className="mb-6">
              <h2 className="font-display font-extrabold text-2xl text-[#0F0F0F]">
                {mode === 'login' && 'Sign In to Aurora E-Cell'}
                {mode === 'register' && 'Create Your Student Account'}
                {mode === 'reset' && 'Reset Your Password'}
              </h2>
              <p className="text-xs text-neutral-600 mt-1">
                {mode === 'login' &&
                  'Enter your credentials to access the portal. Administrators use this same login.'}
                {mode === 'register' &&
                  'Register with your email address to join the Aurora E-Cell portal.'}
                {mode === 'reset' &&
                  'Enter your registered email address and we will send a password reset link.'}
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="mb-5 p-3.5 bg-[#FFF1F2] border-2 border-[#E11D48] rounded-lg text-xs text-[#9F1239] font-medium flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{authError}</p>
                  {showProviderSetupGuide && (
                    <p className="text-[11px] text-neutral-700 leading-normal">
                      Note: To use Firebase Email/Password authentication in production, enable{' '}
                      <strong>Email/Password</strong> in the Firebase Console under{' '}
                      <em>Authentication &rarr; Sign-in method</em>, or sign in directly with Google below.
                    </p>
                  )}
                </div>
              </div>
            )}

            {authSuccess && (
              <div
                role="status"
                className="mb-5 p-3.5 bg-[#FEFCE8] border-2 border-[#0F0F0F] rounded-lg text-xs text-[#0F0F0F] font-medium flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="font-bold">{authSuccess}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-xs font-display font-bold text-[#0F0F0F] mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Aarav Reddy"
                      autoComplete="name"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm text-[#0F0F0F] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-xs font-semibold text-[#E11D48]">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-display font-bold text-[#0F0F0F] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@aurora.edu.in"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm text-[#0F0F0F] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs font-semibold text-[#E11D48]">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-display font-bold text-[#0F0F0F]"
                    >
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full pl-10 pr-11 py-2.5 bg-white border-2 border-[#0F0F0F] rounded-lg text-sm text-[#0F0F0F] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-600 hover:text-[#0F0F0F] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-xs font-semibold text-[#E11D48]">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#FF5722] hover:bg-[#FACC15] text-[#0F0F0F] font-display font-extrabold text-sm border-2 border-[#0F0F0F] rounded-lg pop-shadow transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <span>
                  {isSubmitting
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Sign In to Portal'
                    : mode === 'register'
                    ? 'Create Account'
                    : 'Send Password Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 text-xs font-display font-bold text-neutral-700 hover:text-[#0F0F0F] text-center cursor-pointer"
                >
                  Back to Sign In
                </button>
              )}
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-300" />
              <span className="text-xs font-mono font-bold text-neutral-500">OR</span>
              <div className="flex-1 h-px bg-neutral-300" />
            </div>

            {/* Official Google Sign-In Button */}
            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={isSubmitting}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>

            <div className="mt-5 pt-4 border-t border-neutral-200 flex items-center justify-center text-xs text-neutral-600">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
                <span>Persistent Session Enabled</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full border-t-2 border-[#0F0F0F] bg-[#FFFDF7] px-6 py-4 text-xs text-neutral-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Aurora Degree &amp; PG College · Entrepreneurship Cell</span>
        <span>Protected by Firebase Authentication &amp; Role-Based Security</span>
      </footer>
    </div>
  );
}
