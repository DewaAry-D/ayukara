'use client';

import React from 'react';
import { BantenItemResolved } from '@/lib/banten/BantenResolver';

export interface BantenPriceEntry {
  bantenId?: number;
  banten_id?: number;
  hargaMin?: number | null;
  harga_min?: number | null;
  hargaMax?: number | null;
  harga_max?: number | null;
  status?: string;
}

export interface BantenTableProps {
  items: BantenItemResolved[];
  tingkatanNama?: string;
  prices?: Record<number, BantenPriceEntry>;
  totalMin?: number;
  totalMax?: number;
}

export function BantenTable({
  items,
  tingkatanNama = 'Madya',
  prices = {},
  totalMin = 0,
  totalMax = 0,
}: BantenTableProps) {
  function formatRupiah(num: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  }

  const hasTotalPrice = totalMin > 0 || totalMax > 0;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-5 text-white shadow-xl">
      {/* Card Header */}
      <div>
        <h3 className="text-xl font-bold font-serif text-white tracking-tight">
          Kebutuhan banten · {tingkatanNama}
        </h3>
      </div>

      {/* Banten Rows */}
      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-400">
          Data banten belum tersedia di pangkalan data terverifikasi.
        </div>
      ) : (
        <div className="divide-y divide-white/10 space-y-0 text-xs">
          {items.map((item) => {
            const price = prices[item.id];
            const minVal = price?.hargaMin ?? price?.harga_min;
            const maxVal = price?.hargaMax ?? price?.harga_max;
            const hasPrice = price && price.status === 'ditemukan' && minVal != null && minVal > 0;
            const qtyStr = item.jumlah || (item.jumlah_min ? `${item.jumlah_min} soroh` : null);

            return (
              <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                {/* Left: Nama Banten */}
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-white font-serif">
                    {item.nama}
                  </div>
                  {item.lokasi && (
                    <div className="text-[11px] text-stone-400">
                      Penempatan: {item.lokasi}
                    </div>
                  )}
                </div>

                {/* Right: Kuantitas & Harga */}
                <div className="text-right space-y-0.5 shrink-0">
                  {qtyStr ? (
                    <div className="text-xs text-stone-300 font-medium">{qtyStr}</div>
                  ) : (
                    <span className="inline-block text-[10px] rounded-full border border-white/20 text-stone-300 px-2 py-0.5">
                      Data belum tersedia
                    </span>
                  )}

                  {hasPrice && minVal != null ? (
                    <div className="text-xs text-stone-200 font-medium">
                      {formatRupiah(minVal)} – {formatRupiah(maxVal ?? minVal)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-400 italic">
                      Harga belum tersedia
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footnote Jumlah */}
      <p className="text-[11px] text-stone-400">
        Jumlah dan satuan hanya ditampilkan bila tersedia dalam sumber terverifikasi.
      </p>

      {/* Divider */}
      <div className="border-t border-white/15 pt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-stone-300 font-medium">
            Total estimasi biaya
          </span>
          <div className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
            {hasTotalPrice ? (
              <>
                {formatRupiah(totalMin)} – {formatRupiah(totalMax)}
              </>
            ) : (
              <span className="text-sm text-stone-400 italic">
                Harga belum tersedia
              </span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-stone-400">
          Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah
        </p>
      </div>
    </div>
  );
}

export default BantenTable;