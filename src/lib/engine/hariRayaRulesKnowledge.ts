import { HariRayaAturanItem } from './HariRayaResolver';

/**
 * Pangkalan Data Kanonikal Aturan Penentuan Hari Raya Tetap (35 Aturan Master).
 * Bersumber dari ddl_banten_wariga.sql, seed_hari_raya.sql, dan seed_hari_raya_v2.sql.
 * Digunakan oleh HariRayaResolver serta sebagai fallback memori berkecepatan tinggi
 * bila koneksi database Neon terhambat sandbox atau sedang offline.
 */
export const HARI_RAYA_RULES_KNOWLEDGE: HariRayaAturanItem[] = [
  // 1. Kajeng Kliwon (upacara_id: 1)
  {
    id: 1,
    upacara_id: 1,
    grup: 1,
    wewaran_nilai_id: 6, // Triwara Kajeng
    penjelasan_penentuan: 'Jatuh setiap 15 hari sekali pada pertemuan Triwara Kajeng dan Pancawara Kliwon, sebagai hari pemarisuda (penyucian) serta penyeimbang energi alam semesta.',
    status: 'unverified',
  },
  {
    id: 2,
    upacara_id: 1,
    grup: 1,
    wewaran_nilai_id: 15, // Pancawara Keliwon
    penjelasan_penentuan: 'Jatuh setiap 15 hari sekali pada pertemuan Triwara Kajeng dan Pancawara Kliwon, sebagai hari pemarisuda (penyucian) serta penyeimbang energi alam semesta.',
    status: 'unverified',
  },

  // 2. Purnama / Tilem (upacara_id: 2)
  {
    id: 3,
    upacara_id: 2,
    grup: 1,
    is_purnama: true,
    penjelasan_penentuan: 'Jatuh setiap bulan pada puncak Purnama (bulan penuh / Sukla Paksa) dan Tilem (bulan mati / Krsna Paksa) sebagai pemujaan Sang Hyang Candra dan Sang Hyang Surya.',
    status: 'unverified',
  },
  {
    id: 4,
    upacara_id: 2,
    grup: 2,
    is_tilem: true,
    penjelasan_penentuan: 'Jatuh setiap bulan pada puncak Purnama (bulan penuh / Sukla Paksa) dan Tilem (bulan mati / Krsna Paksa) sebagai pemujaan Sang Hyang Candra dan Sang Hyang Surya.',
    status: 'unverified',
  },

  // 3. Galungan (upacara_id: 3) - Buda Kliwon Dunggulan
  {
    id: 5,
    upacara_id: 3,
    grup: 1,
    wewaran_nilai_id: 25, // Saptawara Buda
    penjelasan_penentuan: 'Jatuh setiap 210 hari pada Buda Kliwon wuku Dunggulan, merayakan hari kemenangan Dharma (kebenaran/kebaikan) melawan Adharma (keburukan/kebatilan).',
    status: 'unverified',
  },
  {
    id: 6,
    upacara_id: 3,
    grup: 1,
    wewaran_nilai_id: 15, // Pancawara Keliwon
    penjelasan_penentuan: 'Jatuh setiap 210 hari pada Buda Kliwon wuku Dunggulan, merayakan hari kemenangan Dharma (kebenaran/kebaikan) melawan Adharma (keburukan/kebatilan).',
    status: 'unverified',
  },
  {
    id: 7,
    upacara_id: 3,
    grup: 1,
    wuku_id: 11, // Wuku Dunggulan
    penjelasan_penentuan: 'Jatuh setiap 210 hari pada Buda Kliwon wuku Dunggulan, merayakan hari kemenangan Dharma (kebenaran/kebaikan) melawan Adharma (keburukan/kebatilan).',
    status: 'unverified',
  },

  // 4. Kuningan (upacara_id: 4) - Saniscara Kliwon Kuningan
  {
    id: 8,
    upacara_id: 4,
    grup: 1,
    wewaran_nilai_id: 28, // Saptawara Saniscara
    penjelasan_penentuan: 'Jatuh 10 hari setelah Galungan pada Saniscara Kliwon wuku Kuningan (setiap 210 hari), sebagai hari pemujaan dan permohonan keselamatan saat para Dewa dan leluhur kembali ke kahyangan.',
    status: 'unverified',
  },
  {
    id: 9,
    upacara_id: 4,
    grup: 1,
    wewaran_nilai_id: 15, // Pancawara Keliwon
    penjelasan_penentuan: 'Jatuh 10 hari setelah Galungan pada Saniscara Kliwon wuku Kuningan (setiap 210 hari), sebagai hari pemujaan dan permohonan keselamatan saat para Dewa dan leluhur kembali ke kahyangan.',
    status: 'unverified',
  },
  {
    id: 10,
    upacara_id: 4,
    grup: 1,
    wuku_id: 12, // Wuku Kuningan
    penjelasan_penentuan: 'Jatuh 10 hari setelah Galungan pada Saniscara Kliwon wuku Kuningan (setiap 210 hari), sebagai hari pemujaan dan permohonan keselamatan saat para Dewa dan leluhur kembali ke kahyangan.',
    status: 'unverified',
  },

  // 5. Saraswati (upacara_id: 5) - Saniscara Umanis Watugunung
  {
    id: 11,
    upacara_id: 5,
    grup: 1,
    wewaran_nilai_id: 28, // Saptawara Saniscara
    penjelasan_penentuan: 'Jatuh pada Saniscara Umanis wuku Watugunung (setiap 210 hari), sebagai hari turunnya ilmu pengetahuan suci melalui pemujaan Sang Hyang Aji Saraswati.',
    status: 'unverified',
  },
  {
    id: 12,
    upacara_id: 5,
    grup: 1,
    wewaran_nilai_id: 11, // Pancawara Umanis
    penjelasan_penentuan: 'Jatuh pada Saniscara Umanis wuku Watugunung (setiap 210 hari), sebagai hari turunnya ilmu pengetahuan suci melalui pemujaan Sang Hyang Aji Saraswati.',
    status: 'unverified',
  },
  {
    id: 13,
    upacara_id: 5,
    grup: 1,
    wuku_id: 30, // Wuku Watugunung
    penjelasan_penentuan: 'Jatuh pada Saniscara Umanis wuku Watugunung (setiap 210 hari), sebagai hari turunnya ilmu pengetahuan suci melalui pemujaan Sang Hyang Aji Saraswati.',
    status: 'unverified',
  },

  // 6. Pagerwesi (upacara_id: 6) - Buda Kliwon Sinta
  {
    id: 14,
    upacara_id: 6,
    grup: 1,
    wewaran_nilai_id: 25, // Saptawara Buda
    penjelasan_penentuan: 'Jatuh 4 hari setelah Saraswati pada Buda Kliwon wuku Sinta (setiap 210 hari), hari pemujaan Sang Hyang Pramesti Guru untuk memagari diri dengan keteguhan iman dan kesucian rohani.',
    status: 'unverified',
  },
  {
    id: 15,
    upacara_id: 6,
    grup: 1,
    wewaran_nilai_id: 15, // Pancawara Keliwon
    penjelasan_penentuan: 'Jatuh 4 hari setelah Saraswati pada Buda Kliwon wuku Sinta (setiap 210 hari), hari pemujaan Sang Hyang Pramesti Guru untuk memagari diri dengan keteguhan iman dan kesucian rohani.',
    status: 'unverified',
  },
  {
    id: 16,
    upacara_id: 6,
    grup: 1,
    wuku_id: 1, // Wuku Sinta
    penjelasan_penentuan: 'Jatuh 4 hari setelah Saraswati pada Buda Kliwon wuku Sinta (setiap 210 hari), hari pemujaan Sang Hyang Pramesti Guru untuk memagari diri dengan keteguhan iman dan kesucian rohani.',
    status: 'unverified',
  },

  // 7. Siwaratri (upacara_id: 7) - Purwaning Tilem Sasih Kapitu
  {
    id: 17,
    upacara_id: 7,
    grup: 1,
    pangelong: 14,
    penjelasan_penentuan: 'Jatuh setahun sekali pada Purwaning Tilem (Pangelong ping 14) sasih Kapitu, sebagai malam perenungan suci dan peleburan kegelapan batin (penyucian diri) ke hadapan Sang Hyang Siwa.',
    status: 'unverified',
  },
  {
    id: 18,
    upacara_id: 7,
    grup: 1,
    sasih_id: 7, // Sasih Kapitu
    penjelasan_penentuan: 'Jatuh setahun sekali pada Purwaning Tilem (Pangelong ping 14) sasih Kapitu, sebagai malam perenungan suci dan peleburan kegelapan batin (penyucian diri) ke hadapan Sang Hyang Siwa.',
    status: 'unverified',
  },

  // 8. Nyepi / Tahun Baru Saka (upacara_id: 8) - Penanggal 1 Sasih Kedasa
  {
    id: 19,
    upacara_id: 8,
    grup: 1,
    penanggal: 1,
    penjelasan_penentuan: 'Penanggal 1 (apisan) sasih Kadasa/Kedasa, sehari setelah Tilem Kasanga.',
    status: 'unverified',
  },
  {
    id: 20,
    upacara_id: 8,
    grup: 1,
    sasih_id: 10, // Sasih Kedasa
    penjelasan_penentuan: 'Penanggal 1 (apisan) sasih Kadasa/Kedasa, sehari setelah Tilem Kasanga.',
    status: 'unverified',
  },

  // 29. Tumpek Landep (upacara_id: 29) - Saniscara Kliwon Landep
  {
    id: 21,
    upacara_id: 29,
    grup: 1,
    wewaran_nilai_id: 28, // Saniscara
    penjelasan_penentuan: 'Saniscara Kliwon wuku Landep (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 22,
    upacara_id: 29,
    grup: 1,
    wewaran_nilai_id: 15, // Kliwon
    penjelasan_penentuan: 'Saniscara Kliwon wuku Landep (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 23,
    upacara_id: 29,
    grup: 1,
    wuku_id: 2, // Wuku Landep
    penjelasan_penentuan: 'Saniscara Kliwon wuku Landep (setiap 210 hari).',
    status: 'unverified',
  },

  // 30. Tumpek Wariga (upacara_id: 30) - Saniscara Kliwon Wariga
  {
    id: 24,
    upacara_id: 30,
    grup: 1,
    wewaran_nilai_id: 28, // Saniscara
    penjelasan_penentuan: 'Saniscara Kliwon wuku Wariga (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 25,
    upacara_id: 30,
    grup: 1,
    wewaran_nilai_id: 15, // Kliwon
    penjelasan_penentuan: 'Saniscara Kliwon wuku Wariga (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 26,
    upacara_id: 30,
    grup: 1,
    wuku_id: 7, // Wuku Wariga
    penjelasan_penentuan: 'Saniscara Kliwon wuku Wariga (setiap 210 hari).',
    status: 'unverified',
  },

  // 31. Tumpek Krulut (upacara_id: 31) - Saniscara Kliwon Krulut
  {
    id: 27,
    upacara_id: 31,
    grup: 1,
    wewaran_nilai_id: 28, // Saniscara
    penjelasan_penentuan: 'Saniscara Kliwon wuku Krulut (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 28,
    upacara_id: 31,
    grup: 1,
    wewaran_nilai_id: 15, // Kliwon
    penjelasan_penentuan: 'Saniscara Kliwon wuku Krulut (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 29,
    upacara_id: 31,
    grup: 1,
    wuku_id: 17, // Wuku Krulut
    penjelasan_penentuan: 'Saniscara Kliwon wuku Krulut (setiap 210 hari).',
    status: 'unverified',
  },

  // 32. Tumpek Uye (upacara_id: 32) - Saniscara Kliwon Uye
  {
    id: 30,
    upacara_id: 32,
    grup: 1,
    wewaran_nilai_id: 28, // Saniscara
    penjelasan_penentuan: 'Saniscara Kliwon wuku Uye (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 31,
    upacara_id: 32,
    grup: 1,
    wewaran_nilai_id: 15, // Kliwon
    penjelasan_penentuan: 'Saniscara Kliwon wuku Uye (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 32,
    upacara_id: 32,
    grup: 1,
    wuku_id: 22, // Wuku Uye
    penjelasan_penentuan: 'Saniscara Kliwon wuku Uye (setiap 210 hari).',
    status: 'unverified',
  },

  // 33. Tumpek Wayang (upacara_id: 33) - Saniscara Kliwon Wayang
  {
    id: 33,
    upacara_id: 33,
    grup: 1,
    wewaran_nilai_id: 28, // Saniscara
    penjelasan_penentuan: 'Saniscara Kliwon wuku Wayang (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 34,
    upacara_id: 33,
    grup: 1,
    wewaran_nilai_id: 15, // Kliwon
    penjelasan_penentuan: 'Saniscara Kliwon wuku Wayang (setiap 210 hari).',
    status: 'unverified',
  },
  {
    id: 35,
    upacara_id: 33,
    grup: 1,
    wuku_id: 27, // Wuku Wayang
    penjelasan_penentuan: 'Saniscara Kliwon wuku Wayang (setiap 210 hari).',
    status: 'unverified',
  },
];

