import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

describe('Database DDL & Seeder Integrity Test (PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
  });

  afterAll(async () => {
    await db.close();
  });

  it('ensures seed files do not contain destructive DDL (DROP/CREATE/ALTER)', () => {
    const seedBantenSql = fs.readFileSync(path.resolve('docs/seed_banten.sql'), 'utf-8');
    const seedWarigaSql = fs.readFileSync(path.resolve('docs/seed_wariga.sql'), 'utf-8');
    const seedHariRayaSql = fs.readFileSync(path.resolve('docs/seed_hari_raya.sql'), 'utf-8');
    const seedBantenV2Sql = fs.readFileSync(path.resolve('docs/seed_banten_v2.sql'), 'utf-8');
    const seedHariRayaV2Sql = fs.readFileSync(path.resolve('docs/seed_hari_raya_v2.sql'), 'utf-8');
    const seedUpdateDeskripsiSql = fs.readFileSync(path.resolve('docs/update_deskripsi_upacara.sql'), 'utf-8');
    const seedV3DewaSql = fs.readFileSync(path.resolve('docs/seed_banten_hari_raya_v3_dewa.sql'), 'utf-8');

    // Should not contain CREATE TABLE, DROP TABLE, ALTER TABLE
    const ddlPattern = /\b(CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE)\b/i;
    expect(seedBantenSql).not.toMatch(ddlPattern);
    expect(seedWarigaSql).not.toMatch(ddlPattern);
    expect(seedHariRayaSql).not.toMatch(ddlPattern);
    expect(seedBantenV2Sql).not.toMatch(ddlPattern);
    expect(seedHariRayaV2Sql).not.toMatch(ddlPattern);
    expect(seedUpdateDeskripsiSql).not.toMatch(ddlPattern);
    expect(seedV3DewaSql).not.toMatch(ddlPattern);
  });

  it('runs initial DDL migration successfully on clean database', async () => {
    const migration = require('../db/migrations/01-initial-ddl-banten-wariga.js');
    
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await migration.up(queryInterface);

    // Verify all 22 tables exist
    const res = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    );
    const tables = res.rows.map((r) => r.tablename);
    expect(tables).toHaveLength(22);
    expect(tables).toContain('kategori_yadnya');
    expect(tables).toContain('upacara');
    expect(tables).toContain('upacara_rangkaian');
    expect(tables).toContain('tingkatan');
    expect(tables).toContain('daerah');
    expect(tables).toContain('lokasi_banten');
    expect(tables).toContain('banten');
    expect(tables).toContain('banten_komponen');
    expect(tables).toContain('sumber');
    expect(tables).toContain('kutipan');
    expect(tables).toContain('banten_set');
    expect(tables).toContain('banten_set_item');
    expect(tables).toContain('validasi_log');
    expect(tables).toContain('wewaran_jenis');
    expect(tables).toContain('wewaran_nilai');
    expect(tables).toContain('wuku');
    expect(tables).toContain('sasih');
    expect(tables).toContain('dewasa');
    expect(tables).toContain('dewasa_syarat');
    expect(tables).toContain('aturan_dewasa_upacara');
    expect(tables).toContain('hari_raya_aturan');
    expect(tables).toContain('validasi_aturan_log');
  });

  it('runs 01-seed-banten successfully', async () => {
    const seederBanten = require('../db/seeders/01-seed-banten.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await seederBanten.up(queryInterface);

    // Check counts from seed_banten
    const countKategori = await db.query<{ count: string }>('SELECT COUNT(*) FROM kategori_yadnya;');
    expect(Number(countKategori.rows[0].count)).toBe(4);

    const countUpacara = await db.query<{ count: string }>('SELECT COUNT(*) FROM upacara;');
    expect(Number(countUpacara.rows[0].count)).toBe(28);

    const countRangkaian = await db.query<{ count: string }>('SELECT COUNT(*) FROM upacara_rangkaian;');
    expect(Number(countRangkaian.rows[0].count)).toBe(22);

    const countTingkatan = await db.query<{ count: string }>('SELECT COUNT(*) FROM tingkatan;');
    expect(Number(countTingkatan.rows[0].count)).toBe(4);

    const countLokasi = await db.query<{ count: string }>('SELECT COUNT(*) FROM lokasi_banten;');
    expect(Number(countLokasi.rows[0].count)).toBe(53);

    const countBanten = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten;');
    expect(Number(countBanten.rows[0].count)).toBe(126);

    const countBantenSet = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten_set;');
    expect(Number(countBantenSet.rows[0].count)).toBe(50);

    const countBantenSetItem = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten_set_item;');
    expect(Number(countBantenSetItem.rows[0].count)).toBe(822);

    const countKutipan = await db.query<{ count: string }>('SELECT COUNT(*) FROM kutipan;');
    expect(Number(countKutipan.rows[0].count)).toBe(172);

    // Verify jenis_penentuan distribution in seed
    const otonanUpacara = await db.query<{ count: string }>(
      "SELECT COUNT(*) FROM upacara WHERE jenis_penentuan = 'otonan';"
    );
    expect(Number(otonanUpacara.rows[0].count)).toBe(1); // id 23

    const hariRayaUpacara = await db.query<{ count: string }>(
      "SELECT COUNT(*) FROM upacara WHERE jenis_penentuan = 'hari_raya_tetap';"
    );
    expect(Number(hariRayaUpacara.rows[0].count)).toBe(8); // id 1-8

    const dewasaUpacara = await db.query<{ count: string }>(
      "SELECT COUNT(*) FROM upacara WHERE jenis_penentuan = 'dewasa';"
    );
    expect(Number(dewasaUpacara.rows[0].count)).toBe(19); // remaining 19
  });

  it('runs 02-seed-wariga successfully', async () => {
    const seederWariga = require('../db/seeders/02-seed-wariga.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await seederWariga.up(queryInterface);

    // Check counts from seed_wariga
    const countWewaranJenis = await db.query<{ count: string }>('SELECT COUNT(*) FROM wewaran_jenis;');
    expect(Number(countWewaranJenis.rows[0].count)).toBe(10);

    const countWewaranNilai = await db.query<{ count: string }>('SELECT COUNT(*) FROM wewaran_nilai;');
    expect(Number(countWewaranNilai.rows[0].count)).toBe(55);

    const countWuku = await db.query<{ count: string }>('SELECT COUNT(*) FROM wuku;');
    expect(Number(countWuku.rows[0].count)).toBe(30);

    const countSasih = await db.query<{ count: string }>('SELECT COUNT(*) FROM sasih;');
    expect(Number(countSasih.rows[0].count)).toBe(12);

    const countDewasa = await db.query<{ count: string }>('SELECT COUNT(*) FROM dewasa;');
    expect(Number(countDewasa.rows[0].count)).toBe(220);

    const countDewasaSyarat = await db.query<{ count: string }>('SELECT COUNT(*) FROM dewasa_syarat;');
    expect(Number(countDewasaSyarat.rows[0].count)).toBe(2520);

    const countAturan = await db.query<{ count: string }>('SELECT COUNT(*) FROM aturan_dewasa_upacara;');
    expect(Number(countAturan.rows[0].count)).toBe(40);

    const countKutipanTotal = await db.query<{ count: string }>('SELECT COUNT(*) FROM kutipan;');
    // 172 from banten + 220 from wariga = 392
    expect(Number(countKutipanTotal.rows[0].count)).toBe(392);

    const countSumberTotal = await db.query<{ count: string }>('SELECT COUNT(*) FROM sumber;');
    expect(Number(countSumberTotal.rows[0].count)).toBe(2);

    // hari_raya_aturan must be 0 rows before 03-seed-hari-raya
    const countHariRayaAturan = await db.query<{ count: string }>('SELECT COUNT(*) FROM hari_raya_aturan;');
    expect(Number(countHariRayaAturan.rows[0].count)).toBe(0);
  });

  it('runs 03-seed-hari-raya successfully', async () => {
    const seederHariRaya = require('../db/seeders/03-seed-hari-raya.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await seederHariRaya.up(queryInterface);

    const countHariRayaAturan = await db.query<{ count: string }>('SELECT COUNT(*) FROM hari_raya_aturan;');
    expect(Number(countHariRayaAturan.rows[0].count)).toBe(20);

    const countKutipanTotal = await db.query<{ count: string }>('SELECT COUNT(*) FROM kutipan;');
    // 172 from banten + 220 from wariga + 8 from hari raya = 400
    expect(Number(countKutipanTotal.rows[0].count)).toBe(400);

    const countSumberTotal = await db.query<{ count: string }>('SELECT COUNT(*) FROM sumber;');
    // 2 from banten/wariga + 6 from hari raya = 8
    expect(Number(countSumberTotal.rows[0].count)).toBe(8);
  });

  it('runs 04-seed-banten-v2 and 05-seed-hari-raya-v2 successfully', async () => {
    const seederBantenV2 = require('../db/seeders/04-seed-banten-v2.js');
    const seederHariRayaV2 = require('../db/seeders/05-seed-hari-raya-v2.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await seederBantenV2.up(queryInterface);

    const countUpacara = await db.query<{ count: string }>('SELECT COUNT(*) FROM upacara;');
    expect(Number(countUpacara.rows[0].count)).toBe(41); // 28 + 13

    const countBanten = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten;');
    expect(Number(countBanten.rows[0].count)).toBe(207); // 126 + 81

    const countBantenSet = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten_set;');
    expect(Number(countBantenSet.rows[0].count)).toBe(71); // 50 + 21

    await seederHariRayaV2.up(queryInterface);

    const countHariRayaAturan = await db.query<{ count: string }>('SELECT COUNT(*) FROM hari_raya_aturan;');
    expect(Number(countHariRayaAturan.rows[0].count)).toBe(35); // 20 + 15
  });

  it('runs 06-update-deskripsi-upacara successfully', async () => {
    const seederUpdate = require('../db/seeders/06-update-deskripsi-upacara.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await seederUpdate.up(queryInterface);

    // Verify deskripsi is updated for e.g. upacara 13, 17, 23
    const res13 = await db.query<{ deskripsi: string }>(
      'SELECT deskripsi FROM upacara WHERE id = 13;'
    );
    expect(res13.rows[0].deskripsi).toContain('Atiwa-tiwa');

    const res23 = await db.query<{ deskripsi: string }>(
      'SELECT deskripsi FROM upacara WHERE id = 23;'
    );
    expect(res23.rows[0].deskripsi).toContain('otonan');
  });

  it('runs 08-seed-banten-hari-raya-v3-dewa successfully', async () => {
    const seederV3Dewa = require('../db/seeders/08-seed-banten-hari-raya-v3-dewa.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    await seederV3Dewa.up(queryInterface);

    const countUpacara = await db.query<{ count: string }>('SELECT COUNT(*) FROM upacara;');
    expect(Number(countUpacara.rows[0].count)).toBe(54); // 41 + 13

    const countBanten = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten;');
    expect(Number(countBanten.rows[0].count)).toBe(249); // 207 + 42

    const countBantenSet = await db.query<{ count: string }>('SELECT COUNT(*) FROM banten_set;');
    expect(Number(countBantenSet.rows[0].count)).toBe(87); // 71 + 16

    const countHariRayaAturan = await db.query<{ count: string }>('SELECT COUNT(*) FROM hari_raya_aturan;');
    expect(Number(countHariRayaAturan.rows[0].count)).toBe(74); // 35 + 39

    const countLokasi = await db.query<{ count: string }>('SELECT COUNT(*) FROM lokasi_banten;');
    expect(Number(countLokasi.rows[0].count)).toBe(83); // 63 + 20

    const countSumber = await db.query<{ count: string }>('SELECT COUNT(*) FROM sumber;');
    expect(Number(countSumber.rows[0].count)).toBe(10); // 9 + 1 (sumber 10)
  });

  it('enforces schema constraints (CHECK and FOREIGN KEY)', async () => {
    // 1. dewasa_syarat num_nonnulls = 1 constraint:
    // Inserting with 2 non-nulls should fail
    await expect(
      db.query(
        'INSERT INTO dewasa_syarat(id, dewasa_id, grup, wewaran_nilai_id, wuku_id) VALUES (99999, 1, 1, 1, 1);'
      )
    ).rejects.toThrow();

    // 2. banten_set asal CHECK constraint:
    // Only 'manual' and 'internet' allowed
    await expect(
      db.query(
        "INSERT INTO banten_set(id, upacara_id, tingkatan_id, asal, status) VALUES (99999, 1, 1, 'invalid_origin', 'unverified');"
      )
    ).rejects.toThrow();

    // 3. Foreign key violation:
    await expect(
      db.query(
        "INSERT INTO banten_set(id, upacara_id, tingkatan_id, asal, status) VALUES (99998, 99999, 1, 'manual', 'unverified');"
      )
    ).rejects.toThrow();
  });

  it('can down migrate and cleanly drop all tables', async () => {
    const migration = require('../db/migrations/01-initial-ddl-banten-wariga.js');
    const queryInterface = {
      sequelize: {
        query: async (sql: string) => {
          return db.exec(sql);
        },
      },
    };

    // Run down
    await migration.down(queryInterface);

    // Verify all tables dropped
    const res = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    );
    expect(res.rows).toHaveLength(0);

    // Re-run up to restore clean state
    await migration.up(queryInterface);
    const resAfter = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    );
    expect(resAfter.rows).toHaveLength(22);
  });
});
