import type { SVGProps } from 'react';

export type IconName =
  | 'today'
  | 'inbox'
  | 'review'
  | 'stats'
  | 'arrowLeft'
  | 'arrowRight'
  | 'close'
  | 'plus'
  | 'play'
  | 'pause'
  | 'check'
  | 'settings'
  | 'chevronRight'
  | 'clock'
  | 'spark'
  | 'trash'
  | 'edit'
  | 'calendar'
  | 'target'
  | 'leaf'
  | 'refresh'
  | 'lock'
  | 'moon';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.7, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };

  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
        </svg>
      );
    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 5.5h16v13H4z" />
          <path d="M4 13h4l2 3h4l2-3h4" />
        </svg>
      );
    case 'review':
      return (
        <svg {...common}>
          <path d="M5.5 4h13v16h-13z" />
          <path d="M9 9h6M9 13h6M9 17h3" />
        </svg>
      );
    case 'stats':
      return (
        <svg {...common}>
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );
    case 'arrowLeft':
      return (
        <svg {...common}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      );
    case 'arrowRight':
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M7 4.5l12 7.5-12 7.5z" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="7" y="4" width="3.6" height="16" rx="1.2" />
          <rect x="13.4" y="4" width="3.6" height="16" rx="1.2" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.86 1.86-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1 1.56V20h-2.6v-.08a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.88.34l-.06.06-1.86-1.86.06-.06A1.7 1.7 0 009.4 15a1.7 1.7 0 00-1.56-1H7.8v-2.6h.08a1.7 1.7 0 001.56-1 1.7 1.7 0 00-.34-1.88l-.06-.06L10.9 6.6l.06.06a1.7 1.7 0 001.88.34 1.7 1.7 0 001-1.56V5.4h2.6v.08a1.7 1.7 0 001 1.56 1.7 1.7 0 001.88-.34l.06-.06 1.86 1.86-.06.06a1.7 1.7 0 00-.34 1.88 1.7 1.7 0 001.56 1h.08V14h-.08a1.7 1.7 0 00-1.56 1z" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg {...common}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
          <path d="M18.5 16l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 7.5l3 3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9h17M8 3.5V6M16 3.5V6" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...common}>
          <path d="M20 4c-8 0-14 4.5-14 11a5 5 0 005 5c6.5 0 9-6 9-16z" />
          <path d="M4 21c1-5 4.5-9.5 10-12" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 10-2.3 6.3M20 4v7h-7" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 018 0v3" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 15.2A8.5 8.5 0 118.8 4 7 7 0 0020 15.2z" />
        </svg>
      );
    default:
      return null;
  }
}
