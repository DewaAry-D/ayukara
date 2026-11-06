import { LlmClient } from '../llm/LlmClient';

export interface SummaryPlanInput {
  upacaraNama: string;
  tingkatanNama?: string;
  tanggalInfo: {
    tanggal: string; // YYYY-MM-DD
    keterangan: string;
  };
  bantenItems: Array<{
    nama: string;
    lokasi?: string | null;
    jumlah?: string | null;
    kutipan?: {
      teks: string;
      halaman?: string | null;
      sumberJudul?: string | null;
      sumberUrl?: string | null;
    } | null;
  }>;
  rangkaianGroups?: Array<{
    rangkaianNama: string;
    items: Array<{ nama: string; lokasi?: string | null; jumlah?: string | null; kutipan?: any }>;
  }>;
  locationGroups?: Array<{
    lokasiNama: string;
    items: Array<{ nama: string; jumlah?: string | null; kutipan?: any }>;
  }>;
  hargaTotal?: {
    totalMin: number;
    totalMax: number;
    itemTanpaHargaCount: number;
  } | null;
}

export interface CitationItem {
  id: number;
  label: string;
  text: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

export interface SummaryWriterResult {
  summaryText: string;
  citations: CitationItem[];
}

export class SummaryWriter {
  private llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  /**
   * Menghasilkan ringkasan naratif terstruktur beserta sitasi bernomor [1], [2].
   * Sesuai batasan: LLM hanya merangkum data terstruktur yang diberikan, tanpa menambah fakta budaya baru.
   */
  public async generateSummary(input: SummaryPlanInput): Promise<SummaryWriterResult> {
    // 1. Ekstrak dan indeks sitasi dari kutipan banten (Deduplikasi sumber yang sama)
    const citations: CitationItem[] = [];
    const sourceMap = new Map<string, CitationItem>();
    let citationCounter = 1;

    for (const banten of input.bantenItems) {
      if (banten.kutipan && banten.kutipan.teks) {
        const title = (banten.kutipan.sumberJudul || 'Kutipan Sastra Yadnya').trim();
        const url = (banten.kutipan.sumberUrl || '').trim();
        const dedupeKey = `${title.toLowerCase()}|${url.toLowerCase()}`;

        if (!sourceMap.has(dedupeKey)) {
          const item: CitationItem = {
            id: citationCounter,
            label: `[${citationCounter}]`,
            text: banten.kutipan.teks,
            sourceTitle: banten.kutipan.sumberJudul || undefined,
            sourceUrl: banten.kutipan.sumberUrl || undefined,
          };
          citations.push(item);
          sourceMap.set(dedupeKey, item);
          citationCounter++;
        }
      }
    }

    const citationsContext = citations
      .map((c) => `${c.label} ${c.text} (Sumber: ${c.sourceTitle || 'Tidak ada judul'})`)
      .join('\n');

    let bantenListContext = '';
    if (input.rangkaianGroups && input.rangkaianGroups.length > 1) {
      bantenListContext = input.rangkaianGroups
        .map(
          (rg) =>
            `• **${rg.rangkaianNama}:** ` +
            rg.items.map((i) => i.nama + (i.jumlah ? ` (${i.jumlah})` : '')).join(', ')
        )
        .join('\n');
    } else if (input.locationGroups && input.locationGroups.length > 0) {
      bantenListContext = input.locationGroups
        .map(
          (lg) =>
            `• **Penempatan ${lg.lokasiNama}:** ` +
            lg.items.map((i) => i.nama + (i.jumlah ? ` (${i.jumlah})` : '')).join(', ')
        )
        .join('\n');
    } else {
      bantenListContext = input.bantenItems
        .map((b) => {
          let citLabel = '';
          if (b.kutipan && b.kutipan.teks) {
            const title = (b.kutipan.sumberJudul || 'Kutipan Sastra Yadnya').trim();
            const url = (b.kutipan.sumberUrl || '').trim();
            const cit = sourceMap.get(`${title.toLowerCase()}|${url.toLowerCase()}`);
            if (cit) {
              citLabel = ` ${cit.label}`;
            }
          }
          return `• **${b.nama}:** ${b.jumlah || 'secukupnya'} di ${b.lokasi || 'tempat upacara'}${citLabel}`;
        })
        .join('\n');
    }

    const hargaContext =
      input.hargaTotal && input.hargaTotal.totalMin > 0
        ? `Estimasi Biaya Paket: Rp ${input.hargaTotal.totalMin.toLocaleString('id-ID')} - Rp ${input.hargaTotal.totalMax.toLocaleString('id-ID')} (berdasarkan referensi pasar upakara)`
        : 'Estimasi Biaya: Belum ada patokan harga tetap, kisaran biaya banten bersifat fleksibel menyesuaikan fluktuasi bahan di pasar dan kesepakatan setempat. PENTING: DILARANG KERAS menulis angka "Rp 0" atau "Rp 0 - Rp 0".';

    const systemPrompt = `Rangkum data rencana upacara yadnya Hindu Bali berikut ke dalam narasi terstruktur berbahasa Indonesia yang informatif, jelas, dan rapi.

FORMAT & STRUKTUR:
1. Paragraf pengantar singkat (1-2 kalimat): sebutkan nama upacara, tingkatan, tanggal pelaksanaan, dan alasan pemilihan hari baik. Hindari membuat judul heading seperti "# Ringkasan".
2. Jika ada pembagian tempat (lokasi) atau tahapan (rangkaian), tampilkan dalam bentuk poin daftar:
   • **[Nama Tempat / Tahapan]:** [Daftar nama banten di tempat tersebut] [nomor sitasi jika ada]
   • **[Nama Tempat / Tahapan]:** [Daftar nama banten di tempat tersebut] [nomor sitasi jika ada]
3. Paragraf penutup tentang estimasi biaya: sampaikan perkiraan biaya paket upacara secara wajar berdasarkan data yang tersedia. Jika belum ada harga spesifik, jelaskan bahwa perkiraan biaya banten menyesuaikan fluktuasi bahan di pasar dan kesepakatan pemangku atau serati banten setempat. Hindari menulis angka "Rp 0".
4. Gunakan hanya informasi dari data yang disediakan tanpa mengarang fakta keagamaan atau budaya baru di luar daftar.
5. Gunakan nomor sitasi [1], [2] secara proporsional di akhir kelompok banten.`;

    const userMessage = `DATA RENCANA YADNYA:
Upacara: ${input.upacaraNama} (Tingkatan: ${input.tingkatanNama || 'Umum'})
Tanggal: ${input.tanggalInfo.tanggal} (${input.tanggalInfo.keterangan})
Banten yang Dibutuhkan:
${bantenListContext || '-'}

${hargaContext}

DAFTAR SITASI RESMI:
${citationsContext || 'Tidak ada sitasi teks'}`;

    const completion = await this.llmClient.complete({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    let summaryText = completion.text || 'Ringkasan rencana yadnya belum tersedia.';
    // Bersihkan sitasi ganda berturut-turut pada teks (misal: [1] [1] atau [1], [1] atau [1], [1], [1])
    summaryText = summaryText.replace(/\[(\d+)\](?:\s*[,;]?\s*\[\1\])+/g, '[$1]');

    // Bersihkan jika model masih memunculkan narasi "Rp 0 - Rp 0"
    if (/Rp\s*0\s*[-–]\s*Rp\s*0/i.test(summaryText) || /Estimasi biaya\s+Rp\s*0/i.test(summaryText)) {
      if (input.hargaTotal && input.hargaTotal.totalMin > 0) {
        summaryText = summaryText.replace(
          /Estimasi biaya\s+Rp\s*0[^\n.]*\./i,
          `Estimasi biaya paket berkisar antara Rp ${input.hargaTotal.totalMin.toLocaleString('id-ID')} – Rp ${input.hargaTotal.totalMax.toLocaleString('id-ID')} berdasarkan referensi pasar upakara.`
        );
        summaryText = summaryText.replace(
          /Rp\s*0\s*[-–]\s*Rp\s*0[^\n.]*\./i,
          `Rp ${input.hargaTotal.totalMin.toLocaleString('id-ID')} – Rp ${input.hargaTotal.totalMax.toLocaleString('id-ID')} berdasarkan referensi pasar upakara.`
        );
      } else {
        summaryText = summaryText.replace(
          /Estimasi biaya\s+Rp\s*0[^\n.]*\./i,
          'Estimasi biaya banten dapat disesuaikan dengan fluktuasi harga bahan pasar dan kesepakatan serati banten setempat.'
        );
        summaryText = summaryText.replace(
          /Rp\s*0\s*[-–]\s*Rp\s*0[^\n.]*\./i,
          'disesuaikan dengan fluktuasi harga bahan pasar dan kesepakatan serati banten setempat.'
        );
      }
    }

    // Deteksi jika respon proxy/LLM adalah pesan error otentikasi atau penolakan persona (refusal)
    const isErrorOrRefusalText =
      /invalid api key|unauthorized|failed to authenticate|incorrect api key|i can't help with this|i cannot help with this|adopt a different identity|i'm kiro|i am kiro|overrides my actual design|mau lanjut\?|as an ai language model/i.test(
        summaryText
      );

    if (isErrorOrRefusalText) {
      const bantenCount = input.bantenItems.length;
      const tgl = input.tanggalInfo.tanggal || 'yang telah dipilih';
      const ketTgl = input.tanggalInfo.keterangan ? ` (${input.tanggalInfo.keterangan})` : '';
      const tingkat = input.tingkatanNama || 'Umum / Sederhana';

      let fallbackText = `Rencana pelaksanaan upacara ${input.upacaraNama} dengan tingkatan ${tingkat} dijadwalkan pada ${tgl}${ketTgl}. Upacara ini membutuhkan ${bantenCount} sarana upakara (banten) yang telah disusun sesuai pedoman sastra yadnya Hindu Bali.\n\n`;

      if (bantenListContext) {
        fallbackText += `Daftar sarana upakara yang dipersiapkan:\n${bantenListContext}\n\n`;
      }

      if (input.hargaTotal && input.hargaTotal.totalMin > 0) {
        fallbackText += `Estimasi biaya paket banten berkisar antara Rp ${input.hargaTotal.totalMin.toLocaleString('id-ID')} hingga Rp ${input.hargaTotal.totalMax.toLocaleString('id-ID')} berdasarkan referensi pasar upakara dan kesepakatan setempat.`;
      } else {
        fallbackText += `Perkiraan biaya sarana banten bersifat fleksibel dan dapat disesuaikan dengan fluktuasi harga bahan di pasar serta kesepakatan serati banten atau pemangku setempat.`;
      }

      summaryText = fallbackText;
    }

    return {
      summaryText,
      citations,
    };
  }
}

