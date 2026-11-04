import React from 'react';

/**
 * Custom Desi Pop-Art × Indian Street Poster SVG Illustrations & Empty States
 * Zero external image dependencies — crisp, resilient vector screenprint art.
 */

export function HeroPopArtIllustration() {
  return (
    <div className="relative w-full h-full min-h-[340px] bg-[#0F0F0F] border-2 border-[#0F0F0F] rounded-xl overflow-hidden pop-shadow-lg flex items-center justify-center p-6 select-none">
      {/* Halftone & radial sunburst backdrop */}
      <svg
        viewBox="0 0 600 480"
        className="w-full h-full max-h-[420px]"
        aria-label="Aurora E-Cell Desi Pop-Art Graphic Illustration"
        role="img"
      >
        <defs>
          <pattern id="halftoneDots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill="#FACC15" fillOpacity="0.28" />
          </pattern>
          <pattern id="pinkDots" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.8" fill="#E11D48" fillOpacity="0.45" />
          </pattern>
        </defs>

        {/* Background screenprint blocks */}
        <rect x="0" y="0" width="600" height="480" fill="#0F0F0F" />
        <rect x="16" y="16" width="568" height="448" rx="12" fill="#1D4ED8" stroke="#FFFDF7" strokeWidth="3" />
        <rect x="16" y="16" width="568" height="448" rx="12" fill="url(#halftoneDots)" />

        {/* Dynamic diagonal pop-art rays */}
        <polygon points="16,464 260,16 390,16 140,464" fill="#FF5722" opacity="0.92" />
        <polygon points="280,464 520,16 584,16 410,464" fill="#E11D48" opacity="0.88" />

        {/* Retro Indian street poster scalloped frame */}
        <rect
          x="48"
          y="44"
          width="504"
          height="392"
          rx="8"
          fill="#FFFDF7"
          stroke="#0F0F0F"
          strokeWidth="5"
        />
        <rect x="60" y="56" width="480" height="368" fill="url(#pinkDots)" />

        {/* Corner ticket cutout ornaments */}
        <circle cx="48" cy="44" r="16" fill="#0F0F0F" />
        <circle cx="552" cy="44" r="16" fill="#0F0F0F" />
        <circle cx="48" cy="436" r="16" fill="#0F0F0F" />
        <circle cx="552" cy="436" r="16" fill="#0F0F0F" />

        {/* Comic starburst center-right */}
        <polygon
          points="430,85 450,125 495,115 470,155 510,180 465,195 480,240 435,220 410,260 395,215 350,225 375,185 340,155 385,140 375,95 415,120"
          fill="#FACC15"
          stroke="#0F0F0F"
          strokeWidth="4"
        />
        <text
          x="425"
          y="178"
          textAnchor="middle"
          fill="#0F0F0F"
          fontFamily="Bricolage Grotesque, sans-serif"
          fontWeight="800"
          fontSize="20"
          transform="rotate(-8 425 175)"
        >
          BUILD!
        </text>

        {/* Bold Pop-Art Megaphone & Spark bolts */}
        <g transform="translate(95, 130)">
          {/* Shadow */}
          <path
            d="M36 96 L156 36 L156 186 L36 126 Z"
            fill="#0F0F0F"
            transform="translate(8, 8)"
          />
          {/* Cone */}
          <path
            d="M36 96 L156 36 L156 186 L36 126 Z"
            fill="#FF5722"
            stroke="#0F0F0F"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Mouthpiece */}
          <rect
            x="10"
            y="90"
            width="30"
            height="42"
            rx="6"
            fill="#FACC15"
            stroke="#0F0F0F"
            strokeWidth="5"
          />
          {/* Handle */}
          <path
            d="M52 126 L70 185 L98 185 L84 138"
            fill="#1D4ED8"
            stroke="#0F0F0F"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Rim */}
          <ellipse
            cx="156"
            cy="111"
            rx="16"
            ry="75"
            fill="#FACC15"
            stroke="#0F0F0F"
            strokeWidth="5"
          />
          {/* Sound/Idea Lightning Bolts */}
          <path
            d="M190 70 L240 45 L225 78 L275 60"
            fill="none"
            stroke="#0F0F0F"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M196 112 L265 112"
            fill="none"
            stroke="#E11D48"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M190 152 L240 175 L225 145 L275 165"
            fill="none"
            stroke="#0F0F0F"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Comic Speech Bubble Bottom Left */}
        <g transform="translate(82, 325)">
          <rect
            x="6"
            y="6"
            width="430"
            height="68"
            rx="10"
            fill="#0F0F0F"
          />
          <rect
            x="0"
            y="0"
            width="430"
            height="68"
            rx="10"
            fill="#FACC15"
            stroke="#0F0F0F"
            strokeWidth="4"
          />
          <text
            x="215"
            y="41"
            textAnchor="middle"
            fill="#0F0F0F"
            fontFamily="Bricolage Grotesque, sans-serif"
            fontWeight="800"
            fontSize="17.5"
            letterSpacing="0.5"
          >
            AURORA DEGREE &amp; PG COLLEGE · E-CELL
          </text>
        </g>
      </svg>
    </div>
  );
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
  const bgMap = {
    orange: 'bg-halftone-orange text-[#0F0F0F]',
    blue: 'bg-halftone-blue text-[#FFFDF7]',
    yellow: 'bg-halftone-yellow text-[#0F0F0F]',
    pink: 'bg-[#E11D48] text-[#FFFDF7]',
  };

  return (
    <div
      className={`w-full h-full min-h-[180px] flex flex-col justify-between p-5 border-b-2 border-[#0F0F0F] ${bgMap[variant]} select-none relative overflow-hidden`}
    >
      <div className="flex items-center justify-between text-xs font-mono font-bold opacity-90">
        <span>AURORA E-CELL</span>
        <span>·</span>
        <span>OFFICIAL POSTER</span>
      </div>
      <div className="my-auto py-3">
        <p className="font-display font-extrabold text-xl leading-tight line-clamp-2 bg-[#FFFDF7] text-[#0F0F0F] inline-block px-2.5 py-1 border-2 border-[#0F0F0F] pop-shadow">
          {title}
        </p>
      </div>
      {subtitle && (
        <div className="text-xs font-mono font-bold truncate opacity-95">
          {subtitle}
        </div>
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
      className={`${className} border-b-2 border-[#0F0F0F] bg-[#FFFDF7]`}
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
      className="w-full bg-[#FFFDF7] border-2 border-[#0F0F0F] rounded-xl p-8 md:p-12 pop-shadow text-center flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Comic speech bubble graphic */}
      <div className="relative mb-5">
        <div className="bg-[#FACC15] border-2 border-[#0F0F0F] rounded-lg px-5 py-2.5 pop-shadow inline-block">
          <span className="font-display font-extrabold text-base md:text-lg text-[#0F0F0F] tracking-tight">
            {message}
          </span>
        </div>
      </div>

      <h3 className="font-display font-bold text-xl md:text-2xl text-[#0F0F0F] mb-2">
        {sectionTitle}
      </h3>
      <p className="text-sm md:text-base text-neutral-700 max-w-lg leading-relaxed">
        {subMessage}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 px-5 py-2.5 bg-[#FF5722] text-[#0F0F0F] font-display font-bold text-sm border-2 border-[#0F0F0F] rounded-lg pop-shadow hover:bg-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
