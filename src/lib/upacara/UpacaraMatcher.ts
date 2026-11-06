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
 * Daftar kata henti (stop words) umum dalam bahasa Indonesia dan istilah percakapan
 * untuk menyaring token substantif dari input pengguna.
 */
const STOP_WORDS = new Set([
  'saya', 'kami', 'kita', 'dia', 'mereka', 'anda', 'kamu',
  'mau', 'ingin', 'mencari', 'cari', 'minta', 'butuh', 'membutuhkan',
  'hari', 'raya', 'baik', 'dewasa', 'ayu', 'kapan', 'waktu', 'tanggal', 'jadwal',
  'upacara', 'yadnya', 'acara', 'ritual', 'upakara', 'perayaan',
  'untuk', 'buat', 'bagi', 'kepada', 'pada', 'saat', 'ketika', 'tentang',
  'yang', 'dan', 'atau', 'di', 'ke', 'dari', 'dengan', 'tanpa',
  'ini', 'itu', 'tersebut', 'adalah', 'yaitu', 'ada', 'bisa', 'dapat',
  'tolong', 'bantu', 'rekomendasi', 'saran', 'bagaimana', 'apa',
  'sudah', 'telah', 'akan', 'sedang', 'bila', 'jika', 'kalau',
  'supaya', 'agar', 'karena', 'sebab', 'serta', 'juga', 'secara',
  'bali', 'adat', 'hindu', 'tradisi', 'tradisional', 'keagamaan'
]);

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
 * Menghitung jarak Levenshtein antara dua string untuk toleransi saltik (typo).
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Memeriksa apakah suatu kata cocok dengan target toleran saltik (typo).
 */
function isFuzzyMatch(token: string, target: string): boolean {
  if (token === target) return true;
  if (token.length < 4 || target.length < 4) return false;
  if (Math.abs(token.length - target.length) > 2) return false;
  const maxDistance = target.length >= 8 ? 2 : 1;
  return levenshteinDistance(token, target) <= maxDistance;
}

/**
 * Menghitung skor kemiripan semantik dan kecocokan intensi pengguna
 * terhadap upacara di database secara deterministik dan berbasis konteks luas.
 * Mendukung analisis deskripsi, istilah budaya, toleransi saltik, dan clustering terdekat.
 */
function computeSemanticScore(
  cleanQuery: string,
  queryTokens: string[],
  substantiveTokens: string[],
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
      ...cleanNama.split(' ').filter((w) => w.length > 2),
    ])
  );

  const rawDeskripsi = upacara.deskripsi || meta?.deskripsiBudaya || '';
  const cleanDeskripsi = normalizeText(rawDeskripsi);

  // 1. Cek frasa nama lengkap upacara
  if (cleanQuery === cleanNama) {
    return { score: 100, matchedReason: `Cocok persis dengan nama upacara ${upacara.nama}` };
  }
  if (cleanQuery.includes(cleanNama)) {
    score += 70;
    reason = `Mengandung nama upacara ${upacara.nama}`;
  } else if (cleanNama.includes(cleanQuery) && cleanQuery.length >= 4) {
    score += 60;
    reason = `Cocok dengan bagian nama upacara ${upacara.nama}`;
  }

  // 2. Cek frasa alias kanonikal
  for (const alias of aliases) {
    if (!alias) continue;
    if (cleanQuery === alias) {
      return { score: 95, matchedReason: `Sesuai dengan istilah/alias '${alias}'` };
    }
    const aliasRegex = new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i');
    if (aliasRegex.test(cleanQuery)) {
      score += 65;
      if (!reason) reason = `Cocok dengan istilah '${alias}' (${upacara.nama})`;
    }
  }

  // 3. Pencocokan token substantif terhadap nama, alias, kata kunci, dan deskripsi (dengan deduplikasi per token)
  const genericWords = new Set(['anak', 'rumah', 'diri', 'hari', 'bulan', 'orang', 'desa', 'suci']);

  for (const token of substantiveTokens) {
    // a. Pencocokan terhadap nama upacara (maks. 1 kali per token)
    const nameWords = cleanNama.split(' ');
    if (nameWords.includes(token)) {
      score += 25;
      if (!reason) reason = `Terkait langsung dengan upacara ${upacara.nama}`;
    } else if (isFuzzyMatch(token, cleanNama)) {
      score += 35;
      if (!reason) reason = `Mirip dengan nama upacara ${upacara.nama}`;
    } else if (nameWords.some((w) => isFuzzyMatch(token, w))) {
      score += 15;
      if (!reason) reason = `Mirip dengan istilah nama upacara ${upacara.nama}`;
    }

    // b. Pencocokan terhadap alias (maks. 1 kali per token)
    let aliasMatched = false;
    for (const al of aliases) {
      const alTokens = al.split(' ');
      if (alTokens.includes(token)) {
        score += 20;
        if (!reason) reason = `Terkait dengan istilah '${al}'`;
        aliasMatched = true;
        break;
      }
    }
    if (!aliasMatched) {
      for (const al of aliases) {
        const alTokens = al.split(' ');
        if (alTokens.some((w) => isFuzzyMatch(token, w))) {
          score += 15;
          if (!reason) reason = `Mendekati istilah '${al}'`;
          aliasMatched = true;
          break;
        }
      }
    }

    // c. Pencocokan terhadap kata kunci budaya (maks. 1 kali per token)
    let keywordMatched = false;
    for (const kw of keywords) {
      if (!kw || kw.length < 3) continue;
      if (kw === token) {
        score += 15;
        if (!reason) reason = `Terkait dengan konsep '${kw}'`;
        keywordMatched = true;
        break;
      }
    }
    if (!keywordMatched) {
      for (const kw of keywords) {
        if (!kw || kw.length < 3) continue;
        if (isFuzzyMatch(token, kw)) {
          score += 10;
          break;
        }
      }
    }

    // d. Pencocokan terhadap deskripsi budaya upacara (maks. 1 kali per token, abaikan kata generik)
    if (cleanDeskripsi && !genericWords.has(token)) {
      const deskripsiWords = cleanDeskripsi.split(' ');
      if (deskripsiWords.includes(token)) {
        score += 12;
        if (!reason) reason = `Sesuai dengan tujuan upacara: ${rawDeskripsi}`;
      }
    }
  }

  // 4. Pencocokan frasa 2-kata substantif pada deskripsi upacara
  if (substantiveTokens.length >= 2 && cleanDeskripsi) {
    for (let i = 0; i < substantiveTokens.length - 1; i++) {
      const pair = `${substantiveTokens[i]} ${substantiveTokens[i + 1]}`;
      if (cleanDeskripsi.includes(pair)) {
        score += 35;
        if (!reason) reason = `Sesuai dengan deskripsi upacara: "${rawDeskripsi}"`;
      }
    }
  }

  // 5. Aturan Disambiguasi & Pengelompokan Budaya Bali (Clustering Relevansi Luas)

  // a. Kematian / Pitra Yadnya / Ngaben / Kedukaan (Cluster Pitra Yadnya)
  const hasNgaben = /(ngaben|pelebon|kremasi|jenazah|mayat|meninggal|wafat|kematian|sawa|rumah\s*duka|kedukaan|duka|layon|petulangan)/i.test(cleanQuery);
  const hasAnakMeninggal = /(anak|bayi|balita|belum\s*tanggal\s*gigi)\s*(meninggal|wafat|mati)/i.test(cleanQuery);
  const hasKeguguran = /(keguguran|janin|gugur\s*kandungan|ruron|keruron)/i.test(cleanQuery);
  const hasPembersihanDuka = /(pembersihan\s*rumah\s*duka|nyengker\s*jurang|cuntaka\s*duka|sebel\s*duka|meruwat\s*rumah\s*duka)/i.test(cleanQuery);

  if (hasNgaben || hasAnakMeninggal || hasKeguguran || hasPembersihanDuka) {
    if (hasKeguguran) {
      if (upacara.id === 15) {
        score += 90;
        reason = 'Sesuai untuk penyucian bayi atau janin yang gugur dalam kandungan (Keruron)';
      } else if (upacara.id === 14) {
        score += 40;
      } else if (upacara.id === 16) {
        score += 30;
      }
    } else if (hasAnakMeninggal) {
      if (upacara.id === 14) {
        score += 90;
        reason = 'Sesuai khusus bagi anak yang meninggal sebelum tanggal gigi atau belum remaja (Ngelungah)';
      } else if (upacara.id === 13) {
        score += 55;
      } else if (upacara.id === 16) {
        score += 45;
      }
    } else if (hasPembersihanDuka) {
      if (upacara.id === 16) {
        score += 90;
        reason = 'Sesuai untuk penyucian pekarangan rumah setelah masa kedukaan (Pembersihan Rumah Duka)';
      } else if (upacara.id === 13) {
        score += 55;
      }
    } else {
      // Kedukaan / kematian keluarga secara umum
      if (upacara.id === 13) {
        score += 85;
        reason = 'Sesuai untuk upacara pembakaran jenazah / pitra yadnya (Ngeringkes / Atiwa-tiwa)';
      } else if (upacara.id === 16) {
        score += 65;
        reason = 'Sesuai untuk penyucian pekarangan rumah setelah masa kedukaan (Pembersihan Rumah Duka)';
      } else if (upacara.id === 14) {
        score += 35;
        reason = 'Alternatif khusus jika yang meninggal adalah anak-anak / belum tanggal gigi (Ngelungah)';
      } else if (upacara.id === 15) {
        score += 25;
        reason = 'Alternatif khusus bagi janin yang gugur dalam kandungan (Keruron)';
      }
    }

    // Taboo guard: Upacara pernikahan atau daur hidup manusia tidak boleh tercampur dengan kedukaan
    if (upacara.id === 17 || upacara.id === 24 || upacara.id === 25 || upacara.id === 22 || upacara.id === 23) {
      score -= 100;
    }
  }

  // b. Bayi 3 Bulan (Nyambutin) vs Otonan 6 Bulan vs Tutug Kambuhan 42 Hari
  const has3Bulan = /(3\s*bulan|tiga\s*bulan|nyambutin|nelubulanin|telung\s*bulan|nigang\s*sasih|105\s*hari)/i.test(cleanQuery);
  const has6Bulan = /(6\s*bulan|enam\s*bulan|otonan|210\s*hari|wetonan)/i.test(cleanQuery);
  const has42Hari = /(42\s*hari|kambuhan|tutug\s*kambuhan|sebulan\s*pitung\s*dina|sebulan\s*tujuh\s*hari)/i.test(cleanQuery);

  if (has3Bulan) {
    if (upacara.id === 22) {
      score += 85;
      reason = 'Sesuai untuk upacara bayi berumur 3 bulan (105 hari / Nyambutin)';
    } else if (upacara.id === 23 || upacara.id === 21) {
      score -= 80;
    }
  }

  if (has6Bulan) {
    if (upacara.id === 23) {
      score += 85;
      reason = 'Sesuai untuk peringatan hari kelahiran / otonan 6 bulan (siklus 210 hari)';
    } else if (upacara.id === 22) {
      score -= 80;
    }
  }

  if (has42Hari) {
    if (upacara.id === 21) {
      score += 85;
      reason = 'Sesuai untuk upacara penyucian bayi dan ibu setelah 42 hari kelahiran (Tutug Kambuhan)';
    } else if (upacara.id === 22 || upacara.id === 23) {
      score -= 80;
    }
  }

  // c. Kehamilan (Megedong-gedongan)
  const hasKehamilan = /(kehamilan|hamil|kandungan|tujuh\s*bulan|7\s*bulan|mitoni|megedong|gedong)/i.test(cleanQuery);
  if (hasKehamilan && !hasKeguguran) {
    if (upacara.id === 18) {
      score += 85;
      reason = 'Sesuai untuk upacara penyucian janin dan ibu hamil usia 6-7 bulan (Megedong-gedongan)';
    }
  }

  // d. Bayi Baru Lahir & Lepas Pusar (Cluster Kelahiran)
  const hasLepasPusar = /(lepas\s*tali\s*pusar|kepus\s*pusar|kepus\s*puser|cuwek)/i.test(cleanQuery);
  if (hasLepasPusar) {
    if (upacara.id === 20) {
      score += 85;
      reason = 'Sesuai untuk upacara saat tali pusar bayi telah lepas secara alami (Kepus Pusar)';
    }
  }

  const hasBayiLahir = /(bayi\s*lahir|kelahiran|baru\s*lahir|persalinan|menyambut\s*bayi|mapag\s*rare)/i.test(cleanQuery);
  if (hasBayiLahir && !has3Bulan && !has6Bulan && !has42Hari && !hasKehamilan && !hasLepasPusar) {
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

  // e. Remaja / Pubertas / Pembersihan Diri (Cluster Kedewasaan)
  const hasRemaja = /(remaja|akil\s*baligh|menginjak\s*dewasa|menek\s*kelih|menek\s*bajang|pubertas|haid\s*pertama|pembersihan\s*diri|penyucian\s*diri)/i.test(cleanQuery);
  if (hasRemaja) {
    if (upacara.id === 24) {
      score += 85;
      reason = 'Sesuai untuk upacara saat anak mulai menginjak masa remaja / akil baligh (Menek Kelih/Bajang)';
    } else if (upacara.id === 25) {
      score += 75;
      reason = 'Upacara penyucian diri dan pengendalian Sad Ripu bagi yang beranjak dewasa (Potong Gigi / Metatah)';
    } else if (upacara.id === 26) {
      score += 45;
      reason = 'Upacara penyucian diri secara rohani (Mawinten)';
    }

    // Taboo guard: Upacara kematian dilarang masuk ke rekomendasi kedewasaan
    if (upacara.id === 13 || upacara.id === 14 || upacara.id === 15 || upacara.id === 16) {
      score -= 100;
    }
  }

  // f. Pernikahan / Pawiwahan / Pawidhi Widana
  const hasNikah = /(nikah|kawin|menikah|pernikahan|perkawinan|pawiwahan|pewiwahan|pawihan|pawidhi\s*widana|manten|mantenan|mempelai|wiwaha)/i.test(cleanQuery);
  if (hasNikah) {
    if (upacara.id === 17) {
      score += 85;
      reason = 'Sesuai untuk upacara pernikahan / pawiwahan (Pawidhi Widana)';
    } else if (upacara.id === 13 || upacara.id === 14 || upacara.id === 15 || upacara.id === 16) {
      score -= 100; // Mencegah tertukar dengan kematian
    }
  }

  // g. Potong Gigi / Metatah
  const hasPotongGigi = /(potong\s*gigi|metatah|mapandes|mepandes|matatah|mesangih|kikir\s*gigi|sad\s*ripu)/i.test(cleanQuery);
  if (hasPotongGigi) {
    if (upacara.id === 25) {
      score += 85;
      reason = 'Sesuai untuk upacara potong gigi guna mengendalikan Sad Ripu (Metatah / Mapandes)';
    }
  }

  // h. Kepemangkuan / Pawintenan (Mawinten)
  const hasMawinten = /(mawinten|pawintenan|pemangku|pinandita|serati|dwijati|ekajati|guru\s*wisesa)/i.test(cleanQuery);
  if (hasMawinten) {
    if (upacara.id === 26) {
      score += 85;
      reason = 'Sesuai untuk upacara penyucian rohani calon pemangku atau pelayan umat (Mawinten)';
    }
  }

  // i. Bangunan / Pindah Rumah / Melaspas
  const hasBangunan = /(melaspas|pindah\s*rumah|bangunan\s*baru|resmikan\s*rumah|bangunan|rumah\s*baru|kantor\s*baru|resmikan\s*kantor|toko\s*baru|ngurip)/i.test(cleanQuery);
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

    if (upacara.id === 16) {
      score -= 80; // Mencegah pembersihan rumah duka masuk ke bangunan baru
    }
  }

  // j. Piodalan / Tempat Suci / Odalan
  const hasPiodalan = /(piodalan|odalan|pujawali|sanggah|merajan|tempat\s*suci|pelinggih)/i.test(cleanQuery);
  if (hasPiodalan) {
    const hasSuciSari = /(suci\s*sari|suci\s*alit|alit)/i.test(cleanQuery);
    const hasSuciLaksana = /(suci\s*laksana|agung)/i.test(cleanQuery);

    if (hasSuciSari && upacara.id === 9) {
      score += 85;
      reason = 'Upacara piodalan pura berskala Suci Sari / Alit';
    } else if (hasSuciLaksana && upacara.id === 10) {
      score += 85;
      reason = 'Upacara piodalan agung pura berskala besar dengan sarana Suci Laksana';
    } else if (upacara.id === 11) {
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

  // k. Rezeki / Finansial / Usaha / Rambut Sedana
  const hasRezeki = /(rambut\s*sedana|sedana|rezeki|kemakmuran|usaha\s*dagang|toko|kekayaan|keuangan|finansial|dewi\s*sri)/i.test(cleanQuery);
  if (hasRezeki) {
    if (upacara.id === 34) {
      score += 85;
      reason = 'Pemujaan Bhatara Rambut Sedana / Dewi Sri untuk memohon kelancaran rezeki dan usaha';
    } else if (upacara.id === 11) {
      score += 45;
    } else if (upacara.id === 12) {
      score += 35;
    }
  }

  // l. Kendaraan / Logam / Senjata (Tumpek Landep)
  const hasLogamKendaraan = /(tumpek\s*landep|landep|pasupati|kendaraan|mobil|motor|senjata|keris|logam|besi|mesin|ketajaman\s*pikiran)/i.test(cleanQuery);
  if (hasLogamKendaraan) {
    if (upacara.id === 29) {
      score += 85;
      reason = 'Pemujaan Sang Hyang Pasupati untuk ketajaman budi serta penyucian benda berbahan logam dan kendaraan (Tumpek Landep)';
    }
  }

  // m. Tumbuhan / Pohon / Lingkungan (Tumpek Wariga)
  const hasTumbuhan = /(tumpek\s*wariga|tumpek\s*uduh|tumpek\s*bubuh|tumpek\s*pengatag|tanaman|pohon|kebun|kesuburan\s*tumbuhan|buah)/i.test(cleanQuery);
  if (hasTumbuhan) {
    if (upacara.id === 30) {
      score += 85;
      reason = 'Pemujaan Sang Hyang Sangkara untuk memohon kesuburan tumbuh-tumbuhan dan pepohonan (Tumpek Wariga)';
    }
  }

  // n. Kesenian / Gamelan / Kasih Sayang (Tumpek Krulut)
  const hasKesenian = /(tumpek\s*krulut|krulut|lulut|gamelan|gong|tetabuhan|alat\s*musik|hari\s*kasih\s*sayang\s*bali)/i.test(cleanQuery);
  if (hasKesenian) {
    if (upacara.id === 31) {
      score += 85;
      reason = 'Pemujaan ke hadapan Dewa Iswara pada suara suci gamelan dan rasa kasih sayang (Tumpek Krulut)';
    }
  }

  // o. Hewan / Ternak / Peliharaan (Tumpek Uye)
  const hasHewan = /(tumpek\s*uye|tumpek\s*kandang|hewan|ternak|binatang|sapi|anjing|kucing|peliharaan|rare\s*angon)/i.test(cleanQuery);
  if (hasHewan) {
    if (upacara.id === 32) {
      score += 85;
      reason = 'Pemujaan Sang Hyang Rare Angon sebagai wujud syukur dan pelestarian terhadap hewan ternak/peliharaan (Tumpek Uye)';
    }
  }

  // p. Kesenian Wayang / Sapuh Leger (Tumpek Wayang)
  const hasWayang = /(tumpek\s*wayang|wayang|sapuh\s*leger|ruwatan\s*wayang|wuku\s*wayang)/i.test(cleanQuery);
  if (hasWayang) {
    if (upacara.id === 33) {
      score += 85;
      reason = 'Pemujaan Bhatara Iswara untuk kesenian wayang serta upacara ruwatan Sapuh Leger kelahiran Wuku Wayang (Tumpek Wayang)';
    }
  }

  // q. Bhuta Yadnya / Pecaruan / Pembersihan Lingkungan
  const hasCaru = /(pecaruan|caru|bhuta\s*yadnya|kurban\s*ayam|ayam\s*panca\s*warna|panca\s*sanak|panca\s*kelud|balik\s*sumpah|labuh\s*gentuh)/i.test(cleanQuery);
  if (hasCaru) {
    if (/(balik\s*sumpah|sumpah|kutukan)/i.test(cleanQuery) && upacara.id === 37) {
      score += 85;
      reason = 'Upacara penyucian tingkat tinggi untuk menetralkan sumpah atau kutukan (Caru Balik Sumpah)';
    } else if (/(labuh\s*gentuh|bencana\s*alam|marabahaya|bumi)/i.test(cleanQuery) && upacara.id === 38) {
      score += 85;
      reason = 'Upacara Bhuta Yadnya skala agung untuk menyucikan bumi dari bencana (Caru / Tawur Labuh Gentuh)';
    } else if (/(panca\s*kelud)/i.test(cleanQuery) && upacara.id === 36) {
      score += 85;
      reason = 'Pecaruan tingkat Panca Kelud untuk menyucikan pekarangan dan alam semesta';
    } else if (/(panca\s*sata|lima\s*ayam)/i.test(cleanQuery) && upacara.id === 28) {
      score += 85;
      reason = 'Upacara Bhuta Yadnya dengan sarana kurban lima ekor ayam (Caru Panca Sata)';
    } else if (upacara.id === 27) {
      score += 75;
      reason = 'Upacara Bhuta Yadnya sederhana dengan kurban satu ekor ayam panca warna (Caru Eka Sata)';
    } else if (upacara.id === 28) {
      score += 55;
    } else if (upacara.id === 35) {
      score += 45;
    }
  }

  // r. Kecelakaan di Jalan / Kejadian Berdarah
  const hasKecelakaan = /(kecelakaan|tabrakan|jatuh\s*di\s*jalan|darah\s*di\s*jalan|luka\s*di\s*jalan|meruwat\s*jalan)/i.test(cleanQuery);
  if (hasKecelakaan) {
    const hasBerat = /(berat|parah|korban\s*jiwa|meninggal|patah|banyak\s*darah)/i.test(cleanQuery);
    if (hasBerat) {
      if (upacara.id === 41) {
        score += 85;
        reason = 'Penyucian pekarangan atau lokasi kejadian setelah adanya kecelakaan berat / luka parah (Kecelakaan Abot)';
      } else if (upacara.id === 27) {
        score += 50;
      } else if (upacara.id === 40) {
        score += 40;
      }
    } else {
      if (upacara.id === 40) {
        score += 85;
        reason = 'Pembersihan pekarangan atau lokasi jalan setelah terjadi kecelakaan kecil / luka ringan (Kacelakaan Cilik / Tiba Biasa)';
      } else if (upacara.id === 41) {
        score += 50;
      } else if (upacara.id === 27) {
        score += 45;
      }
    }
  }

  // s. Hari Raya Tertentu (Galungan, Kuningan, Saraswati, Pagerwesi, Siwaratri, Nyepi)
  const hasGalungan = /(galungan|kemenangan\s*dharma|penjor)/i.test(cleanQuery);
  if (hasGalungan) {
    if (upacara.id === 3) {
      score += 85;
      reason = 'Hari raya suci merayakan kemenangan Dharma melawan Adharma (Galungan)';
    } else if (upacara.id === 4) {
      score += 50;
    }
  }

  const hasKuningan = /(kuningan|tamiang|sampian\s*gantung)/i.test(cleanQuery);
  if (hasKuningan && upacara.id === 4) {
    score += 85;
    reason = 'Rangkaian kemenangan Dharma 10 hari setelah Galungan (Kuningan)';
  }

  const hasSaraswati = /(saraswati|turunnya\s*ilmu|ilmu\s*pengetahuan|pustaka\s*suci)/i.test(cleanQuery);
  if (hasSaraswati && upacara.id === 5) {
    score += 85;
    reason = 'Hari suci turunnya ilmu pengetahuan suci ke hadapan Sang Hyang Widhi Wasa (Saraswati)';
  }

  const hasPagerwesi = /(pagerwesi|pagar\s*besi|pramesti\s*guru|keteguhan\s*iman)/i.test(cleanQuery);
  if (hasPagerwesi && upacara.id === 6) {
    score += 85;
    reason = 'Hari suci pemujaan Sang Hyang Pramesti Guru untuk keteguhan batin (Pagerwesi)';
  }

  const hasSiwaratri = /(siwaratri|malam\s*siwa|peleburan\s*dosa|jagra|upawasa)/i.test(cleanQuery);
  if (hasSiwaratri && upacara.id === 7) {
    score += 85;
    reason = 'Malam perenungan suci dan peleburan kegelapan batin ke hadapan Sang Hyang Siwa (Siwaratri)';
  }

  const hasNyepi = /(nyepi|tahun\s*baru\s*saka|catur\s*brata|pengerupukan|tawur\s*kesanga)/i.test(cleanQuery);
  if (hasNyepi && upacara.id === 8) {
    score += 85;
    reason = 'Tahun Baru Saka yang dirayakan dengan Catur Brata Penyepian (Nyepi)';
  }

  const finalReason = reason || upacara.deskripsi || meta?.deskripsiBudaya || 'Sesuai dengan deskripsi yang diberikan';
  return { score, matchedReason: finalReason };
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
   * Menggunakan pendekatan hybrid yang luas dan adaptif:
   * 1. Exact match nama / alias kanonikal di DB secara deterministik.
   * 2. Evaluasi deskripsi berbasis kemiripan semantik, token substantif, toleransi saltik, dan clustering budaya.
   * 3. Konsultasi LLM dengan DAFTAR TERTUTUP yang diperkaya metadata deskripsi dan kategori (fault-tolerant).
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

    // Perkaya kandidat dengan alias kanonikal dan deskripsi budaya jika belum lengkap
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
    const substantiveTokens = queryTokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1);

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
    // TAHAP 1.2: Cek jika input singkat (<= 3 kata) yang hanya berisi kata henti + 1 kata inti cocok persis
    // =========================================================================
    if (queryTokens.length <= 3 && substantiveTokens.length === 1) {
      const coreToken = substantiveTokens[0];
      for (const upacara of allCandidates) {
        const cleanNama = normalizeText(upacara.nama);
        if (cleanNama === coreToken) {
          return {
            matchType: 'exact',
            selectedUpacara: upacara,
            candidates: [
              {
                upacara,
                alasan: `Nama upacara ${upacara.nama} sesuai dengan pencarian`,
                isTopMatch: true,
              },
            ],
            message: 'Upacara sesuai',
          };
        }

        if (upacara.alias) {
          for (const al of upacara.alias) {
            const cleanAl = normalizeText(al);
            if (cleanAl === coreToken) {
              return {
                matchType: 'exact',
                selectedUpacara: upacara,
                candidates: [
                  {
                    upacara,
                    alasan: `Istilah '${al}' sesuai dengan upacara ${upacara.nama}`,
                    isTopMatch: true,
                  },
                ],
                message: 'Upacara sesuai',
              };
            }
          }
        }
      }
    }

    // =========================================================================
    // TAHAP 1.3: Cek toleransi saltik (typo / fuzzy matching) untuk kata tunggal atau frasa pendek
    // =========================================================================
    const candidateToMatch =
      substantiveTokens.length === 1 && queryTokens.length <= 2
        ? substantiveTokens[0]
        : queryTokens.length <= 2
        ? cleanQuery
        : '';

    if (candidateToMatch && candidateToMatch.length >= 4) {
      let bestFuzzyMatch: {
        upacara: UpacaraMatchItem;
        distance: number;
        matchedWord: string;
      } | null = null;

      for (const upacara of allCandidates) {
        const cleanNama = normalizeText(upacara.nama);
        const nameTokens = cleanNama.split(' ');

        // Cek nama lengkap dan token dalam nama upacara
        if (isFuzzyMatch(candidateToMatch, cleanNama)) {
          const dist = levenshteinDistance(candidateToMatch, cleanNama);
          if (!bestFuzzyMatch || dist < bestFuzzyMatch.distance) {
            bestFuzzyMatch = { upacara, distance: dist, matchedWord: upacara.nama };
          }
        } else {
          for (const nw of nameTokens) {
            if (nw.length >= 4 && isFuzzyMatch(candidateToMatch, nw)) {
              const dist = levenshteinDistance(candidateToMatch, nw);
              if (!bestFuzzyMatch || dist < bestFuzzyMatch.distance) {
                bestFuzzyMatch = { upacara, distance: dist, matchedWord: upacara.nama };
              }
            }
          }
        }

        // Cek alias kanonikal
        if (upacara.alias) {
          for (const al of upacara.alias) {
            const cleanAl = normalizeText(al);
            const alTokens = cleanAl.split(' ');
            if (isFuzzyMatch(candidateToMatch, cleanAl)) {
              const dist = levenshteinDistance(candidateToMatch, cleanAl);
              if (!bestFuzzyMatch || dist < bestFuzzyMatch.distance) {
                bestFuzzyMatch = { upacara, distance: dist, matchedWord: al };
              }
            } else {
              for (const at of alTokens) {
                if (at.length >= 4 && isFuzzyMatch(candidateToMatch, at)) {
                  const dist = levenshteinDistance(candidateToMatch, at);
                  if (!bestFuzzyMatch || dist < bestFuzzyMatch.distance) {
                    bestFuzzyMatch = { upacara, distance: dist, matchedWord: al };
                  }
                }
              }
            }
          }
        }
      }

      if (bestFuzzyMatch) {
        return {
          matchType: 'exact',
          selectedUpacara: bestFuzzyMatch.upacara,
          candidates: [
            {
              upacara: bestFuzzyMatch.upacara,
              alasan: `Mendekati '${bestFuzzyMatch.matchedWord}' (${bestFuzzyMatch.upacara.nama})`,
              isTopMatch: true,
            },
          ],
          message: 'Upacara sesuai',
        };
      }
    }

    // =========================================================================
    // TAHAP 2: Hitung Skor Semantik Lokal (Intent, Deskripsi, & Cluster Scoring)
    // =========================================================================
    const scoredList: { upacara: UpacaraMatchItem; score: number; reason: string }[] = [];

    for (const upacara of allCandidates) {
      const meta = UPACARA_KNOWLEDGE_MAP.get(upacara.id);
      const { score, matchedReason } = computeSemanticScore(
        cleanQuery,
        queryTokens,
        substantiveTokens,
        upacara,
        meta
      );
      if (score >= 25) {
        // Tambahkan petunjuk navigasi tab jika relevan
        let enrichedReason = matchedReason;
        if (upacara.jenis_penentuan === 'otonan' && !enrichedReason.includes('Tab Otonan')) {
          enrichedReason += ' (Perhitungan wuku 210 hari juga tersedia di Tab Otonan).';
        } else if (upacara.jenis_penentuan === 'hari_raya_tetap' && !enrichedReason.includes('Tab Hari Raya')) {
          enrichedReason += ' (Jadwal perayaan dapat dilihat langsung di Tab Hari Raya).';
        }

        scoredList.push({
          upacara,
          score,
          reason: enrichedReason,
        });
      }
    }

    // Urutkan kandidat berdasarkan skor tertinggi
    scoredList.sort((a, b) => b.score - a.score);

    // Jika skor kandidat teratas sangat tinggi (>= 90) dan hanya ada 1-2 kata query yang sangat spesifik
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
    // TAHAP 3: Konsultasi LLM dengan DAFTAR TERTUTUP Kaya Konteks (Aturan Mutlak #15)
    // =========================================================================
    const closedListText = allCandidates
      .map((c) => {
        const parts = [`- ID ${c.id}: ${c.nama}`];
        if (c.jenis_penentuan) parts.push(`(Tipe: ${c.jenis_penentuan})`);
        if (c.deskripsi) parts.push(`| Deskripsi: ${c.deskripsi}`);
        if (c.alias && c.alias.length > 0) parts.push(`| Alias/Istilah: ${c.alias.join(', ')}`);
        return parts.join(' ');
      })
      .join('\n');

    const systemPrompt = `Tugas Anda: Analisis deskripsi atau kebutuhan upacara dari pengguna dan HANYA pilih upacara yang relevan dari DAFTAR TERTUTUP berikut:
${closedListText}

PANDUAN:
1. Dilarang mengarang upacara atau ID di luar daftar di atas (Aturan Mutlak #15).
2. Keluarkan dalam format JSON { "matches": [{ "id": number, "alasan": string }] }.
3. Berikan 1 hingga maksimal 3 rekomendasi upacara yang paling relevan. Jika deskripsi pengguna bersifat umum (misalnya tentang tahapan daur hidup anak, kedukaan, atau pembersihan lingkungan), sajikan hingga 3 rekomendasi berurutan dari yang paling sesuai.
4. Tuliskan alasan rekomendasi yang ramah, informatif, dan menjelaskan mengapa upacara tersebut sesuai dengan kebutuhan pengguna.
5. Jika upacara berjenis 'hari_raya_tetap' atau 'otonan', sebutkan dalam alasan bahwa pengguna juga dapat melihat tanggal dan penentuannya melalui tab terkait (Tab Hari Raya atau Tab Otonan).
6. Urutkan matches dari yang paling sesuai di urutan pertama.
7. Jika tidak ada upacara yang cocok, kembalikan { "matches": [] }.`;

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
            alasan: matchItem.alasan || upacara.deskripsi || 'Deskripsi sesuai dengan upacara ini',
            isTopMatch: llmValidCandidates.length === 0,
          });
        }
      }

      // Jika LLM mengembalikan kurang dari 3 tetapi pemeringkat lokal memiliki alternatif terkait kuat, lengkapi hingga 3
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

    // Saran pindah tab bila terindikasi mencari hal spesifik yang lebih cocok di tab lain
    let notFoundMsg = 'Upacara tidak ditemukan';
    if (/(lahir|weton|siklus|210\s*hari|wuku)/i.test(cleanQuery)) {
      notFoundMsg = 'Upacara tidak ditemukan di tab Cari Hari Baik. Untuk perhitungan weton dan jadwal kelahiran, Anda dapat menggunakan Tab Otonan.';
    } else if (/(hari\s*raya|kalender|purnama|tilem|galungan|kuningan|nyepi|saraswati)/i.test(cleanQuery)) {
      notFoundMsg = 'Upacara tidak ditemukan di tab Cari Hari Baik. Untuk perayaan berkala atau hari suci, Anda dapat memeriksa Tab Hari Raya.';
    }

    return {
      matchType: 'not_found',
      candidates: [],
      message: notFoundMsg,
    };
  }
}
