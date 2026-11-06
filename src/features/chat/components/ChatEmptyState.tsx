'use client';

import React from 'react';
import Image from 'next/image';

export interface ChatEmptyStateProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const SUGGESTIONS = [
  'Dewasa ayu pawiwahan bulan depan',
  'Apa itu tingkat nista?',
  'Banten apa saja untuk upacara galungan',
];

export function ChatEmptyState({ onSelectSuggestion }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto space-y-4 sm:space-y-5">
      {/* Balinese Emblem Illustration */}
      <div className="relative">
        <Image
          src="/images/logo_ayukara.png"
          alt="Ayukara Emblem"
          width={88}
          height={88}
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto drop-shadow-md"
          priority
        />
      </div>

      {/* Gold Divider: line — ✦ — line */}
      <div className="flex items-center justify-center gap-3 w-32 sm:w-36 mx-auto">
        <span className="flex-1 h-[1px] bg-[#C9A24A]/60" />
        <span className="text-[#C9A24A] text-xs">✦</span>
        <span className="flex-1 h-[1px] bg-[#C9A24A]/60" />
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight">
          Om Swastyastu, ada yang bisa dibantu?
        </h1>
        <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed">
          Tanyakan seputar dewasa ayu, tingkatan yadnya, atau kebutuhan banten pawiwahan.
        </p>
      </div>

      {/* 3 Suggestion Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-3">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSuggestion(s)}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/40 text-stone-200 hover:text-white text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChatEmptyState;

