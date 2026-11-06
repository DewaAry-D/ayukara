import React from 'react';

interface VerificationBadgeProps {
  status: 'verified' | 'unverified' | 'konflik' | 'rejected';
  className?: string;
}

export function VerificationBadge({ status, className = '' }: VerificationBadgeProps) {
  if (status === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ${className}`}
        title="Data telah diverifikasi oleh Cultural Lead"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        Tervalidasi
      </span>
    );
  }

  if (status === 'konflik') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 ${className}`}
        title="Terdapat pertentangan aturan pada sumber rujukan"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        Konflik Aturan
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ${className}`}
      title="Data bersumber dari literatur/web namun belum ditelaah final oleh Cultural Lead"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
      Belum Ditelaah
    </span>
  );
}

export default VerificationBadge;

