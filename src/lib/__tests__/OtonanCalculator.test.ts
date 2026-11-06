import { describe, it, expect } from 'vitest';
import { OtonanCalculator } from '@/lib/engine/OtonanCalculator';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';

describe('OtonanCalculator (Fase 2)', () => {
  const calendarAdapter = new CalendarAdapter();
  const calculator = new OtonanCalculator(calendarAdapter);

  it('calculates birth weton and wuku accurately', () => {
    // 2020-01-01 was Buda (saptawara) Umanis (pancawara) in Wuku Sinta
    const birthDate = new Date('2020-01-01');
    const result = calculator.calculate(birthDate, new Date('2026-11-04'));

    expect(result.weton.saptawara).toBe('Buda');
    expect(result.weton.pancawara).toBe('Umanis');
    expect(result.wuku).toBe('Kulantir');
  });

  it('calculates 3 consecutive otonan occurrences spaced exactly 210 days apart', () => {
    const birthDate = new Date('2020-01-01');
    const referenceDate = new Date('2026-11-04');
    const result = calculator.calculate(birthDate, referenceDate);

    expect(result.otonanList.length).toBe(3);

    const [first, second, third] = result.otonanList;

    // Check 210 days gap (in milliseconds: 210 * 24 * 60 * 60 * 1000 = 18,144,000,000 ms)
    const diff1 = second.date.getTime() - first.date.getTime();
    const diff2 = third.date.getTime() - second.date.getTime();

    expect(Math.round(diff1 / (1000 * 60 * 60 * 24))).toBe(210);
    expect(Math.round(diff2 / (1000 * 60 * 60 * 24))).toBe(210);

    // Each otonan must preserve the same weton and wuku
    for (const otonan of result.otonanList) {
      const info = calendarAdapter.fromDate(otonan.date);
      expect(info.wewaran.saptawara.nama).toBe('Buda');
      expect(info.wewaran.pancawara.nama).toBe('Umanis');
      expect(info.wuku.nama).toBe('Kulantir');
    }
  });

  it('marks the nearest upcoming otonan as Terdekat and labels otonan ke-n', () => {
    const birthDate = new Date('2024-01-01');
    // Reference date right after birth
    const referenceDate = new Date('2024-02-01');
    const result = calculator.calculate(birthDate, referenceDate);

    // The first upcoming otonan after birth is Otonan ke-1 (210 days after 2024-01-01)
    expect(result.otonanList[0].otonanKe).toBe(1);
    expect(result.otonanList[0].isTerdekat).toBe(true);
    expect(result.otonanList[1].otonanKe).toBe(2);
    expect(result.otonanList[1].isTerdekat).toBe(false);
  });
});

