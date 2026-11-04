'use client';

import React from 'react';

export interface AiSummaryBoxProps {
  summaryText: string;
  citations?: Array<{
    id: number;
    title: string;
    url?: string;
  }>;
}

export function AiSummaryBox({ summaryText, citations = [] }: AiSummaryBoxProps) {
  function renderFormattedText(text: string) {
    if (!text) return null;

    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = match[1];
        return (
          <sup key={i} className="px-0.5 text-[#C9A24A] font-bold">
            [{citationNum}]
          </sup>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-4 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <svg className="w-4 h-4 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
        </svg>
        <h3 className="text-xl font-bold font-serif text-white tracking-tight">
          Penjelasan dari Ayukara AI
        </h3>
      </div>

      {/* Narrative Body */}
      <div className="text-xs sm:text-sm text-stone-200 leading-relaxed">
        {renderFormattedText(summaryText)}
      </div>

      {/* Citations List */}
      {citations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {citations.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs text-stone-300">
              <span className="w-1 h-3.5 bg-[#C9A24A] rounded-full shrink-0" />
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-stone-200 hover:text-[#F3E9CF]"
                >
                  [{c.id}] {c.title}
                </a>
              ) : (
                <span>
                  [{c.id}] {c.title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footnote Disclaimer */}
      <p className="text-[11px] text-stone-400 pt-1 border-t border-white/10">
        Penjelasan ini bersifat pendamping; keputusan akhir pada sulinggih atau pemangku.
      </p>
    </div>
  );
}

export default AiSummaryBox;