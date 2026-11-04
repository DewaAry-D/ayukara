'use client';

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { PlannerTabType } from '../types';
import { TabCariHariBaik } from './TabCariHariBaik';
import { TabOtonan } from './TabOtonan';
import { TabHariRaya } from './TabHariRaya';

const TABS: { id: PlannerTabType; label: string; desc: string }[] = [
  {
    id: 'dewasa',
    label: 'Cari Hari Baik',
    desc: 'Pawiwahan, Melaspas, Ngaben...',
  },
  {
    id: 'otonan',
    label: 'Otonan',
    desc: 'Berdasarkan hari lahir',
  },
  {
    id: 'hari_raya',
    label: 'Hari Raya',
    desc: 'Galungan, Saraswati, Nyepi...',
  },
];

export function PlannerTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = (searchParams.get('tab') as PlannerTabType) || 'dewasa';

  function handleTabChange(tabId: PlannerTabType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      {/* Subnav Container (Floating Glassmorphism Dark) */}
      <div className="p-1.5 rounded-2xl bg-black/25 border border-white/15 grid grid-cols-1 md:grid-cols-3 gap-1.5 shadow-lg">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`py-3.5 px-5 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#F5F0E6] text-[#1F3B3A] shadow-md font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <div className="text-base font-serif font-bold tracking-tight">
                {tab.label}
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  isActive ? 'text-[#5B6B66]' : 'text-stone-400'
                }`}
              >
                {tab.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Konten Tab Aktif */}
      <div className="pt-2">
        {currentTab === 'dewasa' && <TabCariHariBaik />}
        {currentTab === 'otonan' && <TabOtonan />}
        {currentTab === 'hari_raya' && <TabHariRaya />}
      </div>
    </div>
  );
}

export default PlannerTabs;