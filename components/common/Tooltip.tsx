'use client';

import type { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  label: string;
  align?: 'left' | 'center' | 'right';
}

export default function Tooltip({
  children,
  label,
  align = 'center',
}: TooltipProps) {
  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-50 mb-2 hidden w-max max-w-64 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-within:block ${alignClass}`}
      >
        {label}
      </span>
    </span>
  );
}
