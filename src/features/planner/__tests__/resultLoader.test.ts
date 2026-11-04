import { describe, it, expect } from 'vitest';
import { loadPlanResult } from '../resultLoader';

describe('resultLoader (FR-P13 Format Hasil Seragam)', () => {
  it('harus memuat hasil perencanaan tab dewasa dengan benar', async () => {
    const result = await loadPlanResult({
      tab: 'dewasa',
      upacaraId: '9',
      upacaraNama: 'Pawiwahan',
      tingkatanId: '2',
      fromDate: '2025-05-01',
      toDate: '2025-05-30',
    });

    expect(result.tab).toBe('dewasa');
    expect(result.upacaraNama).toBe('Pawiwahan');
    expect(result.tingkatanNama).toBe('Madya');
    expect(result.totalPrice).toBeDefined();
    expect(typeof result.totalPrice.totalMin).toBe('number');
    expect(typeof result.totalPrice.totalMax).toBe('number');
    expect(result.aiSummary).toContain('Pawiwahan');
  });

  it('harus memuat hasil perencanaan tab otonan dengan benar', async () => {
    const result = await loadPlanResult({
      tab: 'otonan',
      upacaraId: '23',
      upacaraNama: 'Otonan',
      tingkatanId: '1',
      personName: 'I Made Arya',
      birthDate: '2020-01-01',
      selectedOtonanDate: '2024-06-12',
      weton: 'Buda Umanis',
      wuku: 'Kulantir',
    });

    expect(result.tab).toBe('otonan');
    expect(result.personName).toBe('I Made Arya');
    expect(result.weton).toBe('Buda Umanis');
    expect(result.wuku).toBe('Kulantir');
    expect(result.tingkatanNama).toBe('Nista');
    expect(result.aiSummary).toContain('Otonan');
  });

  it('harus memuat hasil perencanaan tab hari_raya dengan benar', async () => {
    const result = await loadPlanResult({
      tab: 'hari_raya',
      upacaraId: '3',
      upacaraNama: 'Galungan',
      year: '2025',
      targetDate: '2025-04-23',
      penjelasanPenentuan: 'Buda Kliwon Dungulan',
      tingkatanId: '2',
    });

    expect(result.tab).toBe('hari_raya');
    expect(result.upacaraNama).toBe('Galungan');
    expect(result.targetDate).toBe('2025-04-23');
    expect(result.penjelasanPenentuan).toBe('Buda Kliwon Dungulan');
    expect(result.aiSummary).toContain('Galungan');
  });
});
