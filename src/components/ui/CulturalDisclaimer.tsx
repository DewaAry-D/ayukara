import React from 'react';

interface CulturalDisclaimerProps {
  className?: string;
}

export function CulturalDisclaimer({ className = '' }: CulturalDisclaimerProps) {
  return (
    <div
      role="note"
      className={`rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-sm text-amber-950 shadow-xs flex items-start gap-3 ${className}`}
    >
      <div className="shrink-0 mt-0.5 text-amber-700" aria-hidden="true">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="leading-relaxed">
        <strong>Penting:</strong> Ayukara adalah pendamping perencanaan yadnya berbasis lontar dan sumber berkutipan,{' '}
        <span className="font-semibold underline decoration-amber-400">bukan pengganti sulinggih atau pemangku</span>. Selalu konsultasikan pelaksanaan upakara dengan pemangku atau sulinggih di wilayah Anda.
      </p>
    </div>
  );
}

export default CulturalDisclaimer;

