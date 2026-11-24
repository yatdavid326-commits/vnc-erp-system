'use client';

import type { ReactNode } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'view' | 'edit' | 'delete' | 'movement';
  disabled?: boolean;
  title: string;
  compact?: boolean;
}

export default function ActionButton({
  children,
  icon,
  onClick,
  variant = 'edit',
  disabled = false,
  title,
  compact = false,
}: ActionButtonProps) {
  const variantClass =
    variant === 'delete'
      ? 'bg-red-600 hover:bg-red-700'
      : variant === 'movement'
        ? 'bg-amber-600 hover:bg-amber-700'
        : variant === 'view'
          ? 'bg-gray-600 hover:bg-gray-700'
          : 'bg-blue-600 hover:bg-blue-700';

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded text-white transition-colors disabled:opacity-50 ${variantClass} ${
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
