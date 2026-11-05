import { describe, it, expect } from 'vitest';
import {
  BantenResolver,
  IBantenResolverRepository,
} from '@/lib/banten/BantenResolver';
import { MockSearchClient } from '@/lib/search/MockSearchClient';
import { MockLlmClient } from '@/lib/llm/MockLlmClient';
import { LlmExtractor } from '@/lib/llm/LlmExtractor';
import { QuoteVerifier } from '@/lib/banten/QuoteVerifier';

describe('BantenResolver Orchestration (Fase 3)', () => {
  const verifier = new QuoteVerifier();

  it('returns banten set directly from DB when present (DB first)', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSet(opts) {
        if (opts.upacaraId === 9 && opts.tingkatanId === 1) {
          return {
            id: 1,
            upacara_id: 9,
            tingkatan_id: 1,
            asal: 'manual',
            status: 'unverified',
            items: [
              {
                id: 1,
                banten_id: 1,
                urutan: 1,
                jumlah: '1 soroh',
                grup_alternatif: null,
                banten: { id: 1, nama: 'Pejati' },
                lokasi: { id: 1, nama: 'Pamerjan' },
                kutipan: {
                  id: 10,
                  teks: 'Menggunakan banten Pejati di Pamerjan',
                  sumber: { id: 1, judul: 'Kusuma Dewa', url: null },
                },
              },
            ],
          };
        }
        return null;
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
      async saveFallbackBantenSet() {
        throw new Error('Should not be called when DB hit');
      },
    };

    const mockSearch = new MockSearchClient();
    const mockLlm = new MockLlmClient();
    const extractor = new LlmExtractor(mockLlm, verifier);

    const resolver = new BantenResolver(mockRepo, mockSearch, extractor);
    const result = await resolver.resolve({
      upacaraId: 9,
      tingkatanId: 1,
      upacaraNama: 'Pawiwahan',
      tingkatanNama: 'Nista',
    });

    expect(result.isFound).toBe(true);
    expect(result.asal).toBe('manual');
    expect(result.items.length).toBe(1);
    expect(result.items[0].nama).toBe('Pejati');
    expect(result.items[0].lokasi).toBe('Pamerjan');
    expect(mockSearch.lastQuery).toBeNull(); // Search was NOT called
  });

  it('falls back to web search + LLM extraction when DB has no data', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSet() {
        return null; // DB miss
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
      async saveFallbackBantenSet() {
        // Return dummy saved set
        return {} as unknown;
      },
    };

    const sourceContent = 'Sarana upacara Pawiwahan nista meliputi Banten Pejati dan Canang Sari.';
    const mockSearch = new MockSearchClient([
      {
        url: 'https://babadbali.com/pawiwahan-nista',
        title: 'Pawiwahan Nista Babad Bali',
        content: sourceContent,
      },
    ]);

    const mockLlm = new MockLlmClient({
      mockJson: {
        items: [
          {
            nama: 'Pejati',
            kutipan: 'meliputi Banten Pejati',
            jumlah: 1,
          },
          {
            nama: 'Canang Sari',
            kutipan: 'dan Canang Sari.',
            jumlah: 2,
          },
        ],
      },
    });

    const extractor = new LlmExtractor(mockLlm, verifier);
    const resolver = new BantenResolver(mockRepo, mockSearch, extractor);

    const result = await resolver.resolve({
      upacaraId: 99,
      tingkatanId: 1,
      upacaraNama: 'Upacara Langka',
      tingkatanNama: 'Nista',
    });

    expect(result.isFound).toBe(true);
    expect(result.asal).toBe('internet');
    // Aturan Mutlak #4: Hasil fallback LLM tidak pernah langsung 'verified'
    expect(result.status).toBe('unverified');
    expect(result.items.length).toBe(2);
    expect(result.items[0].nama).toBe('Pejati');
    expect(result.items[1].nama).toBe('Canang Sari');
  });

  it('returns "Data belum tersedia" when both DB and web search find nothing (Aturan Mutlak #1)', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSet() {
        return null;
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
      async saveFallbackBantenSet() {
        return {} as unknown;
      },
    };

    const mockSearch = new MockSearchClient([]); // Search returns empty
    const mockLlm = new MockLlmClient();
    const extractor = new LlmExtractor(mockLlm, verifier);

    const resolver = new BantenResolver(mockRepo, mockSearch, extractor);
    const result = await resolver.resolve({
      upacaraId: 999,
      tingkatanId: 1,
      upacaraNama: 'Upacara Fiktif',
      tingkatanNama: 'Nista',
    });

    expect(result.isFound).toBe(false);
    expect(result.items.length).toBe(0);
    expect(result.message).toBe('Data belum tersedia');
  });

  it('mengembalikan banten berstatus tidak disebutkan (tingkatan_id 1) untuk pilihan tingkatan apapun jika upacara tidak memiliki tingkatan khusus di DB', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSets() {
        return [
          {
            id: 45,
            upacara_id: 24, // Menek Kelih
            tingkatan_id: 1, // 'tidak disebutkan'
            asal: 'manual',
            status: 'unverified',
            tingkatan: { id: 1, nama: 'tidak disebutkan' },
            items: [
              {
                id: 1,
                banten_id: 10,
                urutan: 1,
                banten: { id: 10, nama: 'Daksina' },
                lokasi: { id: 1, nama: 'Arepan Sang Hyang Widhi' },
              },
            ],
          },
        ];
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
    };

    const resolver = new BantenResolver(mockRepo);
    // User memilih tingkatan Madya (tingkatanId: 2)
    const result = await resolver.resolve({
      upacaraId: 24,
      tingkatanId: 2,
      upacaraNama: 'Menek Kelih',
      tingkatanNama: 'Madya',
    });

    expect(result.isFound).toBe(true);
    expect(result.tingkatanNama).toBe('Umum / Sederhana');
    expect(result.items.length).toBe(1);
    expect(result.items[0].nama).toBe('Daksina');
  });

  it('menyarankan opsi Alit dan Utama ketika user memilih Madya namun di DB hanya ada Alit dan Utama', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSets() {
        return [
          {
            id: 32,
            upacara_id: 17, // Pawiwahan
            tingkatan_id: 2, // 'kecil' (Alit)
            asal: 'manual',
            status: 'unverified',
            tingkatan: { id: 2, nama: 'kecil' },
            items: [
              {
                id: 1,
                banten_id: 1,
                urutan: 1,
                banten: { id: 1, nama: 'Pejati Alit' },
                lokasi: { id: 1, nama: 'Sanggah Surya' },
              },
            ],
          },
          {
            id: 33,
            upacara_id: 17,
            tingkatan_id: 4, // 'besar' (Utama)
            asal: 'manual',
            status: 'unverified',
            tingkatan: { id: 4, nama: 'besar' },
            items: [
              {
                id: 2,
                banten_id: 2,
                urutan: 1,
                banten: { id: 2, nama: 'Suci Ageng Utama' },
                lokasi: { id: 1, nama: 'Sanggah Surya' },
              },
            ],
          },
        ];
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
    };

    const resolver = new BantenResolver(mockRepo);
    // User memilih Madya
    const result = await resolver.resolve({
      upacaraId: 17,
      tingkatanId: 2,
      upacaraNama: 'Pawiwahan',
      tingkatanNama: 'Madya',
    });

    expect(result.isFound).toBe(true);
    expect(result.catatanTingkatan).toContain('Madya tidak tersedia secara spesifik');
    expect(result.tingkatanNama).toBe('Alit');
    expect(result.availableTingkatan).toBeDefined();
    expect(result.availableTingkatan?.length).toBe(2);
    expect(result.availableTingkatan?.[0].label).toBe('Alit');
    expect(result.availableTingkatan?.[1].label).toBe('Utama');
  });

  it('menampilkan opsi Alit dan Madya jika upacara memiliki tingkatan Alit dan Madya di DB', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSets() {
        return [
          {
            id: 47,
            upacara_id: 26, // Mawinten
            tingkatan_id: 2,
            asal: 'manual',
            status: 'unverified',
            tingkatan: { id: 2, nama: 'kecil' },
            items: [
              {
                id: 1,
                banten_id: 1,
                urutan: 1,
                banten: { id: 1, nama: 'Pejati Alit Mawinten' },
                lokasi: { id: 1, nama: 'Utama Mandala' },
              },
            ],
          },
          {
            id: 48,
            upacara_id: 26, // Mawinten
            tingkatan_id: 3,
            asal: 'manual',
            status: 'unverified',
            tingkatan: { id: 3, nama: 'menengah' },
            items: [
              {
                id: 2,
                banten_id: 2,
                urutan: 1,
                banten: { id: 2, nama: 'Pejati Madya Mawinten' },
                lokasi: { id: 1, nama: 'Utama Mandala' },
              },
            ],
          },
        ];
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
    };

    const resolver = new BantenResolver(mockRepo);
    // User memilih Madya
    const result = await resolver.resolve({
      upacaraId: 26,
      tingkatanId: 2,
      upacaraNama: 'Mawinten',
      tingkatanNama: 'Madya',
    });

    expect(result.isFound).toBe(true);
    expect(result.tingkatanNama).toBe('Madya');
    expect(result.availableTingkatan).toBeDefined();
    expect(result.availableTingkatan?.length).toBe(2);
    expect(result.availableTingkatan?.[0].label).toBe('Alit');
    expect(result.availableTingkatan?.[1].label).toBe('Madya');
  });

  it('mengelompokkan banten per rangkaian dan per lokasi/tempat jika upacara memiliki rangkaian', async () => {
    const mockRepo: IBantenResolverRepository = {
      async findBantenSets() {
        return [
          {
            id: 18,
            upacara_id: 12,
            tingkatan_id: 1,
            rangkaian_id: 11,
            asal: 'manual',
            status: 'unverified',
            rangkaian: { id: 11, nama: 'Nyikut Karang', urutan: 1 },
            items: [
              {
                id: 101,
                banten_id: 5,
                urutan: 1,
                banten: { id: 5, nama: 'Canang Sari' },
                lokasi: { id: 10, nama: 'Padmasana' },
              },
            ],
          },
          {
            id: 19,
            upacara_id: 12,
            tingkatan_id: 1,
            rangkaian_id: 12,
            asal: 'manual',
            status: 'unverified',
            rangkaian: { id: 12, nama: 'Ngeruak Karang', urutan: 2 },
            items: [
              {
                id: 102,
                banten_id: 8,
                urutan: 1,
                banten: { id: 8, nama: 'Caru Ayam Brumbun' },
                lokasi: { id: 4, nama: 'Sor / Natas' },
              },
            ],
          },
        ];
      },
      async getWhitelistedDomains() {
        return ['babadbali.com'];
      },
    };

    const resolver = new BantenResolver(mockRepo);
    const result = await resolver.resolve({
      upacaraId: 12,
      tingkatanId: 2,
      upacaraNama: 'Melaspas',
      tingkatanNama: 'Madya',
    });

    expect(result.isFound).toBe(true);
    expect(result.rangkaianGroups).toBeDefined();
    expect(result.rangkaianGroups?.length).toBe(2);
    expect(result.rangkaianGroups?.[0].rangkaianNama).toBe('Nyikut Karang');
    expect(result.rangkaianGroups?.[0].locationGroups[0].lokasiNama).toBe('Padmasana');
    expect(result.rangkaianGroups?.[1].rangkaianNama).toBe('Ngeruak Karang');
    expect(result.rangkaianGroups?.[1].locationGroups[0].lokasiNama).toBe('Sor / Natas');
  });
});

