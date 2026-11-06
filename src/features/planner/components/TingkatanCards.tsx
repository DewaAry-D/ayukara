'use client';

import React from 'react';

const TINGKATAN_OPTIONS = [
  {
    id: 1,
    kode: 'nista',
    nama: 'Nista',
    deskripsi: 'Pelaksanaan inti yang sederhana dengan sarana dasar.',
  },
  {
    id: 2,
    kode: 'madya',
    nama: 'Madya',
    deskripsi: 'Pelaksanaan menengah dengan banten lebih lengkap.',
  },
  {
    id: 3,
    kode: 'utama',
    nama: 'Utama',
    deskripsi: 'Pelaksanaan paling lengkap dengan rangkaian terbesar.',
  },
];

interface TingkatanCardsProps {
  selectedId: number;
  onSelect: (id: number) => void;
}

export function TingkatanCards({ selectedId, onSelect }: TingkatanCardsProps) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-8 space-y-4 text-white">
      <div>
        <h3 className="text-xl font-bold font-serif text-white tracking-tight">
          Pilih tingkatan yadnya
        </h3>
        <p className="text-xs sm:text-sm text-stone-300 mt-1">
          Tingkatan mencerminkan skala pelaksanaan, bukan kualitas spiritual persembahan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {TINGKATAN_OPTIONS.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#C9A24A] bg-white/[0.08] shadow-md ring-1 ring-[#C9A24A]'
                  : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold font-serif text-white">
                    {opt.nama}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-[#C9A24A] bg-[#C9A24A]'
                        : 'border-stone-400 bg-transparent'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#1F3B3A]" />}
                  </div>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  {opt.deskripsi}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TingkatanCards;