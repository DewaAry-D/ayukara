import { CalendarAdapter } from '../calendar/CalendarAdapter';
import { BalineseDateInfo } from '../calendar/types';
import {
  WarigaRuleEngine,
  WarigaRuleSet,
  EvaluationTarget,
  DateEvaluationResult,
} from '../engine/WarigaRuleEngine';
import { SuggestedPlan } from './ChatService';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatTanggalIndonesia(d: Date): string {
  const hari = NAMA_HARI[d.getDay()];
  const tgl = d.getDate();
  const bln = NAMA_BULAN[d.getMonth()];
  const thn = d.getFullYear();
  return `${hari}, ${tgl} ${bln} ${thn}`;
}

export interface HolyDayMatch {
  name: string;
  check: (info: BalineseDateInfo) => boolean;
  penjelasan: string;
}

const HOLY_DAYS: HolyDayMatch[] = [
  {
    name: 'Galungan',
    check: (info) =>
      info.wuku.id === 11 &&
      info.wewaran.saptawara.nama === 'Buda' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Dirayakan pada hari Buda Kliwon Dunggulan setiap 210 hari sekali sebagai hari kemenangan Dharma (kebenaran) atas Adharma (kejahatan).',
  },
  {
    name: 'Kuningan',
    check: (info) =>
      info.wuku.id === 12 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Dirayakan 10 hari setelah Galungan, tepatnya pada Saniscara Kliwon Kuningan, memohon berkah perlindungan dan kesejahteraan dari Ida Sang Hyang Widhi dan para Leluhur.',
  },
  {
    name: 'Saraswati',
    check: (info) =>
      info.wuku.id === 30 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      info.wewaran.pancawara.nama === 'Umanis',
    penjelasan:
      'Dirayakan pada Saniscara Umanis Watugunung sebagai pemujaan kehadapan Sang Hyang Aji Saraswati atas penganugerahan ilmu pengetahuan suci.',
  },
  {
    name: 'Pagerwesi',
    check: (info) =>
      info.wuku.id === 1 &&
      info.wewaran.saptawara.nama === 'Buda' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Dirayakan 4 hari setelah Saraswati pada Buda Kliwon Sinta untuk memagari diri dengan keteguhan iman dan memuja Sang Hyang Pramesti Guru.',
  },
  {
    name: 'Siwaratri',
    check: (info) =>
      info.sasih.id === 7 && (info.pangelong === 14 || (info.isTilem && info.pangelong === null)),
    penjelasan:
      'Malam perenungan dosa (Purwaning Tilem Sasih Kapitu) yang dirayakan dengan jagra (berjaga semalaman), memuja Ida Sang Hyang Widhi dalam manifestasi Siwa.',
  },
  {
    name: 'Nyepi (Tahun Baru Saka)',
    check: (info) => info.sasih.id === 10 && info.penanggal === 1,
    penjelasan:
      'Pergantian Tahun Baru Saka pada Pinanggal 1 Sasih Kedasa yang dirayakan dengan Catur Brata Penyepian (Amati Geni, Amati Karya, Amati Lelungan, Amati Lelanguan).',
  },
  {
    name: 'Kajeng Kliwon',
    check: (info) =>
      info.wewaran.triwara.nama === 'Kajeng' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Pertemuan Triwara Kajeng dan Pancawara Kliwon setiap 15 hari sekali untuk persembahan segehan dan menjaga keselarasan bhuana alit serta bhuana agung.',
  },
  {
    name: 'Purnama',
    check: (info) => info.isPurnama === true,
    penjelasan:
      'Bulan purnama penuh, hari suci pemujaan Sang Hyang Candra untuk memohon kesucian dan kerahayuan lahir batin.',
  },
  {
    name: 'Tilem',
    check: (info) => info.isTilem === true,
    penjelasan:
      'Bulan mati (Tilem), hari suci pemujaan Sang Hyang Surya untuk melebur segala mala dan kekotoran rohani.',
  },
  {
    name: 'Tumpek Landep',
    check: (info) =>
      info.wuku.id === 2 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Saniscara Kliwon Landep, pemujaan kehadapan Sang Hyang Pasupati untuk memohon ketajaman budhi (jnana) dan pensucian senjata/sarana ketajaman.',
  },
  {
    name: 'Tumpek Wariga (Uduh/Pengatag)',
    check: (info) =>
      info.wuku.id === 7 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Saniscara Kliwon Wariga, 25 hari sebelum Galungan, memuja Sang Hyang Sangkara sebagai wujud syukur dan doa kesuburan pepohonan/tanaman.',
  },
  {
    name: 'Tumpek Krulut',
    check: (info) =>
      info.wuku.id === 17 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Saniscara Kliwon Krulut, hari kasih sayang Hindu Bali, memuja Sang Hyang Iswara atas keindahan seni suara, gamelan, dan welas asih.',
  },
  {
    name: 'Tumpek Uye (Kandang)',
    check: (info) =>
      info.wuku.id === 22 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Saniscara Kliwon Uye, pemujaan kehadapan Ida Sang Hyang Widhi sebagai pelindung hewan dan satwa sarwa prani.',
  },
  {
    name: 'Tumpek Wayang',
    check: (info) =>
      info.wuku.id === 27 &&
      info.wewaran.saptawara.nama === 'Saniscara' &&
      (info.wewaran.pancawara.nama === 'Keliwon' || info.wewaran.pancawara.nama === 'Kliwon'),
    penjelasan:
      'Saniscara Kliwon Wayang, pemujaan kehadapan Sang Hyang Iswara manifestasi Dewa Siwa / Bhatara Kala untuk pembersihan dan ruwatan kelahiran wuku Wayang.',
  },
];

/**
 * Aturan dasar wariga untuk upacara utama bila database aturan tidak memuatnya
 */
const DEFAULT_CEREMONY_TARGETS = [
  {
    keywords: ['pawiwahan', 'nikah', 'pernikahan', 'kawin', 'wiwaha', 'ijab'],
    target: { upacaraId: 9, upacaraNama: 'Pawiwahan', kategoriYadnyaId: 3 } as EvaluationTarget,
    namaUpacara: 'Pawiwahan (Pernikahan)',
    tab: 'dewasa' as const,
  },
  {
    keywords: ['ngaben', 'pelebon', 'pitra yadnya', 'kremasi', 'memperabukan'],
    target: { upacaraId: 12, upacaraNama: 'Ngaben', kategoriYadnyaId: 2 } as EvaluationTarget,
    namaUpacara: 'Ngaben (Pitra Yadnya)',
    tab: 'dewasa' as const,
  },
  {
    keywords: ['melaspas', 'pelaspas', 'rumah baru', 'bangunan', 'ngelinggihang'],
    target: { upacaraId: 17, upacaraNama: 'Melaspas Bangunan', kategoriYadnyaId: 1 } as EvaluationTarget,
    namaUpacara: 'Melaspas Bangunan',
    tab: 'dewasa' as const,
  },
  {
    keywords: ['metatah', 'potong gigi', 'mesangih', 'mapendes'],
    target: { upacaraId: 10, upacaraNama: 'Metatah / Potong Gigi', kategoriYadnyaId: 3 } as EvaluationTarget,
    namaUpacara: 'Metatah (Potong Gigi)',
    tab: 'dewasa' as const,
  },
  {
    keywords: ['piodalan', 'odalan', 'dewa yadnya'],
    target: { upacaraId: 1, upacaraNama: 'Piodalan', kategoriYadnyaId: 1 } as EvaluationTarget,
    namaUpacara: 'Piodalan / Dewa Yadnya',
    tab: 'dewasa' as const,
  },
];

export class ChatCalendarAdvisor {
  private calendarAdapter: CalendarAdapter;

  constructor(calendarAdapter?: CalendarAdapter) {
    this.calendarAdapter = calendarAdapter || new CalendarAdapter();
  }

  /**
   * Menemukan tanggal jatuhan hari raya berikutnya berdasarkan pertanyaan pengguna
   */
  public findUpcomingHolyDays(query: string, referenceDate: Date = new Date()): string | null {
    const qLower = query.toLowerCase();

    // Cari hari raya yang cocok dengan pertanyaan
    const matchedHolyDays = HOLY_DAYS.filter((h) => {
      const hLower = h.name.toLowerCase();
      if (hLower.includes('galungan') && qLower.includes('galungan')) return true;
      if (hLower.includes('kuningan') && qLower.includes('kuningan')) return true;
      if (hLower.includes('saraswati') && qLower.includes('saraswati')) return true;
      if (hLower.includes('pagerwesi') && qLower.includes('pagerwesi')) return true;
      if (hLower.includes('siwaratri') && qLower.includes('siwaratri')) return true;
      if (hLower.includes('nyepi') && (qLower.includes('nyepi') || qLower.includes('saka'))) return true;
      if (hLower.includes('kajeng kliwon') && qLower.includes('kajeng kliwon')) return true;
      if (hLower.includes('purnama') && qLower.includes('purnama')) return true;
      if (hLower.includes('tilem') && qLower.includes('tilem')) return true;
      if (hLower.includes('landep') && qLower.includes('landep')) return true;
      if (hLower.includes('wariga') && (qLower.includes('wariga') || qLower.includes('uduh') || qLower.includes('pengatag'))) return true;
      if (hLower.includes('krulut') && qLower.includes('krulut')) return true;
      if (hLower.includes('uye') && (qLower.includes('uye') || qLower.includes('kandang'))) return true;
      if (hLower.includes('wayang') && qLower.includes('wayang')) return true;
      return false;
    });

    if (matchedHolyDays.length === 0) {
      return null;
    }

    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);

    const occurrences: Array<{
      name: string;
      date: Date;
      info: BalineseDateInfo;
      penjelasan: string;
    }> = [];

    // Pindai 365 hari ke depan
    for (let i = 0; i <= 365; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const info = this.calendarAdapter.fromDate(cur);

      for (const h of matchedHolyDays) {
        if (h.check(info)) {
          // Maksimal 2 kemunculan per hari raya
          const count = occurrences.filter((o) => o.name === h.name).length;
          if (count < 2) {
            occurrences.push({
              name: h.name,
              date: cur,
              info,
              penjelasan: h.penjelasan,
            });
          }
        }
      }

      // Hentikan jika semua matched sudah dapat 2 kemunculan
      if (occurrences.length >= matchedHolyDays.length * 2) {
        break;
      }
    }

    if (occurrences.length === 0) {
      return null;
    }

    const lines = occurrences.map((occ, idx) => {
      const tglFormat = formatTanggalIndonesia(occ.date);
      const weton = `${occ.info.wewaran.saptawara.nama} ${occ.info.wewaran.pancawara.nama}`;
      const wuku = occ.info.wuku.nama;
      const sasih = occ.info.sasih.nama;
      const saka = occ.info.saka;

      return `${idx + 1}. **${occ.name}**\n   - Tanggal Masehi: ${tglFormat}\n   - Penanggalan Bali: ${weton}, Wuku ${wuku}, Sasih ${sasih} (Tahun Saka ${saka})\n   - Cara Penentuan: ${occ.penjelasan}`;
    });

    return `Berikut adalah hasil perhitungan akurat kalender Bali untuk tanggal hari raya terdekat:\n\n${lines.join('\n\n')}`;
  }

  /**
   * Menghitung rekomendasi hari baik (dewasa ayu) untuk upacara tertentu
   */
  public findCeremonyHariBaik(
    query: string,
    warigaRuleSet?: WarigaRuleSet,
    referenceDate: Date = new Date()
  ): { adviceText: string; suggestedPlan?: SuggestedPlan } | null {
    const qLower = query.toLowerCase();

    // Cek apakah pertanyaan menyangkut "hari baik", "kapan baiknya", "dewasa ayu", "duase", dsb.
    const isAskingHariBaik =
      qLower.includes('hari baik') ||
      qLower.includes('kapan baiknya') ||
      qLower.includes('kapan bagus') ||
      qLower.includes('dewasa ayu') ||
      qLower.includes('dewasa') ||
      qLower.includes('duase') ||
      qLower.includes('duasa') ||
      qLower.includes('tanggal baik') ||
      qLower.includes('waktu baik') ||
      qLower.includes('kapan nikah') ||
      qLower.includes('kapan ngaben') ||
      qLower.includes('kapan melaspas') ||
      qLower.includes('kapan potong gigi');

    if (!isAskingHariBaik) {
      return null;
    }

    // Identifikasi target upacara
    const matchedCeremony = DEFAULT_CEREMONY_TARGETS.find((c) =>
      c.keywords.some((kw) => qLower.includes(kw))
    );

    if (!matchedCeremony) {
      if (qLower.includes('duase') || qLower.includes('dewasa')) {
        const todayInfo = this.calendarAdapter.fromDate(referenceDate);
        const weton = `${todayInfo.wewaran.saptawara.nama} ${todayInfo.wewaran.pancawara.nama}`;
        return {
          adviceText: `Dalam tradisi Hindu Bali, **duase** atau **dewasa ayu** merupakan sistem perhitungan hari baik untuk melangsungkan yadnya maupun aktivitas penting menurut kaidah Lontar Wariga (mempertimbangkan wewaran, wuku, sasih, dan penanggal/pangelong). Penanggalan hari ini bertepatan dengan ${weton}, Wuku ${todayInfo.wuku.nama}, Sasih ${todayInfo.sasih.nama}. Anda dapat menanyakan duase untuk upacara tertentu, seperti *Pawiwahan (nikah)*, *Ngaben*, *Melaspas rumah*, atau *Metatah (potong gigi)*.`,
        };
      }
      return null;
    }

    // Tentukan rentang tanggal
    const startDate = new Date(referenceDate);
    startDate.setHours(0, 0, 0, 0);

    // Jika minta "bulan depan", geser ke awal bulan depan
    if (qLower.includes('bulan depan')) {
      startDate.setMonth(startDate.getMonth() + 1, 1);
    } else {
      // Besok
      startDate.setDate(startDate.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 45); // Rentang 45 hari

    const range = this.calendarAdapter.fromRange(startDate, endDate);

    // Gunakan WarigaRuleEngine
    const ruleSetToUse = warigaRuleSet || { dewasaList: [], aturanList: [] };
    const engine = new WarigaRuleEngine(ruleSetToUse);

    const recommendations = engine.filterRecommended(range, matchedCeremony.target);

    // Ambil hasil rekomendasi (maksimal 4 hari terbaik)
    const combined = recommendations.slice(0, 4);

    let adviceText = '';
    if (combined.length > 0) {
      const dateItems = combined.map((res, i) => {
        const tglStr = formatTanggalIndonesia(res.dateInfo.date);
        const weton = `${res.dateInfo.wewaran.saptawara.nama} ${res.dateInfo.wewaran.pancawara.nama}`;
        const wuku = res.dateInfo.wuku.nama;
        const sasih = res.dateInfo.sasih.nama;
        const statusLabel =
          res.rekomendasi === 'paling_disarankan'
            ? 'Paling Disarankan (Dewasa Ayu Utama)'
            : 'Alternatif Baik';
        const alasanStr =
          res.alasan.length > 0 ? res.alasan.slice(0, 2).join('; ') : 'Mendapat naungan dewasa ayu';

        return `${i + 1}. **${tglStr}** (${statusLabel})\n   - Penanggalan: ${weton}, Wuku ${wuku}, Sasih ${sasih}\n   - Naungan Dewasa Ayu: ${alasanStr}`;
      });

      adviceText = `Berdasarkan perhitungan Wariga Dewasa Ayu untuk upacara **${matchedCeremony.namaUpacara}**, berikut rekomendasi hari baik terdekat:\n\n${dateItems.join('\n\n')}`;
    } else {
      // Jika aturan rule engine tidak menghasilkan hari, gunakan pengetahuan umum kalender
      const candidateDays = range.filter((d) => {
        // Hindari hari yang dianggap rawan (misal wuku wayang untuk upacara pernikahan atau tilem)
        const isBudaOrSukra =
          d.wewaran.saptawara.nama === 'Buda' ||
          d.wewaran.saptawara.nama === 'Sukra' ||
          d.wewaran.saptawara.nama === 'Wraspati';
        const isPancaBaik =
          d.wewaran.pancawara.nama === 'Umanis' || d.wewaran.pancawara.nama === 'Pon';
        return isBudaOrSukra && isPancaBaik && !d.isTilem;
      }).slice(0, 3);

      const items = candidateDays.map((d, i) => {
        const tglStr = formatTanggalIndonesia(d.date);
        const weton = `${d.wewaran.saptawara.nama} ${d.wewaran.pancawara.nama}`;
        return `${i + 1}. **${tglStr}**\n   - Penanggalan: ${weton}, Wuku ${d.wuku.nama}, Sasih ${d.sasih.nama}\n   - Naungan: Hari baik umum berenergi positif (pertemuan wewaran baik)`;
      });

      adviceText = `Berdasarkan kalender Bali untuk upacara **${matchedCeremony.namaUpacara}**, berikut rekomendasi hari baik terdekat yang memiliki konfigurasi wewaran positif:\n\n${items.join('\n\n')}`;
    }

    const suggestedPlan: SuggestedPlan = {
      upacaraId: matchedCeremony.target.upacaraId,
      upacaraNama: matchedCeremony.target.upacaraNama || matchedCeremony.namaUpacara,
      tab: matchedCeremony.tab,
    };

    return { adviceText, suggestedPlan };
  }
}
