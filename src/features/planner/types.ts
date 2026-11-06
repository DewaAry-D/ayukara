import { CandidateResult, UpacaraMatchItem } from '@/lib/upacara/UpacaraMatcher';
import { OtonanOccurrence } from '@/lib/engine/OtonanCalculator';

export type PlannerTabType = 'dewasa' | 'otonan' | 'hari_raya';

export interface TingkatanOption {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string;
}

export interface MatchUpacaraActionResult {
  success: boolean;
  matchType?: 'exact' | 'candidates' | 'not_found';
  selectedUpacara?: UpacaraMatchItem;
  candidates?: CandidateResult[];
  message: string;
}

export interface CalculateOtonanActionResult {
  success: boolean;
  weton?: {
    saptawara: string;
    pancawara: string;
    nama: string;
  };
  wuku?: string;
  otonanList?: OtonanOccurrence[];
  message?: string;
}

export interface ResolveHariRayaActionResult {
  success: boolean;
  upacaraId: number;
  year?: number;
  nextDateString: string | null;
  occurrences?: Array<{
    dateString: string;
    weton: string;
    wuku: string;
    sasih: string;
    urutanTahun: number;
    isPast: boolean;
  }>;
  totalOccurrences?: number;
  penjelasanPenentuan: string;
  penjelasanDetail?: string;
  isAvailable: boolean;
  message?: string;
}

