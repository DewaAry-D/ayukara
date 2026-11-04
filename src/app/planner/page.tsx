import React, { Suspense } from 'react';
import { PlannerTabs } from '@/features/planner/components/PlannerTabs';

export const metadata = {
  title: 'Perencana Upacara Yadnya · Ayukara',
  description:
    'Rencanakan upacara yadnya Hindu Bali dengan perhitungan wariga teruji, kebutuhan banten terstruktur, dan estimasi biaya transparan.',
};

export default function PlannerPage() {
  return (
    <div className="w-full min-h-screen bg-[#1F3B3A]">
      {/* TOP HEADER SECTION (#F5F0E6 with wave landscape) */}
      <section className="relative w-full bg-[#F5F0E6] pt-10 pb-16 sm:pb-24 overflow-hidden border-b border-[#DDD3C1]/50">
        {/* Layered hill wave background decorations */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none w-full h-[50%] flex flex-col justify-end">
          <div className="w-full h-full relative">
            <svg
              className="absolute bottom-0 w-full h-[85%] text-[#8EA89D]/40"
              viewBox="0 0 1440 240"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,144 C320,72 640,192 960,120 C1280,48 1360,96 1440,120 L1440,240 L0,240 Z" />
            </svg>
            <svg
              className="absolute bottom-0 w-full h-[60%] text-[#5B8577]/60"
              viewBox="0 0 1440 240"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,96 C280,168 560,72 840,144 C1120,216 1320,120 1440,144 L1440,240 L0,240 Z" />
            </svg>
            <svg
              className="absolute bottom-0 w-full h-[35%] text-[#1F3B3A]"
              viewBox="0 0 1440 240"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,120 C360,48 720,168 1080,96 C1260,60 1380,105 1440,120 L1440,240 L0,240 Z" />
            </svg>
          </div>
        </div>

        {/* Header Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-3">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#A8543A]">
            LANGKAH 1 DARI 2 · RENCANAKAN UPACARA
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1F3B3A] tracking-tight font-serif leading-tight">
            Ceritakan rencana Anda
          </h1>
        </div>
      </section>

      {/* PLANNER TABS & FORMS SECTION (Deep Forest Green #1F3B3A) */}
      <section className="w-full py-10 px-6 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <Suspense
            fallback={
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm text-stone-300">
                Memuat modul perencana...
              </div>
            }
          >
            <PlannerTabs />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
