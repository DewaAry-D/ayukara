'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const ddl = `
      -- 1. kategori_yadnya
      CREATE TABLE IF NOT EXISTS kategori_yadnya (
        id    INT PRIMARY KEY,
        nama  VARCHAR(50) NOT NULL UNIQUE
      );

      -- 2. upacara
      CREATE TABLE IF NOT EXISTS upacara (
        id                  INT PRIMARY KEY,
        kategori_yadnya_id  INT REFERENCES kategori_yadnya(id),
        nama                VARCHAR(100) NOT NULL,
        deskripsi           TEXT,
        jenis_penentuan     VARCHAR(20) NOT NULL DEFAULT 'dewasa'
                            CHECK (jenis_penentuan IN ('dewasa','hari_raya_tetap','otonan')),
        UNIQUE (kategori_yadnya_id, nama)
      );

      -- 3. upacara_rangkaian
      CREATE TABLE IF NOT EXISTS upacara_rangkaian (
        id          INT PRIMARY KEY,
        upacara_id  INT NOT NULL REFERENCES upacara(id) ON DELETE CASCADE,
        parent_id   INT REFERENCES upacara_rangkaian(id),
        nama        VARCHAR(100) NOT NULL,
        urutan      SMALLINT,
        deskripsi   TEXT
      );

      -- 4. tingkatan
      CREATE TABLE IF NOT EXISTS tingkatan (
        id         INT PRIMARY KEY,
        nama       VARCHAR(50) NOT NULL UNIQUE,
        urutan     SMALLINT,
        parent_id  INT REFERENCES tingkatan(id)
      );

      -- 5. daerah
      CREATE TABLE IF NOT EXISTS daerah (
        id     INT PRIMARY KEY,
        nama   VARCHAR(100) NOT NULL,
        jenis  VARCHAR(20)
      );

      -- 6. lokasi_banten
      CREATE TABLE IF NOT EXISTS lokasi_banten (
        id    INT PRIMARY KEY,
        nama  VARCHAR(100) NOT NULL UNIQUE
      );

      -- 7. banten
      CREATE TABLE IF NOT EXISTS banten (
        id          INT PRIMARY KEY,
        nama        VARCHAR(100) NOT NULL UNIQUE,
        nama_alias  TEXT[],
        deskripsi   TEXT
      );

      -- 8. banten_komponen
      CREATE TABLE IF NOT EXISTS banten_komponen (
        id             INT PRIMARY KEY,
        banten_id      INT NOT NULL REFERENCES banten(id) ON DELETE CASCADE,
        nama_komponen  VARCHAR(100) NOT NULL,
        jumlah         VARCHAR(50)
      );

      -- 9. sumber
      CREATE TABLE IF NOT EXISTS sumber (
        id                INT PRIMARY KEY,
        jenis             VARCHAR(20) CHECK (jenis IN ('lontar','buku','jurnal','web','narasumber')),
        judul             TEXT,
        penulis           TEXT,
        penerbit          TEXT,
        tahun             SMALLINT,
        url               TEXT,
        domain_diizinkan  BOOLEAN DEFAULT FALSE,
        diakses_pada      TIMESTAMPTZ
      );

      -- 10. kutipan
      CREATE TABLE IF NOT EXISTS kutipan (
        id         INT PRIMARY KEY,
        sumber_id  INT NOT NULL REFERENCES sumber(id) ON DELETE CASCADE,
        teks       TEXT NOT NULL,
        halaman    VARCHAR(20)
      );

      -- 11. banten_set
      CREATE TABLE IF NOT EXISTS banten_set (
        id            INT PRIMARY KEY,
        upacara_id    INT NOT NULL REFERENCES upacara(id),
        tingkatan_id  INT NOT NULL REFERENCES tingkatan(id),
        daerah_id     INT REFERENCES daerah(id),
        rangkaian_id  INT REFERENCES upacara_rangkaian(id),
        asal          VARCHAR(20) NOT NULL CHECK (asal IN ('manual','internet')),
        status        VARCHAR(20) NOT NULL DEFAULT 'unverified'
                      CHECK (status IN ('unverified','verified','rejected')),
        created_at    TIMESTAMPTZ DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_banten_set
        ON banten_set (upacara_id, tingkatan_id, COALESCE(daerah_id,0), COALESCE(rangkaian_id,0));
      CREATE INDEX IF NOT EXISTS idx_banten_set_lookup
        ON banten_set (upacara_id, tingkatan_id, daerah_id, status);

      -- 12. banten_set_item
      CREATE TABLE IF NOT EXISTS banten_set_item (
        id               INT PRIMARY KEY,
        banten_set_id    INT NOT NULL REFERENCES banten_set(id) ON DELETE CASCADE,
        banten_id        INT NOT NULL REFERENCES banten(id),
        lokasi_id        INT REFERENCES lokasi_banten(id),
        jumlah           VARCHAR(50),
        jumlah_min       SMALLINT,
        grup_alternatif  SMALLINT,
        urutan           SMALLINT,
        kutipan_id       INT NOT NULL REFERENCES kutipan(id),
        catatan          TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bsi_set ON banten_set_item (banten_set_id);
      CREATE INDEX IF NOT EXISTS idx_bsi_banten ON banten_set_item (banten_id);

      -- 13. validasi_log
      CREATE TABLE IF NOT EXISTS validasi_log (
        id             INT PRIMARY KEY,
        banten_set_id  INT NOT NULL REFERENCES banten_set(id) ON DELETE CASCADE,
        validator      VARCHAR(100) NOT NULL,
        status_baru    VARCHAR(20) NOT NULL CHECK (status_baru IN ('unverified','verified','rejected')),
        catatan        TEXT,
        created_at     TIMESTAMPTZ DEFAULT now()
      );

      -- 14. wewaran_jenis
      CREATE TABLE IF NOT EXISTS wewaran_jenis (
        id      INT PRIMARY KEY,
        nama    VARCHAR(20) NOT NULL UNIQUE,
        siklus  SMALLINT NOT NULL CHECK (siklus BETWEEN 1 AND 10)
      );

      -- 15. wewaran_nilai
      CREATE TABLE IF NOT EXISTS wewaran_nilai (
        id                INT PRIMARY KEY,
        wewaran_jenis_id  INT NOT NULL REFERENCES wewaran_jenis(id),
        nama              VARCHAR(30) NOT NULL,
        urutan            SMALLINT,
        urip              SMALLINT,
        UNIQUE (wewaran_jenis_id, nama)
      );

      -- 16. wuku
      CREATE TABLE IF NOT EXISTS wuku (
        id      INT PRIMARY KEY,
        nama    VARCHAR(30) NOT NULL UNIQUE,
        urutan  SMALLINT NOT NULL CHECK (urutan BETWEEN 1 AND 30)
      );

      -- 17. sasih
      CREATE TABLE IF NOT EXISTS sasih (
        id      INT PRIMARY KEY,
        nama    VARCHAR(30) NOT NULL UNIQUE,
        urutan  SMALLINT NOT NULL
      );

      -- 18. dewasa
      CREATE TABLE IF NOT EXISTS dewasa (
        id         INT PRIMARY KEY,
        nama       VARCHAR(100) NOT NULL UNIQUE,
        sifat      VARCHAR(10) CHECK (sifat IN ('ayu','ala')),
        deskripsi  TEXT
      );

      -- 19. dewasa_syarat
      CREATE TABLE IF NOT EXISTS dewasa_syarat (
        id                INT PRIMARY KEY,
        dewasa_id         INT NOT NULL REFERENCES dewasa(id) ON DELETE CASCADE,
        grup              SMALLINT NOT NULL DEFAULT 1,
        wewaran_nilai_id  INT REFERENCES wewaran_nilai(id),
        wuku_id           INT REFERENCES wuku(id),
        sasih_id          INT REFERENCES sasih(id),
        penanggal         SMALLINT CHECK (penanggal BETWEEN 1 AND 15),
        pangelong         SMALLINT CHECK (pangelong BETWEEN 1 AND 15),
        is_purnama        BOOLEAN,
        is_tilem          BOOLEAN,
        CHECK (num_nonnulls(wewaran_nilai_id, wuku_id, sasih_id, penanggal,
                            pangelong, is_purnama, is_tilem) = 1)
      );
      CREATE INDEX IF NOT EXISTS idx_dewasa_syarat ON dewasa_syarat (dewasa_id, grup);

      -- 20. aturan_dewasa_upacara
      CREATE TABLE IF NOT EXISTS aturan_dewasa_upacara (
        id                  INT PRIMARY KEY,
        dewasa_id           INT NOT NULL REFERENCES dewasa(id),
        upacara_id          INT REFERENCES upacara(id),
        kategori_yadnya_id  INT REFERENCES kategori_yadnya(id),
        efek                VARCHAR(10) NOT NULL CHECK (efek IN ('larangan','anjuran')),
        prioritas           SMALLINT DEFAULT 0,
        kutipan_id          INT NOT NULL REFERENCES kutipan(id),
        status              VARCHAR(20) NOT NULL DEFAULT 'unverified'
                            CHECK (status IN ('unverified','verified','rejected','konflik')),
        catatan             TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_aturan_lookup ON aturan_dewasa_upacara (upacara_id, status);

      -- 21. hari_raya_aturan
      CREATE TABLE IF NOT EXISTS hari_raya_aturan (
        id                    INT PRIMARY KEY,
        upacara_id            INT NOT NULL REFERENCES upacara(id) ON DELETE CASCADE,
        grup                  SMALLINT NOT NULL DEFAULT 1,
        wewaran_nilai_id      INT REFERENCES wewaran_nilai(id),
        wuku_id               INT REFERENCES wuku(id),
        sasih_id              INT REFERENCES sasih(id),
        penanggal             SMALLINT CHECK (penanggal BETWEEN 1 AND 15),
        pangelong             SMALLINT CHECK (pangelong BETWEEN 1 AND 15),
        is_purnama            BOOLEAN,
        is_tilem              BOOLEAN,
        penjelasan_penentuan  TEXT,
        kutipan_id            INT REFERENCES kutipan(id),
        status                VARCHAR(20) NOT NULL DEFAULT 'unverified'
                              CHECK (status IN ('unverified','verified')),
        CHECK (num_nonnulls(wewaran_nilai_id, wuku_id, sasih_id, penanggal,
                            pangelong, is_purnama, is_tilem) = 1)
      );
      CREATE INDEX IF NOT EXISTS idx_hari_raya_aturan ON hari_raya_aturan (upacara_id, grup);
      CREATE INDEX IF NOT EXISTS idx_hari_raya_aturan_status ON hari_raya_aturan (upacara_id, status);

      -- 22. validasi_aturan_log
      CREATE TABLE IF NOT EXISTS validasi_aturan_log (
        id           INT PRIMARY KEY,
        aturan_id    INT NOT NULL REFERENCES aturan_dewasa_upacara(id) ON DELETE CASCADE,
        validator    VARCHAR(100) NOT NULL,
        status_baru  VARCHAR(20) NOT NULL CHECK (status_baru IN ('unverified','verified','rejected','konflik')),
        catatan      TEXT,
        created_at   TIMESTAMPTZ DEFAULT now()
      );
    `;

    await queryInterface.sequelize.query(ddl);
  },

  async down(queryInterface, _Sequelize) {
    const dropSql = `
      DROP TABLE IF EXISTS validasi_aturan_log CASCADE;
      DROP TABLE IF EXISTS hari_raya_aturan CASCADE;
      DROP TABLE IF EXISTS aturan_dewasa_upacara CASCADE;
      DROP TABLE IF EXISTS dewasa_syarat CASCADE;
      DROP TABLE IF EXISTS dewasa CASCADE;
      DROP TABLE IF EXISTS sasih CASCADE;
      DROP TABLE IF EXISTS wuku CASCADE;
      DROP TABLE IF EXISTS wewaran_nilai CASCADE;
      DROP TABLE IF EXISTS wewaran_jenis CASCADE;
      DROP TABLE IF EXISTS validasi_log CASCADE;
      DROP TABLE IF EXISTS banten_set_item CASCADE;
      DROP TABLE IF EXISTS banten_set CASCADE;
      DROP TABLE IF EXISTS kutipan CASCADE;
      DROP TABLE IF EXISTS sumber CASCADE;
      DROP TABLE IF EXISTS banten_komponen CASCADE;
      DROP TABLE IF EXISTS banten CASCADE;
      DROP TABLE IF EXISTS lokasi_banten CASCADE;
      DROP TABLE IF EXISTS daerah CASCADE;
      DROP TABLE IF EXISTS tingkatan CASCADE;
      DROP TABLE IF EXISTS upacara_rangkaian CASCADE;
      DROP TABLE IF EXISTS upacara CASCADE;
      DROP TABLE IF EXISTS kategori_yadnya CASCADE;
    `;

    await queryInterface.sequelize.query(dropSql);
  },
};

