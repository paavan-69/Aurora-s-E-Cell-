import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  Mail,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { validateAuthInput } from '../utils/ecellLogic';
import { HeroPopArtIllustration, HeaderBrandLogo, WordRevealHeading } from './PopArtGraphics';

export interface AuthScreenProps {
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailRegister: (fullName: string, email: string, password: string) => Promise<boolean>;
  onPasswordReset: (email: string, newPassword?: string) => Promise<void>;
  authError: string | null;
  authSuccess: string | null;
  clearMessages: () => void;
  isSubmitting: boolean;
  websiteBranding?: {
    ecellLogoUrl: string;
    collegeLogoUrl: string;
  };
}

export function AuthScreen({
  onEmailLogin,
  onEmailRegister,
  onPasswordReset,
  authError,
  authSuccess,
  clearMessages,
  isSubmitting,
  websiteBranding,
}: AuthScreenProps) {
  // Start in 'register' mode first so users Register first and then Sign In
  const [mode, setMode] = useState<'register' | 'login' | 'reset'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchMode = (nextMode: 'register' | 'login' | 'reset', preserveMessages = false) => {
    setMode(nextMode);
    setFieldErrors({});
    if (!preserveMessages) {
      clearMessages();
    }
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

    if (mode === 'register') {
      const registered = await onEmailRegister(fullName.trim(), email.trim(), password);
      if (registered) {
        setPassword('');
        switchMode('login', true);
      }
    } else if (mode === 'login') {
      await onEmailLogin(email.trim(), password);
    } else {
      await onPasswordReset(email.trim(), password.trim() || undefined);
    }
  };

  return (
    <div className="min-h-screen bg-aurora-void text-white flex flex-col justify-between relative">
      {/* Floating Responsive Header (Transparent initially -> Dark Glassmorphism on scroll) */}
      <header
        className={`sticky top-0 z-30 w-full px-3 sm:px-6 py-3.5 flex items-center justify-between gap-2 sm:gap-6 transition-all duration-300 ${
          isScrolled
            ? 'aurora-glass-header'
            : 'bg-gradient-to-b from-[#050505]/95 to-transparent border-b border-white/10'
        }`}
      >
        {/* Top-Left Corner: Aurora E-Cell Logo + Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <HeaderBrandLogo
            src={websiteBranding?.ecellLogoUrl}
            alt="Aurora E-Cell Official Logo"
            testId="header-ecell-logo"
          />
          <div className="font-display font-bold text-sm sm:text-xl tracking-tight text-white whitespace-nowrap shrink-0">
            AURORA <span className="text-[#FF3030]">E-CELL</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-[#A1A1AA]">
          <span>AURORA DEGREE &amp; PG COLLEGE</span>
          <span aria-hidden="true">·</span>
          <span className="text-white">ENTREPRENEURSHIP CELL PORTAL</span>
        </div>

        {/* Top-Right Corner: Action + Aurora College Logo */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <button
            type="button"
            onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-display font-bold aurora-crimson-btn rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="sm:hidden">{mode === 'register' ? 'Sign In' : 'Register'}</span>
            <span className="hidden sm:inline">
              {mode === 'register' ? 'Existing Member? Sign In' : 'New Member? Register'}
            </span>
          </button>
          <HeaderBrandLogo
            src={websiteBranding?.collegeLogoUrl}
            alt="Aurora College Official Logo"
            testId="header-college-logo"
          />
        </div>
      </header>

      {/* Main Split-Screen Futuristic Aurora Auth Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* Left Column: Cinematic Headline & Venture Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="aurora-card rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF3030]/15 blur-3xl"
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs font-mono text-[#FF3030] mb-3 uppercase tracking-wider">
                <span>AURORA DEGREE &amp; PG COLLEGE</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#A1A1AA]">OFFICIAL DIGITAL PORTAL</span>
              </div>

              <WordRevealHeading
                text="Where Campus Ideas Turn Into Real Ventures."
                highlightWords={['Ideas', 'Real', 'Ventures.']}
                className="font-display font-bold text-white tracking-tight leading-[1.06] mb-4"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
              />

              <p className="text-base text-[#A1A1AA] leading-relaxed max-w-2xl">
                Welcome to the official Entrepreneurship Cell portal of Aurora Degree &amp; PG College.
                Register your account first, then sign in to explore upcoming events, student
                achievements, and active incubating startups.
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <HeroPopArtIllustration />
          </div>
        </div>

        {/* Right Column: Glassmorphic Authentication Card (Email & Password Only) */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="aurora-glass rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Mode Switcher Tabs: 1. Register Account -> 2. Sign In */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#050505] border border-white/10 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2.5 px-4 text-xs font-display font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'register'
                    ? 'aurora-crimson-btn text-white'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                1. Register Account
              </button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2.5 px-4 text-xs font-display font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'login'
                    ? 'aurora-crimson-btn text-white'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                2. Sign In
              </button>
            </div>

            <div className="mb-6">
              <h2 className="font-display font-bold text-2xl text-white">
                {mode === 'register' && 'Create Your Account'}
                {mode === 'login' && 'Sign In to Aurora E-Cell'}
                {mode === 'reset' && 'Reset Your Password'}
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                {mode === 'register' &&
                  'Step 1: Register with your full name, email address, and password to save your profile in the database.'}
                {mode === 'login' &&
                  'Step 2: Sign in with your registered email and password. Administrators use this same login.'}
                {mode === 'reset' &&
                  'Enter your registered email address to reset your password.'}
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="mb-5 p-3.5 bg-[#FF3030]/15 border border-[#FF3030]/50 rounded-xl text-xs text-white font-medium flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-[#FF3030] shrink-0 mt-0.5" />
                <p className="font-semibold">{authError}</p>
              </div>
            )}

            {authSuccess && (
              <div
                role="status"
                className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-white font-medium flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="font-semibold">{authSuccess}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-xs font-display font-semibold text-white mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Aarav Reddy"
                      autoComplete="name"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0B0B0D] border border-white/15 rounded-xl text-sm text-white placeholder-[#A1A1AA]/50 focus:outline-none focus:border-[#FF3030]"
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-xs font-semibold text-[#FF3030]">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-display font-semibold text-white mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@aurora.edu.in"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0B0D] border border-white/15 rounded-xl text-sm text-white placeholder-[#A1A1AA]/50 focus:outline-none focus:border-[#FF3030]"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs font-semibold text-[#FF3030]">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-display font-semibold text-white"
                    >
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs font-semibold text-[#FF3030] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password (min 6 chars)"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full pl-10 pr-11 py-2.5 bg-[#0B0B0D] border border-white/15 rounded-xl text-sm text-white placeholder-[#A1A1AA]/50 focus:outline-none focus:border-[#FF3030]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#A1A1AA] hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-xs font-semibold text-[#FF3030]">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 aurora-crimson-btn font-display font-bold text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <span>
                  {isSubmitting
                    ? 'Processing...'
                    : mode === 'register'
                    ? 'Create Account'
                    : mode === 'login'
                    ? 'Sign In to Portal'
                    : 'Send Password Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 text-xs font-display font-bold text-[#A1A1AA] hover:text-white text-center cursor-pointer"
                >
                  Back to Sign In
                </button>
              )}
            </form>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center text-xs text-[#A1A1AA]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FF3030]" />
                <span>Persistent Session Enabled · All Records Saved to Database</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full border-t border-white/10 bg-[#0B0B0D] px-6 py-4 text-xs text-[#A1A1AA] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Aurora Degree &amp; PG College · Entrepreneurship Cell</span>
        <span>Protected by Encrypted Authentication &amp; Role-Based Security</span>
      </footer>
    </div>
  );
}

