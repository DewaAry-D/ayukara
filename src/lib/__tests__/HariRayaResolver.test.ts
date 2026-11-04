import { describe, it, expect } from 'vitest';
import {
  HariRayaResolver,
  HariRayaAturanItem,
  IHariRayaRuleRepository,
} from '@/lib/engine/HariRayaResolver';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';
import { HARI_RAYA_RULES_KNOWLEDGE } from '@/lib/engine/hariRayaRulesKnowledge';

describe('HariRayaResolver (Fase 2 & Revisi Multi-Jatuhan Pawukon)', () => {
  const calendarAdapter = new CalendarAdapter();

  it('returns "Aturan penentuan belum tersedia" when rules are empty or not verified', async () => {
    const mockRepo: IHariRayaRuleRepository = {
      async getRulesByUpacaraId(_id: number) {
        return [];
      },
    };

    const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
    const result = await resolver.resolveNext(1, { referenceDate: new Date('2026-11-04') });

    expect(result.isAvailable).toBe(false);
    expect(result.nextDate).toBeNull();
    expect(result.penjelasanPenentuan).toBe('Aturan penentuan belum tersedia');
  });

  it('resolves the next date and explanation when verified rules exist', async () => {
    // Galungan: Buda (25) AND Dunggulan (11)
    const galunganRules: HariRayaAturanItem[] = [
      {
        id: 1,
        upacara_id: 3, // Galungan
        grup: 1,
        wewaran_nilai_id: 25, // Buda
        penjelasan_penentuan: 'Jatuh pada Buda Keliwon Dunggulan setiap 210 hari.',
        status: 'verified',
      },
      {
        id: 2,
        upacara_id: 3,
        grup: 1,
        wuku_id: 11, // Dunggulan
        penjelasan_penentuan: 'Jatuh pada Buda Keliwon Dunggulan setiap 210 hari.',
        status: 'verified',
      },
    ];

    const mockRepo: IHariRayaRuleRepository = {
      async getRulesByUpacaraId(id: number) {
        return id === 3 ? galunganRules : [];
      },
    };

    const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
    // Reference date: 2024-02-01 -> Galungan was on 2024-02-28
    const result = await resolver.resolveNext(3, {
      referenceDate: new Date('2024-02-01'),
      verifiedOnly: true,
    });

    expect(result.isAvailable).toBe(true);
    expect(result.nextDateString).toBe('2024-02-28');
    expect(result.penjelasanPenentuan).toBe(
      'Jatuh pada Buda Keliwon Dunggulan setiap 210 hari.'
    );
  });

  it('correctly calculates 2 occurrences of Galungan in 2027 (210-day pawukon cycle)', async () => {
    const mockRepo: IHariRayaRuleRepository = {
      async getRulesByUpacaraId(id: number) {
        return HARI_RAYA_RULES_KNOWLEDGE.filter((r) => r.upacara_id === id);
      },
    };

    const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
    const result = await resolver.resolveForYear(3, 2027, { verifiedOnly: false });

    expect(result.isAvailable).toBe(true);
    expect(result.totalOccurrences).toBe(2);
    expect(result.occurrences.length).toBe(2);

    // Galungan 2027: 13 Jan 2027 dan 11 Ags 2027 (selang 210 hari)
    expect(result.occurrences[0].dateString).toBe('2027-01-13');
    expect(result.occurrences[0].urutanTahun).toBe(1);
    expect(result.occurrences[0].weton).toBe('Buda Keliwon');
    expect(result.occurrences[0].wuku).toBe('Dunggulan');

    expect(result.occurrences[1].dateString).toBe('2027-08-11');
    expect(result.occurrences[1].urutanTahun).toBe(2);
    expect(result.occurrences[1].weton).toBe('Buda Keliwon');
    expect(result.occurrences[1].wuku).toBe('Dunggulan');

    expect(result.penjelasanDetail).toContain('jatuh sebanyak 2 kali');
  });

  it('correctly calculates 1 occurrence of Galungan in 2026', async () => {
    const mockRepo: IHariRayaRuleRepository = {
      async getRulesByUpacaraId(id: number) {
        return HARI_RAYA_RULES_KNOWLEDGE.filter((r) => r.upacara_id === id);
      },
    };

    const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
    const result = await resolver.resolveForYear(3, 2026, { verifiedOnly: false });

    expect(result.isAvailable).toBe(true);
    expect(result.totalOccurrences).toBe(1);
    expect(result.occurrences[0].dateString).toBe('2026-06-17');
    expect(result.penjelasanDetail).toContain('jatuh sebanyak 1 kali');
  });

  it('correctly calculates 2 occurrences of Kuningan in 2027 (10 days after Galungan)', async () => {
    const mockRepo: IHariRayaRuleRepository = {
      async getRulesByUpacaraId(id: number) {
        return HARI_RAYA_RULES_KNOWLEDGE.filter((r) => r.upacara_id === id);
      },
    };

    const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
    const result = await resolver.resolveForYear(4, 2027, { verifiedOnly: false });

    expect(result.isAvailable).toBe(true);
    expect(result.totalOccurrences).toBe(2);
    // Kuningan 2027: 23 Jan 2027 (10 hari setelah 13 Jan) dan 21 Ags 2027 (10 hari setelah 11 Ags)
    expect(result.occurrences[0].dateString).toBe('2027-01-23');
    expect(result.occurrences[0].weton).toBe('Saniscara Keliwon');
    expect(result.occurrences[0].wuku).toBe('Kuningan');

    expect(result.occurrences[1].dateString).toBe('2027-08-21');
    expect(result.occurrences[1].weton).toBe('Saniscara Keliwon');
    expect(result.occurrences[1].wuku).toBe('Kuningan');
  });

  it('resolves Tumpek Landep (Saniscara Kliwon Landep) properly', async () => {
    const mockRepo: IHariRayaRuleRepository = {
      async getRulesByUpacaraId(id: number) {
        return HARI_RAYA_RULES_KNOWLEDGE.filter((r) => r.upacara_id === id);
      },
    };

    const resolver = new HariRayaResolver(calendarAdapter, mockRepo);
    const result = await resolver.resolveForYear(29, 2027, { verifiedOnly: false });

    expect(result.isAvailable).toBe(true);
    expect(result.totalOccurrences).toBeGreaterThanOrEqual(1);
    expect(result.occurrences[0].weton).toBe('Saniscara Keliwon');
    expect(result.occurrences[0].wuku).toBe('Landep');
  });
});
