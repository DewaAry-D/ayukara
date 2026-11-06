import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';
import { WarigaRuleEngine } from '@/lib/engine/WarigaRuleEngine';
import { getSequelize } from '@/lib/db';
import { RuleRepository } from '@/lib/db/repositories/RuleRepository';
import { BantenRepository } from '@/lib/db/repositories/BantenRepository';
import {
  BantenResolver,
  BantenItemResolved,
  BantenRangkaianGroup,
  BantenLocationGroup,
  TingkatanOptionResolved,
} from '@/lib/banten/BantenResolver';
import {
  PriceEstimator,
  CeremonyPackagePriceResult,
  PriceTotalResult,
} from '@/lib/pricing/PriceEstimator';
import { PriceEntry } from '@/lib/cache/PriceCache';
import { getPriceCache } from '@/lib/cache/createPriceCache';
import { createSearchClient } from '@/lib/search/createSearchClient';
import { createLlmClient } from '@/lib/llm/OpenAiLlmClient';
import { QuoteVerifier } from '@/lib/banten/QuoteVerifier';
import { SummaryWriter, SummaryPlanInput } from '@/lib/summary/SummaryWriter';
import { RecommendedDateView } from './components/DateSection';

export interface PlanResultData {
  tab: 'dewasa' | 'otonan' | 'hari_raya';
  upacaraId: number;
  upacaraNama: string;
  tingkatanId: number;
  tingkatanNama: string;
  // Dewasa
  fromDate?: string;
  toDate?: string;
  recommendations: RecommendedDateView[];
  // Otonan
  personName?: string;
  birthDate?: string;
  selectedOtonanDate?: string;
  weton?: string;
  wuku?: string;
  // Hari Raya
  year?: string;
  targetDate?: string;
  penjelasanPenentuan?: string;
  // Banten, Pricing, Summary
  bantenItems: BantenItemResolved[];
  rangkaianGroups?: BantenRangkaianGroup[];
  locationGroups?: BantenLocationGroup[];
  availableTingkatan?: TingkatanOptionResolved[];
  catatanTingkatan?: string;
  prices: Record<number, PriceEntry>;
  totalPrice: PriceTotalResult;
  packagePrice?: CeremonyPackagePriceResult;
  waktuPengambilanWita: string;
  aiSummary: string;
  citations: Array<{ id: number; title: string; url?: string }>;
}

// Pemetaan kategori yadnya untuk upacara (Dewa=1, Pitra=2, Manusa=3, Bhuta=4)
const UPACARA_KATEGORI_MAP: Record<number, number> = {
  // Dewa Yadnya (1)
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1,
  29: 1, 30: 1, 31: 1, 32: 1, 33: 1, 34: 1,
  // Pitra Yadnya (2)
  13: 2, 14: 2, 15: 2, 16: 2,
  // Manusa Yadnya (3)
  17: 3, 18: 3, 19: 3, 20: 3, 21: 3, 22: 3, 23: 3, 24: 3, 25: 3, 26: 3,
  // Bhuta Yadnya (4)
  27: 4, 28: 4, 35: 4, 36: 4, 37: 4, 38: 4, 39: 4, 40: 4, 41: 4,
};

export async function loadPlanResult(
  rawParams: Record<string, string | undefined>
): Promise<PlanResultData> {
  const tab = (rawParams.tab as 'dewasa' | 'otonan' | 'hari_raya') || 'dewasa';
  const upacaraId = Number(rawParams.upacaraId || 9); // Default Pawiwahan bila kosong
  const upacaraNama = rawParams.upacaraNama || 'Upacara Yadnya';
  const tingkatanId = Number(rawParams.tingkatanId || 2); // Default Madya
  const tingkatanMap: Record<number, string> = { 1: 'Nista', 2: 'Madya', 3: 'Utama' };
  const tingkatanNama = tingkatanMap[tingkatanId] || 'Madya';
  const kategoriYadnyaId =
    (rawParams.kategoriYadnyaId ? Number(rawParams.kategoriYadnyaId) : undefined) ||
    UPACARA_KATEGORI_MAP[upacaraId] ||
    3;
  const evalTarget = { upacaraId, upacaraNama, kategoriYadnyaId };

  const calendarAdapter = new CalendarAdapter();
  let recommendations: RecommendedDateView[] = [];

  // 1. Evaluasi Tanggal
  if (tab === 'dewasa') {
    const fromDate = rawParams.fromDate || new Date().toISOString().split('T')[0];
    const toDate =
      rawParams.toDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const seq = getSequelize();
      const ruleRepo = new RuleRepository({ sequelize: seq });
      const warigaRuleSet = await ruleRepo.getWarigaRuleSet();
      const engine = new WarigaRuleEngine(warigaRuleSet);
      const range = calendarAdapter.fromRange(new Date(fromDate), new Date(toDate));
      recommendations = engine.filterRecommended(range, evalTarget).map((res) => ({
        dateString: res.dateInfo.dateString,
        rekomendasi: res.rekomendasi,
        isTopRecommendation: res.rekomendasi === 'paling_disarankan',
        alasan: res.alasan,
        aturanKutipan: res.aturanKutipan,
        dateInfo: {
          wewaran: {
            saptawara: res.dateInfo.wewaran.saptawara.nama,
            pancawara: res.dateInfo.wewaran.pancawara.nama,
          },
          wuku: {
            nama: res.dateInfo.wuku.nama,
          },
          sasih: {
            nama: res.dateInfo.sasih.nama,
          },
        },
      }));
    } catch {
      // Fallback bila DB offline
      const engine = new WarigaRuleEngine({ dewasaList: [], aturanList: [] });
      const range = calendarAdapter.fromRange(new Date(fromDate), new Date(toDate));
      recommendations = engine.filterRecommended(range, evalTarget).map((res) => ({
        dateString: res.dateInfo.dateString,
        rekomendasi: res.rekomendasi,
        isTopRecommendation: res.rekomendasi === 'paling_disarankan',
        alasan: res.alasan,
        aturanKutipan: res.aturanKutipan,
        dateInfo: {
          wewaran: {
            saptawara: res.dateInfo.wewaran.saptawara.nama,
            pancawara: res.dateInfo.wewaran.pancawara.nama,
          },
          wuku: {
            nama: res.dateInfo.wuku.nama,
          },
          sasih: {
            nama: res.dateInfo.sasih.nama,
          },
        },
      }));
    }
  }

  // 2. Ambil Banten dari DB Repository
  let bantenItems: BantenItemResolved[] = [];
  let rangkaianGroups: BantenRangkaianGroup[] | undefined = undefined;
  let locationGroups: BantenLocationGroup[] | undefined = undefined;
  let availableTingkatan: TingkatanOptionResolved[] | undefined = undefined;
  let catatanTingkatan: string | undefined = undefined;
  let finalTingkatanNama = tingkatanNama;

  try {
    const seq = getSequelize();
    const bantenRepo = new BantenRepository({ sequelize: seq });
    const resolver = new BantenResolver(bantenRepo);
    const resolvedSet = await resolver.resolve({
      upacaraId,
      tingkatanId,
      upacaraNama,
      tingkatanNama,
    });
    bantenItems = resolvedSet.items;
    rangkaianGroups = resolvedSet.rangkaianGroups;
    locationGroups = resolvedSet.locationGroups;
    availableTingkatan = resolvedSet.availableTingkatan;
    catatanTingkatan = resolvedSet.catatanTingkatan;
    if (resolvedSet.tingkatanNama) {
      finalTingkatanNama = resolvedSet.tingkatanNama;
    }
  } catch {
    bantenItems = [];
  }

  // 3. Estimasi Harga Paket Upacara (Bukan per item, tapi langsung nama upacara + tingkatan)
  const now = new Date();
  const waktuPengambilanWita =
    new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Makassar',
    }).format(now) + ' WITA';

  const prices: Record<number, PriceEntry> = {};
  let packagePrice: CeremonyPackagePriceResult | undefined = undefined;
  let totalPrice: PriceTotalResult = {
    totalMin: 0,
    totalMax: 0,
    mataUang: 'IDR',
    itemTanpaHargaCount: bantenItems.length,
    disclaimer:
      'Harga merupakan estimasi paket upacara dan dapat berbeda tergantung harga bahan dan daerah.',
  };

  try {
    const cache = getPriceCache();
    const searchClient = createSearchClient();
    const llmClient = createLlmClient();
    const verifier = new QuoteVerifier();
    const estimator = new PriceEstimator(cache, searchClient, llmClient, verifier);

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('[Ayukara resultLoader] Estimasi harga paket melebihi batas waktu SSR 8 detik.');
        resolve(null);
      }, 8000)
    );

    const priceResult = await Promise.race([
      estimator.estimateCeremonyPackagePrice({
        upacaraId,
        upacaraNama,
        tingkatanId,
        tingkatanNama: finalTingkatanNama,
      }),
      timeoutPromise,
    ]);

    if (priceResult) {
      packagePrice = priceResult;
      if (packagePrice.status === 'ditemukan' && packagePrice.hargaMin != null) {
        totalPrice = {
          totalMin: packagePrice.hargaMin,
          totalMax: packagePrice.hargaMax ?? packagePrice.hargaMin,
          mataUang: 'IDR',
          itemTanpaHargaCount: 0,
          disclaimer: packagePrice.disclaimer,
        };
      }
    }
  } catch (err) {
    console.warn('Gagal memuat estimasi harga paket upacara:', err);
  }

  // 4. Ringkasan AI Terstruktur (Grounding)
  let targetDateStr = '';
  let dateDescription = '';
  if (tab === 'dewasa') {
    targetDateStr = recommendations.length > 0 ? recommendations[0].dateString : rawParams.fromDate || '';
    dateDescription =
      recommendations.length > 0
        ? `Hari baik yang paling disarankan adalah ${recommendations[0].dateString} (${recommendations[0].alasan.join(', ')})`
        : 'Tidak ada hari baik yang memenuhi syarat penuh dalam rentang waktu yang dipilih.';
  } else if (tab === 'otonan') {
    targetDateStr = rawParams.selectedOtonanDate || rawParams.birthDate || '';
    dateDescription = `Peringatan otonan pada tanggal ${rawParams.selectedOtonanDate || '-'} dengan weton ${rawParams.weton || '-'} dan wuku ${rawParams.wuku || '-'}.`;
  } else {
    targetDateStr = rawParams.targetDate || '';
    dateDescription = `Jadwal hari raya ${upacaraNama} pada tanggal ${rawParams.targetDate || 'belum tersedia'} (${rawParams.penjelasanPenentuan || 'aturan belum tersedia'}).`;
  }

  let aiSummary = `Rencana upacara ${upacaraNama} (${tingkatanNama}) disusun dengan ${bantenItems.length} macam banten upakara berdasarkan pangkalan data terverifikasi Ayukara.`;
  let citations: Array<{ id: number; title: string; url?: string }> = [];

  try {
    const llm = createLlmClient();
    const writer = new SummaryWriter(llm);
    const summaryInput: SummaryPlanInput = {
      upacaraNama,
      tingkatanNama: finalTingkatanNama,
      tanggalInfo: {
        tanggal: targetDateStr,
        keterangan: dateDescription,
      },
      bantenItems: bantenItems.map((b) => ({
        nama: b.nama,
        lokasi: b.lokasi,
        jumlah: b.jumlah,
        kutipan: b.kutipan,
      })),
      rangkaianGroups,
      locationGroups,
      hargaTotal: {
        totalMin: totalPrice.totalMin,
        totalMax: totalPrice.totalMax,
        itemTanpaHargaCount: totalPrice.itemTanpaHargaCount,
      },
    };
    const summaryTimeout = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('[Ayukara resultLoader] Ringkasan AI melebihi batas waktu SSR 8 detik.');
        resolve(null);
      }, 8000)
    );
    const summaryResult = await Promise.race([
      writer.generateSummary(summaryInput),
      summaryTimeout,
    ]);
    if (summaryResult && summaryResult.summaryText) {
      aiSummary = summaryResult.summaryText;
      citations = (summaryResult.citations || []).map((c) => ({
        id: c.id,
        title: c.sourceTitle || 'Kutipan Sastra Yadnya',
        url: c.sourceUrl,
      }));
    }

    if (
      packagePrice?.urlSumber &&
      !citations.some((c) => c.url === packagePrice?.urlSumber)
    ) {
      citations.push({
        id: citations.length + 1,
        title: `Estimasi Biaya Paket ${upacaraNama} (${packagePrice.urlSumber})`,
        url: packagePrice.urlSumber,
      });
    }
  } catch {
    // Fallback terstruktur jika LLM API offline / mock
    aiSummary = `Rencana upacara ${upacaraNama} (${finalTingkatanNama}) telah disusun untuk tanggal ${targetDateStr || 'yang dipilih'}. Diperlukan ${bantenItems.length} sarana banten sesuai pedoman upakara yadnya Hindu Bali.`;
  }

  return {
    tab,
    upacaraId,
    upacaraNama,
    tingkatanId,
    tingkatanNama: finalTingkatanNama,
    fromDate: rawParams.fromDate,
    toDate: rawParams.toDate,
    recommendations,
    personName: rawParams.personName,
    birthDate: rawParams.birthDate,
    selectedOtonanDate: rawParams.selectedOtonanDate,
    weton: rawParams.weton,
    wuku: rawParams.wuku,
    year: rawParams.year,
    targetDate: rawParams.targetDate,
    penjelasanPenentuan: rawParams.penjelasanPenentuan,
    bantenItems,
    rangkaianGroups,
    locationGroups,
    availableTingkatan,
    catatanTingkatan,
    prices,
    totalPrice,
    packagePrice,
    waktuPengambilanWita,
    aiSummary,
    citations,
  };
}
