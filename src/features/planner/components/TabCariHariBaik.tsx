'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { matchUpacaraAction } from '../actions';
import { CandidateResult, UpacaraMatchItem } from '@/lib/upacara/UpacaraMatcher';
import { TingkatanCards } from './TingkatanCards';
import { LoadingModal } from './LoadingModal';
import { FixedCeremonyNoticeModal } from './FixedCeremonyNoticeModal';

export function TabCariHariBaik() {
  const router = useRouter();

  // Inputs
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected Upacara & Candidates
  const [selectedUpacara, setSelectedUpacara] = useState<UpacaraMatchItem | null>(null);
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [exactMatchNotice, setExactMatchNotice] = useState<string | null>(null);

  // Modal notice for fixed ceremony (hari raya / otonan)
  const [redirectModal, setRedirectModal] = useState<{
    isOpen: boolean;
    upacara: UpacaraMatchItem | null;
    targetTab: 'hari_raya' | 'otonan';
  }>({
    isOpen: false,
    upacara: null,
    targetTab: 'hari_raya',
  });
  const [dismissedNoticeId, setDismissedNoticeId] = useState<number | null>(null);

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  });
  const [activeChip, setActiveChip] = useState<'month' | '3months' | 'this_year' | 'next_year'>('3months');

  // Tingkatan
  const [tingkatanId, setTingkatanId] = useState<number>(2); // Default Madya

  async function handleSearchUpacara() {
    if (!inputText.trim()) {
      setSearchError('Silakan ketik nama atau deskripsi upacara.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setExactMatchNotice(null);
    setCandidates([]);

    const res = await matchUpacaraAction(inputText);
    setIsSearching(false);

    if (!res.success) {
      setSearchError(res.message);
      return;
    }

    if (res.matchType === 'exact' && res.selectedUpacara) {
      setSelectedUpacara(res.selectedUpacara);
      setExactMatchNotice(`Upacara sesuai: ${res.selectedUpacara.nama}`);

      if (res.selectedUpacara.jenis_penentuan === 'hari_raya_tetap') {
        setRedirectModal({
          isOpen: true,
          upacara: res.selectedUpacara,
          targetTab: 'hari_raya',
        });
      } else if (res.selectedUpacara.jenis_penentuan === 'otonan') {
        setRedirectModal({
          isOpen: true,
          upacara: res.selectedUpacara,
          targetTab: 'otonan',
        });
      }
    } else if (res.matchType === 'candidates' && res.candidates && res.candidates.length > 0) {
      setCandidates(res.candidates);
      setSelectedUpacara(res.candidates[0].upacara);

      const top = res.candidates[0].upacara;
      if (top.jenis_penentuan === 'hari_raya_tetap') {
        setRedirectModal({
          isOpen: true,
          upacara: top,
          targetTab: 'hari_raya',
        });
      } else if (top.jenis_penentuan === 'otonan') {
        setRedirectModal({
          isOpen: true,
          upacara: top,
          targetTab: 'otonan',
        });
      }
    } else {
      setSelectedUpacara(null);
      setSearchError('Upacara tidak ditemukan. Coba gunakan istilah lain atau periksa tab Otonan / Hari Raya.');
    }
  }

  function handleSelectCandidate(candUpacara: UpacaraMatchItem) {
    setSelectedUpacara(candUpacara);
    if (candUpacara.jenis_penentuan === 'hari_raya_tetap') {
      setRedirectModal({
        isOpen: true,
        upacara: candUpacara,
        targetTab: 'hari_raya',
      });
    } else if (candUpacara.jenis_penentuan === 'otonan') {
      setRedirectModal({
        isOpen: true,
        upacara: candUpacara,
        targetTab: 'otonan',
      });
    }
  }

  function handleSwitchTab() {
    if (!redirectModal.upacara) return;
    const target = redirectModal.targetTab;
    const upacaraId = redirectModal.upacara.id;
    setRedirectModal((prev) => ({ ...prev, isOpen: false }));
    if (target === 'hari_raya') {
      router.push(`/planner?tab=hari_raya&upacaraId=${upacaraId}`);
    } else {
      router.push(`/planner?tab=otonan`);
    }
  }

  function handleStayHere() {
    handleReset();
  }

  function handleReset() {
    setInputText('');
    setSelectedUpacara(null);
    setCandidates([]);
    setSearchError(null);
    setExactMatchNotice(null);
    setDismissedNoticeId(null);
    setRedirectModal({ isOpen: false, upacara: null, targetTab: 'hari_raya' });
  }

  function applyDateChip(type: 'month' | '3months' | 'this_year' | 'next_year') {
    setActiveChip(type);
    const now = new Date();
    const fromStr = now.toISOString().split('T')[0];
    let to = new Date();

    if (type === 'month') {
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === '3months') {
      to.setDate(now.getDate() + 90);
    } else if (type === 'this_year') {
      to = new Date(now.getFullYear(), 11, 31);
    } else if (type === 'next_year') {
      setFromDate(`${now.getFullYear() + 1}-01-01`);
      setToDate(`${now.getFullYear() + 1}-12-31`);
      return;
    }

    setFromDate(fromStr);
    setToDate(to.toISOString().split('T')[0]);
  }

  function handleSubmit() {
    if (!selectedUpacara) {
      setSearchError('Silakan cari dan pilih salah satu upacara terlebih dahulu.');
      return;
    }

    if (
      selectedUpacara.jenis_penentuan === 'hari_raya_tetap' &&
      dismissedNoticeId !== selectedUpacara.id
    ) {
      setRedirectModal({
        isOpen: true,
        upacara: selectedUpacara,
        targetTab: 'hari_raya',
      });
      return;
    }

    if (
      selectedUpacara.jenis_penentuan === 'otonan' &&
      dismissedNoticeId !== selectedUpacara.id
    ) {
      setRedirectModal({
        isOpen: true,
        upacara: selectedUpacara,
        targetTab: 'otonan',
      });
      return;
    }

    const params = new URLSearchParams({
      tab: 'dewasa',
      upacaraId: String(selectedUpacara.id),
      upacaraNama: selectedUpacara.nama,
      tingkatanId: String(tingkatanId),
      fromDate,
      toDate,
    });

    setIsNavigating(true);
    router.push(`/planner/result?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* CARD 1: INPUT DATA */}
      <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-8 space-y-6 text-white shadow-xl">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
          </svg>
          <h3 className="text-xl font-bold font-serif text-white tracking-tight">
            Input Data
          </h3>
        </div>

        {/* Textarea Field */}
        <div className="space-y-2">
          <label htmlFor="upacara-input" className="block text-xs font-semibold text-[#F3E9CF]">
            Jenis upacara *
          </label>
          <p className="text-xs text-stone-300">
            Tulis nama upacaranya, atau ceritakan acara yang ingin kamu laksanakan. AI akan membantu menentukan upacara yang sesuai.
          </p>

          <div className="relative pt-1">
            <textarea
              id="upacara-input"
              rows={4}
              maxLength={300}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (searchError) setSearchError(null);
              }}
              placeholder="Contoh: Upacara pernikahan (Pawiwahan), potong gigi, atau upacara saat pindah rumah baru (Melaspas)"
              className="w-full rounded-xl bg-white/[0.06] border border-white/20 p-4 text-sm text-white placeholder:text-stone-400 focus:border-[#C9A24A] focus:outline-hidden transition-colors"
            />
            <div className="flex items-center justify-between text-xs text-stone-400 pt-1.5 px-1">
              <span className="flex items-center gap-1.5 text-[#F3E9CF]/80">
                <svg className="w-3.5 h-3.5 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
                </svg>
                Dibantu AI · boleh pakai bahasa sehari-hari
              </span>
              <span className="font-mono">{inputText.length}/300</span>
            </div>
          </div>

          <p className="text-xs text-stone-400 pt-1">
            AI akan membantu mencocokkan upacara dan merekomendasikan dewasa ayu (hari baik) yang sesuai.
          </p>
        </div>

        {/* Action Button: Cari Upacara */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <button
            type="button"
            onClick={handleSearchUpacara}
            disabled={isSearching || !inputText.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#A8543A] hover:bg-[#8f432d] text-white shadow-md disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSearching ? 'Mencari...' : 'Cari upacara yang sesuai'}
          </button>

          {exactMatchNotice && (
            <span className="text-xs text-[#F3E9CF] bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
              {exactMatchNotice}
            </span>
          )}
        </div>

        {searchError && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-950/40 p-3 text-xs text-rose-200">
            {searchError}
          </div>
        )}

        {/* Panel Upacara Teridentifikasi */}
        {candidates.length > 0 && (
          <div className="rounded-xl bg-black/25 border border-white/10 p-5 space-y-3.5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold font-serif text-[#F3E9CF]">
                <svg className="w-3.5 h-3.5 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
                </svg>
                Upacara Teridentifikasi
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Berdasarkan deskripsi: &ldquo;{inputText}&rdquo;
              </p>
            </div>

            <div className="space-y-2.5">
              {candidates.map((cand) => {
                const isSelected = selectedUpacara?.id === cand.upacara.id;
                return (
                  <div
                    key={cand.upacara.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#C9A24A] bg-white/[0.08] shadow-md'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-white font-serif">
                          {cand.upacara.nama}
                        </span>
                        {cand.isTopMatch && (
                          <span className="rounded-full bg-[#A8543A] text-white px-2 py-0.5 text-[10px] font-bold">
                            Paling sesuai
                          </span>
                        )}
                        {cand.upacara.jenis_penentuan === 'hari_raya_tetap' && (
                          <span className="rounded-full bg-[#C9A24A]/20 border border-[#C9A24A]/40 text-[#F3E9CF] px-2 py-0.5 text-[10px] font-medium">
                            Hari Raya Tetap
                          </span>
                        )}
                        {cand.upacara.jenis_penentuan === 'otonan' && (
                          <span className="rounded-full bg-[#C9A24A]/20 border border-[#C9A24A]/40 text-[#F3E9CF] px-2 py-0.5 text-[10px] font-medium">
                            Otonan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-300 mt-0.5">
                        {cand.alasan}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(cand.upacara)}
                      className={`ml-4 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#A8543A] text-white'
                          : 'border border-white/30 text-white hover:bg-white/10'
                      }`}
                    >
                      {isSelected ? 'Terpilih' : 'Pilih'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rentang Tanggal: Dari - Sampai */}
        <div className="pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dari-tanggal" className="block text-xs font-semibold text-[#F3E9CF] mb-1 cursor-pointer">
                Dari *
              </label>
              <input
                id="dari-tanggal"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl bg-white/[0.06] border border-white/20 p-3 text-sm text-white focus:border-[#C9A24A] focus:outline-hidden cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="sampai-tanggal" className="block text-xs font-semibold text-[#F3E9CF] mb-1 cursor-pointer">
                Sampai *
              </label>
              <input
                id="sampai-tanggal"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl bg-white/[0.06] border border-white/20 p-3 text-sm text-white focus:border-[#C9A24A] focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-stone-400 mr-1">Pilih cepat:</span>
            <button
              type="button"
              onClick={() => applyDateChip('month')}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                activeChip === 'month'
                  ? 'bg-[#A8543A] text-white border-[#A8543A]'
                  : 'border-white/20 text-stone-300 hover:border-white/40'
              }`}
            >
              Bulan ini
            </button>
            <button
              type="button"
              onClick={() => applyDateChip('3months')}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                activeChip === '3months'
                  ? 'bg-[#A8543A] text-white border-[#A8543A]'
                  : 'border-white/20 text-stone-300 hover:border-white/40'
              }`}
            >
              3 bulan ke depan
            </button>
            <button
              type="button"
              onClick={() => applyDateChip('this_year')}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                activeChip === 'this_year'
                  ? 'bg-[#A8543A] text-white border-[#A8543A]'
                  : 'border-white/20 text-stone-300 hover:border-white/40'
              }`}
            >
              Tahun ini
            </button>
            <button
              type="button"
              onClick={() => applyDateChip('next_year')}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                activeChip === 'next_year'
                  ? 'bg-[#A8543A] text-white border-[#A8543A]'
                  : 'border-white/20 text-stone-300 hover:border-white/40'
              }`}
            >
              Tahun depan
            </button>
          </div>
        </div>
      </div>

      {/* CARD 2: PILIH TINGKATAN */}
      <TingkatanCards selectedId={tingkatanId} onSelect={setTingkatanId} />

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
          disabled={!selectedUpacara}
          className="px-7 py-3 rounded-xl text-sm font-bold bg-[#A8543A] hover:bg-[#8f432d] text-white shadow-md transition-colors cursor-pointer disabled:opacity-40"
        >
          Lihat Rekomendasi →
        </button>
      </div>

      {/* Loading Modal saat navigasi ke Result */}
      <LoadingModal
        isOpen={isNavigating}
        onCancel={() => setIsNavigating(false)}
        title="Menyiapkan rekomendasi..."
        subtitle="Ayukara sedang memproses rencana Anda."
      />

      {/* Modal Dialog Konfirmasi Hari Raya Tetap / Otonan */}
      <FixedCeremonyNoticeModal
        isOpen={redirectModal.isOpen}
        upacara={redirectModal.upacara}
        targetTab={redirectModal.targetTab}
        onSwitchTab={handleSwitchTab}
        onStayHere={handleStayHere}
      />
    </div>
  );
}

export default TabCariHariBaik;