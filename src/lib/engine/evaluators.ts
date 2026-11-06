import { BalineseDateInfo } from '../calendar/types';

export interface SyaratCriteria {
  grup?: number;
  wewaran_nilai_id?: number | null;
  wuku_id?: number | null;
  sasih_id?: number | null;
  penanggal?: number | null;
  pangelong?: number | null;
  is_purnama?: boolean | null;
  is_tilem?: boolean | null;
}

/**
 * Mengevaluasi satu baris syarat terhadap tanggal Bali.
 * Sesuai CHECK constraint num_nonnulls = 1, setiap baris mewakili satu kriteria.
 */
export function checkSingleSyarat(syarat: SyaratCriteria, dateInfo: BalineseDateInfo): boolean {
  if (syarat.wewaran_nilai_id != null) {
    return dateInfo.wewaranNilaiIds.includes(syarat.wewaran_nilai_id);
  }
  if (syarat.wuku_id != null) {
    return dateInfo.wuku.id === syarat.wuku_id;
  }
  if (syarat.sasih_id != null) {
    return dateInfo.sasih.id === syarat.sasih_id;
  }
  if (syarat.penanggal != null) {
    return dateInfo.penanggal === syarat.penanggal;
  }
  if (syarat.pangelong != null) {
    return dateInfo.pangelong === syarat.pangelong;
  }
  if (syarat.is_purnama != null) {
    return dateInfo.isPurnama === Boolean(syarat.is_purnama);
  }
  if (syarat.is_tilem != null) {
    return dateInfo.isTilem === Boolean(syarat.is_tilem);
  }
  return false;
}

/**
 * Mengevaluasi daftar syarat:
 * - Dalam satu grup = AND (semua syarat dalam grup harus terpenuhi)
 * - Antar grup = OR (cukup minimal satu grup terpenuhi)
 */
export function checkDewasaSyarat(syaratList: SyaratCriteria[], dateInfo: BalineseDateInfo): boolean {
  if (!syaratList || syaratList.length === 0) {
    return false;
  }

  // Kelompokkan syarat berdasarkan grup
  const groupMap = new Map<number, SyaratCriteria[]>();
  for (const s of syaratList) {
    const grup = s.grup ?? 1;
    const existing = groupMap.get(grup) || [];
    existing.push(s);
    groupMap.set(grup, existing);
  }

  // Evaluasi OR antar grup (minimal 1 grup lolos semua syaratnya / AND)
  for (const groupSyarat of groupMap.values()) {
    const groupMatches = groupSyarat.every((syarat) => checkSingleSyarat(syarat, dateInfo));
    if (groupMatches) {
      return true;
    }
  }

  return false;
}

// Alias untuk kecocokan penamaan di AGENTS.md
export const checkList = checkDewasaSyarat;
export const checkKombinasi = checkDewasaSyarat;

