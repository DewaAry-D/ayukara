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

    const systemPrompt = `Anda adalah asisten perangkum rencana yadnya Hindu Bali di Ayukara.
Tugas Anda: buat narasi ringkasan rencana yang santun, jelas, terstruktur rapi, dan mudah dibaca dalam Bahasa Indonesia.

ATURAN STRUKTUR & TATA LETAK:
1. Mulai langsung dengan paragraf pengantar singkat (1-2 kalimat) yang menyebutkan upacara, tingkatan, tanggal pelaksanaan, dan alasan pemilihan hari baik. JANGAN menulis judul besar seperti "# Ringkasan...".
2. Jika ada pembagian tempat (lokasi) atau tahapan (rangkaian), TAMPILKAN DALAM BENTUK POIN DAFTAR (bullet points list):
   • **[Nama Tempat / Tahapan]:** [Daftar nama banten di tempat tersebut] [nomor sitasi jika ada]
   • **[Nama Tempat / Tahapan]:** [Daftar nama banten di tempat tersebut] [nomor sitasi jika ada]
   Gunakan format tebal (**nama tempat:**) pada setiap label tempat agar jelas dan mudah dibaca.
3. Tutup dengan paragraf singkat tentang estimasi biaya. DILARANG KERAS menuliskan angka "Rp 0" atau "Rp 0 - Rp 0". Jika harga spesifik belum ada, sampaikan bahwa perkiraan biaya banten menyesuaikan fluktuasi pasar dan kesepakatan serati banten atau pemangku setempat.
4. DILARANG menambahkan fakta keagamaan/budaya baru di luar data input.
5. Gunakan nomor sitasi [1], [2] secara proporsional di akhir kelompok banten, jangan mengulang sitasi yang sama di setiap kata.`;

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

    // Deteksi jika respon proxy/LLM adalah pesan error otentikasi (misal balasan dari gateway 9router)
    const isErrorText =
      /invalid api key|unauthorized|error:|failed to authenticate|incorrect api key/i.test(summaryText);

    if (isErrorText) {
      summaryText = `Rencana upacara ${input.upacaraNama} (${input.tingkatanNama || 'Umum'}) telah disusun untuk tanggal ${input.tanggalInfo.tanggal || 'yang dipilih'}. Diperlukan ${input.bantenItems.length} sarana banten sesuai pedoman upakara yadnya Hindu Bali.`;
    }

    return {
      summaryText,
      citations,
    };
  }
}

