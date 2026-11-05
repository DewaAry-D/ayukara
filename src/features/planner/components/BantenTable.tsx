'use client';

import React, { useState } from 'react';
import {
  BantenItemResolved,
  BantenRangkaianGroup,
  BantenLocationGroup,
  TingkatanOptionResolved,
} from '@/lib/banten/BantenResolver';

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
  upacaraId?: number;
  upacaraNama?: string;
  items: BantenItemResolved[];
  tingkatanNama?: string;
  prices?: Record<number, BantenPriceEntry>;
  totalMin?: number;
  totalMax?: number;
  packageSourceUrl?: string | null;
  packageKutipan?: string | null;
  rangkaianGroups?: BantenRangkaianGroup[];
  locationGroups?: BantenLocationGroup[];
  availableTingkatan?: TingkatanOptionResolved[];
  catatanTingkatan?: string;
  onPriceLoaded?: (min: number, max: number, sourceUrl?: string | null) => void;
}

export function BantenTable({
  upacaraId,
  upacaraNama,
  items,
  tingkatanNama = 'Madya',
  prices = {},
  totalMin = 0,
  totalMax = 0,
  packageSourceUrl,
  packageKutipan,
  rangkaianGroups = [],
  locationGroups = [],
  availableTingkatan,
  catatanTingkatan,
  onPriceLoaded,
}: BantenTableProps) {
  const defaultIdx = React.useMemo(() => {
    if (!availableTingkatan || availableTingkatan.length === 0) return 0;
    const foundIdx = availableTingkatan.findIndex(
      (opt) => opt.label.toLowerCase() === (tingkatanNama || '').toLowerCase()
    );
    return foundIdx >= 0 ? foundIdx : 0;
  }, [availableTingkatan, tingkatanNama]);

  const [selectedTingkatanIdx, setSelectedTingkatanIdx] = useState<number | null>(null);

  const activeIdx =
    selectedTingkatanIdx !== null &&
    availableTingkatan &&
    selectedTingkatanIdx < availableTingkatan.length
      ? selectedTingkatanIdx
      : defaultIdx;

  function formatRupiah(num: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Tentukan opsi tingkatan aktif jika ada beberapa saran tingkatan (misal Alit & Utama atau Alit & Madya)
  const currentOption =
    availableTingkatan && availableTingkatan.length > 0
      ? availableTingkatan[activeIdx]
      : null;

  const activeItems = currentOption ? currentOption.items : items;
  const activeRangkaianGroups = currentOption
    ? currentOption.rangkaianGroups
    : rangkaianGroups;
  const activeLocationGroups = currentOption
    ? currentOption.locationGroups
    : locationGroups;
  const currentTingkatanLabel = currentOption
    ? currentOption.label
    : tingkatanNama;

  // State estimasi harga paket (mendukung client-side live fetch agar halaman hasil terbuka instan)
  const [livePrice, setLivePrice] = useState<{
    min: number;
    max: number;
    sourceUrl?: string | null;
    isLoading: boolean;
  }>({
    min: totalMin,
    max: totalMax,
    sourceUrl: packageSourceUrl,
    isLoading: false,
  });

  // Sinkronkan state saat props berubah
  React.useEffect(() => {
    setLivePrice({
      min: totalMin,
      max: totalMax,
      sourceUrl: packageSourceUrl,
      isLoading: false,
    });
  }, [totalMin, totalMax, packageSourceUrl]);

  // Notifikasi ke komponen luar ketika harga telah siap/ditemukan
  React.useEffect(() => {
    if (livePrice.min > 0 && onPriceLoaded) {
      onPriceLoaded(livePrice.min, livePrice.max, livePrice.sourceUrl);
    }
  }, [livePrice.min, livePrice.max, livePrice.sourceUrl, onPriceLoaded]);

  // Jika harga dari server masih 0, ambil secara asinkron di latar belakang tanpa menghalangi tampilan user
  React.useEffect(() => {
    if (totalMin > 0 || !upacaraNama) return;
    let isCancelled = false;

    async function fetchPriceAsync() {
      setLivePrice((prev) => ({ ...prev, isLoading: true }));
      try {
        const res = await fetch('/api/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upacaraId,
            upacaraNama,
            tingkatanNama: currentTingkatanLabel,
          }),
        });
        if (!res.ok) {
          if (!isCancelled) setLivePrice((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        const data = await res.json();
        if (
          !isCancelled &&
          data.packagePrice &&
          data.packagePrice.status === 'ditemukan' &&
          data.packagePrice.hargaMin
        ) {
          setLivePrice({
            min: data.packagePrice.hargaMin,
            max: data.packagePrice.hargaMax || data.packagePrice.hargaMin,
            sourceUrl: data.packagePrice.urlSumber || null,
            isLoading: false,
          });
        } else if (!isCancelled) {
          setLivePrice((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        if (!isCancelled) {
          setLivePrice((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    fetchPriceAsync();
    return () => {
      isCancelled = true;
    };
  }, [upacaraNama, currentTingkatanLabel, totalMin, upacaraId]);

  // Hitung ulang estimasi harga berdasarkan item tingkatan yang aktif jika per-item tersedia
  const computedMinPrice = activeItems.reduce((acc, item) => {
    const p = prices[item.id];
    return acc + (p && p.status === 'ditemukan' && p.hargaMin ? p.hargaMin : 0);
  }, 0);

  const computedMaxPrice = activeItems.reduce((acc, item) => {
    const p = prices[item.id];
    return (
      acc +
      (p && p.status === 'ditemukan' && (p.hargaMax ?? p.hargaMin)
        ? (p.hargaMax ?? p.hargaMin)!
        : 0)
    );
  }, 0);

  const displayTotalMin = computedMinPrice > 0 ? computedMinPrice : livePrice.min;
  const displayTotalMax = computedMaxPrice > 0 ? computedMaxPrice : livePrice.max;
  const hasTotalPrice = displayTotalMin > 0 || displayTotalMax > 0;

  // Helper render baris banten
  function renderBantenRow(item: BantenItemResolved, showLocation = true, keyPrefix = '') {
    const qtyStr = item.jumlah || (item.jumlah_min ? `${item.jumlah_min} soroh` : null);
    const rowKey = keyPrefix
      ? `${keyPrefix}-${item.id}`
      : `${item.id}-${item.nama}-${item.lokasi || ''}`;

    return (
      <div key={rowKey} className="py-2.5 flex items-center justify-between gap-4">
        {/* Left: Nama Banten */}
        <div className="space-y-0.5 min-w-0">
          <div className="text-sm font-medium text-white font-serif tracking-wide truncate">
            {item.nama}
          </div>
          {showLocation && item.lokasi && (
            <div className="text-[11px] text-stone-400">
              Penempatan: {item.lokasi}
            </div>
          )}
        </div>

        {/* Right: Kuantitas */}
        <div className="text-right shrink-0">
          {qtyStr ? (
            <div className="text-xs text-stone-300 font-medium">{qtyStr}</div>
          ) : (
            <span className="inline-block text-[10px] rounded-full border border-white/20 text-stone-300 px-2 py-0.5">
              Data belum tersedia
            </span>
          )}
        </div>
      </div>
    );
  }

  const hasMultipleRangkaian = activeRangkaianGroups && activeRangkaianGroups.length > 1;
  const hasLocations = activeLocationGroups && activeLocationGroups.length > 0;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-5 text-white shadow-xl">
      {/* Top Header & Switcher */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-bold font-serif text-white tracking-tight">
            Kebutuhan banten · {currentTingkatanLabel}
          </h3>

          {/* Tingkatan Switcher jika tersedia opsi tingkatan */}
          {availableTingkatan && availableTingkatan.length > 1 && (
            <div className="inline-flex rounded-xl bg-white/[0.06] border border-white/15 p-1 gap-1">
              {availableTingkatan.map((opt, idx) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedTingkatanIdx(idx)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    activeIdx === idx
                      ? 'bg-[#C9A24A] text-stone-900 font-semibold shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Catatan Penyesuaian Tingkatan */}
        {catatanTingkatan && (
          <div className="rounded-xl border border-[#C9A24A]/30 bg-[#C9A24A]/10 px-3.5 py-2 text-xs text-[#F5E6C8] leading-relaxed">
            {catatanTingkatan}
          </div>
        )}
      </div>

      {/* Middle Box: Rangkaian & Lokasi Cards */}
      <div className="space-y-4">
        {activeItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-400">
            Data banten belum tersedia di pangkalan data terverifikasi.
          </div>
        ) : hasMultipleRangkaian ? (
          // Kasus 1: Ada beberapa rangkaian upacara (Card per rangkaian)
          <div className="space-y-4">
            {activeRangkaianGroups.map((rg, rgIdx) => (
              <div
                key={rg.rangkaianId ?? rgIdx}
                className="rounded-xl border border-white/15 bg-white/[0.03] p-4 space-y-3 shadow-sm"
              >
                {/* Rangkaian Header Box */}
                <div className="flex items-center justify-between gap-2 pb-1">
                  <h4 className="text-sm font-semibold text-white tracking-wide font-serif">
                    {rg.rangkaianNama}
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    {rg.items.length} banten
                  </span>
                </div>

                {/* Sub-group per tempat/lokasi dalam rangkaian */}
                <div className="space-y-3">
                  {rg.locationGroups.map((lg, lgIdx) => (
                    <div key={lgIdx} className="space-y-1.5">
                      <div className="text-[11px] font-medium text-[#C9A24A] flex items-center gap-1.5 pt-1">
                        <span>Penempatan: {lg.lokasiNama}</span>
                      </div>
                      <div className="space-y-1">
                        {lg.items.map((item, itemIdx) =>
                          renderBantenRow(item, false, `rg-${rgIdx}-lg-${lgIdx}-${itemIdx}`)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : hasLocations ? (
          // Kasus 2: Satu rangkaian, kelompokkan per tempat/lokasi
          <div className="space-y-3.5">
            {activeLocationGroups.map((lg, lgIdx) => (
              <div
                key={lgIdx}
                className="rounded-xl border border-white/15 bg-white/[0.03] p-4 space-y-2.5 shadow-sm"
              >
                {/* Lokasi Header Box */}
                <div className="flex items-center justify-between gap-2 pb-1">
                  <h4 className="text-xs font-semibold text-[#F3E9CF] tracking-wide">
                    Penempatan: {lg.lokasiNama}
                  </h4>
                  <span className="text-[11px] text-stone-400 font-normal">
                    {lg.items.length} banten
                  </span>
                </div>

                <div className="space-y-1">
                  {lg.items.map((item, itemIdx) =>
                    renderBantenRow(item, false, `lg-${lgIdx}-${itemIdx}`)
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Kasus 3: Daftar banten langsung
          <div className="space-y-1.5 text-xs">
            {activeItems.map((item, itemIdx) =>
              renderBantenRow(item, true, `direct-${itemIdx}`)
            )}
          </div>
        )}
      </div>

      {/* Bottom Summary */}
      <div className="pt-4 space-y-3">
        <p className="text-[11px] text-stone-400">
          Jumlah dan satuan hanya ditampilkan bila tersedia dalam sumber terverifikasi.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="space-y-1">
            <span className="text-xs text-stone-300 font-medium block">
              Total estimasi biaya paket ({currentTingkatanLabel})
            </span>
            <div className="text-base sm:text-lg font-bold text-white tracking-tight">
              {livePrice.isLoading ? (
                <span className="text-xs text-[#C9A24A] animate-pulse font-normal">
                  Memeriksa referensi pasar...
                </span>
              ) : hasTotalPrice ? (
                <span>
                  {formatRupiah(displayTotalMin)}
                  <span className="text-stone-400 font-normal mx-1.5">–</span>
                  {formatRupiah(displayTotalMax)}
                </span>
              ) : (
                <span className="text-sm text-stone-400 italic font-normal">
                  Harga belum tersedia
                </span>
              )}
            </div>
            {livePrice.sourceUrl && (
              <a
                href={livePrice.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#C9A24A] hover:underline inline-block pt-0.5"
              >
                Sumber referensi pasar: {(() => {
                  try {
                    return new URL(livePrice.sourceUrl).hostname;
                  } catch {
                    return livePrice.sourceUrl;
                  }
                })()}
              </a>
            )}
          </div>

          <div className="pt-2.5 border-t border-white/10 text-[11px] text-stone-300 leading-relaxed">
            <strong className="text-[#C9A24A]">Perhatian:</strong> Angka di atas merupakan estimasi perkiraan acuan perencanaan, bukan harga pasti atau ketetapan mutlak. Biaya riil di lapangan dapat berbeda tergantung fluktuasi harga bahan pasar, kelengkapan sarana tambahan, serta kesepakatan dengan serati banten atau pemangku setempat.
          </div>
        </div>
      </div>
    </div>
  );
}

export default BantenTable;
