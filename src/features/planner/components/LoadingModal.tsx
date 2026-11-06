'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export interface LoadingModalProps {
  isOpen: boolean;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export function LoadingModal({
  isOpen,
  onCancel,
  title = 'Menyiapkan rekomendasi...',
  subtitle = 'Ayukara sedang memproses rencana Anda.',
}: LoadingModalProps) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isOpen) {
      setProgress(15);
      return;
    }

    // Interval progres halus menyerupai pemrosesan nyata
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          return prev + Math.floor(Math.random() * 8 + 6);
        }
        if (prev < 70) {
          return prev + Math.floor(Math.random() * 6 + 4);
        }
        if (prev < 88) {
          return prev + Math.floor(Math.random() * 3 + 2);
        }
        if (prev < 96) {
          return prev + 1;
        }
        return prev;
      });
    }, 180);

    // Escape key listener untuk menutup modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#FBF8F2] border border-[#DDD3C1]/80 p-8 sm:p-9 shadow-2xl text-center space-y-6">
        {/* Orbital Mandala Spinner */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          {/* Base Ring Track */}
          <div className="absolute inset-0 rounded-full border-2 border-[#EADFC9]" />

          {/* Spinning Orbit Ring with Accent Arc */}
          <div className="absolute inset-0 rounded-full animate-spin [animation-duration:2.5s]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="38"
                fill="none"
                stroke="#C9A24A"
                strokeWidth="2.5"
                strokeDasharray="65 175"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Center Mandala Icon */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            <Image
              src="/images/logo_ayukara.png"
              alt="Ayukara Mandala"
              width={42}
              height={42}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Text Heading & Subtitle */}
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#1F3B3A] tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="space-y-2 pt-1">
          <div className="w-full h-1.5 bg-[#E8E1D5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#A8543A] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Biasanya hanya 1–2 detik.</span>
            <span className="font-semibold text-stone-700 font-mono">{progress}%</span>
          </div>
        </div>

        {/* Batal Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs sm:text-sm font-medium text-stone-500 hover:text-[#1F3B3A] transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoadingModal;

