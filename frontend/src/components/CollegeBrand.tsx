import type { CSSProperties } from 'react';

type BrandConfig = {
  shortName: string;
  nickname: string;
  palette: {
    base: string;
    accent: string;
    highlight: string;
    ink: string;
    soft: string;
  };
  glow: string;
  gradient: string;
  bannerGradient: string;
  pattern: string;
  shape: 'mountain' | 'bridge' | 'summit' | 'river';
};

const brandMap: Record<string, BrandConfig> = {
  'apex institute of technology': {
    shortName: 'Apex',
    nickname: 'Vanguard',
    palette: {
      base: '#0f766e',
      accent: '#14b8a6',
      highlight: '#99f6e4',
      ink: '#ecfeff',
      soft: '#134e4a'
    },
    glow: 'rgba(20,184,166,0.28)',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #115e59 42%, #14b8a6 100%)',
    bannerGradient: 'radial-gradient(circle at 20% 20%, rgba(153,246,228,0.28), transparent 35%), linear-gradient(135deg, #042f2e 0%, #0f766e 55%, #14b8a6 100%)',
    pattern: 'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.14), transparent 18%), linear-gradient(115deg, transparent 0 40%, rgba(255,255,255,0.08) 40% 43%, transparent 43% 100%)',
    shape: 'mountain'
  },
  'northbridge engineering college': {
    shortName: 'Northbridge',
    nickname: 'Sentinels',
    palette: {
      base: '#1d4ed8',
      accent: '#60a5fa',
      highlight: '#bfdbfe',
      ink: '#eff6ff',
      soft: '#172554'
    },
    glow: 'rgba(96,165,250,0.3)',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 45%, #60a5fa 100%)',
    bannerGradient: 'radial-gradient(circle at 18% 18%, rgba(191,219,254,0.26), transparent 34%), linear-gradient(135deg, #172554 0%, #1d4ed8 52%, #60a5fa 100%)',
    pattern: 'radial-gradient(circle at 78% 22%, rgba(255,255,255,0.12), transparent 16%), linear-gradient(90deg, transparent 0 30%, rgba(255,255,255,0.07) 30% 34%, transparent 34% 66%, rgba(255,255,255,0.07) 66% 70%, transparent 70% 100%)',
    shape: 'bridge'
  },
  'summit school of computing': {
    shortName: 'Summit',
    nickname: 'Ascendants',
    palette: {
      base: '#7c3aed',
      accent: '#a855f7',
      highlight: '#e9d5ff',
      ink: '#faf5ff',
      soft: '#3b0764'
    },
    glow: 'rgba(168,85,247,0.32)',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #581c87 45%, #c084fc 100%)',
    bannerGradient: 'radial-gradient(circle at 18% 18%, rgba(233,213,255,0.28), transparent 34%), linear-gradient(135deg, #2e1065 0%, #7c3aed 55%, #c084fc 100%)',
    pattern: 'radial-gradient(circle at 78% 22%, rgba(255,255,255,0.14), transparent 18%), linear-gradient(135deg, transparent 0 54%, rgba(255,255,255,0.08) 54% 58%, transparent 58% 100%)',
    shape: 'summit'
  },
  'rivergate university': {
    shortName: 'Rivergate',
    nickname: 'Tideguard',
    palette: {
      base: '#ea580c',
      accent: '#fb923c',
      highlight: '#fed7aa',
      ink: '#fff7ed',
      soft: '#7c2d12'
    },
    glow: 'rgba(251,146,60,0.3)',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #9a3412 45%, #fb923c 100%)',
    bannerGradient: 'radial-gradient(circle at 18% 18%, rgba(254,215,170,0.24), transparent 34%), linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #fb923c 100%)',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 16%), linear-gradient(180deg, transparent 0 45%, rgba(255,255,255,0.08) 45% 49%, transparent 49% 61%, rgba(255,255,255,0.08) 61% 65%, transparent 65% 100%)',
    shape: 'river'
  }
};

const fallbackBrand = brandMap['apex institute of technology'];

export function getCollegeBrand(name: string) {
  return brandMap[name.trim().toLowerCase()] ?? fallbackBrand;
}

function crestShape(shape: BrandConfig['shape'], accent: string, highlight: string) {
  if (shape === 'mountain') {
    return (
      <>
        <path d="M18 54L36 24L54 54H18Z" fill={accent} opacity="0.95" />
        <path d="M30 54L48 18L66 54H30Z" fill={highlight} opacity="0.9" />
        <path d="M46 26L50 32L54 26L58 32L62 26" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      </>
    );
  }

  if (shape === 'bridge') {
    return (
      <>
        <path d="M18 54H66" stroke={highlight} strokeWidth="5" strokeLinecap="round" />
        <path d="M24 54C24 40 32 30 42 30C52 30 60 40 60 54" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <path d="M30 54C30 44 35 38 42 38C49 38 54 44 54 54" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <path d="M30 26V54M54 26V54" stroke={highlight} strokeWidth="3" opacity="0.8" />
      </>
    );
  }

  if (shape === 'summit') {
    return (
      <>
        <path d="M42 16L48 30L64 30L51 39L56 54L42 45L28 54L33 39L20 30L36 30L42 16Z" fill={highlight} opacity="0.98" />
        <circle cx="42" cy="36" r="8" fill={accent} opacity="0.95" />
        <path d="M42 24V48M30 36H54" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </>
    );
  }

  return (
    <>
      <path d="M16 46C22 36 30 36 36 46C42 56 50 56 56 46C60 40 64 39 68 44" fill="none" stroke={highlight} strokeWidth="6" strokeLinecap="round" />
      <path d="M16 58C22 48 30 48 36 58C42 68 50 68 56 58C60 52 64 51 68 56" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <path d="M22 26H62L54 38H30L22 26Z" fill={highlight} opacity="0.88" />
    </>
  );
}

type CollegeCrestProps = {
  collegeName: string;
  size?: number;
  withLabel?: boolean;
};

export function CollegeCrest({ collegeName, size = 72, withLabel = false }: CollegeCrestProps) {
  const brand = getCollegeBrand(collegeName);
  const style = {
    background: `radial-gradient(circle at 30% 28%, ${brand.palette.highlight}44, transparent 34%), ${brand.gradient}`,
    boxShadow: `0 18px 48px ${brand.glow}`
  } satisfies CSSProperties;

  return (
    <div className="flex items-center gap-3">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15" style={{ ...style, width: size, height: size }}>
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: brand.pattern }} />
        <svg viewBox="0 0 84 84" className="relative h-full w-full p-2.5" aria-hidden="true">
          <rect x="8" y="8" width="68" height="68" rx="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
          {crestShape(brand.shape, brand.palette.accent, brand.palette.highlight)}
        </svg>
      </div>
      {withLabel ? (
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/55">{brand.nickname}</p>
          <p className="text-base font-bold text-white">{brand.shortName}</p>
        </div>
      ) : null}
    </div>
  );
}

export function getCollegeSurfaceStyle(name: string) {
  const brand = getCollegeBrand(name);
  return {
    backgroundImage: `${brand.pattern}, ${brand.bannerGradient}`,
    boxShadow: `0 24px 80px ${brand.glow}`
  } satisfies CSSProperties;
}
