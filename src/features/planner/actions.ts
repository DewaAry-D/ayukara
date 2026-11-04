'use server';

import { UpacaraMatcher, UpacaraMatchItem, IUpacaraMatchRepository } from '@/lib/upacara/UpacaraMatcher';
import { UPACARA_KNOWLEDGE_LIST } from '@/lib/upacara/upacaraKnowledge';
import { RuleRepository } from '@/lib/db/repositories/RuleRepository';
import { getSequelize } from '@/lib/db';
import { createLlmClient } from '@/lib/llm/OpenAiLlmClient';
import { CalendarAdapter } from '@/lib/calendar/CalendarAdapter';
import { OtonanCalculator } from '@/lib/engine/OtonanCalculator';
import { HariRayaResolver, IHariRayaRuleRepository } from '@/lib/engine/HariRayaResolver';
import { HARI_RAYA_RULES_KNOWLEDGE } from '@/lib/engine/hariRayaRulesKnowledge';
import {
  MatchUpacaraActionResult,
  CalculateOtonanActionResult,
  ResolveHariRayaActionResult,
} from './types';

// Fallback master list upacara bila koneksi Neon sedang offline
const HARI_RAYA_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 29, 30, 31, 32, 33]);
const FALLBACK_UPACARA_LIST: UpacaraMatchItem[] = UPACARA_KNOWLEDGE_LIST.map((k) => ({
  id: k.id,
  nama: k.namaResmi,
  alias: k.aliases,
  deskripsi: k.deskripsiBudaya,
  jenis_penentuan:
    HARI_RAYA_IDS.has(k.id) ? 'hari_raya_tetap' : k.id === 23 ? 'otonan' : 'dewasa',
}));

function getRepo(): IUpacaraMatchRepository & IHariRayaRuleRepository {
  try {
    const seq = getSequelize();
    return new RuleRepository({ sequelize: seq });
  } catch (err) {
    console.warn('Gagal menghubungkan ke database Neon, menggunakan memory fallback:', err);
    return {
      async getAllCandidates() {
        return FALLBACK_UPACARA_LIST;
      },
      async getRulesByUpacaraId(id: number) {
        return HARI_RAYA_RULES_KNOWLEDGE.filter((r) => r.upacara_id === id);
      },
    };
  }
}

/**
 * Server Action: Mencocokkan upacara dari input teks pengguna.
 */
export async function matchUpacaraAction(query: string): Promise<MatchUpacaraActionResult> {
  try {
    const trimmed = (query || '').trim();
    if (trimmed.length > 300) {
      return {
        success: false,
        message: 'Input upacara melebihi batas maksimal 300 karakter.',
      };
    }

    if (!trimmed) {
      return {
        success: false,
        message: 'Silakan masukkan nama atau deskripsi upacara.',
      };
    }

    const repo = getRepo();
    const llm = createLlmClient();
    const matcher = new UpacaraMatcher(repo, llm);

    const result = await matcher.match(trimmed);

    return {
      success: true,
      matchType: result.matchType,
      selectedUpacara: result.selectedUpacara,
      candidates: result.candidates,
      message: result.message,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Terjadi kesalahan sistem pencarian.';
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Server Action: Menghitung weton dan jadwal 3 otonan terdekat.
 */
export async function calculateOtonanAction(
  birthDateString: string,
  referenceDateString?: string
): Promise<CalculateOtonanActionResult> {
  try {
    if (!birthDateString) {
      return { success: false, message: 'Tanggal lahir wajib diisi.' };
    }

    const adapter = new CalendarAdapter();
    const calculator = new OtonanCalculator(adapter);

    const birthDate = new Date(birthDateString);
    const refDate = referenceDateString ? new Date(referenceDateString) : new Date();

    const result = calculator.calculate(birthDate, refDate);

    return {
      success: true,
      weton: result.weton,
      wuku: result.wuku,
      otonanList: result.otonanList,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal menghitung jadwal otonan.';
    return { success: false, message: msg };
  }
}

/**
 * Server Action: Mengambil tanggal dan deskripsi hari raya berikutnya.
 */
export async function resolveHariRayaAction(
  upacaraId: number,
  year?: number
): Promise<ResolveHariRayaActionResult> {
  try {
    const adapter = new CalendarAdapter();
    const repo = getRepo();
    const resolver = new HariRayaResolver(adapter, repo);

    const targetYear = year || new Date().getFullYear();
    let result = await resolver.resolveForYear(upacaraId, targetYear, {
      verifiedOnly: false,
    });

    // Fallback ke pangkalan pengetahuan bila database kosong / aturan belum terhubung
    if (!result.isAvailable || result.occurrences.length === 0) {
      const fallbackRepo: IHariRayaRuleRepository = {
        async getRulesByUpacaraId(id: number) {
          return HARI_RAYA_RULES_KNOWLEDGE.filter((r) => r.upacara_id === id);
        },
      };
      const fbResolver = new HariRayaResolver(adapter, fallbackRepo);
      result = await fbResolver.resolveForYear(upacaraId, targetYear, {
        verifiedOnly: false,
      });
    }

    return {
      success: true,
      upacaraId: result.upacaraId,
      year: result.year,
      nextDateString: result.nextDateString,
      occurrences: result.occurrences.map((o) => ({
        dateString: o.dateString,
        weton: o.weton,
        wuku: o.wuku,
        sasih: o.sasih,
        urutanTahun: o.urutanTahun,
        isPast: o.isPast,
      })),
      totalOccurrences: result.totalOccurrences,
      penjelasanPenentuan: result.penjelasanPenentuan,
      penjelasanDetail: result.penjelasanDetail,
      isAvailable: result.isAvailable,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal menentukan tanggal hari raya.';
    return {
      success: false,
      upacaraId,
      year,
      nextDateString: null,
      occurrences: [],
      totalOccurrences: 0,
      penjelasanPenentuan: 'Aturan penentuan belum tersedia',
      penjelasanDetail: 'Aturan penentuan belum tersedia',
      isAvailable: false,
      message: msg,
    };
  }
}

/**
 * Mengambil daftar hari raya tetap untuk tampilan tab Hari Raya.
 */
export async function getHariRayaListAction(): Promise<UpacaraMatchItem[]> {
  try {
    const repo = getRepo();
    const all = await repo.getAllCandidates();
    return all.filter((u) => u.jenis_penentuan === 'hari_raya_tetap');
  } catch {
    return FALLBACK_UPACARA_LIST.filter((u) => u.jenis_penentuan === 'hari_raya_tetap');
  }
}

