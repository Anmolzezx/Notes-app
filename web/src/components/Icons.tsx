import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PinIcon({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 2 L12 14 M7 7 L17 7 L15.5 11 L8.5 11 Z M9 14 L15 14 L12 22 Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4 v5 h5" />
      <path d="M12 7 v5 l3 2" />
    </svg>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.5 10.5 L15.5 6.5" />
      <path d="M8.5 13.5 L15.5 17.5" />
    </svg>
  );
}

export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M14 4 L20 10 L8 22 L2 22 L2 16 Z" />
      <path d="M13 5 L19 11" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7 h16" />
      <path d="M10 4 h4 a1 1 0 0 1 1 1 v2 h-6 v-2 a1 1 0 0 1 1 -1 z" />
      <path d="M6 7 l1 13 a2 2 0 0 0 2 2 h6 a2 2 0 0 0 2 -2 l1 -13" />
      <path d="M10 11 v7 M14 11 v7" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6 L18 18 M6 18 L18 6" />
    </svg>
  );
}
