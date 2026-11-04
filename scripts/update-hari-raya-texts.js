'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const pg = require('pg');

// Zero-dependency .env loader
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const f of envFiles) {
    const fullPath = path.resolve(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL tidak ditemukan di .env atau .env.local');
  }

  console.log('Menghubungkan ke database Neon...');
  const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: dbUrl.includes('sslmode=require')
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });

  await sequelize.authenticate();
  console.log('Koneksi berhasil. Memperbarui teks hari_raya_aturan dan upacara...');

  const hariRayaUpdates = [
    {
      upacaraId: 1,
      penjelasan:
        'Jatuh setiap 15 hari sekali pada pertemuan Triwara Kajeng dan Pancawara Kliwon, sebagai hari pemarisuda (penyucian) serta penyeimbang energi alam semesta.',
    },
    {
      upacaraId: 2,
      penjelasan:
        'Jatuh setiap bulan pada puncak Purnama (bulan penuh / Sukla Paksa) dan Tilem (bulan mati / Krsna Paksa) sebagai pemujaan Sang Hyang Candra dan Sang Hyang Surya.',
    },
    {
      upacaraId: 3,
      penjelasan:
        'Jatuh setiap 210 hari pada Buda Kliwon wuku Dunggulan, merayakan hari kemenangan Dharma (kebenaran/kebaikan) melawan Adharma (keburukan/kebatilan).',
    },
    {
      upacaraId: 4,
      penjelasan:
        'Jatuh 10 hari setelah Galungan pada Saniscara Kliwon wuku Kuningan (setiap 210 hari), sebagai hari pemujaan dan permohonan keselamatan saat para Dewa dan leluhur kembali ke kahyangan.',
    },
    {
      upacaraId: 5,
      penjelasan:
        'Jatuh pada Saniscara Umanis wuku Watugunung (setiap 210 hari), sebagai hari turunnya ilmu pengetahuan suci melalui pemujaan Sang Hyang Aji Saraswati.',
    },
    {
      upacaraId: 6,
      penjelasan:
        'Jatuh 4 hari setelah Saraswati pada Buda Kliwon wuku Sinta (setiap 210 hari), hari pemujaan Sang Hyang Pramesti Guru untuk memagari diri dengan keteguhan iman dan kesucian rohani.',
    },
    {
      upacaraId: 7,
      penjelasan:
        'Jatuh setahun sekali pada Purwaning Tilem (Pangelong ping 14) sasih Kapitu, sebagai malam perenungan suci dan peleburan kegelapan batin (penyucian diri) ke hadapan Sang Hyang Siwa.',
    },
  ];

  for (const item of hariRayaUpdates) {
    await sequelize.query(
      'UPDATE hari_raya_aturan SET penjelasan_penentuan = :penjelasan WHERE upacara_id = :id',
      {
        replacements: { penjelasan: item.penjelasan, id: item.upacaraId },
      }
    );
    console.log(`Updated upacara_id ${item.upacaraId} di hari_raya_aturan.`);
  }

  const upacaraDescs = [
    {
      id: 1,
      desc: 'Hari suci pemarisuda dan penyeimbang energi kosmis alam semesta (bhuwana agung dan bhuwana alit), jatuh setiap 15 hari sekali pada pertemuan Triwara Kajeng dan Pancawara Kliwon.',
    },
    {
      id: 2,
      desc: 'Pemujaan ke hadapan Sang Hyang Candra dan Sang Hyang Surya pada puncak bulan penuh (Sukla Paksa) dan bulan mati (Krsna Paksa) setiap pertengahan dan akhir sasih.',
    },
    {
      id: 3,
      desc: 'Hari raya suci merayakan kemenangan Dharma (kebenaran dan kebajikan) melawan Adharma (kebatilan), jatuh pada Buda Kliwon Dunggulan dengan pemasangan penjor sebagai wujud bakti dan syukur.',
    },
    {
      id: 4,
      desc: 'Rangkaian perayaan kemenangan Dharma yang jatuh pada Saniscara Kliwon Kuningan (10 hari setelah Galungan), memohon berkah keselamatan saat para Dewa dan Pitara kembali ke alam kahyangan.',
    },
    {
      id: 5,
      desc: 'Hari suci turunnya ilmu pengetahuan dan kebijaksanaan ke hadapan Sang Hyang Widhi Wasa dalam manifestasi Dewi Saraswati, dirayakan pada hari terakhir wuku (Saniscara Umanis Watugunung).',
    },
    {
      id: 6,
      desc: 'Hari suci pemujaan Sang Hyang Pramesti Guru yang jatuh pada Buda Kliwon Sinta (4 hari setelah Saraswati) untuk memagari diri dengan keteguhan iman dan rohani berlandaskan ilmu pengetahuan suci.',
    },
    {
      id: 7,
      desc: 'Malam perenungan suci (peleburan kegelapan batin / jagra) ke hadapan Sang Hyang Siwa, jatuh pada Purwaning Tilem Sasih Kapitu melalui brata jagra, upawasa, dan monobrata.',
    },
  ];

  for (const u of upacaraDescs) {
    await sequelize.query('UPDATE upacara SET deskripsi = :desc WHERE id = :id', {
      replacements: { desc: u.desc, id: u.id },
    });
    console.log(`Updated deskripsi upacara id ${u.id}.`);
  }

  console.log('Semua data berhasil diperbarui di database Neon!');
  await sequelize.close();
}

main().catch((err) => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});
