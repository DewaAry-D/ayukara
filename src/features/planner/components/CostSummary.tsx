'use client';

import React from 'react';
import { PriceDisclaimer } from '@/components/ui/PriceDisclaimer';

export interface CostSummaryPriceData {
  totalMin?: number;
  totalMax?: number;
  total_min?: number;
  total_max?: number;
  itemDenganHarga?: number;
  item_dengan_harga?: number;
  itemTanpaHargaCount?: number;
  item_tanpa_harga?: number;
}

export interface CostSummaryProps {
  totalPrice: CostSummaryPriceData;
  waktuPengambilanWita?: string;
}

export function CostSummary({ totalPrice, waktuPengambilanWita }: CostSummaryProps) {
  function formatRupiah(num: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  }

  const minVal = totalPrice.totalMin ?? totalPrice.total_min ?? 0;
  const maxVal = totalPrice.totalMax ?? totalPrice.total_max ?? 0;
  const countWithPrice = totalPrice.itemDenganHarga ?? totalPrice.item_dengan_harga ?? 0;
  const countWithoutPrice = totalPrice.itemTanpaHargaCount ?? totalPrice.item_tanpa_harga ?? 0;

  const hasPricedItems = countWithPrice > 0;

  return (
    <div className="rounded-2xl border border-[#E5DFD5] bg-white p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#C25E2E]">
            Perkiraan Anggaran
          </span>
          <h3 className="font-bold text-lg text-[#1B3022]">
            Total Estimasi Biaya Banten
          </h3>
          <p className="text-xs text-[#5C6B5E] mt-0.5">
            Dihitung otomatis di kode berdasarkan rentang harga pasar bahan upakara.
          </p>
        </div>
        {waktuPengambilanWita && (
          <span className="self-start sm:self-auto text-[11px] text-stone-500 font-mono bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200">
            Diambil: {waktuPengambilanWita}
          </span>
        )}
      </div>

      <div className="rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-stone-500 font-medium">
            Rentang Total Estimasi:
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1B3022] mt-0.5">
            {hasPricedItems ? (
              <>
                {formatRupiah(minVal)}
                <span className="text-stone-400 font-normal text-lg sm:text-xl mx-2">–</span>
                {formatRupiah(maxVal)}
              </>
            ) : (
              <span className="text-base sm:text-lg text-stone-500 font-normal">
                Belum ada data harga pasar tersedia
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            ✓ {countWithPrice} item memiliki estimasi
          </span>
          {countWithoutPrice > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              ⚠ {countWithoutPrice} item belum berharga
            </span>
          )}
        </div>
      </div>

      {/* Catatan & Disclaimer Harga */}
      <PriceDisclaimer />
    </div>
  );
}

export default CostSummary;