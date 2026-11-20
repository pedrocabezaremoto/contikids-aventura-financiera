/** Íconos SVG locales (sin emojis ni CDN). Heredan el color con currentColor. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...p,
});

export const MapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
    <path d="M9 4v13M15 7v13" />
  </svg>
);

export const GiftIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="9" width="18" height="11" rx="2" />
    <path d="M3 13h18M12 9v11" />
    <path d="M12 9c-2.5 0-4-1-4-2.5S9.5 4 12 9c2.5-5 4-3.5 4-2.5S14.5 9 12 9Z" />
  </svg>
);

export const UserIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);

export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base({ strokeWidth: 3.4, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Moneda Waddles: dorada, con una "W" (distinta de los Bs. de los ejercicios). */
export const CoinIcon = (p: P) => (
  <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <circle cx="12" cy="12" r="10.5" fill="#ecc911" stroke="#b39a0b" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="7.4" fill="none" stroke="#b39a0b" strokeWidth="1.2" />
    <path
      d="m8.2 9 1.7 6 2.1-4.6 2.1 4.6 1.7-6"
      fill="none"
      stroke="#8a6a07"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Rayo de XP. */
export const XpIcon = (p: P) => (
  <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <path
      d="M13.5 2 4.5 13.5H11L10 22l9-11.5h-6.5L13.5 2Z"
      fill="#3e6aa8"
      stroke="#2a4c7e"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const StarIcon = ({ filled = true, ...p }: P & { filled?: boolean }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <path
      d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z"
      fill={filled ? '#ecc911' : 'none'}
      stroke={filled ? '#b39a0b' : '#9aa6c4'}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
  </svg>
);

export const QuizIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.2 9.3a3 3 0 1 1 4.4 2.6c-.9.5-1.6 1.1-1.6 2.2M12 17.4v.1" />
  </svg>
);

export const TrophyIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5" />
  </svg>
);
