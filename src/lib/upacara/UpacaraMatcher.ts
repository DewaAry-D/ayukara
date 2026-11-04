import { LlmClient } from '../llm/LlmClient';
import { UPACARA_KNOWLEDGE_MAP, UpacaraKnowledgeEntry } from './upacaraKnowledge';

export interface UpacaraMatchItem {
  id: number;
  nama: string;
  alias?: string[];
  deskripsi?: string | null;
  jenis_penentuan?: 'dewasa' | 'hari_raya_tetap' | 'otonan';
}

export interface IUpacaraMatchRepository {
  getAllCandidates(): Promise<UpacaraMatchItem[]>;
}

export interface CandidateResult {
  upacara: UpacaraMatchItem;
  alasan: string;
  isTopMatch: boolean;
}

export interface MatchResult {
  matchType: 'exact' | 'candidates' | 'not_found';
  selectedUpacara?: UpacaraMatchItem;
  candidates: CandidateResult[];
  message: string;
}

interface LlmMatchItem {
  id: number;
  alasan?: string;
}

interface LlmMatchResponse {
  matches?: LlmMatchItem[];
}

/**
 * Normalisasi teks untuk pencocokan kata dan frasa.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Menghitung skor kemiripan semantik dan kecocokan intensi pengguna
 * terhadap upacara di database secara deterministik.
 * Mendukung pengelompokan (clustering) upacara terkait agar dapat memberikan
 * hingga 3 rekomendasi terdekat untuk deskripsi bebas.
 */
function computeSemanticScore(
  cleanQuery: string,
  queryTokens: string[],
  upacara: UpacaraMatchItem,
  meta?: UpacaraKnowledgeEntry
): { score: number; matchedReason: string } {
  let score = 0;
  let reason = '';

  const cleanNama = normalizeText(upacara.nama);
  const aliases = Array.from(
    new Set([
      ...(upacara.alias || []).map((a) => normalizeText(a)),
      ...(meta?.aliases || []).map((a) => normalizeText(a)),
    ])
  );
  const keywords = Array.from(
    new Set([
      ...(meta?.keywords || []).map((k) => normalizeText(k)),
      ...cleanNama.split(' '),
    ])
  );

  // 1. Cek frasa nama lengkap upacara
  if (cleanQuery === cleanNama) {
    return { score: 100, matchedReason: `Cocok persis dengan nama upacara ${upacara.nama}` };
  }
  if (cleanQuery.includes(cleanNama)) {
    score += 70;
    reason = `Mengandung nama upacara ${upacara.nama}`;
  }

  // 2. Cek frasa alias
  for (const alias of aliases) {
    if (!alias) continue;
    if (cleanQuery === alias) {
      return { score: 95, matchedReason: `Sesuai dengan istilah/alias '${alias}'` };
    }
    const aliasRegex = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i');
    if (aliasRegex.test(cleanQuery)) {
      score += 60;
      if (!reason) reason = `Cocok dengan istilah '${alias}' (${upacara.nama})`;
    }
  }

  // 3. Cek kata kunci
  for (const kw of keywords) {
    if (!kw || kw.length < 3) continue;
    const kwRegex = new RegExp(`(^|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i');
    if (kwRegex.test(cleanQuery)) {
      score += 15;
      if (!reason) reason = `Terkait dengan kata kunci '${kw}'`;
    }
  }

  // 4. Aturan Disambiguasi & Pengelompokan Budaya Bali (Clustering Relevansi)

  // a. Kematian / Pitra Yadnya / Ngaben / Kedukaan (Cluster Pitra Yadnya)
  const hasNgaben = /(ngaben|pelebon|kremasi|jenazah|mayat|meninggal|wafat|kematian|sawa|rumah\s*duka|kedukaan|duka)/i.test(cleanQuery);
  if (hasNgaben) {
    if (upacara.id === 13) {
      score += 75;
      reason = 'Sesuai untuk upacara pembakaran jenazah / pitra yadnya (Ngeringkes / Atiwa-tiwa)';
    } else if (upacara.id === 16) {
      score += 55;
      reason = 'Sesuai untuk penyucian pekarangan rumah setelah masa kedukaan (Pembersihan Rumah Duka)';
    } else if (upacara.id === 14) {
      score += 45;
      reason = 'Alternatif khusus jika yang meninggal adalah anak-anak / belum tanggal gigi (Ngelungah)';
    } else if (upacara.id === 15) {
      score += 35;
      reason = 'Alternatif khusus bagi janin yang gugur dalam kandungan (Keruron)';
    } else if (upacara.id === 17) {
      score -= 100; // Mencegah tertukar dengan pernikahan
    }
  }

  // b. Bayi 3 Bulan (Nyambutin) vs Otonan 6 Bulan vs Tutug Kambuhan 42 Hari
  const has3Bulan = /(3\s*bulan|tiga\s*bulan|nyambutin|nelubulanin|telung\s*bulan)/i.test(cleanQuery);
  const has6Bulan = /(6\s*bulan|enam\s*bulan|otonan)/i.test(cleanQuery);
  const has42Hari = /(42\s*hari|kambuhan|tutug\s*kambuhan|sebulan\s*pitung\s*dina)/i.test(cleanQuery);

  if (has3Bulan) {
    if (upacara.id === 22) {
      score += 80;
      reason = 'Sesuai untuk upacara bayi berumur 3 bulan (105 hari / Nyambutin)';
    } else if (upacara.id === 23 || upacara.id === 21) {
      score -= 80;
    }
  }

  if (has6Bulan) {
    if (upacara.id === 23) {
      score += 80;
      reason = 'Sesuai untuk upacara kelahiran / otonan 6 bulan (siklus 210 hari)';
    } else if (upacara.id === 22) {
      score -= 80;
    }
  }

  if (has42Hari) {
    if (upacara.id === 21) {
      score += 80;
      reason = 'Sesuai untuk upacara penyucian bayi umur 42 hari (Tutug Kambuhan)';
    } else if (upacara.id === 22 || upacara.id === 23) {
      score -= 80;
    }
  }

  // c. Bayi Baru Lahir (Cluster Kelahiran)
  const hasBayiLahir = /(bayi\s*lahir|kelahiran|baru\s*lahir|persalinan|menyambut\s*bayi|mapag\s*rare)/i.test(cleanQuery);
  if (hasBayiLahir && !has3Bulan && !has6Bulan) {
    if (upacara.id === 19) {
      score += 75;
      reason = 'Sesuai untuk upacara menyambut kelahiran bayi pertama kali ke dunia (Bayi Lahir / Mapag Rare)';
    } else if (upacara.id === 20) {
      score += 55;
      reason = 'Upacara saat tali pusar bayi telah lepas secara alami (Kepus Pusar)';
    } else if (upacara.id === 21) {
      score += 45;
      reason = 'Penyucian diri bayi dan ibu setelah melewati 42 hari kelahiran (Tutug Kambuhan)';
    }
  }

  // d. Remaja / Pubertas / Pembersihan Diri (Cluster Kedewasaan)
  const hasRemaja = /(remaja|akil\s*baligh|menginjak\s*dewasa|menek\s*kelih|pubertas|haid|pembersihan\s*diri|penyucian\s*diri)/i.test(cleanQuery);
  if (hasRemaja) {
    if (upacara.id === 24) {
      score += 75;
      reason = 'Sesuai untuk upacara saat anak mulai menginjak masa remaja / akil baligh (Menek Kelih/Bajang)';
    } else if (upacara.id === 25) {
      score += 55;
      reason = 'Upacara penyucian diri dan pengendalian Sad Ripu bagi yang beranjak dewasa (Potong Gigi / Metatah)';
    } else if (upacara.id === 26) {
      score += 45;
      reason = 'Upacara penyucian diri secara rohani (Mawinten)';
    }
  }

  // e. Pernikahan / Pawiwahan / Pawidhi Widana
  const hasNikah = /(nikah|kawin|menikah|pernikahan|perkawinan|pawiwahan|pewiwahan|pawidhi\s*widana|manten)/i.test(cleanQuery);
  if (hasNikah) {
    if (upacara.id === 17) {
      score += 85;
      reason = 'Sesuai untuk upacara pernikahan / pawiwahan (Pawidhi Widana)';
    }
  }

  // f. Potong Gigi / Metatah
  const hasPotongGigi = /(potong\s*gigi|metatah|mapandes|mepandes|matatah|mesangih)/i.test(cleanQuery);
  if (hasPotongGigi) {
    if (upacara.id === 25) {
      score += 85;
      reason = 'Sesuai untuk upacara potong gigi (Metatah / Mapandes)';
    }
  }

  // g. Bangunan / Pindah Rumah / Melaspas
  const hasBangunan = /(melaspas|pindah\s*rumah|bangunan\s*baru|resmikan\s*rumah|bangunan|rumah\s*baru)/i.test(cleanQuery);
  if (hasBangunan) {
    if (upacara.id === 12) {
      score += 75;
      reason = 'Sesuai untuk upacara pembersihan dan penyucian bangunan baru (Melaspas)';
    } else if (upacara.id === 27) {
      score += 45;
      reason = 'Pecaruan pekarangan untuk menjaga keseimbangan energi (Caru Eka Sata)';
    } else if (upacara.id === 11) {
      score += 35;
      reason = 'Piodalan pelinggih baru di pekarangan rumah';
    }
  }

  // h. Piodalan / Tempat Suci / Odalan
  const hasPiodalan = /(piodalan|odalan|pujawali|sanggah|merajan|tempat\s*suci)/i.test(cleanQuery);
  if (hasPiodalan) {
    if (upacara.id === 11) {
      score += 75;
      reason = 'Sesuai untuk upacara piodalan / odalan rutin di sanggah, merajan, atau pura keluarga';
    } else if (upacara.id === 9) {
      score += 55;
      reason = 'Upacara piodalan pura berskala Suci Sari / Alit';
    } else if (upacara.id === 10) {
      score += 45;
      reason = 'Upacara piodalan agung pura berskala besar dengan sarana Suci Laksana';
    }
  }

  return { score, matchedReason: reason || meta?.deskripsiBudaya || 'Sesuai dengan deskripsi yang diberikan' };
}

export class UpacaraMatcher {
  private repository: IUpacaraMatchRepository;
  private llmClient: LlmClient;

  constructor(repository: IUpacaraMatchRepository, llmClient: LlmClient) {
    this.repository = repository;
    this.llmClient = llmClient;
  }

  /**
   * Mencocokkan input pengguna (maks. 300 karakter) dengan daftar upacara di database.
   * Menggunakan pendekatan hybrid:
   * 1. Exact match nama / alias kanonikal di DB.
   * 2. Evaluasi deskripsi berbasis intent & skor semantik lokal (memberikan 1 hingga maks. 3 rekomendasi).
   * 3. Konsultasi LLM dengan daftar tertutup DB (fault-tolerant: fallback ke semantik lokal bila LLM 401/404/offline).
   */
  public async match(rawInput: string): Promise<MatchResult> {
    const input = rawInput.trim();

    // Aturan Mutlak #18: Validasi panjang input maksimal 300 karakter
    if (input.length > 300) {
      throw new Error('Input upacara melebihi batas maksimal 300 karakter.');
    }

    if (input.length === 0) {
      return {
        matchType: 'not_found',
        candidates: [],
        message: 'Upacara tidak ditemukan',
      };
    }

    const allCandidates = await this.repository.getAllCandidates();
    const candidateMap = new Map<number, UpacaraMatchItem>();

    // Perkaya kandidat dengan alias kanonikal jika belum ada
    for (const c of allCandidates) {
      const meta = UPACARA_KNOWLEDGE_MAP.get(c.id);
      if (meta) {
        const mergedAliases = new Set([
          ...(c.alias || []).map((a) => a.trim()),
          ...meta.aliases,
        ]);
        c.alias = Array.from(mergedAliases);
        if (!c.deskripsi && meta.deskripsiBudaya) {
          c.deskripsi = meta.deskripsiBudaya;
        }
      }
      candidateMap.set(c.id, c);
    }

    const lowerInput = input.toLowerCase();
    const cleanQuery = normalizeText(input);
    const queryTokens = cleanQuery.split(' ').filter(Boolean);

    // =========================================================================
    // TAHAP 1: Cek kecocokan persis (nama atau alias) di DB
    // =========================================================================
    for (const upacara of allCandidates) {
      const cleanNama = normalizeText(upacara.nama);
      if (upacara.nama.toLowerCase() === lowerInput || cleanNama === cleanQuery) {
        return {
          matchType: 'exact',
          selectedUpacara: upacara,
          candidates: [{ upacara, alasan: 'Nama upacara cocok persis', isTopMatch: true }],
          message: 'Upacara sesuai',
        };
      }

      if (upacara.alias) {
        for (const al of upacara.alias) {
          const cleanAl = normalizeText(al);
          if (al.toLowerCase() === lowerInput || cleanAl === cleanQuery) {
            return {
              matchType: 'exact',
              selectedUpacara: upacara,
              candidates: [
                {
                  upacara,
                  alasan: `Istilah '${al}' cocok persis dengan upacara ${upacara.nama}`,
                  isTopMatch: true,
                },
              ],
              message: 'Upacara sesuai',
            };
          }
        }
      }
    }

    // =========================================================================
    // TAHAP 2: Hitung Skor Semantik Lokal (Intent & Cluster Scoring)
    // =========================================================================
    const scoredList: { upacara: UpacaraMatchItem; score: number; reason: string }[] = [];

    for (const upacara of allCandidates) {
      const meta = UPACARA_KNOWLEDGE_MAP.get(upacara.id);
      const { score, matchedReason } = computeSemanticScore(cleanQuery, queryTokens, upacara, meta);
      if (score >= 25) {
        scoredList.push({
          upacara,
          score,
          reason: matchedReason,
        });
      }
    }

    // Urutkan kandidat berdasarkan skor tertinggi
    scoredList.sort((a, b) => b.score - a.score);

    // Jika skor kandidat teratas sangat tinggi (>= 90) dan hanya ada 1 kata query yang sangat spesifik
    if (scoredList.length > 0 && scoredList[0].score >= 90 && queryTokens.length <= 2) {
      const top = scoredList[0];
      return {
        matchType: 'exact',
        selectedUpacara: top.upacara,
        candidates: [{ upacara: top.upacara, alasan: top.reason, isTopMatch: true }],
        message: 'Upacara sesuai',
      };
    }

    // Format kandidat lokal: ambil maksimal 3 rekomendasi terbaik
    const localCandidates: CandidateResult[] = scoredList.slice(0, 3).map((item, idx) => ({
      upacara: item.upacara,
      alasan: item.reason,
      isTopMatch: idx === 0,
    }));

    // =========================================================================
    // TAHAP 3: Konsultasi LLM dengan DAFTAR TERTUTUP (Aturan Mutlak #15)
    // =========================================================================
    const closedListText = allCandidates
      .map((c) => `- ID ${c.id}: ${c.nama} (alias: ${c.alias?.join(', ') || '-'})`)
      .join('\n');

    const systemPrompt = `Anda adalah asisten pencocokan upacara Yadnya Hindu Bali.
Tugas Anda adalah menganalisis deskripsi upacara dari pengguna dan HANYA memilih upacara yang relevan dari DAFTAR TERTUTUP berikut:
${closedListText}

ATURAN KETAT:
1. Anda DILARANG mengarang upacara atau ID di luar daftar di atas.
2. Keluarkan dalam format JSON { "matches": [{ "id": number, "alasan": string }] }.
3. Berikan 1 hingga maksimal 3 rekomendasi upacara yang paling relevan. Jika ada beberapa tahapan atau alternatif yang berhubungan dengan deskripsi pengguna, berikan hingga 3 rekomendasi terdekat.
4. Urutkan matches dari yang paling sesuai di urutan pertama.
5. Jika tidak ada yang relevan, kembalikan { "matches": [] }.`;

    const userPrompt = `Deskripsi upacara pengguna: "${input}"`;

    const llmValidCandidates: CandidateResult[] = [];

    try {
      const completion = await this.llmClient.complete({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        jsonSchema: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  alasan: { type: 'string' },
                },
                required: ['id'],
              },
            },
          },
          required: ['matches'],
        },
      });

      const parsed = completion.json as LlmMatchResponse | undefined;
      const rawMatches = parsed?.matches || [];

      // Aturan Mutlak #15: Validasi di kode — ID di luar daftar tertutup DB dibuang, ambil maks. 3
      for (const matchItem of rawMatches.slice(0, 3)) {
        if (candidateMap.has(matchItem.id)) {
          const upacara = candidateMap.get(matchItem.id)!;
          llmValidCandidates.push({
            upacara,
            alasan: matchItem.alasan || 'Deskripsi sesuai dengan upacara ini',
            isTopMatch: llmValidCandidates.length === 0,
          });
        }
      }

      // Jika LLM hanya mengembalikan 1 atau 2 tetapi lokal memiliki alternatif terkait yang kuat, gabungkan hingga 3
      if (llmValidCandidates.length > 0 && llmValidCandidates.length < 3) {
        const existingIds = new Set(llmValidCandidates.map((c) => c.upacara.id));
        for (const local of localCandidates) {
          if (!existingIds.has(local.upacara.id) && llmValidCandidates.length < 3) {
            llmValidCandidates.push({
              ...local,
              isTopMatch: false,
            });
            existingIds.add(local.upacara.id);
          }
        }
      }
    } catch (llmError) {
      console.warn('UpacaraMatcher: Panggilan LLM mengalami kendala, menggunakan pemeringkat semantik lokal:', llmError);
    }

    // =========================================================================
    // TAHAP 4: Konsolidasi Hasil (Prioritaskan LLM jika valid, fallback ke lokal)
    // =========================================================================
    if (llmValidCandidates.length > 0) {
      return {
        matchType: 'candidates',
        candidates: llmValidCandidates,
        message: 'Upacara Teridentifikasi',
      };
    }

    // Jika LLM gagal/kosong tapi ada hasil semantik lokal yang relevan
    if (localCandidates.length > 0) {
      return {
        matchType: 'candidates',
        candidates: localCandidates,
        message: 'Upacara Teridentifikasi',
      };
    }

    return {
      matchType: 'not_found',
      candidates: [],
      message: 'Upacara tidak ditemukan',
    };
  }
}
