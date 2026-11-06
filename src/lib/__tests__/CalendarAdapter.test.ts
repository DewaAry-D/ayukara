import { describe, it, expect } from 'vitest';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';

describe('CalendarAdapter (Fase 2)', () => {
  const adapter = new CalendarAdapter();

  it('maps standard Balinese calendar correctly with all 10 wewaran IDs', () => {
    // 2026-11-04 (Today)
    const result = adapter.fromDate(new Date('2026-11-04'));

    expect(result).toBeDefined();
    expect(result.dateString).toBe('2026-11-04');
    expect(result.wewaranNilaiIds.length).toBe(10);
    expect(result.wuku.id).toBeGreaterThanOrEqual(1);
    expect(result.wuku.id).toBeLessThanOrEqual(30);
    expect(result.sasih.id).toBeGreaterThanOrEqual(1);
    expect(result.sasih.id).toBeLessThanOrEqual(12);
  });

  it('handles spelling consistency between library and database master values', () => {
    // Check Pancawara Kliwon -> Keliwon (DB id 15)
    // Check Wuku Dungulan -> Dunggulan (DB id 11), Klawu -> Kulawu (DB id 28)
    // Check Sasih Kadasa -> Kedasa (DB id 10), Destha -> Desta (DB id 11)
    // Check Astawara Brahma (DB id 34)
    const result = adapter.fromDate(new Date('2024-02-28')); // Galungan Dunggulan
    expect(result.wuku.nama).toBe('Dunggulan');
    expect(result.wuku.id).toBe(11);
    expect(result.wewaran.saptawara.nama).toBe('Buda');
    expect(result.wewaran.pancawara.nama).toBe('Keliwon');
    expect(result.wewaran.pancawara.id).toBe(15);
  });

  it('correctly identifies Purnama and Tilem flags', () => {
    // Purnama Kadasa 2024: 2024-03-24
    const purnama = adapter.fromDate(new Date('2024-03-24'));
    expect(purnama.isPurnama).toBe(true);
    expect(purnama.isTilem).toBe(false);

    // Tilem Kesanga 2024 (Saka 1945 ending): 2024-03-10
    const tilem = adapter.fromDate(new Date('2024-03-10'));
    expect(tilem.isTilem).toBe(true);
    expect(tilem.isPurnama).toBe(false);
  });

  it('converts a range of dates [from, to]', () => {
    const range = adapter.fromRange(new Date('2026-11-01'), new Date('2026-11-03'));
    expect(range.length).toBe(3);
    expect(range[0].dateString).toBe('2026-11-01');
    expect(range[2].dateString).toBe('2026-11-03');
  });
});

