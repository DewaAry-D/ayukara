'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { UpacaraMatchItem } from '@/lib/upacara/UpacaraMatcher';

export interface FixedCeremonyNoticeModalProps {
  isOpen: boolean;
  upacara: UpacaraMatchItem | null;
  targetTab: 'hari_raya' | 'otonan';
  onSwitchTab: () => void;
  onStayHere: () => void;
}

export function FixedCeremonyNoticeModal({
  isOpen,
  upacara,
  targetTab,
  onSwitchTab,
  onStayHere,
}: FixedCeremonyNoticeModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStayHere();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onStayHere]);

  if (!isOpen || !upacara) return null;

  const isHariRaya = targetTab === 'hari_raya';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#FBF8F2] border border-[#DDD3C1]/80 p-7 sm:p-8 shadow-2xl text-center space-y-5">
        {/* Logo Mandala Ayukara (Tanpa Box) */}
        <div className="flex justify-center pt-1">
          <Image
            src="/images/logo_ayukara.png"
            alt="Ayukara Mandala"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#1F3B3A] tracking-tight">
          {isHariRaya ? 'Hari Raya Tetap Terdeteksi' : 'Upacara Otonan Terdeteksi'}
        </h3>

        {/* Explanation Body */}
        <div className="rounded-2xl bg-[#F2EDE2]/70 border border-[#E4DAC6] p-4 text-left space-y-2.5">
          <div className="text-sm font-bold text-[#1F3B3A] font-serif flex items-center gap-2">
            <span>{upacara.nama}</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            {isHariRaya
              ? 'Upacara ini memiliki jadwal pelaksanaan yang sudah pasti dalam kalender Bali (Pawukon atau Sasih). Tidak menggunakan perhitungan pencarian dewasa ayu (hari baik/buruk).'
              : 'Upacara otonan dihitung berdasarkan weton tanggal kelahiran seseorang (siklus 210 hari Pawukon), bukan melalui perhitungan dewasa ayu umum.'}
          </p>
          <div className="pt-1 text-xs text-[#8F432D] font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <span>
              {isHariRaya
                ? 'Disarankan membukanya di tab Hari Raya untuk melihat jadwal dan kebutuhan banten.'
                : 'Disarankan membukanya di tab Otonan untuk menghitung 3 otonan terdekat.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onStayHere}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Tetap di Sini
          </button>
          <button
            type="button"
            onClick={onSwitchTab}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#A8543A] hover:bg-[#8f432d] text-white shadow-md transition-colors cursor-pointer"
          >
            {isHariRaya ? 'Buka di Tab Hari Raya' : 'Buka di Tab Otonan'}
          </button>
        </div>
      </div>
    </div>
  );
}

