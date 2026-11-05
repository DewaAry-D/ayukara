import React from 'react';
import Link from 'next/link';
import { DateSection } from '@/features/planner/components/DateSection';
import { BantenWithSummary } from '@/features/planner/components/BantenWithSummary';
import { ExportPdfButton } from '@/features/planner/components/ExportPdfButton';
import { loadPlanResult } from '@/features/planner/resultLoader';

export const metadata = {
  title: 'Hasil Rencana Upacara Yadnya · Ayukara',
  description:
    'Rincian hari baik, kebutuhan upakara banten, estimasi biaya pasar, dan penjelasan sastra Hindu Bali.',
};

export default async function PlannerResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const resultData = await loadPlanResult(resolvedParams);

  // Parameter bar pills
  const upacaraPill = resultData.upacaraNama;
  const tingkatanPill = `Tingkat ${resultData.tingkatanNama}`;
  let rangePill = '';
  if (resultData.tab === 'dewasa') {
    rangePill = resultData.fromDate && resultData.toDate ? `${resultData.fromDate} – ${resultData.toDate}` : '1 Jun – 31 Jul 2026';
  } else if (resultData.tab === 'otonan') {
    rangePill = resultData.selectedOtonanDate || 'Siklus Pawukon';
  } else {
    rangePill = resultData.targetDate || `Tahun ${resultData.year || '2027'}`;
  }

  // Format summary string untuk ekspor PDF
  let dateSummary = '-';
  let dateDetail = '';

  if (resultData.tab === 'dewasa') {
    if (resultData.recommendations.length > 0) {
      const top = resultData.recommendations[0];
      dateSummary = new Date(top.dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const panca = typeof top.dateInfo.wewaran.pancawara === 'object' ? top.dateInfo.wewaran.pancawara.nama : top.dateInfo.wewaran.pancawara;
      const sapta = typeof top.dateInfo.wewaran.saptawara === 'object' ? top.dateInfo.wewaran.saptawara.nama : top.dateInfo.wewaran.saptawara;
      dateDetail = `${sapta} ${panca} · Wuku ${top.dateInfo.wuku.nama} · Sasih ${top.dateInfo.sasih.nama} (${top.alasan.join(', ')})`;
    } else {
      dateSummary = 'Tidak ditemukan hari baik yang memenuhi kriteria';
    }
  } else if (resultData.tab === 'otonan') {
    dateSummary = resultData.selectedOtonanDate
      ? new Date(resultData.selectedOtonanDate).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '-';
    dateDetail = `Weton: ${resultData.weton || '-'} · Wuku: ${resultData.wuku || '-'} (Siklus 210 Hari Pawukon)`;
  } else {
    dateSummary = resultData.targetDate
      ? new Date(resultData.targetDate).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Aturan penentuan belum tersedia';
    dateDetail = resultData.penjelasanPenentuan || 'Aturan penentuan belum tersedia';
  }

  // Format banten items untuk PDF
  const pdfBantenItems = resultData.bantenItems.map((item) => {
    const price = resultData.prices[item.id];
    let hargaStr = 'Harga belum tersedia';
    if (price && price.status === 'ditemukan' && price.hargaMin != null && price.hargaMin > 0) {
      hargaStr = `Rp ${price.hargaMin.toLocaleString('id-ID')} – Rp ${(price.hargaMax ?? price.hargaMin).toLocaleString('id-ID')}`;
    }
    return {
      nama: item.nama,
      lokasi: item.lokasi || null,
      jumlah: item.jumlah || (item.jumlah_min ? `${item.jumlah_min} soroh` : '1 soroh'),
      status: item.status,
      hargaStr,
      sumber: item.kutipan?.sumberJudul || undefined,
    };
  });

  const totalHargaStr =
    resultData.totalPrice.totalMin > 0
      ? `Rp ${resultData.totalPrice.totalMin.toLocaleString('id-ID')} – Rp ${resultData.totalPrice.totalMax.toLocaleString('id-ID')}`
      : 'Harga belum tersedia';

  return (
    <div className="w-full min-h-screen bg-[#1F3B3A]">
      {/* TOP HEADER SECTION (#F5F0E6 with wave landscape) */}
      <section className="relative w-full bg-[#F5F0E6] pt-10 pb-16 sm:pb-24 overflow-x-clip">
        <div className="absolute inset-x-0 -bottom-[2px] pointer-events-none w-full h-[50%] flex flex-col justify-end">
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
              className="absolute -bottom-[2px] w-full h-[calc(35%+4px)] text-[#1F3B3A]"
              viewBox="0 0 1440 240"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,120 C360,48 720,168 1080,96 C1260,60 1380,105 1440,120 L1440,245 L0,245 Z" />
            </svg>
            {/* Strip penutup agar tidak ada celah garis putih/subpixel dari background beige */}
            <div className="absolute inset-x-0 -bottom-[2px] h-2 bg-[#1F3B3A]" />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 space-y-3">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#A8543A]">
            LANGKAH 2 DARI 2 · HASIL
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1F3B3A] tracking-tight font-serif leading-tight">
            Rencana Upacara Anda
          </h1>
        </div>
      </section>

      {/* RESULT BODY SECTION (Deep Forest Green #1F3B3A) */}
      <section className="w-full py-10 px-6 sm:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Parameter Bar: Pills on Left, Ekspor PDF on Right */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-white/[0.08] border border-white/20 px-4 py-1.5 text-xs text-white font-medium">
                {upacaraPill}
              </span>
              <span className="rounded-full bg-white/[0.08] border border-white/20 px-4 py-1.5 text-xs text-white font-medium">
                {tingkatanPill}
              </span>
              <span className="rounded-full bg-white/[0.08] border border-white/20 px-4 py-1.5 text-xs text-white font-medium">
                {rangePill}
              </span>
            </div>

            <ExportPdfButton
              planData={{
                tab: resultData.tab,
                upacaraNama: resultData.upacaraNama,
                tingkatanNama: resultData.tingkatanNama,
                dateSummary,
                dateDetail,
                bantenItems: pdfBantenItems,
                totalHargaStr,
                waktuPengambilanWita: resultData.waktuPengambilanWita,
                aiSummary: resultData.aiSummary,
                personName: resultData.personName,
              }}
            />
          </div>

          {/* Two-Column Grid (Desktop 2-Col, Mobile Stacked) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Alternatif Dewasa Ayu / Otonan / Hari Raya */}
            <div className="lg:col-span-6">
              <DateSection
                tab={resultData.tab}
                upacaraNama={resultData.upacaraNama}
                recommendations={resultData.recommendations}
                fromDate={resultData.fromDate}
                toDate={resultData.toDate}
                personName={resultData.personName}
                birthDate={resultData.birthDate}
                selectedOtonanDate={resultData.selectedOtonanDate}
                weton={resultData.weton}
                wuku={resultData.wuku}
                year={resultData.year}
                targetDate={resultData.targetDate}
                penjelasanPenentuan={resultData.penjelasanPenentuan}
              />
            </div>

            {/* Right Column: Kebutuhan Banten + Estimasi Biaya & Penjelasan AI */}
            <div className="lg:col-span-6">
              <BantenWithSummary
                bantenTableProps={{
                  upacaraId: resultData.upacaraId,
                  upacaraNama: resultData.upacaraNama,
                  items: resultData.bantenItems,
                  tingkatanNama: resultData.tingkatanNama,
                  prices: resultData.prices,
                  totalMin: resultData.totalPrice.totalMin,
                  totalMax: resultData.totalPrice.totalMax,
                  packageSourceUrl: resultData.packagePrice?.urlSumber,
                  packageKutipan: resultData.packagePrice?.kutipan,
                  rangkaianGroups: resultData.rangkaianGroups,
                  locationGroups: resultData.locationGroups,
                  availableTingkatan: resultData.availableTingkatan,
                  catatanTingkatan: resultData.catatanTingkatan,
                }}
                aiSummaryProps={{
                  summaryText: resultData.aiSummary,
                  citations: resultData.citations,
                  totalMin: resultData.totalPrice.totalMin,
                  totalMax: resultData.totalPrice.totalMax,
                }}
              />
            </div>
          </div>

          {/* Navigation Back */}
          <div className="pt-6 flex justify-between items-center">
            <Link
              href="/planner"
              className="text-xs text-stone-300 hover:text-white underline underline-offset-4"
            >
              ← Kembali ke Perencana
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
