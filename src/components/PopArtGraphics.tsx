import React, { useRef, useState } from 'react';
import { Award, Rocket, Building2, Flame, ShieldCheck, Users } from 'lucide-react';

/**
 * Editorial Venture Showcase Card for the Hero section.
 * Clean, high-performance, editorial showcase of Aurora E-Cell's institutional achievements and venture pillars.
 */
export function HeroVentureShowcaseCard() {
  return (
    <div
      data-testid="aurora-venture-showcase"
      className="relative w-full h-full min-h-[440px] bg-[#0B0B0D] border border-white/12 rounded-2xl overflow-hidden flex flex-col justify-between p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] group transition-all duration-300"
    >
      {/* Ambient Crimson Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#FF3030]/15 blur-3xl"
      />

      {/* Top Header Strip */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[#FF3030]" />
            <h2 className="font-display font-bold text-sm sm:text-base tracking-wide text-white">
              AURORA VENTURE ACCELERATOR
            </h2>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Campus Incubation &amp; Entrepreneurship Cell
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141416] border border-white/12 text-[11px] font-mono text-white">
            <span className="w-2 h-2 rounded-full bg-[#FF3030] animate-pulse" />
            <span className="text-[#FF3030] font-semibold">ACTIVE HYDERABAD HUB</span>
          </span>
        </div>
      </div>

      {/* Center Highlights: Institutional Pillars */}
      <div className="relative z-10 my-auto py-6 space-y-4">
        <div className="p-4 rounded-xl bg-[#141416]/80 border border-white/10 flex items-center gap-4 hover:border-[#FF3030]/40 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#FF3030]/15 border border-[#FF3030]/30 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-[#FF3030]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF3030] uppercase">
              <span>National Achievement</span>
              <span aria-hidden="true">·</span>
              <span className="text-white font-bold">21st Rank</span>
            </div>
            <h3 className="font-display font-bold text-base text-white mt-0.5">
              IIT Bombay NEC 2025–2026
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
              Secured 21st Place Nationally across 700+ competing institutions in India's premier
              entrepreneurship challenge.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141416]/80 border border-white/10 flex items-center gap-4 hover:border-[#FF3030]/40 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#FF3030]/15 border border-[#FF3030]/30 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-[#FF3030]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF3030] uppercase">
              <span>Incubation Alliance</span>
              <span aria-hidden="true">·</span>
              <span className="text-white font-bold">Institutional Partner</span>
            </div>
            <h3 className="font-display font-bold text-base text-white mt-0.5">
              Osmania TBI &amp; T-Works Ecosystem
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
              Direct access to state-level prototyping facilities, research grants, and regional VC
              mentorship networks.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry & Metrics Badges */}
      <div className="relative z-10 space-y-3 pt-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#141416]/90 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#A1A1AA] uppercase">
              <Flame className="w-3 h-3 text-[#FF3030]" />
              <span>National</span>
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
              21st
            </div>
            <div className="text-[10px] text-[#A1A1AA] truncate mt-0.5">IIT Bombay NEC</div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#141416]/90 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#A1A1AA] uppercase">
              <ShieldCheck className="w-3 h-3 text-[#FF3030]" />
              <span>Focus</span>
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
              Zero-to-1
            </div>
            <div className="text-[10px] text-[#A1A1AA] truncate mt-0.5">Incubation</div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#141416]/90 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#A1A1AA] uppercase">
              <Users className="w-3 h-3 text-[#FF3030]" />
              <span>Network</span>
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
              Active
            </div>
            <div className="text-[10px] text-[#A1A1AA] truncate mt-0.5">Student Founders</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA] pt-1">
          <span>Aurora Degree &amp; PG College · ED Cell</span>
          <span className="text-[#FF3030]">● Live Ecosystem</span>
        </div>
      </div>
    </div>
  );
}

/** Legacy alias pointing to the clean HeroVentureShowcaseCard */
export const HeroPopArtIllustration = HeroVentureShowcaseCard;

export function PopArtPosterFallback({
  title,
  subtitle,
  variant = 'orange',
}: {
  title: string;
  subtitle?: string;
  variant?: 'orange' | 'blue' | 'yellow' | 'pink';
}) {
  const accentMap = {
    orange: 'from-[#FF3030]/25 via-[#8B0000]/15 to-[#0B0B0D]',
    blue: 'from-[#FF3030]/20 via-[#141416] to-[#050505]',
    yellow: 'from-[#8B0000]/30 via-[#141416] to-[#050505]',
    pink: 'from-[#FF3030]/30 via-[#8B0000]/20 to-[#0B0B0D]',
  };

  return (
    <div
      className={`w-full h-full min-h-[180px] flex flex-col justify-between p-5 border-b border-white/10 bg-gradient-to-br ${accentMap[variant]} text-white select-none relative overflow-hidden`}
    >
      <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#A1A1AA] uppercase">
        <span className="text-[#FF3030] font-semibold">AURORA E-CELL</span>
        <span>·</span>
        <span>OFFICIAL SHOWCASE</span>
      </div>
      <div className="my-auto py-3">
        <p className="font-display font-bold text-xl leading-tight line-clamp-2 text-white">
          {title}
        </p>
      </div>
      {subtitle && (
        <div className="text-xs font-mono text-[#A1A1AA] truncate">{subtitle}</div>
      )}
    </div>
  );
}

export function ResilientMediaImage({
  src,
  alt,
  fallbackTitle,
  fallbackSubtitle,
  variant = 'yellow',
  className = 'w-full h-48 object-cover',
}: {
  src?: string;
  alt: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  variant?: 'orange' | 'blue' | 'yellow' | 'pink';
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (!src || !src.trim() || failed) {
    return (
      <div className={className}>
        <PopArtPosterFallback
          title={fallbackTitle}
          subtitle={fallbackSubtitle}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} border-b border-white/10 bg-[#0B0B0D]`}
    />
  );
}

export function StylishEmptyState({
  sectionTitle,
  message = 'Nothing here yet. Stay tuned.',
  subMessage = 'All content in this section is curated and published directly by the Aurora E-Cell administrator.',
  actionLabel,
  onAction,
}: {
  sectionTitle: string;
  message?: string;
  subMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      data-testid={`empty-state-${sectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      className="w-full aurora-card rounded-2xl p-8 md:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#FF3030]/10 blur-3xl"
      />
      <div className="relative z-10 mb-3 text-xs font-mono uppercase tracking-widest text-[#FF3030]">
        {message}
      </div>

      <h3 className="relative z-10 font-display font-bold text-xl md:text-2xl text-white mb-2">
        {sectionTitle}
      </h3>
      <p className="relative z-10 text-sm md:text-base text-[#A1A1AA] max-w-lg leading-relaxed">
        {subMessage}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative z-10 mt-6 px-5 py-2.5 aurora-crimson-btn font-display font-bold text-sm rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Symmetrical, transparent-background header brand logo (Aurora E-Cell top-left or Aurora College top-right).
 * - Gracefully hides when no logo URL is uploaded or if image loading fails (never shows broken image or placeholder).
 * - Uses object-fit: contain and responsive sizing for mobile, tablet, and desktop.
 * - Renders directly against the dark header background without extra borders, backgrounds, or containers.
 */
export function HeaderBrandLogo({
  src,
  alt,
  testId,
}: {
  src?: string;
  alt: string;
  testId: string;
}) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const trimmed = (src || '').trim();

  if (!trimmed || failedSrc === trimmed) {
    return null;
  }

  return (
    <img
      src={trimmed}
      alt={alt}
      data-testid={testId}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(trimmed)}
      style={{ objectFit: 'contain' }}
      className="h-7 sm:h-9 md:h-11 w-auto max-w-[88px] sm:max-w-[130px] md:max-w-[165px] object-contain select-none shrink-0 animate-logo-entrance"
    />
  );
}

/**
 * Word reveal heading component for editorial typography with glowing highlighted words.
 */
export function WordRevealHeading({
  text,
  highlightWords = [],
  className = '',
  style,
}: {
  text: string;
  highlightWords?: string[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const words = text.split(' ');
  return (
    <h1 className={className} style={style}>
      {words.map((word, idx) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isHighlight = highlightWords.some(
          (hw) => hw.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanWord
        );
        return (
          <span
            key={idx}
            className={`inline-block mr-[0.28em] transition-transform duration-300 ${
              isHighlight
                ? 'text-[#FF3030] font-extrabold drop-shadow-[0_0_20px_rgba(255,48,48,0.4)]'
                : 'text-white'
            }`}
          >
            {word}
          </span>
        );
      })}
    </h1>
  );
}

/**
 * 3D interactive tilt card reacting to cursor hover for futuristic visual depth.
 */
export function Tilt3DCard({
  children,
  className = '',
  testId,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`
    );
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      data-testid={testId}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform: transformStyle,
        transition: transformStyle ? 'transform 0.12s ease-out' : 'transform 0.35s ease-out',
        willChange: 'transform',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
