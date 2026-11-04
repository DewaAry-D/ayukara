'use client';

import React, { useState } from 'react';

export interface ExportPdfButtonProps {
  planData: {
    tab: 'dewasa' | 'otonan' | 'hari_raya';
    upacaraNama: string;
    tingkatanNama: string;
    dateSummary: string;
    dateDetail?: string;
    bantenItems: Array<{
      nama: string;
      lokasi?: string | null;
      jumlah?: string | null;
      status: string;
      hargaStr?: string;
      sumber?: string;
    }>;
    totalHargaStr?: string;
    waktuPengambilanWita?: string;
    aiSummary?: string;
    personName?: string;
  };
}

export function ExportPdfButton({ planData }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExportPdf() {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        throw new Error(`Gagal membuat PDF (status: ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = planData.upacaraNama.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Rencana_Yadnya_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor PDF';
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      {errorMessage && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-950/60 p-2.5 text-xs text-rose-200 mb-2">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleExportPdf}
        disabled={isExporting}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#A8543A] hover:bg-[#8f432d] text-white shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Menyiapkan PDF...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Ekspor PDF</span>
          </>
        )}
      </button>
    </div>
  );
}

export default ExportPdfButton;