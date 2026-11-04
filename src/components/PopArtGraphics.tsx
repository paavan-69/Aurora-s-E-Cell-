import React, { useRef, useState } from 'react';
import { AuroraAiExperience } from './AuroraAiExperience';

/**
 * Word-by-word expressive headline reveal for the Futuristic Aurora design system.
 */
export function WordRevealHeading({
  text,
  as: Tag = 'h1',
  className = '',
  highlightWords = [],
  style,
}: {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  highlightWords?: string[];
  style?: React.CSSProperties;
}) {
  const words = text.split(' ');
  const highlightSet = new Set(highlightWords.map((w) => w.toLowerCase()));

  return (
    <Tag className={className} style={style}>
      {words.map((word, idx) => {
        const clean = word.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
        const isHighlighted = highlightSet.has(clean);
        return (
          <React.Fragment key={`${word}-${idx}`}>
            <span
              className={`animate-word-rise ${
                isHighlighted
                  ? 'bg-gradient-to-r from-[#FF3030] via-[#FF6B4A] to-[#FF3030] bg-clip-text text-transparent'
                  : ''
              }`}
              style={{ animationDelay: `${idx * 55}ms` }}
            >
              {word}
            </span>
            {idx < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}

/**
 * Interactive 3D perspective card tilt with cursor-reactive crimson specular lighting.
 */
export function Tilt3DCard({
  children,
  className = '',
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState<string>(
    'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  );
  const [glowPos, setGlowPos] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const rotateY = (relX - 0.5) * 8;
    const rotateX = (0.5 - relY) * 8;
    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
    );
    setGlowPos({
      x: Math.round(relX * 100),
      y: Math.round(relY * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlowPos((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={ref}
      data-testid={testId}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: glowPos.active
          ? 'transform 90ms ease-out'
          : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {glowPos.active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(360px circle at ${glowPos.x}% ${glowPos.y}%, rgba(255, 48, 48, 0.14), transparent 70%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full flex flex-col justify-between">{children}</div>
    </div>
  );
}

/**
 * AURORA AI Interactive Experience (Replaces the legacy Nexus Core 3D Interactive Field)
 */
export function HeroPopArtIllustration() {
  return <AuroraAiExperience />;
}

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


