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
  status: 'verified' | 'unverified' | 'rejected';
  rangkaianNama?: string | null;
  rangkaianUrutan?: number | null;
  tingkatanNama?: string | null;
}

export interface BantenLocationGroup {
  lokasiNama: string;
  items: BantenItemResolved[];
}

export interface BantenRangkaianGroup {
  rangkaianId?: number | null;
  rangkaianNama: string;
  urutan: number;
  items: BantenItemResolved[];
  locationGroups: BantenLocationGroup[];
}

export interface TingkatanOptionResolved {
  id: number;
  label: string;
  dbNama: string;
  items: BantenItemResolved[];
  rangkaianGroups: BantenRangkaianGroup[];
  locationGroups: BantenLocationGroup[];
}

export interface BantenSetResolved {
  upacaraId: number;
  tingkatanId: number;
  tingkatanNama?: string;
  asal: 'manual' | 'internet';
  status: 'verified' | 'unverified' | 'rejected';
  items: BantenItemResolved[];
  isFound: boolean;
  message?: string;
  rangkaianGroups?: BantenRangkaianGroup[];
  locationGroups?: BantenLocationGroup[];
  availableTingkatan?: TingkatanOptionResolved[];
  catatanTingkatan?: string;
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
  urutan?: number | null;
  jumlah?: string | null;
  jumlah_min?: number | null;
  grup_alternatif?: number | null;
  banten?: { id: number; nama: string };
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
  rangkaian_id?: number | null;
  asal: 'manual' | 'internet';
  status: 'verified' | 'unverified' | 'rejected';
  tingkatan?: { id: number; nama: string } | null;
  rangkaian?: { id: number; nama: string; urutan?: number | null } | null;
  items?: DbBantenSetItem[];
}

export interface IBantenResolverRepository {
  findBantenSet?(options: {
    upacaraId: number;
    tingkatanId: number;
    rangkaianId?: number | null;
    daerahId?: number | null;
  }): Promise<DbBantenSet | null>;
  findBantenSets?(options: {
    upacaraId: number;
    tingkatanId?: number;
    rangkaianId?: number | null;
    daerahId?: number | null;
  }): Promise<DbBantenSet[]>;
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

    function getTingkatanInfo(id: number): { label: string; name: string } {
      switch (id) {
        case 2:
        case 5:
          return { label: 'Alit', name: 'kecil' };
        case 3:
        case 6:
          return { label: 'Madya', name: 'menengah' };
        case 4:
        case 7:
          return { label: 'Utama', name: 'besar' };
        case 1:
        case 8:
        default:
          return { label: 'Umum / Sederhana', name: 'tidak disebutkan' };
      }
    }

    function groupItems(sets: DbBantenSet[]): {
      items: BantenItemResolved[];
      rangkaianGroups: BantenRangkaianGroup[];
      locationGroups: BantenLocationGroup[];
    } {
      const allItems: BantenItemResolved[] = [];
      const rangkaianMap = new Map<number | string, BantenRangkaianGroup>();
      const locationMap = new Map<string, BantenLocationGroup>();

      for (const set of sets) {
        const rName = set.rangkaian?.nama || 'Rangkaian Pokok';
        const rId = set.rangkaian_id ?? (set.rangkaian ? set.rangkaian.id : 'default');
        const rUrutan = set.rangkaian?.urutan ?? 1;

        if (!rangkaianMap.has(rId)) {
          rangkaianMap.set(rId, {
            rangkaianId: typeof rId === 'number' ? rId : null,
            rangkaianNama: rName,
            urutan: rUrutan,
            items: [],
            locationGroups: [],
          });
        }

        const rGroup = rangkaianMap.get(rId)!;

        for (const item of set.items || []) {
          const resolvedItem: BantenItemResolved = {
            id: item.banten_id,
            nama: item.banten?.nama || 'Banten',
            lokasi: item.lokasi?.nama || null,
            jumlah: item.jumlah || null,
            jumlah_min: item.jumlah_min ?? null,
            grup_alternatif: item.grup_alternatif ?? null,
            urutan: item.urutan ?? 1,
            kutipan: item.kutipan
              ? {
                  teks: item.kutipan.teks,
                  halaman: item.kutipan.halaman || null,
                  sumberJudul: item.kutipan.sumber?.judul || null,
                  sumberUrl: item.kutipan.sumber?.url || null,
                }
              : null,
            status: set.status,
            rangkaianNama: set.rangkaian ? rName : null,
            rangkaianUrutan: rUrutan,
            tingkatanNama: set.tingkatan?.nama || null,
          };

          allItems.push(resolvedItem);
          rGroup.items.push(resolvedItem);

          const locName = resolvedItem.lokasi || 'Penempatan Umum / Pokok';
          if (!locationMap.has(locName)) {
            locationMap.set(locName, {
              lokasiNama: locName,
              items: [],
            });
          }
          locationMap.get(locName)!.items.push(resolvedItem);
        }
      }

      for (const rg of rangkaianMap.values()) {
        const rgLocMap = new Map<string, BantenLocationGroup>();
        for (const it of rg.items) {
          const locName = it.lokasi || 'Penempatan Umum / Pokok';
          if (!rgLocMap.has(locName)) {
            rgLocMap.set(locName, {
              lokasiNama: locName,
              items: [],
            });
          }
          rgLocMap.get(locName)!.items.push(it);
        }
        rg.locationGroups = Array.from(rgLocMap.values());
      }

      const rangkaianGroups = Array.from(rangkaianMap.values()).sort(
        (a, b) => a.urutan - b.urutan
      );
      const locationGroups = Array.from(locationMap.values());

      return {
        items: allItems,
        rangkaianGroups,
        locationGroups,
      };
    }

    // 1. Cek database terlebih dahulu (DB First)
    let allSets: DbBantenSet[] = [];
    if (this.repository.findBantenSets) {
      allSets = await this.repository.findBantenSets({
        upacaraId,
        rangkaianId,
        daerahId,
      });
    } else if (this.repository.findBantenSet) {
      const singleSet = await this.repository.findBantenSet({
        upacaraId,
        tingkatanId,
        rangkaianId,
        daerahId,
      });
      if (singleSet) allSets = [singleSet];
    }

    if (allSets && allSets.length > 0) {
      const availableTingkatanIds = Array.from(
        new Set(allSets.map((s) => s.tingkatan_id))
      );

      // Pemetaan tingkatan yang diminta user:
      // UI: 1 = Nista/Alit (DB 2 'kecil'), 2 = Madya (DB 3 'menengah'), 3 = Utama (DB 4 'besar')
      let targetDbTingkatanId = 2; // Default Alit
      const tNamaLower = (tingkatanNama || '').toLowerCase();
      if (
        tNamaLower.includes('utama') ||
        tNamaLower.includes('besar') ||
        tingkatanId === 4 ||
        tingkatanId === 3
      ) {
        targetDbTingkatanId = 4;
      } else if (
        tNamaLower.includes('madya') ||
        tNamaLower.includes('menengah') ||
        tingkatanId === 2
      ) {
        targetDbTingkatanId = 3;
      } else if (
        tNamaLower.includes('nista') ||
        tNamaLower.includes('alit') ||
        tNamaLower.includes('kecil') ||
        tingkatanId === 1
      ) {
        targetDbTingkatanId = 2;
      }

      if (targetDbTingkatanId === 2 && !availableTingkatanIds.includes(2) && availableTingkatanIds.includes(5)) {
        targetDbTingkatanId = 5;
      } else if (targetDbTingkatanId === 3 && !availableTingkatanIds.includes(3) && availableTingkatanIds.includes(6)) {
        targetDbTingkatanId = 6;
      } else if (targetDbTingkatanId === 4 && !availableTingkatanIds.includes(4) && availableTingkatanIds.includes(7)) {
        targetDbTingkatanId = 7;
      }

      let selectedSets: DbBantenSet[] = [];
      let resolvedTingkatanNama = tingkatanNama || 'Madya';
      let catatanTingkatan: string | undefined = undefined;
      let availableTingkatanOptions: TingkatanOptionResolved[] | undefined = undefined;

      // Kumpulkan tingkatan spesifik non-umum yang tersedia di DB
      const specificTingkatanIds = [2, 5, 3, 6, 4, 7].filter((id) =>
        availableTingkatanIds.includes(id)
      );

      const buildOptions = () =>
        specificTingkatanIds.map((tid) => {
          const sets = allSets.filter((s) => s.tingkatan_id === tid);
          const grp = groupItems(sets);
          const info = getTingkatanInfo(tid);
          return {
            id: tid,
            label: info.label,
            dbNama: info.name,
            items: grp.items,
            rangkaianGroups: grp.rangkaianGroups,
            locationGroups: grp.locationGroups,
          };
        });

      // ATURAN 1: Cocok persis di database
      const exactMatchSets = allSets.filter((s) => s.tingkatan_id === targetDbTingkatanId);

      if (exactMatchSets.length > 0) {
        selectedSets = exactMatchSets;
        resolvedTingkatanNama = getTingkatanInfo(targetDbTingkatanId).label;
        if (specificTingkatanIds.length > 1) {
          availableTingkatanOptions = buildOptions();
        }
      } else if (specificTingkatanIds.length > 0) {
        // ATURAN 2: Tingkatan yang diminta tidak ada, tapi ada tingkatan spesifik lain di DB
        availableTingkatanOptions = buildOptions();

        if (targetDbTingkatanId === 3 || targetDbTingkatanId === 6) {
          const labels = availableTingkatanOptions.map((o) => o.label).join(' dan ');
          catatanTingkatan = `Tingkat Madya tidak tersedia secara spesifik di pustaka terverifikasi. Kami menyarankan opsi banten tingkat ${labels} yang tersedia.`;
          const fallbackId = specificTingkatanIds[0];
          selectedSets = allSets.filter((s) => s.tingkatan_id === fallbackId);
          resolvedTingkatanNama = getTingkatanInfo(fallbackId).label;
        } else if (targetDbTingkatanId === 4 || targetDbTingkatanId === 7) {
          const labels = availableTingkatanOptions.map((o) => o.label).join(' dan ');
          catatanTingkatan = `Tingkat Utama tidak tersedia secara spesifik di pustaka terverifikasi. Kami menyarankan opsi banten tingkat ${labels} yang tersedia.`;
          const fallbackId = specificTingkatanIds[specificTingkatanIds.length - 1];
          selectedSets = allSets.filter((s) => s.tingkatan_id === fallbackId);
          resolvedTingkatanNama = getTingkatanInfo(fallbackId).label;
        } else {
          const labels = availableTingkatanOptions.map((o) => o.label).join(' dan ');
          catatanTingkatan = `Tingkat Alit tidak tersedia secara spesifik di pustaka terverifikasi. Kami menyarankan opsi banten tingkat ${labels} yang tersedia.`;
          const fallbackId = specificTingkatanIds[0];
          selectedSets = allSets.filter((s) => s.tingkatan_id === fallbackId);
          resolvedTingkatanNama = getTingkatanInfo(fallbackId).label;
        }
      } else if (
        // ATURAN 3: Jika di DB tidak ada tingkatannya, munculkan data banten 'tidak disebutkan' (1 atau 8)
        availableTingkatanIds.includes(1) ||
        availableTingkatanIds.includes(8)
      ) {
        selectedSets = allSets.filter((s) => s.tingkatan_id === 1 || s.tingkatan_id === 8);
        resolvedTingkatanNama = 'Umum / Sederhana';
        catatanTingkatan =
          'Data banten ini berstatus umum / sederhana dan berlaku untuk semua tingkatan upacara.';
      } else {
        // ATURAN 4: Fallback ke tingkatan pertama yang tersedia
        const fallbackId = availableTingkatanIds[0];
        selectedSets = allSets.filter((s) => s.tingkatan_id === fallbackId);
        resolvedTingkatanNama = getTingkatanInfo(fallbackId).label;
        catatanTingkatan = `Tingkat ${tingkatanNama} belum tersedia secara khusus; menampilkan banten tingkat ${resolvedTingkatanNama} yang tercatat.`;
      }

      const grouped = groupItems(selectedSets);

      return {
        upacaraId,
        tingkatanId: selectedSets[0]?.tingkatan_id || tingkatanId,
        tingkatanNama: resolvedTingkatanNama,
        asal: selectedSets[0]?.asal || 'manual',
        status: selectedSets[0]?.status || 'unverified',
        items: grouped.items,
        isFound: grouped.items.length > 0,
        rangkaianGroups: grouped.rangkaianGroups,
        locationGroups: grouped.locationGroups,
        availableTingkatan: availableTingkatanOptions,
        catatanTingkatan,
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

