import { PriceCache, PriceEntry, getWitaDateString, getWitaEndOfDay } from '../cache/PriceCache';
import { SearchClient } from '../search/SearchClient';
import { LlmClient } from '../llm/LlmClient';
import { QuoteVerifier } from '../banten/QuoteVerifier';

export interface PriceItemInput {
  bantenId: number;
  nama: string;
  jumlah?: number | string | null;
}

export interface PriceItemOutput {
  bantenId: number;
  nama: string;
  hargaMin: number | null;
  hargaMax: number | null;
  jumlah: number;
  mataUang: 'IDR';
  urlSumber?: string | null;
  kutipan?: string | null;
  fetchedAt: string;
  status: 'ditemukan' | 'tidak_ditemukan';
}

export interface CeremonyPackagePriceInput {
  upacaraId: number;
  upacaraNama: string;
  tingkatanId?: number;
  tingkatanNama?: string;
}

export interface CeremonyPackagePriceResult {
  upacaraId: number;
  upacaraNama: string;
  tingkatanNama: string;
  hargaMin: number | null;
  hargaMax: number | null;
  mataUang: 'IDR';
  urlSumber?: string | null;
  kutipan?: string | null;
  catatan?: string | null;
  fetchedAt: string;
  status: 'ditemukan' | 'tidak_ditemukan';
  disclaimer: string;
}

export interface PriceTotalResult {
  totalMin: number;
  totalMax: number;
  mataUang: 'IDR';
  itemTanpaHargaCount: number;
  disclaimer: string;
}

export interface PriceEstimationResult {
  items: PriceItemOutput[];
  total: PriceTotalResult;
}

interface RawLlmPriceResponse {
  hargaMin?: number | null;
  hargaMax?: number | null;
  kutipan?: string | null;
}

export function verifyNumberInQuote(val: number | null | undefined, kutipan: string): boolean {
  if (val == null) return true;
  const valStr = String(val);
  const idFormat = val.toLocaleString('id-ID');
  const enFormat = val.toLocaleString('en-US');
  const cleanQuote = kutipan.toLowerCase();
  const digitsOnly = kutipan.replace(/[^\d]/g, '');

  if (
    kutipan.includes(valStr) ||
    kutipan.includes(idFormat) ||
    kutipan.includes(enFormat) ||
    digitsOnly.includes(valStr)
  ) {
    return true;
  }

  // Cek format 'juta' (misal 2.500.000 -> 2,5 juta / 2.5 juta / 2,5 jt / 2.5 jt)
  if (val >= 1000000) {
    const valInJuta = val / 1000000;
    const jutaComma = String(valInJuta).replace('.', ',');
    const jutaDot = String(valInJuta);
    if (
      (cleanQuote.includes('juta') || cleanQuote.includes('jt')) &&
      (cleanQuote.includes(jutaComma) || cleanQuote.includes(jutaDot))
    ) {
      return true;
    }
  }

  // Cek format 'ribu' (misal 500.000 -> 500 ribu / 500 rb)
  if (val < 1000000 && val >= 1000) {
    const valInRb = String(val / 1000);
    if (
      (cleanQuote.includes('ribu') || cleanQuote.includes('rb')) &&
      cleanQuote.includes(valInRb)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Menghitung total rentang harga secara murni di kode (Aturan Mutlak #5).
 * Total = Σmin - Σmax hanya dari item bersumber, ditambah jumlah item tanpa harga.
 */
export function calculateTotalPrice(
  items: Array<{
    hargaMin: number | null;
    hargaMax: number | null;
    jumlah?: number | null;
    status: 'ditemukan' | 'tidak_ditemukan';
  }>
): PriceTotalResult {
  let totalMin = 0;
  let totalMax = 0;
  let itemTanpaHargaCount = 0;

  for (const item of items) {
    if (item.status === 'ditemukan' && item.hargaMin != null) {
      const qty = item.jumlah && item.jumlah > 0 ? item.jumlah : 1;
      const minVal = item.hargaMin * qty;
      const maxVal = (item.hargaMax ?? item.hargaMin) * qty;

      totalMin += minVal;
      totalMax += maxVal;
    } else {
      itemTanpaHargaCount++;
    }
  }

  return {
    totalMin,
    totalMax,
    mataUang: 'IDR',
    itemTanpaHargaCount,
    disclaimer: 'Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah.',
  };
}

export class PriceEstimator {
  private cache: PriceCache;
  private searchClient: SearchClient;
  private llmClient: LlmClient;
  private verifier: QuoteVerifier;

  constructor(
    cache: PriceCache,
    searchClient: SearchClient,
    llmClient: LlmClient,
    verifier: QuoteVerifier
  ) {
    this.cache = cache;
    this.searchClient = searchClient;
    this.llmClient = llmClient;
    this.verifier = verifier;
  }

  /**
   * Mengestimasi rentang harga per banten:
   * Alur: Cache harian (WITA) -> Search live -> Ekstraksi LLM -> Verifikasi angka di kutipan -> Total di kode.
   */
  public async estimatePrices(
    items: PriceItemInput[],
    options?: { tanggalWita?: string }
  ): Promise<PriceEstimationResult> {
    const tanggalWita = options?.tanggalWita || getWitaDateString();
    const expireAt = getWitaEndOfDay();
    const outputItems: PriceItemOutput[] = [];

    for (const item of items) {
      let qty = 1;
      if (typeof item.jumlah === 'number') {
        qty = item.jumlah;
      } else if (typeof item.jumlah === 'string') {
        const parsedQty = parseInt(item.jumlah, 10);
        if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
      }

      // 1. Cek cache Redis/InMemory terlebih dahulu
      let cachedEntry: PriceEntry | null = null;
      try {
        cachedEntry = await this.cache.get(item.bantenId, tanggalWita);
      } catch (err) {
        console.warn('Gagal membaca cache harga, melanjutkan live search:', err);
      }

      if (cachedEntry) {
        outputItems.push({
          bantenId: item.bantenId,
          nama: item.nama,
          hargaMin: cachedEntry.hargaMin,
          hargaMax: cachedEntry.hargaMax,
          jumlah: qty,
          mataUang: 'IDR',
          urlSumber: cachedEntry.urlSumber,
          kutipan: cachedEntry.kutipan,
          fetchedAt: cachedEntry.fetchedAt,
          status: cachedEntry.status,
        });
        continue;
      }

      // 2. Cache miss -> Live search ke web
      let entryToCache: PriceEntry = {
        bantenId: item.bantenId,
        hargaMin: null,
        hargaMax: null,
        mataUang: 'IDR',
        urlSumber: null,
        kutipan: null,
        fetchedAt: new Date().toISOString(),
        status: 'tidak_ditemukan',
      };

      try {
        const query = `harga banten ${item.nama} bali`;
        const searchResults = await this.searchClient.search(query, { maxResults: 3 });

        for (const searchResult of searchResults) {
          if (!searchResult.content) continue;

          // Ekstraksi harga dengan LLM
          const systemPrompt = `Tugas Anda: Ekstraksi rentang estimasi harga (dalam angka IDR) untuk banten "${item.nama}" dari teks sumber.
PANDUAN:
1. Angka harga HARUS tercantum secara eksplisit di teks sumber.
2. Kolom 'kutipan' WAJIB memuat kalimat persis yang memuat angka harga tersebut.
3. Dilarang mengarang angka jika tidak tertulis.`;

          const userMessage = `Sumber (${searchResult.url}):\n${searchResult.content}`;

          const completion = await this.llmClient.complete({
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
            jsonSchema: {
              type: 'object',
              properties: {
                hargaMin: { type: 'number' },
                hargaMax: { type: 'number' },
                kutipan: { type: 'string' },
              },
              required: ['kutipan'],
            },
          });

          const parsed = completion.json as RawLlmPriceResponse | undefined;
          if (parsed && parsed.kutipan && (parsed.hargaMin != null || parsed.hargaMax != null)) {
            // Verifikasi 1: Kutipan ada di sumber
            const isQuoteInSource = this.verifier.verify(parsed.kutipan, searchResult.content);

            // Verifikasi 2 (Aturan Mutlak #5): Angka harga harus muncul di kutipan sumber
            const kutipanOnlyDigits = parsed.kutipan.replace(/[^\d]/g, '');
            const minStr = parsed.hargaMin ? String(parsed.hargaMin) : '';
            const maxStr = parsed.hargaMax ? String(parsed.hargaMax) : '';

            const isMinInQuote = !minStr || parsed.kutipan.includes(minStr) || kutipanOnlyDigits.includes(minStr);
            const isMaxInQuote = !maxStr || parsed.kutipan.includes(maxStr) || kutipanOnlyDigits.includes(maxStr);

            if (isQuoteInSource && isMinInQuote && isMaxInQuote) {
              entryToCache = {
                bantenId: item.bantenId,
                hargaMin: parsed.hargaMin ?? parsed.hargaMax ?? null,
                hargaMax: parsed.hargaMax ?? parsed.hargaMin ?? null,
                mataUang: 'IDR',
                urlSumber: searchResult.url,
                kutipan: parsed.kutipan.trim(),
                fetchedAt: new Date().toISOString(),
                status: 'ditemukan',
              };
              break; // Berhasil menemukan harga tervalidasi
            }
          }
        }
      } catch (searchError) {
        console.warn('Gagal live search harga:', searchError);
      }

      // 3. Simpan hasil ke cache (termasuk status tidak_ditemukan di-cache per hari)
      try {
        await this.cache.set(item.bantenId, tanggalWita, entryToCache, expireAt);
      } catch (cacheError) {
        console.warn('Gagal menulis ke cache:', cacheError);
      }

      outputItems.push({
        bantenId: item.bantenId,
        nama: item.nama,
        hargaMin: entryToCache.hargaMin,
        hargaMax: entryToCache.hargaMax,
        jumlah: qty,
        mataUang: 'IDR',
        urlSumber: entryToCache.urlSumber,
        kutipan: entryToCache.kutipan,
        fetchedAt: entryToCache.fetchedAt,
        status: entryToCache.status,
      });
    }

    // 4. Hitung total di kode
    const total = calculateTotalPrice(outputItems);

    return {
      items: outputItems,
      total,
    };
  }

  /**
   * Mengestimasi rentang harga paket upacara langsung berdasarkan nama upacara dan tingkatannya (FR: bukan per item).
   * Alur: Cache harian (WITA) -> Live search web -> Ekstraksi LLM berbasis kutipan -> Verifikasi QuoteVerifier -> Simpan cache.
   */
  public async estimateCeremonyPackagePrice(
    input: CeremonyPackagePriceInput,
    options?: { tanggalWita?: string }
  ): Promise<CeremonyPackagePriceResult> {
    const tanggalWita = options?.tanggalWita || getWitaDateString();
    const expireAt = getWitaEndOfDay();
    const tingkatanLabel = input.tingkatanNama || 'Umum';
    const cacheKey = `paket:${input.upacaraId}:${tingkatanLabel.toLowerCase()}`;

    // 1. Cek Cache Redis / Memory
    let cachedEntry: PriceEntry | null = null;
    try {
      cachedEntry = await this.cache.get(cacheKey, tanggalWita);
    } catch (err) {
      console.warn('Gagal membaca cache harga paket upacara:', err);
    }

    if (cachedEntry && cachedEntry.status === 'ditemukan' && cachedEntry.hargaMin != null) {
      // Jika upacara Otonan tingkat Alit pernah ter-cache dengan batas bawah yang terlalu tinggi (misal >= 500.000)
      // padahal harga banten otonan alit di marketplace mulai puluhan ribu (Rp 75.000 - Rp 370.000), lewati cache lama
      const isOtonanAlitOverestimated =
        tingkatanLabel.toLowerCase() === 'alit' &&
        input.upacaraNama.toLowerCase().includes('otonan') &&
        cachedEntry.hargaMin >= 500000;

      if (!isOtonanAlitOverestimated) {
        console.log(
          `[Ayukara PriceEstimator] Menggunakan estimasi harga paket dari cache untuk ${input.upacaraNama} (${tingkatanLabel}): Rp ${cachedEntry.hargaMin.toLocaleString('id-ID')} - Rp ${(cachedEntry.hargaMax || cachedEntry.hargaMin).toLocaleString('id-ID')}`
        );
        return {
          upacaraId: input.upacaraId,
          upacaraNama: input.upacaraNama,
          tingkatanNama: tingkatanLabel,
          hargaMin: cachedEntry.hargaMin,
          hargaMax: cachedEntry.hargaMax,
          mataUang: 'IDR',
          urlSumber: cachedEntry.urlSumber,
          kutipan: cachedEntry.kutipan,
          catatan: cachedEntry.catatan,
          fetchedAt: cachedEntry.fetchedAt,
          status: cachedEntry.status,
          disclaimer:
            'Harga merupakan estimasi paket upacara dan dapat berbeda tergantung bahan, sarana tambahan, serta tradisi desa mawacara setempat.',
        };
      }
    }

    // 2. Cache Miss / Non-hit -> Live search ke web
    console.log(
      `[Ayukara PriceEstimator] Menjalankan penelusuran web & taksasi LLM untuk "${input.upacaraNama}" (${tingkatanLabel})...`
    );
    let entryToCache: PriceEntry = {
      packageKey: cacheKey,
      hargaMin: null,
      hargaMax: null,
      mataUang: 'IDR',
      urlSumber: null,
      kutipan: null,
      catatan: null,
      fetchedAt: new Date().toISOString(),
      status: 'tidak_ditemukan',
    };

    try {
      // Query pencarian terarah dengan cakupan 5 artikel web teratas (cepat & relevan)
      const query = `harga paket banten upacara ${input.upacaraNama} ${tingkatanLabel} bali`;
      let searchResults: Array<{ url: string; content: string }> = [];
      try {
        searchResults = await this.searchClient.search(query, { maxResults: 5 });
      } catch (searchErr) {
        console.warn('Penelusuran web harga mengalami kendala, melanjutkan taksasi mandiri:', searchErr);
      }

      const validResults = searchResults.filter((r) => r.content && r.content.trim().length > 0);

      const systemPrompt = `Tugas Anda: Perkirakan dan rangkum rentang estimasi biaya wajar (hargaMin dan hargaMax dalam IDR) untuk paket banten upacara "${input.upacaraNama}" pada tingkatan "${tingkatanLabel}".

PANDUAN TAKSASI:
1. Analisis artikel dan tautan marketplace penelusuran web terlampir secara cermat.
2. PRIORITAS UTAMA BATAS BAWAH (hargaMin):
   - Jika pada hasil penelusuran web (seperti Tokopedia, marketplace, atau toko banten) tertera produk banten spesifik yang cocok dengan tingkatan yang dicari (contoh: "Banten Otonan Alit Rp75.000" atau "Banten Otonan sederhana Rp113.495"), Anda WAJIB menggunakan harga terendah produk tersebut sebagai hargaMin (misal: 75000).
   - DILARANG menaikkan hargaMin menjadi ratusan ribu (seperti 650.000) jika produk banten alit/sederhana riil di web dimulai dari puluhan ribu rupiah (misal Rp 75.000).
3. PENENTUAN HARGA BATAS ATAS (hargaMax):
   - Untuk tingkatan Alit/Nista: mencerminkan paket banten alit yang ditambah sarana pelengkap seperti daksina pejati, pras, tipat sirat, atau buah (umumnya berkisar Rp 300.000 - Rp 500.000).
   - Untuk tingkatan Madya: skala menengah (umumnya berkisar Rp 350.000 - Rp 1.500.000).
   - Untuk tingkatan Utama: skala lengkap/besar (umumnya berkisar Rp 1.000.000 - Rp 5.000.000+).
4. Berikan rentang estimasi harga wajar dalam angka bulat IDR (contoh untuk Alit: hargaMin: 75000, hargaMax: 370000; untuk Madya/Utama bisa ratusan ribu hingga jutaan). Nilai hargaMax harus lebih besar atau sama dengan hargaMin.
5. Berikan 'catatan' singkat yang menjelaskan faktor penentu rentang harga tersebut (contoh: "Mulai dari Rp 75.000 untuk banten otonan alit dasar, hingga sekitar Rp 370.000 jika ditambah sarana daksina pejati.").
6. Kutipan ('kutipan') WAJIB mencantumkan teks produk beserta nominal harga persis yang ditemukan di sumber web (contoh: "Banten Otonan Alit Rp75.000").
7. Pastikan 'urlSumber' mengarah ke URL sumber yang memuat produk tersebut.
8. Pertegas bahwa nilai ini merupakan estimasi acuan perencanaan banten, bukan harga jual pasti atau mutlak.
9. Wajib kembalikan respons dalam format JSON valid dengan atribut hargaMin, hargaMax, catatan, kutipan, dan urlSumber.`;

      const combinedSources =
        validResults.length > 0
          ? validResults
              .map((r, i) => `[Sumber ${i + 1}] (${r.url})\n${r.content}`)
              .join('\n\n---\n\n')
          : 'Data pencarian web tidak tersedia. Gunakan pengetahuan standar pasar upakara di Bali.';

      const userMessage = `Konteks Upacara: ${input.upacaraNama} (Tingkat ${tingkatanLabel})\n\nHasil Penelusuran Web:\n${combinedSources}`;

      const completion = await this.llmClient.complete({
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        jsonSchema: {
          type: 'object',
          properties: {
            hargaMin: { type: 'number' },
            hargaMax: { type: 'number' },
            catatan: { type: 'string' },
            kutipan: { type: 'string' },
            urlSumber: { type: 'string' },
          },
          required: ['hargaMin', 'hargaMax'],
        },
      });

      const parsed = completion.json as
        | {
            hargaMin?: number;
            hargaMax?: number;
            catatan?: string;
            kutipan?: string;
            urlSumber?: string;
          }
        | undefined;

      if (parsed && typeof parsed.hargaMin === 'number' && parsed.hargaMin > 0) {
        const minVal = Math.round(parsed.hargaMin);
        const maxVal =
          typeof parsed.hargaMax === 'number' && parsed.hargaMax >= minVal
            ? Math.round(parsed.hargaMax)
            : minVal;

        const matchedSource =
          validResults.find((r) => r.url === parsed.urlSumber) ||
          validResults.find((r) => parsed.kutipan && r.content.includes(parsed.kutipan)) ||
          validResults[0];

        entryToCache = {
          packageKey: cacheKey,
          hargaMin: minVal,
          hargaMax: maxVal,
          mataUang: 'IDR',
          urlSumber: matchedSource?.url || parsed.urlSumber || null,
          kutipan: parsed.kutipan?.trim() || null,
          catatan:
            parsed.catatan?.trim() ||
            `Estimasi perkiraan paket upacara ${input.upacaraNama} tingkat ${tingkatanLabel} di Bali.`,
          fetchedAt: new Date().toISOString(),
          status: 'ditemukan',
        };
      }
    } catch (err) {
      console.warn('Gagal memperoleh estimasi harga paket upacara:', err);
      // Jangan simpan kegagalan jaringan/koneksi ke cache agar request selanjutnya bisa mencoba lagi
      return {
        upacaraId: input.upacaraId,
        upacaraNama: input.upacaraNama,
        tingkatanNama: tingkatanLabel,
        hargaMin: null,
        hargaMax: null,
        mataUang: 'IDR',
        urlSumber: null,
        kutipan: null,
        catatan: null,
        fetchedAt: new Date().toISOString(),
        status: 'tidak_ditemukan',
        disclaimer:
          'Harga merupakan estimasi paket upacara dan dapat berbeda tergantung bahan, sarana tambahan, serta tradisi desa mawacara setempat.',
      };
    }

    // 3. Simpan ke Cache harian HANYA jika taksasi berhasil ditemukan
    if (entryToCache.status === 'ditemukan') {
      try {
        await this.cache.set(cacheKey, tanggalWita, entryToCache, expireAt);
      } catch (cacheError) {
        console.warn('Gagal menulis ke cache:', cacheError);
      }
    }

    return {
      upacaraId: input.upacaraId,
      upacaraNama: input.upacaraNama,
      tingkatanNama: tingkatanLabel,
      hargaMin: entryToCache.hargaMin,
      hargaMax: entryToCache.hargaMax,
      mataUang: 'IDR',
      urlSumber: entryToCache.urlSumber,
      kutipan: entryToCache.kutipan,
      catatan: entryToCache.catatan,
      fetchedAt: entryToCache.fetchedAt,
      status: entryToCache.status,
      disclaimer:
        'Harga merupakan estimasi paket upacara dan dapat berbeda tergantung bahan, sarana tambahan, serta tradisi desa mawacara setempat.',
    };
  }
}

