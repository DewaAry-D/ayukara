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

export interface HariRayaResolveResult {
  upacaraId: number;
  nextDate: Date | null;
  nextDateString: string | null;
  penjelasanPenentuan: string;
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
   * Menentukan tanggal hari raya berikutnya dan deskripsi penentuannya.
   */
  public async resolveNext(
    upacaraId: number,
    options?: HariRayaResolveOptions
  ): Promise<HariRayaResolveResult> {
    const verifiedOnly = options?.verifiedOnly ?? true;
    const allRules = await this.ruleRepository.getRulesByUpacaraId(upacaraId);

    const rules = verifiedOnly
      ? allRules.filter((r) => r.status === 'verified')
      : allRules;

    if (!rules || rules.length === 0) {
      return {
        upacaraId,
        nextDate: null,
        nextDateString: null,
        penjelasanPenentuan: 'Aturan penentuan belum tersedia',
        isAvailable: false,
      };
    }

    const penjelasan = rules[0].penjelasan_penentuan || 'Aturan penentuan belum tersedia';

    // Tentukan rentang pencarian tanggal
    let startDate: Date;
    let maxDaysToScan = 420; // 420 hari mencakup 2 siklus pawukon (210x2) dan > 1 tahun sasih

    if (options?.year) {
      startDate = new Date(options.year, 0, 1);
      maxDaysToScan = 366;
    } else {
      const ref = options?.referenceDate ? new Date(options.referenceDate) : new Date();
      startDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    }

    const current = new Date(startDate);
    for (let day = 0; day <= maxDaysToScan; day++) {
      const dateInfo = this.calendarAdapter.fromDate(current);
      if (checkDewasaSyarat(rules, dateInfo)) {
        return {
          upacaraId,
          nextDate: new Date(current),
          nextDateString: dateInfo.dateString,
          penjelasanPenentuan: penjelasan,
          isAvailable: true,
        };
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      upacaraId,
      nextDate: null,
      nextDateString: null,
      penjelasanPenentuan: penjelasan,
      isAvailable: false,
    };
  }
}

