import { describe, it, expect } from 'vitest';
import { checkSingleSyarat, checkDewasaSyarat, SyaratCriteria } from '@/lib/engine/evaluators';
import { BalineseDateInfo } from '@/lib/calendar/types';

describe('Wariga Evaluators (Fase 2)', () => {
  const mockDateInfo: BalineseDateInfo = {
    date: new Date('2024-02-28'),
    dateString: '2024-02-28',
    saka: 1945,
    wuku: { id: 11, nama: 'Dunggulan', urutan: 11 },
    sasih: { id: 8, nama: 'Kawolu', urutan: 8 },
    wewaran: {
      ekawara: { id: 0, nama: '-' },
      dwiwara: { id: 2, nama: 'Menga' },
      triwara: { id: 6, nama: 'Kajeng' },
      caturwara: { id: 8, nama: 'Laba' },
      pancawara: { id: 15, nama: 'Keliwon' },
      sadwara: { id: 19, nama: 'Paniron' },
      saptawara: { id: 25, nama: 'Buda' },
      astawara: { id: 35, nama: 'Kala' },
      sangawara: { id: 41, nama: 'Ogan' },
      dasawara: { id: 54, nama: 'Dewa' },
    },
    wewaranNilaiIds: [2, 6, 8, 15, 19, 25, 35, 41, 54],
    penanggal: 4,
    pangelong: null,
    isPurnama: false,
    isTilem: false,
  };

  describe('checkSingleSyarat', () => {
    it('evaluates wewaran_nilai_id correctly', () => {
      expect(checkSingleSyarat({ wewaran_nilai_id: 15 }, mockDateInfo)).toBe(true);
      expect(checkSingleSyarat({ wewaran_nilai_id: 12 }, mockDateInfo)).toBe(false);
    });

    it('evaluates wuku_id correctly', () => {
      expect(checkSingleSyarat({ wuku_id: 11 }, mockDateInfo)).toBe(true);
      expect(checkSingleSyarat({ wuku_id: 12 }, mockDateInfo)).toBe(false);
    });

    it('evaluates sasih_id correctly', () => {
      expect(checkSingleSyarat({ sasih_id: 8 }, mockDateInfo)).toBe(true);
      expect(checkSingleSyarat({ sasih_id: 9 }, mockDateInfo)).toBe(false);
    });

    it('evaluates penanggal and pangelong correctly', () => {
      expect(checkSingleSyarat({ penanggal: 4 }, mockDateInfo)).toBe(true);
      expect(checkSingleSyarat({ penanggal: 5 }, mockDateInfo)).toBe(false);
      expect(checkSingleSyarat({ pangelong: 4 }, mockDateInfo)).toBe(false);
    });

    it('evaluates is_purnama and is_tilem correctly', () => {
      expect(checkSingleSyarat({ is_purnama: true }, mockDateInfo)).toBe(false);
      expect(checkSingleSyarat({ is_tilem: false }, mockDateInfo)).toBe(true);
    });
  });

  describe('checkDewasaSyarat (AND dalam grup, OR antar grup)', () => {
    it('requires ALL syarat in the same grup to match (AND)', () => {
      // Grup 1: Buda (id 25) AND Keliwon (id 15) -> Both match!
      const matchingGrup: SyaratCriteria[] = [
        { grup: 1, wewaran_nilai_id: 25 },
        { grup: 1, wewaran_nilai_id: 15 },
      ];
      expect(checkDewasaSyarat(matchingGrup, mockDateInfo)).toBe(true);

      // Grup 1: Buda (id 25) AND Umanis (id 11) -> One fails, overall grup fails
      const partiallyFailingGrup: SyaratCriteria[] = [
        { grup: 1, wewaran_nilai_id: 25 },
        { grup: 1, wewaran_nilai_id: 11 },
      ];
      expect(checkDewasaSyarat(partiallyFailingGrup, mockDateInfo)).toBe(false);
    });

    it('matches if AT LEAST ONE grup matches (OR antar grup)', () => {
      // Grup 1: Fails (id 25 & id 11)
      // Grup 2: Matches (wuku 11 & id 15)
      const multipleGroups: SyaratCriteria[] = [
        { grup: 1, wewaran_nilai_id: 25 },
        { grup: 1, wewaran_nilai_id: 11 },
        { grup: 2, wuku_id: 11 },
        { grup: 2, wewaran_nilai_id: 15 },
      ];
      expect(checkDewasaSyarat(multipleGroups, mockDateInfo)).toBe(true);
    });

    it('returns false when no grup matches or syarat list is empty', () => {
      expect(checkDewasaSyarat([], mockDateInfo)).toBe(false);

      const allFailing: SyaratCriteria[] = [
        { grup: 1, wuku_id: 1 },
        { grup: 2, sasih_id: 1 },
      ];
      expect(checkDewasaSyarat(allFailing, mockDateInfo)).toBe(false);
    });
  });
});
