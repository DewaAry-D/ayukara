import React from 'react';

interface PriceDisclaimerProps {
  className?: string;
}

export function PriceDisclaimer({ className = '' }: PriceDisclaimerProps) {
  return (
    <div
      role="note"
      className={`rounded-lg border border-stone-200 bg-stone-50/80 px-3.5 py-2.5 text-xs text-stone-600 flex items-center gap-2 ${className}`}
    >
      <span className="shrink-0 text-stone-500 font-bold" aria-hidden="true">ⓘ</span>
      <p>Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah.</p>
    </div>
  );
}

export default PriceDisclaimer;

