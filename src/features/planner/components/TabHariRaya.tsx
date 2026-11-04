'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getHariRayaListAction, resolveHariRayaAction } from '../actions';
import { UpacaraMatchItem } from '@/lib/upacara/UpacaraMatcher';
import { ResolveHariRayaActionResult } from '../types';

const ITEMS_PER_PAGE = 8;
const AVAILABLE_YEARS = [2026, 2027, 2028];

export function TabHariRaya() {
  const router = useRouter();

  // Master list of Hari Raya Upacara
  const [hariRayaList, setHariRayaList] = useState<UpacaraMatchItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(2027);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Card, Resolution & Selected Occurrence
  const [selectedUpacara, setSelectedUpacara] = useState<UpacaraMatchItem | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<ResolveHariRayaActionResult | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string>('');

  // Fetch list on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingList(true);
      const list = await getHariRayaListAction();
      if (isMounted) {
        setHariRayaList(list);
        setIsLoadingList(false);
        // Default select Galungan (id: 3)
        const galungan = list.find((u) => u.nama.toLowerCase().includes('galungan')) || list[0];
        if (galungan) {
          setSelectedUpacara(galungan);
          setIsResolving(true);
          resolveHariRayaAction(galungan.id, 2027).then((res) => {
            if (isMounted) {
              setResolvedResult(res);
              setIsResolving(false);
              if (res.occurrences && res.occurrences.length > 0) {
                const upcoming = res.occurrences.find((o) => !o.isPast);
                setSelectedOccurrenceDate(upcoming ? upcoming.dateString : res.occurrences[0].dateString);
              } else {
                setSelectedOccurrenceDate(res.nextDateString || '');
              }
            }
          });
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return hariRayaList;
    return hariRayaList.filter(
      (item) =>
        item.nama.toLowerCase().includes(q) ||
        (item.alias && item.alias.some((a) => a.toLowerCase().includes(q)))
    );
  }, [hariRayaList, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  async function handleSelectCard(upacara: UpacaraMatchItem) {
    setSelectedUpacara(upacara);
    setIsResolving(true);
    setResolvedResult(null);

    const res = await resolveHariRayaAction(upacara.id, selectedYear);
    setIsResolving(false);
    setResolvedResult(res);
    if (res.occurrences && res.occurrences.length > 0) {
      const upcoming = res.occurrences.find((o) => !o.isPast);
      setSelectedOccurrenceDate(upcoming ? upcoming.dateString : res.occurrences[0].dateString);
    } else {
      setSelectedOccurrenceDate(res.nextDateString || '');
    }
  }

  async function handleYearChange(yr: number) {
    setSelectedYear(yr);
    if (selectedUpacara) {
      setIsResolving(true);
      const res = await resolveHariRayaAction(selectedUpacara.id, yr);
      setIsResolving(false);
      setResolvedResult(res);
      if (res.occurrences && res.occurrences.length > 0) {
        const upcoming = res.occurrences.find((o) => !o.isPast);
        setSelectedOccurrenceDate(upcoming ? upcoming.dateString : res.occurrences[0].dateString);
      } else {
        setSelectedOccurrenceDate(res.nextDateString || '');
      }
    }
  }

  function handleReset() {
    setSearchQuery('');
    setSelectedYear(2027);
    setCurrentPage(1);
    if (hariRayaList.length > 0) {
      handleSelectCard(hariRayaList[0]);
    }
  }

  function handleSubmit() {
    if (!selectedUpacara) return;

    const chosenDate = selectedOccurrenceDate || resolvedResult?.nextDateString || '';
    const explanation =
      resolvedResult?.penjelasanDetail ||
      resolvedResult?.penjelasanPenentuan ||
      'Aturan penentuan belum tersedia';

    const params = new URLSearchParams({
      tab: 'hari_raya',
      upacaraId: String(selectedUpacara.id),
      upacaraNama: selectedUpacara.nama,
      year: String(selectedYear),
      targetDate: chosenDate,
      penjelasanPenentuan: explanation,
      tingkatanId: '2',
    });

    router.push(`/planner/result?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* CARD 1: PILIH HARI RAYA */}
      <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-8 space-y-6 text-white shadow-xl">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
          </svg>
          <h3 className="text-xl font-bold font-serif text-white tracking-tight">
            Pilih Hari Raya
          </h3>
        </div>

        {/* Search Field */}
        <div className="relative max-w-sm">
          <svg
            className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari hari raya..."
            className="w-full rounded-xl bg-white/[0.06] border border-white/20 p-2.5 pl-10 text-sm text-white placeholder:text-stone-400 focus:border-[#C9A24A] focus:outline-hidden"
          />
        </div>

        {/* Grid 8 Kartu Hari Raya */}
        {isLoadingList ? (
          <div className="text-center py-10 text-stone-400 text-xs">
            Memuat daftar hari raya...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {paginatedItems.map((item) => {
              const isSelected = selectedUpacara?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectCard(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#C9A24A] bg-[#F5F0E6] text-[#1F3B3A] shadow-md ring-1 ring-[#C9A24A]'
                      : 'border-white/10 bg-white/[0.03] text-white hover:border-white/25 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm font-serif">
                      {item.nama}
                    </h4>
                    <p className={`text-[11px] leading-relaxed line-clamp-3 ${isSelected ? 'text-[#5B6B66]' : 'text-stone-300'}`}>
                      {item.deskripsi || (item.alias && item.alias.length > 0 ? item.alias.join(', ') : 'Hari raya suci')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination & Status row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">
              Menampilkan {paginatedItems.length} dari {filteredItems.length} hari raya
            </span>
            <span className="rounded-full border border-[#F3E9CF]/40 text-[#F3E9CF] px-2 py-0.5 text-[10px]">
              Tradisi Yadnya Bali
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  currentPage === i + 1
                    ? 'bg-[#F5F0E6] text-[#1F3B3A] border border-[#C9A24A]'
                    : 'border border-white/20 text-white hover:bg-white/10'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Tahun Chips */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs">
          <span className="text-stone-400 mr-1">Tahun Kalender:</span>
          {AVAILABLE_YEARS.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => handleYearChange(yr)}
              className={`px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer font-medium ${
                selectedYear === yr
                  ? 'bg-[#A8543A] text-white border-[#A8543A] shadow-xs'
                  : 'border-white/20 text-stone-300 hover:border-white/40'
              }`}
            >
              Tahun {yr}
            </button>
          ))}
        </div>

        {/* DETAIL HARI RAYA & JATUHAN TANGGAL */}
        {selectedUpacara && (
          <div className="rounded-xl bg-black/25 border border-white/10 p-5 sm:p-6 space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold font-serif text-white">
                <svg className="w-4 h-4 text-[#C9A24A] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>
                  Jadwal {selectedUpacara.nama} &mdash; Tahun {selectedYear}
                </span>
              </div>

              {resolvedResult?.totalOccurrences !== undefined && (
                <div>
                  {resolvedResult.totalOccurrences === 2 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#A8543A] text-white shadow-xs">
                      Jatuh 2 Kali di Tahun {selectedYear}
                    </span>
                  ) : resolvedResult.totalOccurrences === 1 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C9A24A]/20 text-[#F3E9CF] border border-[#C9A24A]/40">
                      Jatuh 1 Kali di Tahun {selectedYear}
                    </span>
                  ) : resolvedResult.totalOccurrences > 2 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C9A24A]/20 text-[#F3E9CF] border border-[#C9A24A]/40">
                      {resolvedResult.totalOccurrences} Kali di Tahun {selectedYear}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">Aturan belum tersedia</span>
                  )}
                </div>
              )}
            </div>

            {/* DAFTAR TANGGAL JATUHAN */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-stone-300">
                Pilih tanggal jatuhan untuk menyusun banten yadnya:
              </div>

              {isResolving ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  Menghitung jatuhan hari raya dari kalender Saka & Pawukon Bali...
                </div>
              ) : resolvedResult?.occurrences && resolvedResult.occurrences.length > 0 ? (
                resolvedResult.occurrences.length <= 4 ? (
                  // Tampilan Kartu Jatuhan (1 sampai 4 kemunculan, misal Galungan, Kuningan, Saraswati, Pagerwesi, Tumpek, Nyepi, Siwaratri)
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resolvedResult.occurrences.map((occ) => {
                      const isChosen = selectedOccurrenceDate === occ.dateString;
                      const dateObj = new Date(occ.dateString);
                      const dateFormatted = dateObj.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      });

                      return (
                        <div
                          key={occ.dateString}
                          onClick={() => setSelectedOccurrenceDate(occ.dateString)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                            isChosen
                              ? 'border-[#C9A24A] bg-[#F5F0E6] text-[#1F3B3A] shadow-md ring-2 ring-[#C9A24A]'
                              : 'border-white/15 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/[0.07]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider ${
                                isChosen ? 'text-[#A8543A]' : 'text-[#C9A24A]'
                              }`}
                            >
                              {resolvedResult.occurrences!.length > 1
                                ? `Jatuhan ke-${occ.urutanTahun}`
                                : 'Tanggal Jatuhan'}
                            </span>
                            {isChosen ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F3B3A] text-white">
                                Terpilih
                              </span>
                            ) : occ.isPast ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/20 text-stone-400">
                                Sudah lewat
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#C9A24A]/40 text-[#F3E9CF]">
                                Mendatang
                              </span>
                            )}
                          </div>

                          <div className="text-base font-bold font-serif leading-snug">
                            {dateFormatted}
                          </div>

                          <div className={`text-xs ${isChosen ? 'text-[#5B6B66]' : 'text-stone-300'}`}>
                            {occ.weton} &middot; Wuku {occ.wuku} &middot; Sasih {occ.sasih}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Tampilan Seleksi Berkala (untuk Kajeng Kliwon / Purnama / Tilem)
                  <div className="space-y-3 p-4 rounded-xl border border-white/15 bg-white/[0.03]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs text-stone-300">
                        Pilih dari {resolvedResult.occurrences.length} tanggal pelaksanaan:
                      </span>
                      <select
                        value={selectedOccurrenceDate}
                        onChange={(e) => setSelectedOccurrenceDate(e.target.value)}
                        className="rounded-lg bg-black/40 border border-white/20 text-white text-xs px-3 py-2 focus:border-[#C9A24A] focus:outline-hidden cursor-pointer"
                      >
                        {resolvedResult.occurrences.map((occ) => {
                          const dateObj = new Date(occ.dateString);
                          const dateStr = dateObj.toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          });
                          return (
                            <option key={occ.dateString} value={occ.dateString} className="bg-[#1F3B3A] text-white">
                              {dateStr} &mdash; {occ.weton} (Wuku {occ.wuku})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedOccurrenceDate && (
                      <div className="text-xs text-[#F3E9CF] pt-1">
                        Tanggal terpilih:{' '}
                        <strong>
                          {new Date(selectedOccurrenceDate).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="py-4 text-xs text-stone-300">
                  Tanggal hari raya belum dapat dihitung karena aturan belum tersedia.
                </div>
              )}
            </div>

            {/* PENJELASAN ATURAN PENENTUAN & MAKNA BUDAYA */}
            <div className="space-y-3 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-4 bg-[#C9A24A] rounded-full mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Penjelasan Penentuan Kalender
                  </h5>
                  <p className="text-stone-300 leading-relaxed">
                    {resolvedResult?.penjelasanDetail ||
                      resolvedResult?.penjelasanPenentuan ||
                      'Aturan penentuan belum tersedia'}
                  </p>
                </div>
              </div>

              {selectedUpacara.deskripsi && (
                <div className="flex items-start gap-2.5 pt-1">
                  <span className="w-1.5 h-4 bg-[#A8543A] rounded-full mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Makna & Hakikat Upacara
                    </h5>
                    <p className="text-stone-300 leading-relaxed">
                      {selectedUpacara.deskripsi}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-stone-400 pt-1">
                Catatan: Hari raya berdasarkan pawukon berulang setiap 210 hari. Hari raya berdasarkan sasih (seperti Nyepi & Siwaratri) ditentukan berdasarkan peredaran bulan (Purwaning Tilem atau Penanggal 1).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BUTTONS */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-2.5 rounded-xl border border-white/30 text-white hover:bg-white/10 text-sm font-semibold transition-colors cursor-pointer"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isResolving || !selectedUpacara || !selectedOccurrenceDate}
          className="px-7 py-3 rounded-xl text-sm font-bold bg-[#A8543A] hover:bg-[#8f432d] text-white shadow-md transition-colors cursor-pointer disabled:opacity-40"
        >
          Lihat Kebutuhan Banten →
        </button>
      </div>
    </div>
  );
}

export default TabHariRaya;
