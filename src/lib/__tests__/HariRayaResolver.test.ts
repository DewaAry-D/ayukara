import { describe, it, expect } from 'vitest';
import {
  HariRayaResolver,
  HariRayaAturanItem,
  IHariRayaRuleRepository,
} from '@/lib/engine/HariRayaResolver';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';

describe('HariRayaResolver (Fase 2)', () => {
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
});
