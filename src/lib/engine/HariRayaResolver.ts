import { CalendarAdapter } from '../calendar/CalendarAdapter';
import { checkDewasaSyarat, SyaratCriteria } from './evaluators';

export interface HariRayaAturanItem extends SyaratCriteria {
  id: number;
  upacara_id: number;
  grup: number;
  penjelasan_penentuan: string;
  status: 'verified' | 'unverified';
}

export interface IHariRayaRuleRepository {
  getRulesByUpacaraId(upacaraId: number): Promise<HariRayaAturanItem[]>;
}

export interface HariRayaResolveOptions {
  year?: number;
  referenceDate?: Date;
  verifiedOnly?: boolean;
}

export interface HariRayaDateOccurrence {
  date: Date;
  dateString: string;
  weton: string;
  wuku: string;
  sasih: string;
  urutanTahun: number; // 1, 2, dst. dalam tahun tersebut
  isPast: boolean;     // apakah sudah lewat relatif terhadap tanggal acuan
}

export interface HariRayaResolveResult {
  upacaraId: number;
  year: number;
  occurrences: HariRayaDateOccurrence[];
  totalOccurrences: number;
  nextDate: Date | null;
  nextDateString: string | null;
  penjelasanPenentuan: string;
  penjelasanDetail?: string;
  isAvailable: boolean;
}

export class HariRayaResolver {
  private calendarAdapter: CalendarAdapter;
  private ruleRepository: IHariRayaRuleRepository;

  constructor(
    calendarAdapter: CalendarAdapter,
    ruleRepository: IHariRayaRuleRepository
  ) {
    this.calendarAdapter = calendarAdapter;
    this.ruleRepository = ruleRepository;
  }

  /**
   * Menghitung seluruh kemunculan tanggal hari raya dalam satu tahun Masehi,
   * mengakomodasi hari raya pawukon (siklus 210 hari) yang dapat jatuh 2 kali dalam setahun.
   */
  public async resolveForYear(
    upacaraId: number,
    year: number,
    options?: { referenceDate?: Date; verifiedOnly?: boolean }
  ): Promise<HariRayaResolveResult> {
    const verifiedOnly = options?.verifiedOnly ?? true;
    const allRules = await this.ruleRepository.getRulesByUpacaraId(upacaraId);

    const rules = verifiedOnly
      ? allRules.filter((r) => r.status === 'verified')
      : allRules;

    if (!rules || rules.length === 0) {
      return {
        upacaraId,
        year,
        occurrences: [],
        totalOccurrences: 0,
        nextDate: null,
        nextDateString: null,
        penjelasanPenentuan: 'Aturan penentuan belum tersedia',
        penjelasanDetail: 'Aturan penentuan belum tersedia',
        isAvailable: false,
      };
    }

    const rawPenjelasan = rules[0].penjelasan_penentuan || 'Aturan penentuan belum tersedia';

    // Tanggal acuan untuk menentukan apakah jatuhan sudah lewat (isPast)
    const ref = options?.referenceDate ? new Date(options.referenceDate) : new Date();
    const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();

    // Pindai setiap hari dalam tahun yang ditentukan (1 Jan - 31 Des)
    const occurrences: HariRayaDateOccurrence[] = [];
    const current = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    while (current <= endOfYear) {
      const dateInfo = this.calendarAdapter.fromDate(current);
      if (checkDewasaSyarat(rules, dateInfo)) {
        const isPast = current.getTime() < refMidnight;
        const sapta = typeof dateInfo.wewaran.saptawara === 'object' ? dateInfo.wewaran.saptawara.nama : dateInfo.wewaran.saptawara;
        const panca = typeof dateInfo.wewaran.pancawara === 'object' ? dateInfo.wewaran.pancawara.nama : dateInfo.wewaran.pancawara;
        const weton = `${sapta} ${panca}`;

        occurrences.push({
          date: new Date(current),
          dateString: dateInfo.dateString,
          weton,
          wuku: dateInfo.wuku.nama,
          sasih: dateInfo.sasih.nama,
          urutanTahun: occurrences.length + 1,
          isPast,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    // Tentukan tanggal berikutnya / terdekat
    let nextDate: Date | null = null;
    let nextDateString: string | null = null;

    if (occurrences.length > 0) {
      if (year === ref.getFullYear()) {
        // Tahun berjalan: cari yang belum lewat
        const upcoming = occurrences.find((occ) => !occ.isPast);
        if (upcoming) {
          nextDate = upcoming.date;
          nextDateString = upcoming.dateString;
        } else {
          // Bila semua sudah lewat, rujuk jatuhan terakhir di tahun ini
          nextDate = occurrences[occurrences.length - 1].date;
          nextDateString = occurrences[occurrences.length - 1].dateString;
        }
      } else if (year > ref.getFullYear()) {
        // Tahun mendatang: jatuhan pertama
        nextDate = occurrences[0].date;
        nextDateString = occurrences[0].dateString;
      } else {
        // Tahun lampau: jatuhan pertama
        nextDate = occurrences[0].date;
        nextDateString = occurrences[0].dateString;
      }
    }

    // Susun penjelasan detail berdasarkan frekuensi kemunculan
    let penjelasanDetail = rawPenjelasan;
    if (occurrences.length === 2) {
      penjelasanDetail = `${rawPenjelasan} Dalam tahun ${year}, hari raya ini jatuh sebanyak 2 kali (siklus 210 hari Pawukon berulang dua kali dalam satu tahun kalender Masehi).`;
    } else if (occurrences.length === 1) {
      penjelasanDetail = `${rawPenjelasan} Dalam tahun ${year}, hari raya ini jatuh sebanyak 1 kali.`;
    } else if (occurrences.length > 2) {
      penjelasanDetail = `${rawPenjelasan} Dalam tahun ${year}, hari raya ini diperingati secara berkala (${occurrences.length} kali dalam setahun).`;
    }

    return {
      upacaraId,
      year,
      occurrences,
      totalOccurrences: occurrences.length,
      nextDate,
      nextDateString,
      penjelasanPenentuan: rawPenjelasan,
      penjelasanDetail,
      isAvailable: occurrences.length > 0,
    };
  }

  /**
   * Menentukan tanggal hari raya berikutnya dan deskripsi penentuannya.
   */
  public async resolveNext(
    upacaraId: number,
    options?: HariRayaResolveOptions
  ): Promise<HariRayaResolveResult> {
    const year =
      options?.year ??
      (options?.referenceDate
        ? options.referenceDate.getFullYear()
        : new Date().getFullYear());

    return this.resolveForYear(upacaraId, year, options);
  }
}
