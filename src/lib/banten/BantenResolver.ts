import { SearchClient } from '../search/SearchClient';
import { LlmExtractor } from '../llm/LlmExtractor';

export interface BantenItemResolved {
  id: number;
  nama: string;
  lokasi?: string | null;
  jumlah?: string | null;
  jumlah_min?: number | null;
  grup_alternatif?: number | null;
  urutan: number;
  kutipan?: {
    teks: string;
    halaman?: string | null;
    sumberJudul?: string | null;
    sumberUrl?: string | null;
  } | null;
  status: 'verified' | 'unverified';
}

export interface BantenSetResolved {
  upacaraId: number;
  tingkatanId: number;
  asal: 'manual' | 'internet';
  status: 'verified' | 'unverified';
  items: BantenItemResolved[];
  isFound: boolean;
  message?: string;
}

export interface ResolveBantenOptions {
  upacaraId: number;
  tingkatanId: number;
  upacaraNama?: string;
  tingkatanNama?: string;
  rangkaianId?: number | null;
  daerahId?: number | null;
}

export interface DbBantenSetItem {
  id: number;
  banten_id: number;
  urutan: number;
  jumlah?: string | null;
  jumlah_min?: number | null;
  grup_alternatif?: number | null;
  banten: { id: number; nama: string };
  lokasi?: { id: number; nama: string } | null;
  kutipan?: {
    id: number;
    teks: string;
    halaman?: string | null;
    sumber?: { id: number; judul?: string | null; url?: string | null } | null;
  } | null;
}

export interface DbBantenSet {
  id: number;
  upacara_id: number;
  tingkatan_id: number;
  asal: 'manual' | 'internet';
  status: 'verified' | 'unverified';
  items?: DbBantenSetItem[];
}

export interface IBantenResolverRepository {
  findBantenSet(options: {
    upacaraId: number;
    tingkatanId: number;
    rangkaianId?: number | null;
    daerahId?: number | null;
  }): Promise<DbBantenSet | null>;
  getWhitelistedDomains(): Promise<string[]>;
  saveFallbackBantenSet?(data: unknown): Promise<unknown>;
}

export class BantenResolver {
  private repository: IBantenResolverRepository;
  private searchClient?: SearchClient;
  private extractor?: LlmExtractor;

  constructor(
    repository: IBantenResolverRepository,
    searchClient?: SearchClient,
    extractor?: LlmExtractor
  ) {
    this.repository = repository;
    this.searchClient = searchClient;
    this.extractor = extractor;
  }

  /**
   * Menyusun kebutuhan banten:
   * Alur: DB -> (fallback) search whitelist -> LLM ekstraksi -> QuoteVerifier -> simpan unverified -> atau "tidak ditemukan".
   */
  public async resolve(options: ResolveBantenOptions): Promise<BantenSetResolved> {
    const { upacaraId, tingkatanId, upacaraNama, tingkatanNama, rangkaianId, daerahId } = options;

    // 1. Cek database terlebih dahulu (DB First)
    const dbSet = await this.repository.findBantenSet({
      upacaraId,
      tingkatanId,
      rangkaianId,
      daerahId,
    });

    if (dbSet && dbSet.items && dbSet.items.length > 0) {
      const items: BantenItemResolved[] = dbSet.items.map((item) => ({
        id: item.banten_id,
        nama: item.banten.nama,
        lokasi: item.lokasi?.nama || null,
        jumlah: item.jumlah || null,
        jumlah_min: item.jumlah_min ?? null,
        grup_alternatif: item.grup_alternatif ?? null,
        urutan: item.urutan,
        kutipan: item.kutipan
          ? {
              teks: item.kutipan.teks,
              halaman: item.kutipan.halaman || null,
              sumberJudul: item.kutipan.sumber?.judul || null,
              sumberUrl: item.kutipan.sumber?.url || null,
            }
          : null,
        status: dbSet.status,
      }));

      return {
        upacaraId,
        tingkatanId,
        asal: dbSet.asal,
        status: dbSet.status,
        items,
        isFound: true,
      };
    }

    // 2. Fallback: Web Search + LLM Extractor
    if (this.searchClient && this.extractor) {
      const whitelist = await this.repository.getWhitelistedDomains();
      const query = `banten upacara ${upacaraNama || ''} tingkatan ${tingkatanNama || ''}`.trim();

      const searchResults = await this.searchClient.search(query, {
        includeDomains: whitelist,
        maxResults: 5,
      });

      if (searchResults && searchResults.length > 0) {
        for (const searchResult of searchResults) {
          const extraction = await this.extractor.extract({
            sourceContent: searchResult.content,
            sourceUrl: searchResult.url,
            upacaraNama: upacaraNama || 'Upacara',
            tingkatanNama: tingkatanNama || 'Umum',
          });

          if (extraction.items && extraction.items.length > 0) {
            const items: BantenItemResolved[] = extraction.items.map((item, idx) => ({
              id: idx + 1,
              nama: item.nama,
              lokasi: item.lokasi || null,
              jumlah: item.jumlah != null ? `${item.jumlah}` : null,
              jumlah_min: item.jumlah_min ?? null,
              grup_alternatif: item.grup_alternatif ?? null,
              urutan: idx + 1,
              kutipan: {
                teks: item.kutipan,
                sumberJudul: searchResult.title || searchResult.url,
                sumberUrl: searchResult.url,
              },
              status: 'unverified', // Aturan Mutlak #4: Hasil fallback LLM selalu 'unverified'
            }));

            // Simpan fallback ke DB bila repository mendukung
            if (this.repository.saveFallbackBantenSet) {
              try {
                await this.repository.saveFallbackBantenSet({
                  upacaraId,
                  tingkatanId,
                  rangkaianId,
                  daerahId,
                  sumber: {
                    url: searchResult.url,
                    judul: searchResult.title,
                  },
                  items: items.map((it) => ({
                    bantenId: it.id,
                    lokasiId: null,
                    jumlah: it.jumlah,
                    kutipanTeks: it.kutipan?.teks || '',
                  })),
                });
              } catch {
                // Jangan gagalkan eksekusi bila operasi penyimpanan gagal
              }
            }

            return {
              upacaraId,
              tingkatanId,
              asal: 'internet',
              status: 'unverified',
              items,
              isFound: true,
            };
          }
        }
      }
    }

    // 3. Jika tidak ditemukan di DB maupun web (Aturan Mutlak #1)
    return {
      upacaraId,
      tingkatanId,
      asal: 'manual',
      status: 'unverified',
      items: [],
      isFound: false,
      message: 'Data belum tersedia',
    };
  }
}

