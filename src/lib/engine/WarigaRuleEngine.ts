import { BalineseDateInfo } from '../calendar/types';
import { checkDewasaSyarat, SyaratCriteria } from './evaluators';

export enum RuleHierarchyLevel {
  WEWARAN = 1,
  WUKU = 2,
  SASIH = 3,
}

export interface WarigaDewasa {
  id: number;
  nama: string;
  sifat: 'ayu' | 'ala' | null;
  deskripsi?: string | null;
  syarat: SyaratCriteria[];
}

export interface WarigaAturan {
  id: number;
  dewasa_id: number;
  upacara_id?: number | null;
  kategori_yadnya_id?: number | null;
  efek: 'anjuran' | 'larangan';
  level: RuleHierarchyLevel;
  status?: 'verified' | 'unverified' | 'konflik' | 'rejected';
  kutipan_id?: number | null;
  catatan?: string | null;
}

export interface WarigaRuleSet {
  dewasaList: WarigaDewasa[];
  aturanList: WarigaAturan[];
}

export type EvaluationStatus = 'dianjurkan' | 'dilarang' | 'netral' | 'konflik';
export type RecommendationRank = 'paling_disarankan' | 'alternatif' | 'tidak_disarankan';

export interface DateEvaluationResult {
  dateInfo: BalineseDateInfo;
  activeDewasa: WarigaDewasa[];
  status: EvaluationStatus;
  rekomendasi: RecommendationRank;
  winningLevel?: RuleHierarchyLevel;
  alasan: string[];
}

export class WarigaRuleEngine {
  private ruleSet: WarigaRuleSet;
  private verifiedOnly: boolean;

  constructor(ruleSet: WarigaRuleSet, options?: { verifiedOnly?: boolean }) {
    this.ruleSet = ruleSet;
    this.verifiedOnly = options?.verifiedOnly ?? false;
  }

  /**
   * Mengevaluasi satu tanggal kalender Bali terhadap aturan wariga dan upacara target.
   */
  public evaluate(
    dateInfo: BalineseDateInfo,
    target?: { upacaraId?: number; kategoriYadnyaId?: number }
  ): DateEvaluationResult {
    // 1. Cari seluruh dewasa yang aktif pada tanggal ini
    const activeDewasa = this.ruleSet.dewasaList.filter((dewasa) =>
      checkDewasaSyarat(dewasa.syarat, dateInfo)
    );

    const activeDewasaIds = new Set(activeDewasa.map((d) => d.id));

    // 2. Filter aturan yang relevan dengan upacara dan dewasa yang aktif
    const relevantAturan = this.ruleSet.aturanList.filter((aturan) => {
      if (!activeDewasaIds.has(aturan.dewasa_id)) return false;
      if (this.verifiedOnly && aturan.status !== 'verified') return false;

      // Cek kecocokan upacara / kategori
      const matchUpacara =
        aturan.upacara_id == null ||
        (target?.upacaraId != null && aturan.upacara_id === target.upacaraId);
      const matchKategori =
        aturan.kategori_yadnya_id == null ||
        (target?.kategoriYadnyaId != null && aturan.kategori_yadnya_id === target.kategoriYadnyaId);

      return matchUpacara && matchKategori;
    });

    if (relevantAturan.length === 0) {
      // Tidak ada aturan upacara spesifik yang cocok, evaluasi sifat umum dewasa
      const hasAyu = activeDewasa.some((d) => d.sifat === 'ayu');
      const hasAla = activeDewasa.some((d) => d.sifat === 'ala');

      let status: EvaluationStatus = 'netral';
      if (hasAyu && hasAla) {
        status = 'konflik';
      } else if (hasAyu) {
        status = 'dianjurkan';
      } else if (hasAla) {
        status = 'dilarang';
      }

      const rekomendasi: RecommendationRank =
        status === 'dianjurkan'
          ? 'alternatif'
          : 'tidak_disarankan';

      return {
        dateInfo,
        activeDewasa,
        status,
        rekomendasi,
        alasan: activeDewasa.map((d) => `${d.nama}: ${d.deskripsi || ''}`.trim()),
      };
    }

    // 3. Hierarki wewaran < wuku < sasih: Ambil level aturan tertinggi yang aktif
    const maxLevel = Math.max(...relevantAturan.map((a) => a.level || RuleHierarchyLevel.WEWARAN));
    const highestLevelAturan = relevantAturan.filter((a) => a.level === maxLevel);

    const hasAnjuran = highestLevelAturan.some((a) => a.efek === 'anjuran');
    const hasLarangan = highestLevelAturan.some((a) => a.efek === 'larangan');

    let status: EvaluationStatus;
    if (hasAnjuran && hasLarangan) {
      status = 'konflik';
    } else if (hasLarangan) {
      status = 'dilarang';
    } else if (hasAnjuran) {
      status = 'dianjurkan';
    } else {
      status = 'netral';
    }

    // 4. Ranking strategi:
    // TODO: Nilai aturan ranking akan diisi dengan data tervalidasi dari Cultural Lead
    let rekomendasi: RecommendationRank = 'tidak_disarankan';
    if (status === 'dianjurkan') {
      rekomendasi = maxLevel >= RuleHierarchyLevel.WUKU ? 'paling_disarankan' : 'alternatif';
    } else if (status === 'netral') {
      rekomendasi = 'alternatif';
    }

    const alasan = highestLevelAturan.map((a) => {
      const d = activeDewasa.find((item) => item.id === a.dewasa_id);
      return `${d ? d.nama + ': ' : ''}${a.catatan || (a.efek === 'anjuran' ? 'Dianjurkan' : 'Dilarang')}`;
    });

    return {
      dateInfo,
      activeDewasa,
      status,
      rekomendasi,
      winningLevel: maxLevel,
      alasan,
    };
  }

  /**
   * Mengevaluasi rentang tanggal.
   */
  public evaluateRange(
    range: BalineseDateInfo[],
    target?: { upacaraId?: number; kategoriYadnyaId?: number }
  ): DateEvaluationResult[] {
    return range.map((dateInfo) => this.evaluate(dateInfo, target));
  }

  /**
   * Menyaring dan mengurutkan rekomendasi hari baik:
   * Menyaring tanggal 'dilarang', mengurutkan 'paling_disarankan' lebih dulu kemudian 'alternatif'.
   */
  public filterRecommended(
    range: BalineseDateInfo[],
    target?: { upacaraId?: number; kategoriYadnyaId?: number }
  ): DateEvaluationResult[] {
    const evaluations = this.evaluateRange(range, target);
    const valid = evaluations.filter((res) => res.status !== 'dilarang');

    return valid.sort((a, b) => {
      if (a.rekomendasi === 'paling_disarankan' && b.rekomendasi !== 'paling_disarankan') {
        return -1;
      }
      if (b.rekomendasi === 'paling_disarankan' && a.rekomendasi !== 'paling_disarankan') {
        return 1;
      }
      return 0;
    });
  }
}

