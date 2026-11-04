import { CalendarAdapter } from '../calendar/CalendarAdapter';

export interface OtonanOccurrence {
  date: Date;
  dateString: string;
  otonanKe: number;
  isTerdekat: boolean;
  weton: string;
  wuku: string;
}

export interface OtonanResult {
  birthDate: Date;
  birthDateString: string;
  weton: {
    saptawara: string;
    pancawara: string;
    nama: string;
  };
  wuku: string;
  otonanList: OtonanOccurrence[];
}

export class OtonanCalculator {
  private calendarAdapter: CalendarAdapter;

  constructor(calendarAdapter: CalendarAdapter) {
    this.calendarAdapter = calendarAdapter;
  }

  /**
   * Menghitung weton, wuku, dan 3 jadwal otonan terdekat (siklus 210 hari).
   * @param birthDate Tanggal lahir pengguna.
   * @param referenceDate Tanggal acuan pencarian (default: hari ini).
   */
  public calculate(birthDate: Date, referenceDate?: Date): OtonanResult {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const bDate = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    const refDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

    const birthInfo = this.calendarAdapter.fromDate(bDate);
    const saptawara = birthInfo.wewaran.saptawara.nama;
    const pancawara = birthInfo.wewaran.pancawara.nama;
    const wetonNama = `${saptawara} ${pancawara}`;
    const wukuNama = birthInfo.wuku.nama;

    // Siklus pawukon kalender Bali = tepat 210 hari
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const CYCLE_DAYS = 210;

    const diffDays = Math.floor((refDate.getTime() - bDate.getTime()) / MS_PER_DAY);

    // Cari otonan ke-n pertama di mana tanggal otonan >= referenceDate
    // Otonan ke-1 adalah 210 hari setelah lahir (n = 1)
    let nextN = Math.ceil(diffDays / CYCLE_DAYS);
    if (nextN < 1) {
      nextN = 1;
    }

    const otonanList: OtonanOccurrence[] = [];
    for (let i = 0; i < 3; i++) {
      const n = nextN + i;
      const targetTime = bDate.getTime() + n * CYCLE_DAYS * MS_PER_DAY;
      const targetDate = new Date(targetTime);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      otonanList.push({
        date: targetDate,
        dateString,
        otonanKe: n,
        isTerdekat: i === 0,
        weton: wetonNama,
        wuku: wukuNama,
      });
    }

    return {
      birthDate: bDate,
      birthDateString: birthInfo.dateString,
      weton: {
        saptawara,
        pancawara,
        nama: wetonNama,
      },
      wuku: wukuNama,
      otonanList,
    };
  }
}

