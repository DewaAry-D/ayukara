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
          const systemPrompt = `Anda adalah sistem ekstraksi harga sarana banten Yadnya Hindu Bali.
Tugas Anda mengekstrak rentang estimasi harga (dalam angka IDR) untuk banten "${item.nama}".
ATURAN KETAT:
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
}

