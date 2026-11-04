import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';
import { WarigaRuleEngine } from '@/lib/engine/WarigaRuleEngine';
import { getSequelize } from '@/lib/db';
import { RuleRepository } from '@/lib/db/repositories/RuleRepository';
import { BantenRepository } from '@/lib/db/repositories/BantenRepository';
import { BantenResolver, BantenItemResolved } from '@/lib/banten/BantenResolver';
import { calculateTotalPrice, PriceTotalResult } from '@/lib/pricing/PriceEstimator';
import { PriceEntry } from '@/lib/cache/PriceCache';
import { createLlmClient } from '@/lib/llm/OpenAiLlmClient';
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
  prices: Record<number, PriceEntry>;
  totalPrice: PriceTotalResult;
  waktuPengambilanWita: string;
  aiSummary: string;
  citations: Array<{ id: number; title: string; url?: string }>;
}

export async function loadPlanResult(
  rawParams: Record<string, string | undefined>
): Promise<PlanResultData> {
  const tab = (rawParams.tab as 'dewasa' | 'otonan' | 'hari_raya') || 'dewasa';
  const upacaraId = Number(rawParams.upacaraId || 9); // Default Pawiwahan bila kosong
  const upacaraNama = rawParams.upacaraNama || 'Upacara Yadnya';
  const tingkatanId = Number(rawParams.tingkatanId || 2); // Default Madya
  const tingkatanMap: Record<number, string> = { 1: 'Nista', 2: 'Madya', 3: 'Utama' };
  const tingkatanNama = tingkatanMap[tingkatanId] || 'Madya';

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
      recommendations = engine.filterRecommended(range, { upacaraId }).map((res) => ({
        dateString: res.dateInfo.dateString,
        rekomendasi: res.rekomendasi,
        alasan: res.alasan,
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
      recommendations = engine.filterRecommended(range, { upacaraId }).map((res) => ({
        dateString: res.dateInfo.dateString,
        rekomendasi: res.rekomendasi,
        alasan: res.alasan,
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
  } catch {
    bantenItems = [];
  }

  // 3. Estimasi Harga (Strictly di kode)
  const now = new Date();
  const waktuPengambilanWita =
    new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Makassar',
    }).format(now) + ' WITA';

  const prices: Record<number, PriceEntry> = {};
  const priceInputList = bantenItems.map((item) => {
    const entry: PriceEntry = {
      bantenId: item.id,
      hargaMin: null,
      hargaMax: null,
      mataUang: 'IDR',
      urlSumber: item.kutipan?.sumberUrl || null,
      kutipan: item.kutipan?.teks || null,
      fetchedAt: now.toISOString(),
      status: 'tidak_ditemukan',
    };
    prices[item.id] = entry;
    return {
      hargaMin: entry.hargaMin,
      hargaMax: entry.hargaMax,
      jumlah: 1,
      status: entry.status,
    };
  });

  const totalPrice = calculateTotalPrice(priceInputList);

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
      tingkatanNama,
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
      hargaTotal: {
        totalMin: totalPrice.totalMin,
        totalMax: totalPrice.totalMax,
        itemTanpaHargaCount: totalPrice.itemTanpaHargaCount,
      },
    };
    const summaryResult = await writer.generateSummary(summaryInput);
    if (summaryResult && summaryResult.summaryText) {
      aiSummary = summaryResult.summaryText;
      citations = (summaryResult.citations || []).map((c) => ({
        id: c.id,
        title: c.sourceTitle || 'Kutipan Sastra Yadnya',
        url: c.sourceUrl,
      }));
    }
  } catch {
    // Fallback terstruktur jika LLM API offline / mock
    aiSummary = `Rencana upacara ${upacaraNama} (${tingkatanNama}) telah disusun untuk tanggal ${targetDateStr || 'yang dipilih'}. Diperlukan ${bantenItems.length} sarana banten sesuai pedoman upakara yadnya Hindu Bali.`;
  }

  return {
    tab,
    upacaraId,
    upacaraNama,
    tingkatanId,
    tingkatanNama,
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
    prices,
    totalPrice,
    waktuPengambilanWita,
    aiSummary,
    citations,
  };
}
