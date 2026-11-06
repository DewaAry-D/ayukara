'use client';

import React from 'react';

export interface AiSummaryBoxProps {
  summaryText: string;
  citations?: Array<{
    id: number;
    title: string;
    url?: string;
  }>;
  totalMin?: number;
  totalMax?: number;
}

export function AiSummaryBox({
  summaryText,
  citations = [],
  totalMin,
  totalMax,
}: AiSummaryBoxProps) {
  function formatRupiah(num: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Deduplikasi sumber: sumber dengan judul dan url yang sama hanya ditampilkan sekali
  const uniqueCitations = React.useMemo(() => {
    const seen = new Set<string>();
    const result: typeof citations = [];

    for (const c of citations) {
      const key = `${(c.title || '').trim().toLowerCase()}|${(c.url || '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }
    return result;
  }, [citations]);

  // Sesuaikan narasi estimasi biaya secara dinamis dengan angka estimasi aktual
  const processedSummaryText = React.useMemo(() => {
    let text = summaryText || '';

    if (totalMin && totalMin > 0) {
      const minStr = formatRupiah(totalMin);
      const maxStr = formatRupiah(totalMax ?? totalMin);
      const priceStatement = `Estimasi biaya paket berkisar antara ${minStr} – ${maxStr} berdasarkan referensi pasar upakara.`;

      // Jika teks AI mengandung narasi Rp 0 - Rp 0 atau 0 item harga
      if (/Estimasi biaya\s+Rp\s*0[^\n.]*\./i.test(text)) {
        text = text.replace(/Estimasi biaya\s+Rp\s*0[^\n.]*\./i, priceStatement);
      }
      if (/Rp\s*0\s*[-–]\s*Rp\s*0/i.test(text)) {
        text = text.replace(/Rp\s*0\s*[-–]\s*Rp\s*0/i, `${minStr} – ${maxStr}`);
      }
    } else {
      // Jika belum ada harga, pastikan tidak ada teks 'Rp 0 - Rp 0'
      text = text.replace(
        /Estimasi biaya\s+Rp\s*0[^\n.]*\./i,
        'Estimasi biaya paket disesuaikan dengan fluktuasi harga bahan pasar dan kesepakatan serati banten setempat.'
      );
      text = text.replace(
        /Rp\s*0\s*[-–]\s*Rp\s*0/i,
        'disesuaikan dengan fluktuasi harga bahan pasar dan kesepakatan serati banten setempat.'
      );
    }

    return text;
  }, [summaryText, totalMin, totalMax]);

  // Helper render inline tokens: **bold** (beneran bold) dan [n] (superscript sitasi emas)
  function renderInline(text: string): React.ReactNode {
    if (!text) return null;

    // Bersihkan sitasi ganda berturut-turut untuk nomor yang sama (misal [1] [1] atau [1], [1])
    const cleanedText = text.replace(/\[(\d+)\](?:\s*[,;]?\s*\[\1\])+/g, '[$1]');

    const tokens = cleanedText.split(/(\*\*[^*]+?\*\*|\[\d+\])/g);
    return tokens.map((token, i) => {
      // 1. Cek apakah token adalah bold: **konten**
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        const boldContent = token.slice(2, -2);
        return (
          <strong key={i} className="font-extrabold text-white tracking-wide">
            {boldContent}
          </strong>
        );
      }

      // 2. Cek apakah token adalah sitasi: [1]
      const citationMatch = token.match(/^\[(\d+)\]$/);
      if (citationMatch) {
        const num = citationMatch[1];
        return (
          <sup key={i} className="px-0.5 text-[#C9A24A] font-bold">
            [{num}]
          </sup>
        );
      }

      // 3. Teks biasa
      return <span key={i}>{token}</span>;
    });
  }

  // Render konten narasi berstruktur: headings, bullet list tempat/rangkaian, dan paragraf
  function renderFormattedContent(text: string) {
    if (!text) return null;

    // 1. Normalisasi heading ## agar selalu diawali baris baru
    let normalized = text.replace(/\s*##\s+/g, '\n\n## ');

    // 2. Hapus judul top-level # Ringkasan... agar tidak berulang dengan judul kartu
    normalized = normalized.replace(/^#\s+[^\n]+\n*/i, '');

    // 3. Ubah daftar tempat / rangkaian inline menjadi poin daftar berbaris baru (bullet list)
    // HANYA jika TIDAK diawali oleh bullet (•, -, *) atau baris baru
    normalized = normalized.replace(/([^\n•\-*])\s+(\*\*[^*]+:\*\*)/g, '$1\n• $2');

    // 4. Pecah berdasarkan baris dan buang baris kosong atau baris yang hanya berisi simbol bullet/titik
    const lines = normalized
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        // Buang jika baris hanya berisi simbol bullet, strip, atau titik tanpa teks nyata
        const withoutBullets = l.replace(/^[•\-*.\s]+$/, '');
        return withoutBullets.length > 0;
      });

    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          // A. Heading tingkat 2 atau 3 (## atau ###)
          if (line.startsWith('## ') || line.startsWith('### ')) {
            const headingText = line.replace(/^#{2,3}\s*/, '').trim();
            if (!headingText) return null;
            return (
              <h4
                key={idx}
                className="text-xs sm:text-sm font-bold font-serif text-[#C9A24A] uppercase tracking-wider pt-2 pb-1"
              >
                {renderInline(headingText)}
              </h4>
            );
          }

          // B. Poin daftar (dimulai dengan •, -, *, atau angka 1.)
          if (/^[•\-*]\s*/.test(line) || /^\d+\.\s*/.test(line)) {
            const itemText = line.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
            // Jika tidak ada isi teks pada poin daftar, jangan render bullet kosong
            if (!itemText) return null;
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
                <span className="text-[#C9A24A] font-black text-sm leading-5 shrink-0">•</span>
                <div className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  {renderInline(itemText)}
                </div>
              </div>
            );
          }

          // C. Paragraf biasa (pastikan bukan simbol bullet tersisa)
          const paragraphText = line.replace(/^[•\-*.\s]+$/, '').trim();
          if (!paragraphText) return null;

          return (
            <p key={idx} className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              {renderInline(line)}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 sm:p-7 space-y-4 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <svg className="w-4 h-4 text-[#C9A24A]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
        </svg>
        <h3 className="text-xl font-bold font-serif text-white tracking-tight">
          Penjelasan dari Ayukara AI
        </h3>
      </div>

      {/* Narrative Body */}
      <div>
        {renderFormattedContent(processedSummaryText)}
      </div>

      {/* Citations List (Deduplikasi Sumber) */}
      {uniqueCitations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {uniqueCitations.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs text-stone-300">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-stone-200 hover:text-[#F3E9CF]"
                >
                  [{c.id}] {c.title}
                </a>
              ) : (
                <span>
                  [{c.id}] {c.title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footnote Disclaimer */}
      <p className="text-[11px] text-stone-400 pt-1">
        Penjelasan ini bersifat pendamping; keputusan akhir pada sulinggih atau pemangku.
      </p>
    </div>
  );
}

export default AiSummaryBox;