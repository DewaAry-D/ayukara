import { describe, it, expect } from 'vitest';
import {
  WarigaRuleEngine,
  WarigaRuleSet,
  RuleHierarchyLevel,
} from '@/lib/engine/WarigaRuleEngine';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';

describe('WarigaRuleEngine (Fase 2)', () => {
  const calendarAdapter = new CalendarAdapter();

  // Test fixtures for rules
  const mockRuleSet: WarigaRuleSet = {
    dewasaList: [
      {
        id: 1,
        nama: 'Kala Rau',
        sifat: 'ala',
        deskripsi: 'Tidak baik untuk upacara pernikahan',
        syarat: [{ grup: 1, wewaran_nilai_id: 24 }], // Anggara
      },
      {
        id: 2,
        nama: 'Subacara',
        sifat: 'ayu',
        deskripsi: 'Baik untuk segala upacara',
        syarat: [{ grup: 1, wuku_id: 11 }], // Dunggulan
      },
      {
        id: 3,
        nama: 'Sasih Ala',
        sifat: 'ala',
        deskripsi: 'Pantangan sasih',
        syarat: [{ grup: 1, sasih_id: 8 }], // Kawolu
      },
    ],
    aturanList: [
      // Rule 1: Kala Rau (wewaran-level) -> larangan for upacara 1
      {
        id: 1,
        dewasa_id: 1,
        upacara_id: 1,
        efek: 'larangan',
        level: RuleHierarchyLevel.WEWARAN,
        status: 'verified',
      },
      // Rule 2: Subacara (wuku-level) -> anjuran for upacara 1
      {
        id: 2,
        dewasa_id: 2,
        upacara_id: 1,
        efek: 'anjuran',
        level: RuleHierarchyLevel.WUKU,
        status: 'verified',
      },
      // Rule 3: Sasih Ala (sasih-level) -> larangan for upacara 1
      {
        id: 3,
        dewasa_id: 3,
        upacara_id: 1,
        efek: 'larangan',
        level: RuleHierarchyLevel.SASIH,
        status: 'verified',
      },
    ],
  };

  it('evaluates active dewasa on a given date', () => {
    const dateInfo = calendarAdapter.fromDate(new Date('2024-02-28'));
    const dynamicRuleSet: WarigaRuleSet = {
      dewasaList: [
        {
          id: 1,
          nama: 'Kala Rau',
          sifat: 'ala',
          deskripsi: 'Tidak baik untuk upacara pernikahan',
          syarat: [{ grup: 1, wewaran_nilai_id: 24 }], // Anggara (Feb 28 is Buda 25)
        },
        {
          id: 2,
          nama: 'Subacara',
          sifat: 'ayu',
          deskripsi: 'Baik untuk segala upacara',
          syarat: [{ grup: 1, wuku_id: dateInfo.wuku.id }], // Matching wuku
        },
        {
          id: 3,
          nama: 'Sasih Ala',
          sifat: 'ala',
          deskripsi: 'Pantangan sasih',
          syarat: [{ grup: 1, sasih_id: dateInfo.sasih.id }], // Matching sasih
        },
      ],
      aturanList: [
        { id: 1, dewasa_id: 1, upacara_id: 1, efek: 'larangan', level: RuleHierarchyLevel.WEWARAN, status: 'verified' },
        { id: 2, dewasa_id: 2, upacara_id: 1, efek: 'anjuran', level: RuleHierarchyLevel.WUKU, status: 'verified' },
        { id: 3, dewasa_id: 3, upacara_id: 1, efek: 'larangan', level: RuleHierarchyLevel.SASIH, status: 'verified' },
      ],
    };

    const engine = new WarigaRuleEngine(dynamicRuleSet);
    const evaluation = engine.evaluate(dateInfo, { upacaraId: 1 });

    expect(evaluation.activeDewasa.map((d) => d.id)).toContain(2); // Subacara active
    expect(evaluation.activeDewasa.map((d) => d.id)).toContain(3); // Sasih Ala active
    expect(evaluation.activeDewasa.map((d) => d.id)).not.toContain(1); // Kala Rau NOT active
  });

  it('enforces hierarchy: wewaran < wuku < sasih (higher level overrides lower)', () => {
    // When Wewaran has larangan but Wuku has anjuran: Wuku (level 2) overrides Wewaran (level 1)
    const engine = new WarigaRuleEngine({
      dewasaList: [
        {
          id: 10,
          nama: 'Wewaran Ala',
          sifat: 'ala',
          syarat: [{ grup: 1, wewaran_nilai_id: 25 }], // Buda
        },
        {
          id: 20,
          nama: 'Wuku Ayu',
          sifat: 'ayu',
          syarat: [{ grup: 1, wuku_id: 11 }], // Dunggulan
        },
      ],
      aturanList: [
        { id: 10, dewasa_id: 10, upacara_id: 1, efek: 'larangan', level: RuleHierarchyLevel.WEWARAN, status: 'verified' },
        { id: 20, dewasa_id: 20, upacara_id: 1, efek: 'anjuran', level: RuleHierarchyLevel.WUKU, status: 'verified' },
      ],
    });

    const dateInfo = calendarAdapter.fromDate(new Date('2024-02-28')); // Buda & Dunggulan
    const result = engine.evaluate(dateInfo, { upacaraId: 1 });

    // Wuku anjuran overrides Wewaran larangan
    expect(result.status).toBe('dianjurkan');
  });

  it('enforces hierarchy: sasih larangan overrides wuku anjuran', () => {
    const dateInfo = calendarAdapter.fromDate(new Date('2024-02-28'));
    const engine = new WarigaRuleEngine({
      dewasaList: [
        {
          id: 20,
          nama: 'Wuku Ayu',
          sifat: 'ayu',
          syarat: [{ grup: 1, wuku_id: dateInfo.wuku.id }],
        },
        {
          id: 30,
          nama: 'Sasih Ala',
          sifat: 'ala',
          syarat: [{ grup: 1, sasih_id: dateInfo.sasih.id }],
        },
      ],
      aturanList: [
        { id: 20, dewasa_id: 20, upacara_id: 1, efek: 'anjuran', level: RuleHierarchyLevel.WUKU, status: 'verified' },
        { id: 30, dewasa_id: 30, upacara_id: 1, efek: 'larangan', level: RuleHierarchyLevel.SASIH, status: 'verified' },
      ],
    });

    const result = engine.evaluate(dateInfo, { upacaraId: 1 });

    // Sasih larangan overrides Wuku anjuran
    expect(result.status).toBe('dilarang');
  });

  it('detects konflik when contradictory rules exist at the same hierarchy level', () => {
    const engine = new WarigaRuleEngine({
      dewasaList: [
        {
          id: 101,
          nama: 'Wuku Ayu',
          sifat: 'ayu',
          syarat: [{ grup: 1, wuku_id: 11 }],
        },
        {
          id: 102,
          nama: 'Wuku Ala',
          sifat: 'ala',
          syarat: [{ grup: 1, wuku_id: 11 }],
        },
      ],
      aturanList: [
        { id: 101, dewasa_id: 101, upacara_id: 1, efek: 'anjuran', level: RuleHierarchyLevel.WUKU, status: 'verified' },
        { id: 102, dewasa_id: 102, upacara_id: 1, efek: 'larangan', level: RuleHierarchyLevel.WUKU, status: 'verified' },
      ],
    });

    const dateInfo = calendarAdapter.fromDate(new Date('2024-02-28'));
    const result = engine.evaluate(dateInfo, { upacaraId: 1 });
    expect(result.status).toBe('konflik');
  });

  it('filters and ranks recommendations across a date range', () => {
    const engine = new WarigaRuleEngine(mockRuleSet);
    const range = calendarAdapter.fromRange(new Date('2024-02-28'), new Date('2024-03-01'));
    const evaluations = engine.evaluateRange(range, { upacaraId: 1 });

    expect(evaluations.length).toBe(3);
    const filtered = engine.filterRecommended(range, { upacaraId: 1 });
    // Filtered dates exclude 'dilarang'
    for (const item of filtered) {
      expect(item.status).not.toBe('dilarang');
    }
  });
});
