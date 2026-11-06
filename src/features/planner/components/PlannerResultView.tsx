'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DateSection } from './DateSection';
import { BantenTable } from './BantenTable';
import { AiSummaryBox } from './AiSummaryBox';
import { ExportPdfButton } from './ExportPdfButton';
import { PlanResultData } from '../resultLoader';

export interface PlannerResultViewProps {
  resultData: PlanResultData;
}

export function PlannerResultView({ resultData }: PlannerResultViewProps) {
  // Tanggal default awal: tanggal teratas atau tanggal yang disarankan
  const initialDateString =
    resultData.tab === 'dewasa'
      ? resultData.recommendations.find(
          (r) => r.isTopRecommendation || r.rekomendasi === 'paling_disarankan'
        )?.dateString || resultData.recommendations[0]?.dateString || ''
      : resultData.tab === 'otonan'
      ? resultData.selectedOtonanDate || ''
      : resultData.targetDate || '';

  const [selectedDateString, setSelectedDateString] = useState<string>(initialDateString);

  // Sinkronisasi estimasi harga terkini jika dimuat secara asinkron
  const [currentPrice, setCurrentPrice] = useState<{ min: number; max: number }>({
    min: resultData.totalPrice.totalMin || 0,
    max: resultData.totalPrice.totalMax || 0,
  });

  const handlePriceLoaded = React.useCallback((min: number, max: number) => {
    setCurrentPrice({ min, max });
  }, []);

  const effectiveMin = currentPrice.min > 0 ? currentPrice.min : (resultData.totalPrice.totalMin || 0);
  const effectiveMax = currentPrice.max > 0 ? currentPrice.max : (resultData.totalPrice.totalMax || effectiveMin);

  // Rekomendasi aktif berdasarkan pilihan tanggal user
  const activeRec =
    resultData.tab === 'dewasa'
      ? resultData.recommendations.find((r) => r.dateString === selectedDateString) ||
        resultData.recommendations[0]
      : undefined;

  // Parameter bar pills
  const upacaraPill = resultData.upacaraNama;
  const tingkatanPill = `Tingkat ${resultData.tingkatanNama}`;
  let rangePill = '';
  if (resultData.tab === 'dewasa') {
    rangePill =
      resultData.fromDate && resultData.toDate
        ? `${resultData.fromDate} – ${resultData.toDate}`
        : 'Rentang Dewasa';
  } else if (resultData.tab === 'otonan') {
    rangePill = resultData.selectedOtonanDate || 'Siklus Pawukon';
  } else {
    rangePill = resultData.targetDate || `Tahun ${resultData.year || '2027'}`;
  }

  // Format ringkasan tanggal untuk PDF dan tampilan
  let dateSummary = '-';
  let dateDetail = '';
  let wetonStr = '-';

  if (resultData.tab === 'dewasa') {
    if (activeRec) {
      dateSummary = new Date(activeRec.dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const panca =
        typeof activeRec.dateInfo.wewaran.pancawara === 'object'
          ? activeRec.dateInfo.wewaran.pancawara.nama
          : activeRec.dateInfo.wewaran.pancawara;
      const sapta =
        typeof activeRec.dateInfo.wewaran.saptawara === 'object'
          ? activeRec.dateInfo.wewaran.saptawara.nama
          : activeRec.dateInfo.wewaran.saptawara;
      const wukuNama = activeRec.dateInfo.wuku?.nama || '';
      wetonStr = `${sapta} ${panca}${wukuNama ? ` (Wuku ${wukuNama})` : ''}`;
      dateDetail = `${sapta} ${panca} · Wuku ${wukuNama} · Sasih ${activeRec.dateInfo.sasih.nama} (${activeRec.alasan.join(', ')})`;
    } else {
      dateSummary = 'Tidak ditemukan hari baik yang memenuhi kriteria';
      wetonStr = '-';
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
    wetonStr = resultData.weton
      ? `${resultData.weton}${resultData.wuku ? ` (Wuku ${resultData.wuku})` : ''}`
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
    wetonStr = resultData.penjelasanPenentuan || '-';
    dateDetail = resultData.penjelasanPenentuan || 'Aturan penentuan belum tersedia';
  }

  // Format banten items untuk PDF
  const pdfBantenItems = resultData.bantenItems.map((item) => {
    const price = resultData.prices[item.id];
    let hargaStr = 'Harga belum tersedia';
    if (price && price.status === 'ditemukan' && price.hargaMin != null && price.hargaMin > 0) {
      hargaStr = `Rp ${price.hargaMin.toLocaleString('id-ID')} – Rp ${(
        price.hargaMax ?? price.hargaMin
      ).toLocaleString('id-ID')}`;
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
      ? `Rp ${resultData.totalPrice.totalMin.toLocaleString(
          'id-ID'
        )} – Rp ${resultData.totalPrice.totalMax.toLocaleString('id-ID')}`
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
              {resultData.tab === 'dewasa' && activeRec && (
                <span className="rounded-full bg-[#C9A24A]/20 border border-[#C9A24A] px-4 py-1.5 text-xs text-[#F3E9CF] font-semibold flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A24A]" />
                  Tanggal Terpilih:{' '}
                  {new Date(activeRec.dateString).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            <ExportPdfButton
              planData={{
                tab: resultData.tab,
                upacaraNama: resultData.upacaraNama,
                tingkatanNama: resultData.tingkatanNama,
                dateSummary,
                dateDetail,
                weton: wetonStr,
                bantenItems: pdfBantenItems,
                totalHargaStr,
                waktuPengambilanWita: resultData.waktuPengambilanWita,
                aiSummary: resultData.aiSummary,
                personName: resultData.personName,
              }}
            />
          </div>

          {/* Two-Column Grid: Left (Alternatif Dewasa Ayu) & Right (Kebutuhan Banten) */}
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
                selectedDateString={selectedDateString}
                onSelectDate={(newDate) => setSelectedDateString(newDate)}
              />
            </div>

            {/* Right Column: Kebutuhan Banten + Estimasi Biaya */}
            <div className="lg:col-span-6">
              <BantenTable
                upacaraId={resultData.upacaraId}
                upacaraNama={resultData.upacaraNama}
                items={resultData.bantenItems}
                tingkatanNama={resultData.tingkatanNama}
                prices={resultData.prices}
                totalMin={resultData.totalPrice.totalMin}
                totalMax={resultData.totalPrice.totalMax}
                packageSourceUrl={resultData.packagePrice?.urlSumber}
                packageKutipan={resultData.packagePrice?.kutipan}
                rangkaianGroups={resultData.rangkaianGroups}
                locationGroups={resultData.locationGroups}
                availableTingkatan={resultData.availableTingkatan}
                catatanTingkatan={resultData.catatanTingkatan}
                onPriceLoaded={handlePriceLoaded}
              />
            </div>
          </div>

          {/* Full-width Section: Penjelasan dari Ayukara AI (membentang penuh dari kiri ke kanan) */}
          <div className="w-full">
            <AiSummaryBox
              summaryText={resultData.aiSummary}
              citations={resultData.citations}
              totalMin={effectiveMin}
              totalMax={effectiveMax}
            />
          </div>

          {/* Navigation Back */}
          <div className="pt-4 flex justify-between items-center">
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

