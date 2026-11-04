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
});

