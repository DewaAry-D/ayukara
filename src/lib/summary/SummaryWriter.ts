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
    // 1. Ekstrak dan indeks sitasi dari kutipan banten
    const citations: CitationItem[] = [];
    let citationCounter = 1;

    for (const banten of input.bantenItems) {
      if (banten.kutipan && banten.kutipan.teks) {
        citations.push({
          id: citationCounter,
          label: `[${citationCounter}]`,
          text: banten.kutipan.teks,
          sourceTitle: banten.kutipan.sumberJudul || undefined,
          sourceUrl: banten.kutipan.sumberUrl || undefined,
        });
        citationCounter++;
      }
    }

    const citationsContext = citations
      .map((c) => `${c.label} ${c.text} (Sumber: ${c.sourceTitle || 'Tidak ada judul'})`)
      .join('\n');

    const bantenListContext = input.bantenItems
      .map((b) => `- ${b.nama} (${b.jumlah || 'secukupnya'}) di ${b.lokasi || 'tempat upacara'}`)
      .join('\n');

    const hargaContext = input.hargaTotal
      ? `Estimasi Biaya: Rp ${input.hargaTotal.totalMin.toLocaleString('id-ID')} - Rp ${input.hargaTotal.totalMax.toLocaleString('id-ID')} (${input.hargaTotal.itemTanpaHargaCount} item harga belum tersedia)`
      : 'Estimasi Biaya: Belum tersedia';

    const systemPrompt = `Anda adalah asisten perangkum rencana yadnya Hindu Bali di Ayukara.
Tugas Anda: buat narasi ringkasan rencana yang santun, jelas, dan ringkas dalam Bahasa Indonesia.

ATURAN KETAT:
1. DILARANG menambahkan fakta keagamaan/budaya baru yang tidak ada pada input data terstruktur.
2. Gunakan penomoran sitasi [1], [2] jika menyebut banten yang memiliki sitasi sumber.
3. Pertahankan tanggal dan rincian harga sesuai input persis.`;

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

    const summaryText = completion.text || 'Ringkasan rencana yadnya belum tersedia.';

    return {
      summaryText,
      citations,
    };
  }
}

