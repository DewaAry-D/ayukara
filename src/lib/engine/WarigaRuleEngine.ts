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
  kutipan?: {
    teks: string;
    sumberJudul?: string | null;
    sumberUrl?: string | null;
  } | null;
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
  aturanKutipan?: Array<{
    teks: string;
    sumberJudul?: string;
  }>;
}

export interface EvaluationTarget {
  upacaraId?: number;
  upacaraNama?: string;
  kategoriYadnyaId?: number;
}

function stripOtomatisPrefix(text?: string | null): string {
  if (!text) return '';
  return text.replace(/^otomatis\s+dari\s+teks:\s*/i, '').trim();
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
   * Mengikuti alur resmi rekomendasi dewasa ayu:
   * 1. Mencocokkan syarat penanggalan untuk mendapatkan dewasa yang berlaku.
   * 2. Menyaring aturan upacara / kategori yadnya / global.
   * 3. Jika ada dewasa ala yang dilarang -> Tanggal dibuang (status: dilarang).
   * 4. Jika ada dewasa ayu yang dianjurkan -> Tanggal direkomendasikan + alasan + kutipan.
   * 5. Jika tidak ada anjuran -> Netral / tidak direkomendasikan.
   */
  public evaluate(
    dateInfo: BalineseDateInfo,
    target?: EvaluationTarget
  ): DateEvaluationResult {
    // 1. Cari seluruh dewasa yang aktif pada tanggal ini
    const activeDewasa = this.ruleSet.dewasaList.filter((dewasa) =>
      checkDewasaSyarat(dewasa.syarat, dateInfo)
    );
    const activeDewasaMap = new Map<number, WarigaDewasa>(activeDewasa.map((d) => [d.id, d]));

    // 2. Filter aturan yang relevan dengan upacara dan kategori yang aktif
    const relevantAturan = this.ruleSet.aturanList.filter((aturan) => {
      if (!activeDewasaMap.has(aturan.dewasa_id)) return false;
      if (this.verifiedOnly && aturan.status !== 'verified') return false;

      // Cek kecocokan upacara / kategori:
      // a. Aturan spesifik untuk upacara target
      const matchSpecificUpacara =
        target?.upacaraId != null && aturan.upacara_id === target.upacaraId;
      // b. Aturan untuk kategori yadnya target (upacara_id null)
      const matchKategori =
        aturan.upacara_id == null &&
        target?.kategoriYadnyaId != null &&
        aturan.kategori_yadnya_id === target.kategoriYadnyaId;
      // c. Aturan global yang berlaku untuk semua upacara (upacara_id null dan kategori_yadnya_id null)
      const matchGlobal =
        aturan.upacara_id == null && aturan.kategori_yadnya_id == null;

      return matchSpecificUpacara || matchKategori || matchGlobal;
    });

    // 3. Evaluasi hierarki aturan (Wewaran < Wuku < Sasih)
    let maxLevelAnjuran: RuleHierarchyLevel | 0 = 0;
    let maxLevelLarangan: RuleHierarchyLevel | 0 = 0;
    const anjuranAturans: WarigaAturan[] = [];
    const laranganAturans: WarigaAturan[] = [];

    for (const a of relevantAturan) {
      const level = a.level || RuleHierarchyLevel.WEWARAN;
      if (a.efek === 'anjuran') {
        anjuranAturans.push(a);
        if (level > maxLevelAnjuran) maxLevelAnjuran = level;
      } else if (a.efek === 'larangan') {
        laranganAturans.push(a);
        if (level > maxLevelLarangan) maxLevelLarangan = level;
      }
    }

    // 4. Deteksi apakah ada dewasa ala aktif yang secara spesifik melarang upacara ini
    const upacaraNamaLower = (target?.upacaraNama || '').toLowerCase();

    const alaDewasaProhibited = activeDewasa.filter((d) => {
      if (d.sifat !== 'ala') return false;
      const desc = (d.deskripsi || '').toLowerCase();

      // Larangan global untuk semua upacara / panca yadnya
      if (
        desc.includes('segala yadnya') ||
        desc.includes('semua upacara') ||
        desc.includes('semua macam yadnya') ||
        desc.includes('segala macam yadnya') ||
        desc.includes('segala upacara') ||
        desc.includes('segala jenis upacara') ||
        desc.includes('panca yadnya')
      ) {
        return true;
      }

      // Larangan berdasarkan upacaraNama jika diberikan
      if (upacaraNamaLower && desc.includes(upacaraNamaLower)) {
        return true;
      }

      // Larangan Manusa Yadnya (kategori 3)
      if (
        target?.kategoriYadnyaId === 3 &&
        (desc.includes('manusa yadnya') ||
          desc.includes('wiwaha') ||
          desc.includes('pernikahan') ||
          desc.includes('nikah') ||
          desc.includes('kawin') ||
          desc.includes('mapendes') ||
          desc.includes('potong gigi') ||
          desc.includes('menek kelih') ||
          desc.includes('potong rambut') ||
          desc.includes('magundul') ||
          desc.includes('macukur'))
      ) {
        return true;
      }

      // Larangan Pitra Yadnya (kategori 2)
      if (
        target?.kategoriYadnyaId === 2 &&
        (desc.includes('pitra yadnya') ||
          desc.includes('ngaben') ||
          desc.includes('atiwa-tiwa') ||
          desc.includes('penguburan') ||
          desc.includes('nyekah') ||
          desc.includes('ngasti'))
      ) {
        return true;
      }

      // Larangan Dewa Yadnya (kategori 1)
      if (
        target?.kategoriYadnyaId === 1 &&
        (desc.includes('dewa yadnya') || desc.includes('piodalan'))
      ) {
        return true;
      }

      // Larangan Bhuta Yadnya (kategori 4)
      if (
        target?.kategoriYadnyaId === 4 &&
        (desc.includes('bhuta yadnya') || desc.includes('caru') || desc.includes('pecaruan'))
      ) {
        return true;
      }

      // Larangan spesifik upacara pernikahan (Pawiwahan / Pawidhi Widana, ID 17)
      if (
        (target?.upacaraId === 17 || upacaraNamaLower.includes('pawiwahan') || upacaraNamaLower.includes('pernikahan')) &&
        (desc.includes('pernikahan') || desc.includes('wiwaha') || desc.includes('nikah') || desc.includes('kawin'))
      ) {
        return true;
      }

      // Larangan spesifik upacara bangunan (Melaspas, ID 12)
      if (
        (target?.upacaraId === 12 || upacaraNamaLower.includes('melaspas')) &&
        (desc.includes('membangun rumah') || desc.includes('melaspas') || desc.includes('bangunan'))
      ) {
        return true;
      }

      return false;
    });

    // 5. Tahap Keputusan 1: "Ada dewasa ala yang dilarang?"
    // Jika ada larangan dari aturan eksplisit atau dari dewasa ala yang relevan
    const hasExplicitLarangan = laranganAturans.length > 0;
    const hasSpecificAla = alaDewasaProhibited.length > 0;

    if (hasExplicitLarangan || hasSpecificAla) {
      // Periksa apakah anjuran memiliki level hierarki yang lebih tinggi dari larangan
      // (Wewaran < Wuku < Sasih: aturan level lebih tinggi mengesampingkan yang lebih rendah)
      // HANYA bila tidak ada pantangan keras dewasa ala (misal Salah Wadi / Carik Walangati)
      if (maxLevelAnjuran > maxLevelLarangan && !hasSpecificAla) {
        // Anjuran di level lebih tinggi (misal wuku/sasih) mengesampingkan larangan wewaran
        // Lanjut ke tahap evaluasi anjuran
      } else {
        // Ada dewasa ala yang dilarang -> Tanggal dibuang!
        return {
          dateInfo,
          activeDewasa,
          status: maxLevelAnjuran === maxLevelLarangan && maxLevelAnjuran > 0 ? 'konflik' : 'dilarang',
          rekomendasi: 'tidak_disarankan',
          alasan: [],
          aturanKutipan: [],
        };
      }
    }

    // 6. Tahap Keputusan 2: "Ada dewasa ayu yang dianjurkan?"
    // Kumpulkan seluruh anjuran yang relevan (dari aturan dan dewasa ayu aktif)
    const validAnjurans = anjuranAturans.filter((a) => {
      return a.efek === 'anjuran';
    });

    // Cek juga dewasa ayu aktif yang secara umum atau spesifik menganjurkan upacara ini
    const specificAyuDewasa = activeDewasa.filter((d) => {
      if (d.sifat !== 'ayu') return false;
      const desc = (d.deskripsi || '').toLowerCase();
      if (
        desc.includes('segala upacara') ||
        desc.includes('semua upacara') ||
        desc.includes('panca yadnya') ||
        desc.includes('segala jenis upacara') ||
        desc.includes('melangsungkan segala jenis upacara') ||
        desc.includes('segala pekerjaan')
      ) {
        return true;
      }
      if (upacaraNamaLower && desc.includes(upacaraNamaLower)) {
        return true;
      }
      if (
        target?.kategoriYadnyaId === 3 &&
        (desc.includes('manusa yadnya') ||
          desc.includes('potong gigi') ||
          desc.includes('mapendes') ||
          desc.includes('pernikahan') ||
          desc.includes('wiwaha') ||
          desc.includes('menek kelih') ||
          desc.includes('rare') ||
          desc.includes('potong rambut'))
      ) {
        return true;
      }
      if (
        target?.kategoriYadnyaId === 2 &&
        (desc.includes('pitra yadnya') || desc.includes('memuja leluhur') || desc.includes('ngaben'))
      ) {
        return true;
      }
      if (
        target?.kategoriYadnyaId === 1 &&
        (desc.includes('dewa yadnya') || desc.includes('tempat suci') || desc.includes('piodalan'))
      ) {
        return true;
      }
      if (
        target?.kategoriYadnyaId === 4 &&
        (desc.includes('bhuta yadnya') || desc.includes('caru') || desc.includes('pecaruan'))
      ) {
        return true;
      }
      return false;
    });

    const isRecommended = validAnjurans.length > 0 || specificAyuDewasa.length > 0;

    if (!isRecommended) {
      // Tidak ada anjuran spesifik -> Netral / tidak direkomendasikan
      return {
        dateInfo,
        activeDewasa,
        status: 'netral',
        rekomendasi: 'tidak_disarankan',
        alasan: [],
        aturanKutipan: [],
      };
    }

    // Tanggal DIREKOMENDASIKAN + alasan + kutipan
    const alasanList: string[] = [];
    const kutipanList: Array<{ teks: string; sumberJudul?: string }> = [];
    const usedDewasaIds = new Set<number>();

    // Masukkan anjuran dari aturan terverifikasi di database
    for (const a of validAnjurans) {
      const d = activeDewasaMap.get(a.dewasa_id);
      if (d) {
        usedDewasaIds.add(d.id);
        const teksCatatan =
          stripOtomatisPrefix(a.catatan) ||
          stripOtomatisPrefix(d.deskripsi) ||
          'Hari baik dianjurkan untuk upacara ini';
        alasanList.push(`${d.nama}: ${teksCatatan}`);
      }
      if (a.kutipan && a.kutipan.teks) {
        kutipanList.push({
          teks: stripOtomatisPrefix(a.kutipan.teks),
          sumberJudul: a.kutipan.sumberJudul || 'Kutipan Sastra Wariga',
        });
      }
    }

    // Masukkan anjuran dari dewasa ayu aktif spesifik yang belum masuk
    for (const d of specificAyuDewasa) {
      if (!usedDewasaIds.has(d.id)) {
        usedDewasaIds.add(d.id);
        alasanList.push(
          `${d.nama}: ${stripOtomatisPrefix(d.deskripsi) || 'Hari baik untuk yadnya'}`
        );
      }
      // Ambil kutipan jika ada di aturanList untuk dewasa ini
      const matchingAturan = this.ruleSet.aturanList.find(
        (a) => a.dewasa_id === d.id && a.kutipan?.teks
      );
      if (matchingAturan?.kutipan) {
        kutipanList.push({
          teks: stripOtomatisPrefix(matchingAturan.kutipan.teks),
          sumberJudul: matchingAturan.kutipan.sumberJudul || 'Kutipan Sastra Wariga',
        });
      }
    }

    if (kutipanList.length === 0 && alasanList.length > 0) {
      kutipanList.push({
        teks: alasanList[0],
        sumberJudul: 'Kutipan Sastra Wariga',
      });
    }

    // Tentukan peringkat rekomendasi:
    // Paling disarankan jika didukung aturan Wuku/Sasih (level >= 2) atau memiliki banyak anjuran
    const rekomendasi: RecommendationRank =
      maxLevelAnjuran >= RuleHierarchyLevel.WUKU || alasanList.length >= 2
        ? 'paling_disarankan'
        : 'alternatif';

    return {
      dateInfo,
      activeDewasa,
      status: 'dianjurkan',
      rekomendasi,
      winningLevel: maxLevelAnjuran > 0 ? (maxLevelAnjuran as RuleHierarchyLevel) : RuleHierarchyLevel.WEWARAN,
      alasan: alasanList,
      aturanKutipan: kutipanList,
    };
  }

  /**
   * Mengevaluasi rentang tanggal.
   */
  public evaluateRange(
    range: BalineseDateInfo[],
    target?: EvaluationTarget
  ): DateEvaluationResult[] {
    return range.map((dateInfo) => this.evaluate(dateInfo, target));
  }

  /**
   * Menyaring dan mengurutkan rekomendasi hari baik:
   * 1. Ada dewasa ala yang dilarang -> Tanggal dibuang.
   * 2. Ada dewasa ayu yang dianjurkan -> Tanggal direkomendasikan.
   * 3. Netral -> Tidak direkomendasikan.
   */
  public filterRecommended(
    range: BalineseDateInfo[],
    target?: EvaluationTarget
  ): DateEvaluationResult[] {
    const evaluations = this.evaluateRange(range, target);
    // Hanya tanggal dengan status 'dianjurkan' yang direkomendasikan
    const valid = evaluations.filter((res) => res.status === 'dianjurkan');

    return valid.sort((a, b) => {
      if (a.rekomendasi === 'paling_disarankan' && b.rekomendasi !== 'paling_disarankan') {
        return -1;
      }
      if (b.rekomendasi === 'paling_disarankan' && a.rekomendasi !== 'paling_disarankan') {
        return 1;
      }
      // Prioritaskan tanggal dengan lebih banyak faktor dewasa ayu yang mendukung
      return b.alasan.length - a.alasan.length;
    });
  }
}
