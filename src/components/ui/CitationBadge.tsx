import React from 'react';

interface CitationBadgeProps {
  id: number;
  label?: string;
  sourceTitle?: string;
  onClick?: () => void;
  className?: string;
}

export function CitationBadge({
  id,
  label,
  sourceTitle,
  onClick,
  className = '',
}: CitationBadgeProps) {
  const displayLabel = label || `[${id}]`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline decoration-dotted underline-offset-2 transition-colors cursor-pointer ${className}`}
      title={sourceTitle ? `Sumber: ${sourceTitle}` : `Sitasi ${id}`}
    >
      <sup>{displayLabel}</sup>
    </button>
  );
}

export default CitationBadge;

