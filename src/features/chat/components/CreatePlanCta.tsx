'use client';

import React from 'react';
import Link from 'next/link';
import { SuggestedPlan } from '@/lib/chat/ChatService';

export interface CreatePlanCtaProps {
  plan: SuggestedPlan;
}

export function CreatePlanCta({ plan }: CreatePlanCtaProps) {
  const queryParams = new URLSearchParams();
  if (plan.tab) queryParams.set('tab', plan.tab);
  if (plan.upacaraNama) queryParams.set('upacara', plan.upacaraNama);
  if (plan.tingkatanNama) queryParams.set('tingkatan', plan.tingkatanNama);

  const plannerUrl = `/planner?${queryParams.toString()}`;

  return (
    <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="text-xs text-stone-300">
        Tertarik menyusun rencana yadnya untuk <strong className="text-white">{plan.upacaraNama}</strong>?
      </div>
      <Link
        href={plannerUrl}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C9A24A] hover:bg-[#B89239] text-stone-900 font-semibold text-xs transition-colors shadow-sm active:scale-95 shrink-0"
      >
        <span>Buat Rencana dari Jawaban Ini</span>
        <span>→</span>
      </Link>
    </div>
  );
}

export default CreatePlanCta;

