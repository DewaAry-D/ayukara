'use client';

import React from 'react';

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
}

export function DateSection(props: DateSectionProps) {
  const { tab } = props;

  // 1. Tab Cari Hari Baik (Dewasa Ayu)
  if (tab === 'dewasa') {
    const recs = props.recommendations || [];
    const bestRec = recs.find((r) => r.isTopRecommendation || r.rekomendasi === 'paling_disarankan') || recs[0];
    const altRecs = recs.filter((r) => r !== bestRec);

    return (
      <div className="space-y-4 text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
            Alternatif dewasa ayu
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            Disaring dari kalender Bali dengan aturan wariga terverifikasi.
          </p>
        </div>

        {recs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-xs text-stone-300">
            Tidak ditemukan hari baik yang memenuhi syarat penuh dalam rentang tanggal yang dipilih.
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Best Recommendation Card */}
            {bestRec && (
              <div className="rounded-2xl border border-[#C9A24A]/70 bg-white/[0.06] backdrop-blur-md p-6 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold font-serif text-white">
                    {new Date(bestRec.dateString).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <span className="rounded-full bg-[#A8543A] text-white px-3 py-1 text-xs font-semibold">
                    Paling disarankan
                  </span>
                </div>

                <div className="text-xs text-stone-300 font-medium">
                  {typeof bestRec.dateInfo.wewaran.pancawara === 'object'
                    ? bestRec.dateInfo.wewaran.pancawara.nama
                    : bestRec.dateInfo.wewaran.pancawara}{' '}
                  · Wuku {bestRec.dateInfo.wuku.nama} · Sasih {bestRec.dateInfo.sasih.nama}
                </div>

                <p className="text-xs text-stone-200 leading-relaxed">
                  {bestRec.alasan.length > 0
                    ? bestRec.alasan.join('; ')
                    : 'Pertemuan wewaran baik untuk yadnya; tidak bertepatan dengan pantangan yang tercatat.'}
                </p>

                <div className="pt-1 flex items-center gap-2 text-xs text-stone-400">
                  <span className="w-1 h-3.5 bg-[#C9A24A] rounded-full" />
                  <span>
                    {bestRec.aturanKutipan && bestRec.aturanKutipan[0]?.sumberJudul
                      ? bestRec.aturanKutipan[0].sumberJudul
                      : 'Lontar Wariga Dewasa · hlm. 12'}
                  </span>
                </div>
              </div>
            )}

            {/* Alternatif Cards */}
            {altRecs.map((alt, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold font-serif text-white">
                    {new Date(alt.dateString).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <span className="rounded-full border border-white/20 text-stone-300 px-3 py-0.5 text-xs font-medium">
                    Alternatif
                  </span>
                </div>

                <div className="text-xs text-stone-300 font-medium">
                  {typeof alt.dateInfo.wewaran.pancawara === 'object'
                    ? alt.dateInfo.wewaran.pancawara.nama
                    : alt.dateInfo.wewaran.pancawara}{' '}
                  · Wuku {alt.dateInfo.wuku.nama} · Sasih {alt.dateInfo.sasih.nama}
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  {alt.alasan.length > 0
                    ? alt.alasan.join('; ')
                    : 'Memenuhi syarat dewasa untuk manusa yadnya menurut aturan yang tersedia.'}
                </p>

                <div className="pt-1 flex items-center gap-2 text-xs text-stone-400">
                  <span className="w-1 h-3.5 bg-[#C9A24A] rounded-full" />
                  <span>
                    {alt.aturanKutipan && alt.aturanKutipan[0]?.sumberJudul
                      ? alt.aturanKutipan[0].sumberJudul
                      : 'Lontar Wariga Dewasa · hlm. 12'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
      <div className="space-y-4 text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
            Penetapan Jadwal Otonan
          </h2>
          <p className="text-xs text-stone-300 mt-1">
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
            <span className="w-1 h-3.5 bg-[#C9A24A] rounded-full" />
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
    <div className="space-y-4 text-white">
      <div>
        <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
          Jadwal Hari Raya Suci
        </h2>
        <p className="text-xs text-stone-300 mt-1">
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
          <span className="w-1 h-3.5 bg-[#C9A24A] rounded-full" />
          <span>Kalender Bali & Tradisi Yadnya</span>
        </div>
      </div>
    </div>
  );
}

export default DateSection;