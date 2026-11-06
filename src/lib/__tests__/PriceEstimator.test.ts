import { describe, it, expect } from 'vitest';
import {
  PriceEstimator,
  calculateTotalPrice,
} from '@/lib/pricing/PriceEstimator';
import { InMemoryPriceCache } from '@/lib/cache/InMemoryPriceCache';
import { getWitaDateString, getWitaEndOfDay } from '@/lib/cache/PriceCache';
import { MockSearchClient } from '@/lib/search/MockSearchClient';
import { MockLlmClient } from '@/lib/llm/MockLlmClient';
import { QuoteVerifier } from '@/lib/banten/QuoteVerifier';

describe('PriceEstimator & Cache (Fase 4)', () => {
  const verifier = new QuoteVerifier();

  describe('WITA Timezone Helpers & Cache Key', () => {
    it('generates correct WITA (Asia/Makassar, UTC+8) date string and end-of-day expireAt', () => {
      // 2026-11-04 00:30 UTC = 2026-11-04 08:30 WITA
      const utcDate = new Date('2026-11-04T00:30:00Z');
      const dateWita = getWitaDateString(utcDate);
      expect(dateWita).toBe('2026-11-04');

      const endOfDay = getWitaEndOfDay(utcDate);
      // End of day in WITA is 23:59:59.999 WITA (15:59:59.999 UTC)
      expect(endOfDay.toISOString()).toContain('T15:59:59');
    });
  });

  describe('calculateTotalPrice (Aturan Mutlak #5: Total Dijumlah di Kode)', () => {
    it('sums min and max prices purely in code, multiplying by quantity', () => {
      const items = [
        {
          bantenId: 1,
          nama: 'Pejati',
          hargaMin: 50000,
          hargaMax: 75000,
          jumlah: 2,
          status: 'ditemukan' as const,
        },
        {
          bantenId: 2,
          nama: 'Canang Sari',
          hargaMin: 2000,
          hargaMax: 3000,
          jumlah: 10,
          status: 'ditemukan' as const,
        },
        {
          bantenId: 3,
          nama: 'Banten Langka',
          hargaMin: null,
          hargaMax: null,
          status: 'tidak_ditemukan' as const,
        },
      ];

      const total = calculateTotalPrice(items);

      // (50000 * 2) + (2000 * 10) = 100000 + 20000 = 120000
      expect(total.totalMin).toBe(120000);
      // (75000 * 2) + (3000 * 10) = 150000 + 30000 = 180000
      expect(total.totalMax).toBe(180000);
      expect(total.itemTanpaHargaCount).toBe(1);
      expect(total.disclaimer).toContain('Harga merupakan estimasi');
    });
  });

  describe('PriceEstimator workflow', () => {
    it('uses cached price when available (Cache Hit)', async () => {
      const cache = new InMemoryPriceCache();
      const mockSearch = new MockSearchClient();
      const mockLlm = new MockLlmClient();

      // Pre-seed cache
      await cache.set(
        1,
        '2026-11-04',
        {
          bantenId: 1,
          hargaMin: 50000,
          hargaMax: 70000,
          mataUang: 'IDR',
          urlSumber: 'https://babadbali.com/harga',
          kutipan: 'Harga pejati sekitar Rp 50.000 sampai Rp 70.000',
          fetchedAt: new Date().toISOString(),
          status: 'ditemukan',
        },
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );

      const estimator = new PriceEstimator(cache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimatePrices([
        { bantenId: 1, nama: 'Pejati', jumlah: 1 },
      ], { tanggalWita: '2026-11-04' });

      expect(result.items[0].hargaMin).toBe(50000);
      expect(result.items[0].hargaMax).toBe(70000);
      expect(mockSearch.lastQuery).toBeNull(); // Search not invoked on cache hit
    });

    it('falls back to live search and verifies price numbers exist in quote', async () => {
      const cache = new InMemoryPriceCache();
      const sourceContent = 'Di Denpasar, kisaran harga banten Pejati berkisar Rp 60000 hingga Rp 80000 per paket.';
      const mockSearch = new MockSearchClient([
        { url: 'https://babadbali.com/harga-banten', title: 'Harga Banten', content: sourceContent },
      ]);

      const mockLlm = new MockLlmClient({
        mockJson: {
          hargaMin: 60000,
          hargaMax: 80000,
          kutipan: 'harga banten Pejati berkisar Rp 60000 hingga Rp 80000 per paket.',
        },
      });

      const estimator = new PriceEstimator(cache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimatePrices([
        { bantenId: 1, nama: 'Pejati', jumlah: 1 },
      ], { tanggalWita: '2026-11-04' });

      expect(result.items[0].status).toBe('ditemukan');
      expect(result.items[0].hargaMin).toBe(60000);
      expect(result.items[0].hargaMax).toBe(80000);

      // Verify cached
      const cached = await cache.get(1, '2026-11-04');
      expect(cached).not.toBeNull();
      expect(cached?.hargaMin).toBe(60000);
    });

    it('rejects hallucinated prices if digits are not in quote or quote not in source', async () => {
      const cache = new InMemoryPriceCache();
      const sourceContent = 'Pejati tersedia di pasar lokal.';
      const mockSearch = new MockSearchClient([
        { url: 'https://babadbali.com/info', title: 'Info', content: sourceContent },
      ]);

      const mockLlm = new MockLlmClient({
        mockJson: {
          hargaMin: 100000, // Halusinasi: angka 100000 tidak ada di sumber
          hargaMax: 150000,
          kutipan: 'Harga Pejati 100000 sampai 150000',
        },
      });

      const estimator = new PriceEstimator(cache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimatePrices([
        { bantenId: 2, nama: 'Pejati', jumlah: 1 },
      ], { tanggalWita: '2026-11-04' });

      // Harus menjadi 'tidak_ditemukan' karena verifikasi angka gagal
      expect(result.items[0].status).toBe('tidak_ditemukan');
      expect(result.items[0].hargaMin).toBeNull();
    });

    it('gracefully handles cache errors by continuing live search', async () => {
      const failingCache = {
        async get(): Promise<never> {
          throw new Error('Redis connection timeout');
        },
        async set(): Promise<never> {
          throw new Error('Redis connection timeout');
        },
      };

      const sourceContent = 'Harga Canang adalah Rp 5000 per bungkus.';
      const mockSearch = new MockSearchClient([
        { url: 'https://babadbali.com/canang', title: 'Canang', content: sourceContent },
      ]);

      const mockLlm = new MockLlmClient({
        mockJson: {
          hargaMin: 5000,
          hargaMax: 5000,
          kutipan: 'Harga Canang adalah Rp 5000 per bungkus.',
        },
      });

      const estimator = new PriceEstimator(failingCache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimatePrices([
        { bantenId: 5, nama: 'Canang', jumlah: 2 },
      ], { tanggalWita: '2026-11-04' });

      expect(result.items[0].status).toBe('ditemukan');
      expect(result.items[0].hargaMin).toBe(5000);
      expect(result.total.totalMin).toBe(10000);
    });

    it('mengestimasi harga paket upacara langsung dari nama upacara dan tingkatan jika ditemukan di web', async () => {
      const cache = new InMemoryPriceCache();
      const sourceContent =
        'Untuk upacara Melaspas Bangunan tingkat Madya di Bali, estimasi paket banten berkisar Rp 2500000 hingga Rp 4000000 tergantung kelengkapan.';
      const mockSearch = new MockSearchClient([
        {
          url: 'https://babadbali.com/paket-melaspas',
          title: 'Paket Melaspas',
          content: sourceContent,
        },
      ]);

      const mockLlm = new MockLlmClient({
        mockJson: {
          hargaMin: 2500000,
          hargaMax: 4000000,
          kutipan:
            'estimasi paket banten berkisar Rp 2500000 hingga Rp 4000000 tergantung kelengkapan.',
          catatan: 'Paket banten madya lengkap',
        },
      });

      const estimator = new PriceEstimator(cache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimateCeremonyPackagePrice(
        {
          upacaraId: 17,
          upacaraNama: 'Melaspas Bangunan',
          tingkatanId: 2,
          tingkatanNama: 'Madya',
        },
        { tanggalWita: '2026-11-05' }
      );

      expect(result.status).toBe('ditemukan');
      expect(result.hargaMin).toBe(2500000);
      expect(result.hargaMax).toBe(4000000);
      expect(result.urlSumber).toBe('https://babadbali.com/paket-melaspas');
      expect(result.catatan).toBe('Paket banten madya lengkap');

      // Verify cached with package key
      const cached = await cache.get('paket:17:madya', '2026-11-05');
      expect(cached).not.toBeNull();
      expect(cached?.hargaMin).toBe(2500000);
    });

    it('menerima hasil sintesis estimasi harga paket upacara dari LLM dan penelusuran web', async () => {
      const cache = new InMemoryPriceCache();
      const sourceContent = 'Paket upacara otonan tersedia lengkap.';
      const mockSearch = new MockSearchClient([
        {
          url: 'https://babadbali.com/otonan',
          title: 'Otonan',
          content: sourceContent,
        },
      ]);

      const mockLlm = new MockLlmClient({
        mockJson: {
          hargaMin: 1500000,
          hargaMax: 2000000,
          kutipan: 'Paket upacara otonan tersedia lengkap.',
        },
      });

      const estimator = new PriceEstimator(cache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimateCeremonyPackagePrice(
        {
          upacaraId: 23,
          upacaraNama: 'Otonan',
          tingkatanNama: 'Alit',
        },
        { tanggalWita: '2026-11-05' }
      );

      expect(result.status).toBe('ditemukan');
      expect(result.hargaMin).toBe(1500000);
      expect(result.hargaMax).toBe(2000000);
    });

    it('mendukung ekstraksi angka harga dalam bentuk teks juta dan ribu dari kutipan', async () => {
      const cache = new InMemoryPriceCache();
      const sourceContent =
        'Biaya paket banten pawiwahan madya berkisar 3,5 juta sampai 6 juta rupiah di Denpasar.';
      const mockSearch = new MockSearchClient([
        {
          url: 'https://babadbali.com/pawiwahan-madya',
          title: 'Pawiwahan Madya',
          content: sourceContent,
        },
      ]);

      const mockLlm = new MockLlmClient({
        mockJson: {
          hargaMin: 3500000,
          hargaMax: 6000000,
          kutipan: 'Biaya paket banten pawiwahan madya berkisar 3,5 juta sampai 6 juta rupiah di Denpasar.',
          urlSumber: 'https://babadbali.com/pawiwahan-madya',
        },
      });

      const estimator = new PriceEstimator(cache, mockSearch, mockLlm, verifier);
      const result = await estimator.estimateCeremonyPackagePrice(
        {
          upacaraId: 9,
          upacaraNama: 'Pawiwahan',
          tingkatanNama: 'Madya',
        },
        { tanggalWita: '2026-11-05' }
      );

      expect(result.status).toBe('ditemukan');
      expect(result.hargaMin).toBe(3500000);
      expect(result.hargaMax).toBe(6000000);
      expect(result.urlSumber).toBe('https://babadbali.com/pawiwahan-madya');
    });
  });
});
