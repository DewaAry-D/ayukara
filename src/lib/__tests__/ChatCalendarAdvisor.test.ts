import { describe, it, expect } from 'vitest';
import { ChatCalendarAdvisor, formatTanggalIndonesia } from '../chat/ChatCalendarAdvisor';
import { CalendarAdapter } from '../calendar/CalendarAdapter';

describe('ChatCalendarAdvisor (Penanggalan Hari Raya & Dewasa Ayu Chat AI)', () => {
  const adapter = new CalendarAdapter();
  const advisor = new ChatCalendarAdvisor(adapter);

  it('memformat tanggal Indonesia dengan hari dan bulan yang benar', () => {
    const d = new Date(2026, 3, 29); // 29 April 2026
    const str = formatTanggalIndonesia(d);
    expect(str).toContain('Rabu');
    expect(str).toContain('29 April 2026');
  });

  it('mendeteksi dan menghitung tanggal hari raya Galungan terdekat', () => {
    // Acuan awal tahun 2026
    const ref = new Date('2026-01-01');
    const result = advisor.findUpcomingHolyDays('Kapan hari raya Galungan tahun ini?', ref);

    expect(result).not.toBeNull();
    expect(result).toContain('Galungan');
    expect(result).toContain('Buda');
    expect(result).toContain('Wuku Dunggulan');
  });

  it('mendeteksi dan menghitung tanggal hari raya Nyepi (Tahun Baru Saka)', () => {
    const ref = new Date('2026-01-01');
    const result = advisor.findUpcomingHolyDays('Kapan hari raya Nyepi?', ref);

    expect(result).not.toBeNull();
    expect(result).toContain('Nyepi');
    expect(result).toContain('Kedasa');
  });

  it('mendeteksi dan menghitung tanggal hari raya Kuningan', () => {
    const ref = new Date('2026-01-01');
    const result = advisor.findUpcomingHolyDays('Kapan Kuningan berikutnya?', ref);

    expect(result).not.toBeNull();
    expect(result).toContain('Kuningan');
    expect(result).toContain('Saniscara');
  });

  it('mendeteksi dan menghitung tanggal Purnama dan Tilem terdekat', () => {
    const ref = new Date('2026-05-01');
    const resultPurnama = advisor.findUpcomingHolyDays('Kapan purnama berikutnya?', ref);
    expect(resultPurnama).not.toBeNull();
    expect(resultPurnama).toContain('Purnama');

    const resultTilem = advisor.findUpcomingHolyDays('Kapan tilem terdekat?', ref);
    expect(resultTilem).not.toBeNull();
    expect(resultTilem).toContain('Tilem');
  });

  it('mengembalikan null jika pertanyaan tidak menanyakan hari raya tertentu', () => {
    const result = advisor.findUpcomingHolyDays('Apa itu banten pejati?');
    expect(result).toBeNull();
  });

  it('menghitung rekomendasi hari baik upacara pernikahan / pawiwahan', () => {
    const ref = new Date('2026-05-01');
    const result = advisor.findCeremonyHariBaik('Kapan baiknya upacara pernikahan atau pawiwahan?', undefined, ref);

    expect(result).not.toBeNull();
    expect(result?.adviceText).toContain('Pawiwahan');
    expect(result?.adviceText).toContain('Penanggalan');
    expect(result?.suggestedPlan).toBeDefined();
    expect(result?.suggestedPlan?.upacaraNama).toContain('Pawiwahan');
    expect(result?.suggestedPlan?.tab).toBe('dewasa');
  });

  it('menghitung rekomendasi hari baik untuk upacara ngaben dan melaspas', () => {
    const ref = new Date('2026-06-01');
    const resNgaben = advisor.findCeremonyHariBaik('Kapan hari baik untuk ngaben?', undefined, ref);
    expect(resNgaben).not.toBeNull();
    expect(resNgaben?.adviceText).toContain('Ngaben');
    expect(resNgaben?.suggestedPlan?.upacaraNama).toContain('Ngaben');

    const resMelaspas = advisor.findCeremonyHariBaik('Kapan dewasa ayu melaspas rumah bulan depan?', undefined, ref);
    expect(resMelaspas).not.toBeNull();
    expect(resMelaspas?.adviceText).toContain('Melaspas');
    expect(resMelaspas?.suggestedPlan?.upacaraNama).toContain('Melaspas');
  });

  it('mengembalikan null jika bukan pertanyaan mencari hari baik upacara', () => {
    const result = advisor.findCeremonyHariBaik('Apa arti warna pada banten daksina?');
    expect(result).toBeNull();
  });
});

