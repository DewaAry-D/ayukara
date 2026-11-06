'use client';

import React, { useState } from 'react';

export interface RecommendedDateView {
  dateString: string;
  rekomendasi?: string;
  isTopRecommendation?: boolean;
  score?: number;
  alasan: string[];
  dateInfo: {
    wewaran: {
      saptawara: { id: number; nama: string } | string;
      pancawara: { id: number; nama: string } | string;
    };
    wuku: {
      nama: string;
    };
    sasih: {
      nama: string;
    };
  };
  aturanKutipan?: Array<{
    teks: string;
    sumberJudul?: string;
  }>;
}

export interface DateSectionProps {
  tab: 'dewasa' | 'otonan' | 'hari_raya';
  upacaraNama: string;
  recommendations?: RecommendedDateView[];
  fromDate?: string;
  toDate?: string;
  personName?: string;
  birthDate?: string;
  selectedOtonanDate?: string;
  weton?: string;
  wuku?: string;
  year?: string;
  targetDate?: string;
  penjelasanPenentuan?: string;
  selectedDateString?: string;
  onSelectDate?: (dateString: string) => void;
}

export function DateSection(props: DateSectionProps) {
  const { tab } = props;

  // 1. Tab Cari Hari Baik (Dewasa Ayu)
  if (tab === 'dewasa') {
    const recs = props.recommendations || [];
    const defaultSelected =
      props.selectedDateString ||
      recs.find((r) => r.isTopRecommendation || r.rekomendasi === 'paling_disarankan')?.dateString ||
      recs[0]?.dateString ||
      '';

    const [internalSelected, setInternalSelected] = useState<string>(defaultSelected);
    const activeSelected =
      props.selectedDateString !== undefined ? props.selectedDateString : internalSelected;

    function handleCardClick(dateStr: string) {
      setInternalSelected(dateStr);
      props.onSelectDate?.(dateStr);
    }

    return (
      <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-5 text-white shadow-xl">
        {/* Top Header */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xl font-bold font-serif text-white tracking-tight">
              Alternatif dewasa ayu
            </h3>
            {recs.length > 0 && (
              <span className="text-xs text-stone-300 bg-white/10 px-3 py-1 rounded-full font-medium w-fit">
                {recs.length} tanggal tersedia
              </span>
            )}
          </div>
          <p className="text-xs text-stone-300">
            Disaring dari kalender Bali dengan aturan wariga terverifikasi. Klik salah satu kartu untuk menetapkan tanggal upacara Anda.
          </p>
        </div>

        {recs.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-400">
            Tidak ditemukan hari baik yang memenuhi syarat penuh dalam rentang tanggal yang dipilih.
          </div>
        ) : (
          <div className="space-y-3">
            {recs.length > 2 && (
              <div className="text-[11px] text-stone-300 font-medium flex items-center justify-between px-1">
                <span>Pilih tanggal yang sesuai dengan rencana Anda</span>
                <span className="text-[#C9A24A]">Gulir untuk opsi lainnya</span>
              </div>
            )}

            {/* Scrollable Container dengan panjang sama seperti banten (max-h-[480px]) */}
            <div className="max-h-[480px] overflow-y-auto space-y-3.5 pr-2 scroll-smooth custom-scrollbar">
              {recs.map((item, idx) => {
                const isSelected = item.dateString === activeSelected;
                const isTop =
                  item.isTopRecommendation ||
                  item.rekomendasi === 'paling_disarankan' ||
                  idx === 0;
                const formattedDate = new Date(item.dateString).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
                const panca =
                  typeof item.dateInfo.wewaran.pancawara === 'object'
                    ? item.dateInfo.wewaran.pancawara.nama
                    : item.dateInfo.wewaran.pancawara;
                const sapta =
                  typeof item.dateInfo.wewaran.saptawara === 'object'
                    ? item.dateInfo.wewaran.saptawara.nama
                    : item.dateInfo.wewaran.saptawara;
                const reasons =
                  item.alasan.length > 0
                    ? item.alasan
                        .map((a) => a.replace(/otomatis\s+dari\s+teks:\s*/gi, ''))
                        .join('; ')
                    : 'Pertemuan wewaran baik untuk yadnya; tidak bertepatan dengan pantangan yang tercatat.';
                const sumber =
                  item.aturanKutipan && item.aturanKutipan[0]?.sumberJudul
                    ? item.aturanKutipan[0].sumberJudul
                    : 'Kutipan Sastra Wariga';

                return (
                  <div
                    key={item.dateString || idx}
                    onClick={() => handleCardClick(item.dateString)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick(item.dateString);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={`w-full text-left rounded-2xl p-5 sm:p-6 space-y-3 transition-all cursor-pointer backdrop-blur-md ${
                      isSelected
                        ? 'border-2 border-[#C9A24A] bg-[#C9A24A]/[0.08] shadow-lg shadow-black/25 ring-1 ring-[#C9A24A]/50'
                        : 'border border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base sm:text-lg font-bold font-serif text-white">
                        {formattedDate}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isTop ? (
                          <span className="rounded-full bg-[#A8543A] text-white px-3 py-1 text-xs font-semibold">
                            Paling disarankan
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/20 text-stone-300 px-3 py-0.5 text-xs font-medium">
                            Alternatif
                          </span>
                        )}

                        {isSelected ? (
                          <span className="rounded-full bg-[#C9A24A] text-[#1F3B3A] px-2.5 py-0.5 text-xs font-bold shadow flex items-center gap-1">
                            Terpilih
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400 border border-white/10 rounded-full px-2.5 py-0.5 hover:border-[#C9A24A]/50 hover:text-[#C9A24A] transition-colors">
                            Pilih
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-stone-300 font-medium">
                      {panca} · Wuku {item.dateInfo.wuku.nama} · Sasih {item.dateInfo.sasih.nama}
                    </div>

                    <p className="text-xs text-stone-200 leading-relaxed">
                      {reasons}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-stone-400 border-t border-white/5">
                      <span>{sumber}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Footer Note */}
        <div className="pt-2 border-t border-white/10 text-[11px] text-stone-300 leading-relaxed">
          <strong className="text-[#C9A24A]">Petunjuk:</strong> Pilihan hari baik didasarkan pada perhitungan sistem Wariga Dewasa Ayu. Klik kartu tanggal di atas untuk menetapkan tanggal upacara yang akan dicantumkan dalam dokumen ekspor PDF.
        </div>
      </div>
    );
  }

  // 2. Tab Otonan
  if (tab === 'otonan') {
    const formattedDate = props.selectedOtonanDate
      ? new Date(props.selectedOtonanDate).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '-';

    return (
      <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-5 text-white shadow-xl">
        <div className="space-y-1">
          <h3 className="text-xl font-bold font-serif text-white tracking-tight">
            Penetapan Jadwal Otonan
          </h3>
          <p className="text-xs text-stone-300">
            Dihitung berdasarkan siklus Pawukon (210 hari) kelahiran Anda.
          </p>
        </div>

        <div className="rounded-2xl border border-[#C9A24A]/70 bg-white/[0.06] backdrop-blur-md p-6 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold font-serif text-white">
              {formattedDate}
            </div>
            <span className="rounded-full bg-[#A8543A] text-white px-3 py-1 text-xs font-semibold">
              Terpilih
            </span>
          </div>

          <div className="text-xs text-stone-300 font-medium">
            Weton: <strong className="text-[#F3E9CF]">{props.weton || '-'}</strong> · Wuku:{' '}
            <strong className="text-[#F3E9CF]">{props.wuku || '-'}</strong>
          </div>

          {props.personName && (
            <p className="text-xs text-stone-200">
              Nama anak/pemohon: <strong className="text-white">{props.personName}</strong> (Tanggal lahir: {props.birthDate || '-'})
            </p>
          )}

          <div className="pt-1 flex items-center gap-2 text-xs text-stone-400">
            <span>Siklus 210 Hari Pawukon Bali</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Tab Hari Raya Tetap
  const formattedHariRaya = props.targetDate
    ? new Date(props.targetDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Aturan penentuan belum tersedia';

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-5 text-white shadow-xl">
      <div className="space-y-1">
        <h3 className="text-xl font-bold font-serif text-white tracking-tight">
          Jadwal Hari Raya Suci
        </h3>
        <p className="text-xs text-stone-300">
          Berdasarkan perhitungan kalender Saka & Pawukon Bali.
        </p>
      </div>

      <div className="rounded-2xl border border-[#C9A24A]/70 bg-white/[0.06] backdrop-blur-md p-6 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold font-serif text-white">
            {formattedHariRaya}
          </div>
          <span className="rounded-full bg-[#A8543A] text-white px-3 py-1 text-xs font-semibold">
            Hari Raya Tetap
          </span>
        </div>

        <p className="text-xs text-stone-200 leading-relaxed">
          {props.penjelasanPenentuan || 'Aturan penentuan belum tersedia'}
        </p>

        <div className="pt-1 flex items-center gap-2 text-xs text-stone-400">
          <span>Kalender Bali & Tradisi Yadnya</span>
        </div>
      </div>
    </div>
  );
}

export default DateSection;