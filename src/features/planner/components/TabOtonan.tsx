'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateOtonanAction } from '../actions';
import { CalculateOtonanActionResult } from '../types';
import { TingkatanCards } from './TingkatanCards';

export function TabOtonan() {
  const router = useRouter();

  // Inputs
  const [personName, setPersonName] = useState('');
  const [birthDate, setBirthDate] = useState('2026-05-04');
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result
  const [calcResult, setCalcResult] = useState<CalculateOtonanActionResult | null>(null);
  const [selectedOtonanDate, setSelectedOtonanDate] = useState<string | null>(null);

  // Tingkatan
  const [tingkatanId, setTingkatanId] = useState<number>(2); // Default Madya

  async function handleCalculate(dateOverride?: string) {
    const targetBirth = dateOverride ?? birthDate;
    if (!targetBirth) {
      setErrorMessage('Silakan pilih tanggal lahir terlebih dahulu.');
      return;
    }

    setIsCalculating(true);
    setErrorMessage(null);

    const res = await calculateOtonanAction(targetBirth);
    setIsCalculating(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Gagal menghitung otonan.');
      return;
    }

    setCalcResult(res);
    if (res.otonanList && res.otonanList.length > 0) {
      const nearest = res.otonanList.find((o) => o.isTerdekat) || res.otonanList[0];
      setSelectedOtonanDate(nearest.dateString);
    }
  }

  function handleReset() {
    setPersonName('');
    setBirthDate('');
    setCalcResult(null);
    setSelectedOtonanDate(null);
    setErrorMessage(null);
  }

  function handleSubmit() {
    if (!selectedOtonanDate || !calcResult) {
      setErrorMessage('Silakan tentukan tanggal lahir dan pilih salah satu tanggal otonan.');
      return;
    }

    const params = new URLSearchParams({
      tab: 'otonan',
      upacaraId: '23',
      upacaraNama: 'Otonan',
      personName: personName.trim(),
      birthDate,
      selectedOtonanDate,
      weton: calcResult.weton?.nama || '',
      wuku: calcResult.wuku || '',
      tingkatanId: String(tingkatanId),
    });

    router.push(`/planner/result?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* CARD 1: DATA OTONAN */}
      <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-8 space-y-6 text-white shadow-xl">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
          </svg>
          <h3 className="text-xl font-bold font-serif text-white tracking-tight">
            Data Otonan
          </h3>
        </div>

        {/* Inputs Name & Birth Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="person-name" className="block text-xs font-semibold text-[#F3E9CF] mb-1.5">
              Nama anak/orang (opsional)
            </label>
            <input
              id="person-name"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Contoh: Putu Ayu"
              className="w-full rounded-xl bg-white/[0.06] border border-white/20 p-3.5 text-sm text-white placeholder:text-stone-400 focus:border-[#C9A24A] focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="birth-date" className="block text-xs font-semibold text-[#F3E9CF] mb-1.5 cursor-pointer">
              Tanggal lahir *
            </label>
            <div className="relative">
              <input
                id="birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  if (e.target.value) handleCalculate(e.target.value);
                }}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {
                    // Fallback bila browser tidak mendukung showPicker
                  }
                }}
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl bg-white/[0.06] border border-white/20 p-3.5 text-sm text-white focus:border-[#C9A24A] focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-950/40 p-3 text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Panel Weton */}
        <div className="rounded-xl bg-black/25 border border-white/10 p-5 space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold font-serif text-white">
            <svg className="w-3.5 h-3.5 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
            </svg>
            <span>
              Weton:{' '}
              <strong className="text-[#F3E9CF]">
                {calcResult?.weton ? `${calcResult.weton.nama} · Wuku ${calcResult.wuku}` : 'Soma Kliwon · Wuku Ukir'}
              </strong>
            </span>
          </div>
          <p className="text-xs text-stone-300">
            Otonan datang setiap 210 hari (sapta wara, panca wara, dan wuku yang sama).
          </p>
        </div>

        {/* 3 Otonan Berikutnya */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-semibold text-stone-300">
            3 otonan berikutnya
          </div>

          <div className="space-y-2.5">
            {calcResult?.otonanList && calcResult.otonanList.length > 0 ? (
              calcResult.otonanList.map((item) => {
                const isSelected = selectedOtonanDate === item.dateString;
                const dateObj = new Date(item.dateString);
                const formattedDate = dateObj.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <div
                    key={item.dateString}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#C9A24A] bg-white/[0.08] shadow-md'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-serif">
                          {formattedDate}
                        </span>
                        {item.isTerdekat && (
                          <span className="rounded-full bg-[#A8543A] text-white px-2 py-0.5 text-[10px] font-bold">
                            Terdekat
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-300 mt-0.5">
                        Otonan ke-{item.otonanKe} · umur {item.otonanKe * 6} bulan Bali ({item.otonanKe * 210} hari)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOtonanDate(item.dateString)}
                      className={`ml-4 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#A8543A] text-white'
                          : 'border border-white/30 text-white hover:bg-white/10'
                      }`}
                    >
                      {isSelected ? 'Dipilih' : 'Pilih'}
                    </button>
                  </div>
                );
              })
            ) : (
              // Default view matching mockup when date is not yet custom picked
              <>
                <div className="flex items-center justify-between p-4 rounded-xl border border-[#C9A24A] bg-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-serif">
                        Senin, 30 November 2026
                      </span>
                      <span className="rounded-full bg-[#A8543A] text-white px-2 py-0.5 text-[10px] font-bold">
                        Terdekat
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Otonan ke-1 · umur 6 bulan Bali (210 hari)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOtonanDate('2026-11-30');
                      if (!calcResult) handleCalculate();
                    }}
                    className="ml-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#A8543A] text-white"
                  >
                    Dipilih
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div>
                    <span className="font-bold text-sm text-white font-serif">
                      Senin, 28 Juni 2027
                    </span>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Otonan ke-2 · 420 hari
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOtonanDate('2027-06-28');
                      if (!calcResult) handleCalculate();
                    }}
                    className="ml-4 px-4 py-2 rounded-xl text-xs font-semibold border border-white/30 text-white hover:bg-white/10"
                  >
                    Pilih
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div>
                    <span className="font-bold text-sm text-white font-serif">
                      Senin, 24 Januari 2028
                    </span>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Otonan ke-3 · 630 hari
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOtonanDate('2028-01-24');
                      if (!calcResult) handleCalculate();
                    }}
                    className="ml-4 px-4 py-2 rounded-xl text-xs font-semibold border border-white/30 text-white hover:bg-white/10"
                  >
                    Pilih
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-[11px] text-stone-400 pt-1">
            Otonan pertama (ke-1) umumnya dirayakan lebih lengkap; otonan berikutnya dapat lebih sederhana sesuai tradisi keluarga.
          </p>
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
          disabled={isCalculating}
          className="px-7 py-3 rounded-xl text-sm font-bold bg-[#A8543A] hover:bg-[#8f432d] text-white shadow-md transition-colors cursor-pointer disabled:opacity-40"
        >
          Lihat Kebutuhan Banten →
        </button>
      </div>
    </div>
  );
}

export default TabOtonan;