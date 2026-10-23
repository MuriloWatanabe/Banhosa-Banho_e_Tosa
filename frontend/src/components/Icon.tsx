import React from 'react';

type Props = {
  name:
    | 'dashboard'
    | 'calendar'
    | 'pets'
    | 'users'
    | 'staff'
    | 'plus'
    | 'search'
    | 'bell'
    | 'chevron'
    | 'clock'
    | 'check'
    | 'paw'
    | 'trash'
    | 'edit';
};

export function Icon({ name }: Props) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'pets':
      return (
        <svg {...common}>
          <path d="M12 17.5c2.8 0 5-1.8 5-4.2 0-1.5-.8-2.8-2-3.6-.2-2.5-1.3-4-3-4s-2.8 1.5-3 4c-1.2.8-2 2.1-2 3.6 0 2.4 2.2 4.2 5 4.2Z" />
          <circle cx="6.5" cy="8" r="1.8" />
          <circle cx="17.5" cy="8" r="1.8" />
          <circle cx="8" cy="5.3" r="1.5" />
          <circle cx="16" cy="5.3" r="1.5" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'staff':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
          <path d="M18 11.5a3.5 3.5 0 1 0 0 7" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case 'paw':
      return (
        <svg {...common}>
          <path d="M12 16.5c2.3 0 4.5 1.4 4.5 3.5 0 .8-.7 1.5-1.5 1.5H9c-.8 0-1.5-.7-1.5-1.5 0-2.1 2.2-3.5 4.5-3.5Z" />
          <circle cx="6.5" cy="11" r="1.6" />
          <circle cx="17.5" cy="11" r="1.6" />
          <circle cx="9" cy="7" r="1.6" />
          <circle cx="15" cy="7" r="1.6" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
          <path d="M6 7l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-13" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
  }
}
