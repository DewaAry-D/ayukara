# AGENTS.md — Ayukara

Panduan untuk agen AI (Claude Code, Codex, Cursor, dll.) dan kontributor yang bekerja di repo ini.
Sumber kebenaran produk: `PRD_Ayukara.md` (Draft v0.1, revisi 4 Nov 2026: Perencana kini 3 tab). Kalau file ini dan PRD berbeda, **PRD menang**, lalu perbarui file ini.

---

## 1. Ringkasan Proyek

**Ayukara** adalah aplikasi web pendamping perencanaan upacara yadnya Hindu Bali.

`/planner` punya **3 tab** yang berujung ke satu halaman hasil `/planner/result` dengan format identik:

| Tab | Input | Bagian tanggal pada hasil |
|---|---|---|
| **Cari Hari Baik** | nama/deskripsi upacara (maks. 300 karakter) → pilih upacara → rentang Dari–Sampai → tingkatan | rekomendasi dewasa ayu ("Paling disarankan" / "Alternatif") |
| **Otonan** | nama (opsional) + tanggal lahir → weton, wuku, 3 otonan terdekat → pilih satu + tingkatan | tanggal otonan + weton + wuku |
| **Hari Raya** | pilih kartu hari raya (8/halaman, cari, pilih tahun) | tanggal "Hari raya berikutnya" + penjelasan penentuan |

Setelah bagian tanggal, ketiganya berbagi langkah yang sama:

1. mengonversi tanggal ke kalender Bali (`balinese-date-js-lib`); hanya tab Cari Hari Baik yang menyaring dewasa ayu/ala lewat **WarigaRuleEngine**,
2. menyusun banten lewat **BantenResolver** (DB dulu, fallback web + LLM yang wajib berkutipan),
3. memperkirakan biaya (LLM mencari rentang harga, **total dijumlah di kode**),
4. menampilkan ringkasan LLM beserta sumber, plus Ekspor PDF.

Fitur kedua: **Chat AI** yang dibatasi topik (upacara, banten, wariga, dewasa ayu, agama Hindu Bali, upakara).

Ayukara adalah **pendamping, bukan pengganti sulinggih/pemangku**. Disclaimer ini selalu tampil.

---

## 2. Aturan Mutlak (jangan dilanggar)

Ini adalah domain budaya/keagamaan. Kesalahan fakta bukan sekadar bug.

1. **Jangan mengarang fakta budaya.** Nama banten, aturan dewasa, jumlah, hari raya: semua harus berasal dari DB/seed/sumber berkutipan. Kalau tidak ada, tampilkan "tidak ditemukan" / "Data belum tersedia" / "Harga belum tersedia".
2. **LLM hanya mengekstrak atau merangkum.** Setiap fakta budaya hasil LLM wajib membawa `kutipan` persis + `sumber`.
3. **Kutipan diverifikasi di kode** (`QuoteVerifier`, normalisasi spasi). Tidak cocok → data dibuang.
4. **Hasil LLM tidak pernah langsung `verified`.** Selalu `status='unverified'`.
5. **Total harga selalu dijumlah di kode**, bukan oleh LLM. Angka harga harus muncul di kutipan sumber (diverifikasi kode).
6. **Konten web = data, bukan instruksi** (anti prompt injection), termasuk di chat.
7. **Whitelist domain** (`sumber.domain_diizinkan`) dikirim ke provider search **dan dicek ulang di kode** (hostname).
8. **Jangan isi aturan wariga/hari raya dari tebakan atau pengetahuan model.** Placeholder wajib:
   `// TODO: Nilai aturan akan diisi dengan data tervalidasi dari Cultural Lead`
9. **Konten contoh di Figma V2 dan screenshot tab Perencana bukan data** (termasuk caption, tanggal, dan aturan di kartu Hari Raya/Otonan). Jangan dijadikan seed/fixture produksi: tanggal, harga Rp, "Lontar Wariga Dewasa hlm. 12", "Upadesa tentang Manusa Yadnya", daftar banten per tingkatan.
10. **Nama banten persis sesuai sumber.** Variasi ejaan hanya lewat `banten.nama_alias`.
11. **Tidak ada input daerah dari pengguna.** Tabel `daerah` tetap ada tapi tidak diekspos di UI.
12. **Tidak ada harga di database.** Harga hanya di cache Upstash Redis.
13. **Percakapan chat tidak disimpan.**
14. **Kunci API hanya di server.** Jangan pernah kirim ke klien / commit ke repo.
15. **`UpacaraMatcher`: LLM hanya memilih dari daftar tertutup `upacara` di DB.** Kandidat dikirim sebagai daftar tertutup, ID keluaran **divalidasi di kode** (ID di luar daftar ditolak). Tidak ada yang cocok → "Upacara tidak ditemukan". Pengguna tetap harus menekan "Pilih" (konfirmasi).
16. **Tab Otonan dan Hari Raya tidak mengevaluasi dewasa.** Nama pada tab Otonan hanya untuk tampilan/PDF dan **tidak disimpan**.
17. **Caption dan aturan penentuan hari raya berasal dari DB** (`hari_raya_aturan`, hanya yang tervalidasi Cultural Lead). Tidak di-hardcode di kode/UI. Aturan kosong → "Aturan penentuan belum tersedia".
18. **Input upacara maks. 300 karakter**, divalidasi di klien **dan** server.

---

## 3. Stack

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router), React Server/Client Components |
| Backend | Route Handlers `src/app/api/*` (`/api/plan`, `/api/chat`, `/api/price`) + Server Actions (form Perencana, aksi validasi) |
| Database | PostgreSQL di **Neon**, akses lewat **Sequelize** (`postgres`, driver `pg`), migrasi **sequelize-cli** |
| LLM | Provider-agnostic (`src/lib/llm/`), default OpenAI (GPT), dipilih lewat `LLM_PROVIDER` / `LLM_MODEL` |
| Web search | Provider-agnostic (`src/lib/search/`), default Tavily; alternatif Exa / Brave (`SEARCH_PROVIDER`) |
| Cache harga | Upstash Redis via `@upstash/redis` (REST) |
| Kalender | `balinese-date-js-lib` |
| Hosting | Vercel (Neon branch per Preview Deployment) |
| Test | **Vitest** (`vitest.config.ts`), **PGlite** untuk uji DB |
| PDF | TODO: library render PDF belum dipilih (server-side, Node runtime) |

> Cek versi Next.js/Sequelize/library yang benar-benar terpasang di `package.json` dan baca dokumentasinya sebelum memakai API yang kamu "ingat". Jangan asumsi.

---

## 4. Struktur Repo (sesuai struktur yang dipakai tim)

Alias TypeScript: `@/*` → `./src/*`. Semua path di dokumen ini relatif terhadap root repo `ayukara/`.

```
ayukara/
├─ .env.local                  # env lokal (JANGAN di-commit); template: .env.example
├─ .sequelizerc                # path sequelize-cli → src/lib/db/
├─ next.config.ts · package.json · tsconfig.json · vitest.config.ts
├─ public/images/hero-pawiwahan.jpg     # placeholder hero (Figma V2)
└─ src/
   ├─ app/                     # ROUTING & ENDPOINT (Next.js App Router)
   │  ├─ layout.tsx · page.tsx (Beranda) · globals.css
   │  ├─ planner/page.tsx · planner/result/page.tsx
   │  ├─ chat/page.tsx
   │  └─ api/{plan,price,chat,pdf}/route.ts    # wajib: export const runtime = 'nodejs'
   ├─ components/              # UI bersama
   │  ├─ layout/{Navbar,Footer}.tsx
   │  └─ ui/{VerificationBadge,CulturalDisclaimer,PriceDisclaimer,CitationBadge}.tsx
   ├─ features/                # UI + Server Actions per fitur
   │  ├─ planner/{actions.ts,types.ts,components/*}
   │  ├─ chat/{components/*,hooks/useChatStream.ts}
   │  └─ validation/{actions.ts,components/ValidationTable.tsx}   # persiapan M7
   └─ lib/                     # LOGIKA DOMAIN & INFRA: tanpa dependensi Next.js
      ├─ config/warigaRules.draft.json
      ├─ calendar/{CalendarAdapter,types}.ts
      ├─ engine/{evaluators,WarigaRuleEngine,HariRayaResolver,OtonanCalculator}.ts   # OtonanCalculator = TAMBAHAN
      ├─ banten/{BantenResolver,QuoteVerifier}.ts
      ├─ upacara/UpacaraMatcher.ts   # TAMBAHAN (FR-P1a)
      ├─ pricing/PriceEstimator.ts
      ├─ summary/SummaryWriter.ts
      ├─ chat/{TopicGuard,ChatService}.ts
      ├─ pdf/PdfGenerator.ts
      ├─ llm/{LlmClient,OpenAiLlmClient,LlmExtractor,MockLlmClient}.ts
      ├─ search/{SearchClient,TavilySearchClient,ExaSearchClient,BraveSearchClient,MockSearchClient}.ts
      ├─ cache/{PriceCache,UpstashPriceCache,InMemoryPriceCache}.ts
      ├─ db/
      │  ├─ index.ts (singleton Sequelize) · config.js (untuk sequelize-cli)
      │  ├─ repositories/{RuleRepository,BantenRepository}.ts
      │  ├─ models/ (22 model + index.ts untuk asosiasi)
      │  ├─ migrations/01-initial-ddl-banten-wariga.js   # 22 tabel (sudah termasuk jenis_penentuan & hari_raya_aturan)
      │  └─ seeders/{01-seed-banten,02-seed-wariga}.js
      └─ __tests__/*.test.ts
```

**Aturan arah dependensi (wajib):**

- `src/lib/**` **tidak boleh** mengimpor `next/*`, `react`, `@/app`, `@/components`, atau `@/features`.
- `src/features/**` dan `src/app/**` boleh mengimpor `@/lib/**`; `src/components/**` tidak mengimpor `@/lib/**` kecuali tipe.
- Route Handlers dan Server Actions hanya **merakit** dependensi (`createLlmClient`, `createSearchClient`, repository, cache) lalu memanggil modul domain. Tidak ada logika budaya di dalam `route.ts` atau `actions.ts`.
- Modul domain tidak mengimpor model Sequelize langsung; lewat `RuleRepository` / `BantenRepository`.

**Perubahan struktur akibat PRD revisi 4 Nov 2026 (3 tab Perencana):**

- **Hapus rencana `migrations/02-add-hari-raya-tetap.js`.** `upacara.jenis_penentuan` dan tabel `hari_raya_aturan` sudah ada di `ddl_banten_wariga.sql` (22 tabel), jadi ikut migrasi `01`.
- **Modul domain baru:** `src/lib/upacara/UpacaraMatcher.ts` dan `src/lib/engine/OtonanCalculator.ts` (keduanya menerima `CalendarAdapter` / `LlmClient` / repository lewat DI; tetap tanpa dependensi Next.js).
- **Komponen tab di `src/features/planner/components/`** (menggantikan satu `PlannerForm` tunggal): `PlannerTabs`, tab Cari Hari Baik (`UpacaraSearchBox`, `UpacaraCandidateList`, form rentang + `TingkatanCards`), tab Otonan (`OtonanForm`, `OtonanCards`), tab Hari Raya (`HariRayaGrid`, `HariRayaDetail`), dan satu `DateSection` bervarian tiga untuk halaman hasil (FR-P13). Nama berkas hanya saran; sesuaikan.
- **Pencocokan upacara** lewat Server Action di `features/planner/actions.ts` (PRD menyebut Server Actions untuk form Perencana; PRD tidak menetapkan endpoint khusus, jadi konfirmasi bila ingin `route.ts` tersendiri).
- Tes baru: `OtonanCalculator.test.ts`, `UpacaraMatcher.test.ts` di `src/lib/__tests__/`.

**Hal yang belum ada di struktur dan perlu ditambahkan:**

- `.env.example` (tanpa nilai rahasia), dan pastikan `.env.local` ada di `.gitignore`.
- `docs/` untuk `PRD_Ayukara.md`, `ddl_banten_wariga.sql`, `seed_banten.sql`, `seed_wariga.sql`, ERD. Seeder `01/02` perlu sumber SQL yang bisa dibaca (mis. `docs/data/` atau `src/lib/db/seeders/sql/`); tentukan satu lokasi dan catat di sini.
- CI (lint + typecheck + test).
- Tes yang belum punya berkas di `__tests__/`: `CalendarAdapter`, `BantenResolver`, `SearchClient` (filter whitelist), `LlmExtractor` (kontrak JSON), `UpstashPriceCache`/fallback Redis, `SummaryWriter`, `ChatService`. Lihat §9.
- `warigaRules.draft.json` di `src/lib/config/` adalah **draf** (belum ada aturan sasih & pancawara, masih ada KONFLIK). Jangan dimuat sebagai aturan produksi sebelum ⛔ Cultural Lead memutuskan.

---

## 5. Perintah

`package.json` saat ini memuat script `dev`, `build`, `test`, `db:migrate`. Script lain di bawah belum ada; tambahkan lalu perbarui bagian ini.

```bash
npm install
npm run dev              # Next.js dev server
npm run build
npm test                 # Vitest: unit + DB test (PGlite)
npm run db:migrate       # sequelize-cli db:migrate (baca .sequelizerc)
# yang perlu ditambahkan:
# npm run lint · npm run typecheck
# npm run db:seed        # urutan: 01-seed-banten lalu 02-seed-wariga
# npm run db:reset       # HANYA dev/branch lokal
```

Ganti `npm` dengan package manager yang benar-benar dipakai tim bila berbeda.

---

## 6. Arsitektur & Modul

Prinsip: **separation of concerns, dependency injection, fungsi evaluator murni.** Modul domain tidak mengimpor SDK provider (OpenAI, Tavily, Sequelize model, Upstash) secara langsung. Semuanya lewat interface yang diinjeksi.

| Modul | Tanggung jawab | Diuji dengan |
|---|---|---|
| `CalendarAdapter` | Bungkus `balinese-date-js-lib`; petakan ke ID `wewaran_nilai`, `wuku`, `sasih`, penanggal/pangelong, purnama/tilem | mock library |
| `WarigaRuleEngine` | Evaluasi murni atas aturan terinjeksi: `evaluate(date)`, `evaluateAll(range)`, `filter(range, upacara)` | fixture aturan |
| evaluator `checkList`, `checkKombinasi` | Fungsi murni | unit |
| `HariRayaResolver` | "Hari raya berikutnya" (tahun yang dipilih/terdekat) dari `hari_raya_aturan` + penjelasan penentuan; menerima `CalendarAdapter` & repository lewat DI | fixture kalender + aturan |
| `OtonanCalculator` | Weton (saptawara + pancawara), wuku, dan 3 otonan terdekat (siklus 210 hari) dari tanggal lahir; label "Terdekat" / "otonan ke-n" | fixture kalender |
| `UpacaraMatcher` | Nama → cocok persis/normalisasi di DB; deskripsi → LLM memilih dari daftar tertutup DB, ID divalidasi | mock LLM + fixture |
| `RuleRepository` / `BantenRepository` | Baca aturan/set banten dari DB | PGlite |
| `BantenResolver` | DB → (fallback) search whitelist → LLM ekstraksi → QuoteVerifier → simpan `unverified` → atau "tidak ditemukan" | mock semua |
| `QuoteVerifier` | Cocokkan kutipan persis (normalisasi spasi) | unit murni |
| `PriceEstimator` | Rentang harga per item + sumber; total di kode; cache harian | unit + mock |
| `SummaryWriter` | Ringkasan dari data terstruktur saja | mock LLM |
| `TopicGuard` | Klasifikasi `in_scope` / `out_of_scope` / `ambiguous` | dataset uji |
| `ChatService` | Orkestrasi chat dengan grounding & sitasi [n] | integrasi |

### Interface kunci

```ts
interface LlmClient {
  complete(args: { system: string; messages: Msg[]; jsonSchema?: object }): Promise<{ text?: string; json?: unknown }>;
  stream(args: { system: string; messages: Msg[] }): AsyncIterable<string>;
}
interface SearchClient {
  search(query: string, opts: { includeDomains: string[]; maxResults: number }):
    Promise<Array<{ url: string; title: string; content: string }>>;
}
interface PriceCache {
  get(bantenId: number, tanggalWita: string): Promise<PriceEntry | null>;
  set(bantenId: number, tanggalWita: string, value: PriceEntry, expireAt: Date): Promise<void>;
}
```

Guardrail dan validasi JSON schema berada **di luar** adapter agar perilaku sama untuk semua provider.

### Semantik WarigaRuleEngine

- `dewasa_syarat`: satu baris = satu syarat. **Dalam satu `grup` = AND, antar `grup` = OR.**
- Satu baris hanya boleh punya **tepat satu** kolom syarat terisi (CHECK `num_nonnulls = 1`).
- `aturan_dewasa_upacara`: efek `larangan` / `anjuran` per upacara (`upacara_id`), per kategori yadnya, atau semua (`upacara_id` NULL). Hierarki **wewaran < wuku < sasih** (yang lebih tinggi menimpa). Cara hierarki diturunkan dari data (kolom `prioritas` default 0 di seed) harus eksplisit di kode dan di-test.
- Konfigurasi engine: mode "hanya `verified`" untuk produksi (keputusan tampilkan unverified dengan label masih TODO).
- Ranking "Paling disarankan" / "Alternatif": TODO persetujuan Cultural Lead. Jangan menciptakan aturan ranking sendiri tanpa menandainya TODO.

### Tiga tab Perencana (FR-P1, P1a–P1d, P13)

**Cari Hari Baik**
1. Input teks maks. 300 karakter + tombol "Cari upacara yang sesuai".
2. `UpacaraMatcher`: (a) cocok persis/normalisasi dengan `upacara.nama` atau alias → teks inline "upacara sesuai", tanpa daftar; (b) deskripsi → LLM memilih dari daftar tertutup → "Upacara Teridentifikasi" (teratas berlabel "Paling sesuai", sisanya tombol "Pilih"); (c) tidak ada yang cocok → "Upacara tidak ditemukan"; boleh menyarankan pindah ke tab Otonan/Hari Raya bila deskripsi lebih cocok.
3. Setelah "Pilih" tombol menjadi "Terpilih" dan halaman auto-scroll ke Dari–Sampai (+ chip Bulan ini / 3 bulan ke depan / Tahun ini / Tahun depan), lalu tingkatan Nista/Madya/Utama, lalu "Lihat Rekomendasi".
4. Setiap hari dalam rentang dievaluasi `WarigaRuleEngine` (semantik §6).
5. Belum diputuskan (⛔): apakah kandidat hanya upacara ber-`jenis_penentuan='dewasa'` atau semua, dan apa yang terjadi bila pengguna memilih upacara bertipe `hari_raya_tetap`/`otonan` di tab ini. Buat sebagai parameter yang mudah diganti.

**Otonan**
1. Nama (opsional) + tanggal lahir; setelah menekan OK di kalender, `OtonanCalculator` menampilkan weton, wuku, dan 3 otonan terdekat (siklus 210 hari), yang terdekat berlabel "Terdekat", masing-masing "otonan ke-n".
2. Pengguna memilih satu tanggal, tingkatan, lalu "Lihat Kebutuhan Banten". **Tanpa evaluasi dewasa.**
3. Acuan "otonan ke-n" (dihitung dari kelahiran) dan tanggal acuan "terdekat" menunggu Cultural Lead (⛔). Jadikan tanggal acuan parameter injeksi; jangan mengasumsikan.
4. Upacara untuk banten dipilih lewat `jenis_penentuan='otonan'` (bukan hard-code ID).

**Hari Raya**
1. Grid kartu dari `upacara` dengan `jenis_penentuan='hari_raya_tetap'`: 8 per halaman, kotak pencarian, pagination, chip tahun.
2. Klik kartu → `HariRayaResolver` → "Hari raya berikutnya: <tanggal>" + `penjelasan_penentuan`. Aturan kosong/belum verified → "Aturan penentuan belum tersedia". Jangan menebak.
3. Hari raya berbasis sasih (mis. Nyepi, Siwaratri) bergantung pada akurasi sasih/penanggal-pangelong library → verifikasi dengan fixture tervalidasi (⛔).
4. **Tidak ada pemilih tingkatan di tab ini.** Cara menentukan tingkatan untuk banten (default, semua tingkatan, atau tambah pemilih) belum diputuskan (⛔); jangan memilih sendiri.

**Halaman hasil seragam (FR-P13):** `/planner/result` memakai komponen yang sama untuk ketiga tab. Hanya bagian tanggal yang bervarian; banten, harga, ringkasan, dan PDF identik.

### Estimasi harga

- Cache per hari: key `harga:{banten_id}:{YYYY-MM-DD}` (tanggal **WITA / Asia/Makassar**), `EXPIREAT` 23:59:59 WITA.
- Hasil `tidak_ditemukan` juga di-cache.
- Redis error/timeout → log warning, **lanjut search live**; gagal tulis cache diabaikan.
- Per item: `{harga_min, harga_max, mata_uang:'IDR', url_sumber, kutipan, fetched_at, status}`.
- Total = Σmin–Σmax hanya dari item bersumber, plus keterangan jumlah item tanpa harga. Kalikan `jumlah`/`jumlah_min` bila ada (aturan satuan/soroh: TODO).
- Disclaimer tetap: "Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah."

---

## 7. Database

### Aturan umum

- **PK `INT` diisi eksplisit.** Jangan pakai `SERIAL`/`autoIncrement`. Seed memakai ID tetap, jadi tentukan strategi ID untuk baris baru yang dibuat runtime (mis. `MAX(id)+1` dalam transaksi, atau sequence manual) dan catat keputusannya.
- Migrasi diturunkan dari `ddl_banten_wariga.sql`: **pertahankan semua CHECK, UNIQUE, index** (termasuk `uq_banten_set` dengan `COALESCE(daerah_id,0)` dan `COALESCE(rangkaian_id,0)`, yang perlu SQL mentah di migrasi).
- Model Sequelize di `src/lib/db/models/` (22 model, satu per tabel DDL); domain hanya lewat repository. Konfigurasi CLI di `src/lib/db/config.js` + `.sequelizerc`; koneksi runtime di `src/lib/db/index.ts`.
- Koneksi: connection string **pooled** Neon (`DATABASE_URL`), instance Sequelize **di-cache di scope modul**, `pool.max` kecil, idle timeout pendek (nilai final TODO setelah uji beban).
- Handler yang memakai DB wajib `export const runtime = 'nodejs'` (bukan Edge).
- 22 tabel: lihat PRD §8. `banten_set_item.kutipan_id` dan `aturan_dewasa_upacara.kutipan_id` **NOT NULL**: tidak boleh ada data tanpa bukti.

### Skema penentuan tanggal (SUDAH ada di `ddl_banten_wariga.sql`)

Berkas DDL terbaru (22 tabel) sudah memuat dua hal berikut, jadi keduanya ikut **migrasi awal** (tidak ada migrasi terpisah):

- `upacara.jenis_penentuan VARCHAR(20) NOT NULL DEFAULT 'dewasa' CHECK (IN ('dewasa','hari_raya_tetap','otonan'))`. Pemetaan: `dewasa` → tab Cari Hari Baik, `hari_raya_tetap` → tab Hari Raya, `otonan` → tab Otonan.
- `hari_raya_aturan`: `id`, `upacara_id` (FK, ON DELETE CASCADE), `grup`, `wewaran_nilai_id`, `wuku_id`, `sasih_id`, `penanggal`, `pangelong`, `is_purnama`, `is_tilem` (CHECK `num_nonnulls = 1`, sama seperti `dewasa_syarat`; DAN dalam grup, ATAU antar-grup), `penjelasan_penentuan`, `kutipan_id` (nullable), `status` (**hanya** `'unverified'`/`'verified'`, default `'unverified'`); index `(upacara_id, grup)` dan `(upacara_id, status)`. Tidak ada kolom `catatan`.
- **Isi `hari_raya_aturan` saat ini 0 baris. Itu sengaja.** Mengisinya = TODO Cultural Lead; jangan di-seed dari tebakan. Konsekuensinya semua kartu Hari Raya menampilkan "Aturan penentuan belum tersedia" sampai data masuk.
- Evaluator `checkList`/`checkKombinasi` dapat dipakai ulang untuk `hari_raya_aturan` karena strukturnya sama.

### Seed: jebakan yang sudah diketahui

| Hal | Detail |
|---|---|
| `seed_banten.sql` versi terbaru | **Hanya `BEGIN; INSERT ...; COMMIT;`, tanpa DDL** (jalankan setelah migrasi). Versi lama berisi `DROP TABLE ... CASCADE` + `CREATE TABLE`: **jangan dipakai.** Tambahkan tes yang memastikan berkas seed tidak mengandung `DROP`/`CREATE`/`ALTER`. |
| `jenis_penentuan` di seed banten | Seed sudah mengisi: `hari_raya_tetap` untuk id 1–8 (Kajeng Kliwon, Purnama/Tilem, Galungan, Kuningan, Saraswati, Pagerwesi, Siwaratri, Nyepi/Tahun Baru Saka), `otonan` untuk id 23 (Otonan Bayi Umur 6 Bulan), `dewasa` untuk 19 sisanya. **PRD menulis "semua 28 masih default dewasa" dan menandai pemetaan sebagai TODO Cultural Lead**, jadi perlakukan nilai seed sebagai **sementara/belum tervalidasi** (⛔). Jangan ubah tanpa persetujuan. |
| Urutan seed | **banten dulu, baru wariga.** `aturan_dewasa_upacara` di seed_wariga merujuk `kategori_yadnya` dari seed_banten. |
| ID | Tidak bentrok: banten memakai `sumber` 1 & `kutipan` 1–172; wariga memakai `sumber` 2 & `kutipan` 1001–1220. Pertahankan rentang ini. |
| `asal` | DDL membatasi `banten_set.asal IN ('manual','internet')`, sedangkan PRD §11 menulis `manual\|llm`. **Pakai `'internet'` untuk hasil fallback web+LLM** sampai keputusan disahkan; jangan ubah CHECK tanpa persetujuan. |
| Wewaran/wuku/sasih | Master diisi urutan kalender standar, **perlu dicek Cultural Lead**. Cek juga ejaan (mis. `Keliwon` di seed vs keluaran library) saat membuat mapping di `CalendarAdapter`. |
| Isi seed | banten: 4 kategori, 28 upacara, 22 rangkaian, 4 tingkatan, 53 lokasi, 126 banten, 172 kutipan, 50 set, 822 item. Wariga: 220 dewasa (127 ayu / 48 ala / 45 tanpa sifat), 2.520 syarat, 40 aturan (`seed_wariga.sql` tidak berubah dari versi sebelumnya). `hari_raya_aturan`: 0 baris. Semua **unverified**. |

Keputusan penamaan yang sudah disepakati (jangan diubah sepihak):
"Sodan/Rayunan/Ajuman" = satu banten (Soda/Dodan = salah tulis); "Ajuman" berdiri sendiri tetap terpisah; Suci Sari/Alit, Suci Laksana, Suci dicatat terpisah; Otonan memakai bentuk garis miring.

---

## 8. Konvensi Kode

- TypeScript strict. Bahasa UI: **Indonesia**. Identifier kode boleh Inggris atau mengikuti istilah domain (`banten`, `dewasa`, `wuku`); konsisten dengan nama tabel.
- Fungsi evaluator **murni** (tanpa I/O, tanpa `Date.now()` tersembunyi; tanggal masuk sebagai argumen).
- Semua zona waktu eksplisit: WITA (`Asia/Makassar`) untuk cache harga dan tampilan tanggal pengambilan.
- Output LLM selalu lewat JSON schema + validasi (mis. zod) sebelum dipakai.
- Panggilan eksternal (LLM/search/Redis) punya **timeout** dan penanganan error; alur search+LLM+harga bisa panjang (perhatikan `maxDuration` Vercel; pecah langkah/stream; nilai TODO sesuai paket).
- Chat memakai streaming respons.
- Jangan log kutipan pengguna/chat ke penyimpanan persisten (FR-C8). Log anonim untuk metrik: TODO konfirmasi.
- Label data `unverified` wajib tampil di UI/PDF bila datanya unverified (desain label: TODO).
- Komentar `TODO` untuk hal yang menunggu Cultural Lead/product owner; **jangan mengisi nilai sendiri**.

---

## 9. Pengujian (Definition of Done tingkat repo)

- Lokasi tes: `src/lib/__tests__/*.test.ts`, dikonfigurasi `vitest.config.ts` (alias `@/*`, PGlite).
- Tidak ada panggilan jaringan di test: pakai `MockLlmClient`, `MockSearchClient`, `InMemoryPriceCache`.
- Wajib ada test untuk:
  - `checkList`, `checkKombinasi`, grup DAN/ATAU, prioritas wewaran<wuku<sasih
  - `HariRayaResolver`: tahun dipilih, tahun terdekat, aturan kosong/unverified → "Aturan penentuan belum tersedia"
  - `OtonanCalculator`: weton & wuku dari fixture; 3 kemunculan berjarak 210 hari; label "Terdekat" / "otonan ke-n"
  - `UpacaraMatcher`: nama valid (inline), deskripsi → daftar, **ID di luar DB ditolak**, tidak ditemukan, batas 300 karakter, injection di teks deskripsi
  - `QuoteVerifier`: cocok, tidak cocok, beda spasi
  - `PriceEstimator`: penjumlahan, item tanpa harga, cache hit/miss, kedaluwarsa akhir hari WITA, Redis down
  - `SearchClient` wrapper: domain di luar whitelist dibuang walau dikembalikan provider; hasil kosong
  - `BantenResolver`: DB hit, kutipan palsu ditolak, tidak ditemukan
  - `TopicGuard`: dataset in/out-of-scope + ambiguous
- Test DB: DDL (migrasi) + seed_banten + seed_wariga jalan tanpa error di PGlite/PostgreSQL.
- Fixture kalender: **nilai harapan diisi Cultural Lead (TODO)**. Boleh membuat struktur fixture, jangan mengarang nilai "benar".
- Red-team: prompt injection (termasuk lewat konten web), di luar topik, permintaan mengarang.
- Sebelum menyatakan tugas selesai: `lint`, `typecheck`, `test` hijau.

---

## 10. Batasan Kerja Agen

**Boleh tanpa bertanya:** menulis kode/test di `src/lib/`, `src/app/`, `src/features/`, `src/components/`, `src/lib/__tests__/`; membuat migrasi dari DDL yang ada; membuat mock/fixture struktural.

**Tanya dulu:**
- mengubah DDL/CHECK yang sudah ada, mengubah nilai `jenis_penentuan` di seed, atau mengisi `hari_raya_aturan`
- menambah/menghapus domain di whitelist
- memilih library PDF, provider search/LLM final, nilai `pool.max` / `maxDuration`
- mengubah aturan ranking, aturan hari raya, atau status data menjadi `verified`
- menambah dependensi besar

**Jangan pernah:** mengisi data budaya dari pengetahuan sendiri; menandai data `verified` lewat kode non-validator; menyimpan harga di DB; mengekspos kunci API; menyimpan riwayat chat; menjalankan seed versi lama yang berisi DDL (`DROP TABLE`/`CREATE TABLE`) pada DB yang sudah termigrasi; memakai konten mockup Figma sebagai data.

---

## 11. Fase Pengerjaan

Fase mengikuti milestone M1–M9 di PRD §16. Tanggal masih TODO. Setiap fase punya **Definition of Done (DoD)**; jangan lanjut menandai selesai sebelum DoD terpenuhi. Item bertanda ⛔ menunggu keputusan manusia (Cultural Lead / product owner) dan **tidak boleh diisi sendiri**.

```
Fase 0 Fondasi ─► Fase 1 Data ─► Fase 2 Engine ─► Fase 3 BantenResolver ─► Fase 4 Harga+Ringkasan
                                      │                                          │
                                      └──────────► Fase 5 UI+PDF ◄───────────────┘
                                                        │
                                   Fase 6 Chat AI ◄─────┤
                                                        ▼
                                              Fase 7 Validasi ─► Fase 8 QA & Rilis ─► Fase 9 Mobile
```

Fase 5 dapat dimulai paralel dengan kontrak/stub setelah Fase 2 menetapkan tipe data hasil.

### Fase 0 — Fondasi Proyek
**Tujuan:** repo siap, pipeline jalan.
- Scaffold Next.js (App Router, TypeScript strict; alias `@/*` → `./src/*`), lint, format, `vitest.config.ts`.
- Struktur folder §4 sudah ada; verifikasi aturan arah dependensi (mis. aturan ESLint `no-restricted-imports` agar `src/lib/**` tidak mengimpor `next/*`/`react`/`@/features`).
- Setup Neon (project + branch dev), Vercel, env var per environment (`DATABASE_URL`, `LLM_PROVIDER`, `LLM_MODEL`, kunci LLM, `SEARCH_PROVIDER`, `SEARCH_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Buat `.env.example` tanpa nilai rahasia.
- Integrasi Neon–Vercel: Neon branch per Preview Deployment, migrasi dijalankan di branch tersebut.
- CI: lint + typecheck + test.
- Buat `docs/` (PRD, DDL, seed, ERD); pastikan `.env.local` di `.gitignore`; sediakan `.env.example`.

**DoD:** `npm run dev` dan CI hijau; deploy preview jalan; `.env.example` lengkap; tidak ada secret di repo.

### Fase 1 — Data (M1)
**Tujuan:** skema + seed bersih, dapat diulang.
- Verifikasi `.sequelizerc` & `src/lib/db/config.js`; isi `migrations/01-initial-ddl-banten-wariga.js` dari `ddl_banten_wariga.sql` (22 tabel, **termasuk** `jenis_penentuan` dan `hari_raya_aturan`; semua CHECK/index/PK INT eksplisit; `uq_banten_set` lewat SQL mentah).
- Model Sequelize di `src/lib/db/models/` + asosiasi di `models/index.ts`.
- `seeders/01-seed-banten.js` menjalankan `seed_banten.sql` terbaru (INSERT-only). Pastikan berkas yang dipakai **bukan** versi lama yang berisi DDL; tes penjaga: tidak ada `DROP`/`CREATE`/`ALTER` di berkas seed.
- `seeders/02-seed-wariga.js` dari `seed_wariga.sql` (harus setelah 01).
- Tes `src/lib/__tests__/db-seed.test.ts` (PGlite).
- Tes DB (PGlite): migrasi + dua seed lolos; cek hitungan baris (lihat §7), FK/CHECK, `jenis_penentuan` (8 `hari_raya_tetap`, 1 `otonan`, 19 `dewasa`), dan `hari_raya_aturan` = 0 baris.
- Catat bahwa pemetaan `jenis_penentuan` di seed sementara (⛔ Cultural Lead).
- Review alias (⛔ Cultural Lead): Pejati←Jauman; Pembersihan←Pebersihan/Pengerisikan; Tumpeng 21←Selikur; Tumpeng 17←Pitulas; Sayut X→Sesayut X; Pulagembal/Mapulagembal; Pemogpog/Pemopog; "Sodan/Rayunan(kuning)/Ajuman" (hlm. 121).
- Perbaiki kutipan Otonan yang masih berbentuk koma dari text layer PDF (⛔ konfirmasi bentuk yang benar).
- Putuskan strategi ID untuk insert runtime (hasil fallback LLM).
- Dokumentasikan aturan wariga yang dilewati: Kajeng Rendetan/Uwudan (tanpa angka), Naga Naut (rumus penanggal/pangelong = sasih), "Sri" ambigu (caturwara/astawara/dasawara; berdampak ke Sri Murti, Sri Tumpuk, grup "Sukra Sri" di Kala Buingrau & Lebur Awu).

**DoD:** `db:migrate && db:seed` pada DB kosong berhasil dan idempoten (atau reset terdokumentasi); test DB hijau; daftar isu terbuka tercatat di `docs/`.

### Fase 2 — Engine Wariga, Kalender, Otonan, Hari Raya, Matcher (M2)
**Tujuan:** dari tanggal → dewasa ayu/ala, murni dan teruji.
- Pastikan model `HariRayaAturan.ts` dan kolom `jenis_penentuan` di `Upacara.ts` sesuai DDL (tidak ada migrasi terpisah). Perbarui ERD draw.io bila belum (PNG terbaru di Drive, lihat PRD §8).
- Interface `LlmClient` + `MockLlmClient` dibuat di sini (dipindah lebih awal dari Fase 3) karena dibutuhkan `UpacaraMatcher`.
- `src/lib/calendar/CalendarAdapter.ts` + `types.ts`, dengan mock library; mapping ke ID `wewaran_nilai`/`wuku`/`sasih` (termasuk astawara "Brahma" dan konsistensi ejaan); penanggal/pangelong; purnama/tilem.
- `src/lib/engine/evaluators.ts` (`checkList`, `checkKombinasi`) dan `WarigaRuleEngine.ts` (`evaluate`, `evaluateAll`, `filter`) dengan aturan diinjeksi.
- `RuleRepository` (DB; JSON `src/lib/config/warigaRules.draft.json` hanya sebagai draf) dengan mode "hanya verified".
- Hierarki prioritas wewaran<wuku<sasih; penanganan status `konflik`.
- `src/lib/engine/HariRayaResolver.ts`: "Hari raya berikutnya" + `penjelasan_penentuan`; aturan kosong/unverified → "Aturan penentuan belum tersedia"; `CalendarAdapter` dan repository diinjeksi.
- `src/lib/engine/OtonanCalculator.ts`: weton, wuku, 3 otonan (210 hari); tanggal acuan sebagai parameter (⛔ konfirmasi "otonan ke-n").
- `src/lib/upacara/UpacaraMatcher.ts`: nama → DB; deskripsi → LLM dengan daftar tertutup, ID divalidasi (aturan mutlak #15).
- Ranking "Paling disarankan/Alternatif": implementasi sebagai strategi yang dapat diganti; aturan final ⛔.
- Fixture kalender: struktur siap, nilai harapan ⛔ Cultural Lead.
- Sisa aturan di `warigaRules.draft.json` (belum ada sasih & pancawara, ada KONFLIK) tidak dimasukkan sebelum diputuskan ⛔.

- Tes: `evaluators.test.ts`, `WarigaRuleEngine.test.ts`, `HariRayaResolver.test.ts`; tambah `CalendarAdapter.test.ts`, `OtonanCalculator.test.ts`, `UpacaraMatcher.test.ts`.

**DoD:** semua unit test §9 untuk modul ini hijau; engine tidak mengimpor Next/DB/SDK langsung; `/api/plan` (stub tanpa banten) mengembalikan bagian tanggal untuk ketiga jalur (dewasa / otonan / hari raya).

### Fase 3 — BantenResolver (M3)
**Tujuan:** set banten berkutipan, tanpa halusinasi.
- `BantenRepository`: lookup `banten_set` + `banten_set_item` by upacara, tingkatan, rangkaian (daerah NULL).
- `src/lib/llm/`: `LlmClient.ts` (+ `createLlmClient`), `OpenAiLlmClient.ts`, `MockLlmClient.ts`, `LlmExtractor.ts`.
- `src/lib/search/`: `SearchClient.ts` (+ `createSearchClient`), `TavilySearchClient.ts` (default), `ExaSearchClient.ts`, `BraveSearchClient.ts`, `MockSearchClient.ts`; **pengecekan ulang hostname whitelist di kode**.
- `LlmExtractor` (JSON schema) + `src/lib/banten/QuoteVerifier.ts` + `BantenResolver.ts`; `BantenRepository` di `src/lib/db/repositories/`.
- Alur: DB → search → ekstraksi → verifikasi → simpan `unverified` (`asal='internet'`, buat `sumber` jenis `web` + `kutipan`) → atau "tidak ditemukan".
- Daftar domain whitelist (⛔ Cultural Lead) di konfigurasi/`sumber.domain_diizinkan`.
- Tampilkan `grup_alternatif` (NULL wajib / 1 opsi lengkap / 2 opsi minimal), `lokasi`, `jumlah`, `jumlah_min`, `urutan`.

**DoD:** test kontrak LLM (kutipan palsu ditolak, tidak ditemukan, domain di luar whitelist dibuang, injection di konten web diabaikan) hijau; hasil fallback tidak pernah `verified`.

### Fase 4 — Estimasi Harga & Ringkasan (M4)
**Tujuan:** harga bersumber + ringkasan yang tidak menambah fakta.
- `src/lib/cache/`: `PriceCache.ts` (interface + helper EXPIREAT 23:59:59 WITA), `UpstashPriceCache.ts`, `InMemoryPriceCache.ts`.
- `src/lib/pricing/PriceEstimator.ts`: search → LLM ekstraksi harga (JSON) → verifikasi angka ada di kutipan → cache → total di kode; fallback saat Redis gagal.
- `SummaryWriter` di `src/lib/summary/`. Endpoint `src/app/api/price/route.ts` terpisah (supaya harga bisa dimuat bertahap dan tidak melewati `maxDuration`).
- Perilaku `SummaryWriter`: hanya merangkum data terstruktur (dewasa, banten, harga) + sitasi; validasi bahwa ringkasan tidak memuat tanggal/banten/angka di luar input.
- Aturan satuan/soroh untuk perkalian jumlah (⛔).

**DoD:** test harga (jumlah, tanpa harga, cache, kedaluwarsa, Redis down) hijau; ringkasan lolos cek "tidak ada fakta baru"; waktu pengambilan WITA tersedia di respons.

### Fase 5 — UI V2 & Ekspor PDF (M5)
**Tujuan:** layar sesuai Figma `YGkeK7kZ3UUggpeLQO3uLl` (page V2 `5:2`) dan desain terbaru 3 tab Perencana.
- **Catatan desain:** frame lama Perencana (`5:85`, "Langkah 1 dari 2") **digantikan** oleh 3 tab. Tab dibangun dari screenshot pengguna (4 Nov 2026); **ID node Figma tab belum dipetakan (TODO sinkronkan)**. Semua isi contoh di mockup (caption, tanggal, aturan) bukan data.
- Layout: `src/app/layout.tsx` + `components/layout/{Navbar,Footer}.tsx` (footer "© 2026 Ayukara · Bali DigiFest 2026").
- Beranda `src/app/page.tsx` (5:3): hero (`public/images/hero-pawiwahan.jpg` placeholder), "Cara Kerja" 3 langkah (cek apakah teks perlu disesuaikan dengan 3 tab: ⛔ product owner).
- Perencana `src/app/planner/page.tsx` dengan 3 tab (komponen di `features/planner/components/`):
  - **Cari Hari Baik:** textarea ≤300 + "Cari upacara yang sesuai"; inline konfirmasi atau daftar "Upacara Teridentifikasi" ("Paling sesuai"/"Pilih" → "Terpilih"); auto-scroll ke Dari–Sampai + chip cepat + `TingkatanCards` (catatan "skala pelaksanaan, bukan kualitas spiritual"); "Lihat Rekomendasi".
  - **Otonan:** nama (opsional), tanggal lahir (date picker + OK), kartu weton & wuku, 3 kartu otonan ("Terdekat", "otonan ke-n"), tingkatan, "Lihat Kebutuhan Banten". Nama tidak disimpan.
  - **Hari Raya:** pencarian, chip tahun, grid 8/halaman + pagination, panel "Hari raya berikutnya" + penjelasan penentuan, "Lihat Kebutuhan Banten". **Tanpa pemilih tingkatan** (⛔ keputusan terbuka); caption dari DB.
  - Pencocokan upacara dan submit lewat Server Actions di `features/planner/actions.ts`.
- Hasil `src/app/planner/result/page.tsx` (6:2): **komponen sama untuk ketiga tab (FR-P13)**; `DateSection` bervarian: (a) `DewasaAyuCard` (Paling disarankan/Alternatif, alasan, sitasi), (b) otonan terpilih + weton + wuku, (c) tanggal hari raya + penjelasan penentuan. Lalu `BantenTable.tsx` (state "Harga belum tersedia"/"Data belum tersedia"), `CostSummary.tsx`, `AiSummaryBox.tsx` ([1][2]), `ExportPdfButton.tsx` (Terima rencana, Ekspor PDF).
- Komponen bersama `components/ui/`: `VerificationBadge` (FR-V3; desain sementara, TODO), `CulturalDisclaimer`, `PriceDisclaimer`, `CitationBadge`. Disclaimer wajib tampil di Hasil, Chat, dan PDF.
- Ekspor PDF (FR-P12): `src/app/api/pdf/route.ts` (Node runtime) memanggil `src/lib/pdf/PdfGenerator.ts` dengan **data terstruktur yang sama** dengan halaman Hasil; 7 bagian: (1) upacara+tingkatan, (2) tanggal/rentang diminta, (3) **bagian tanggal sesuai tab** (dewasa ayu + sumber, **atau** otonan: tanggal, weton, wuku, otonan ke-n, **atau** hari raya + aturan penentuan), (4) banten+status+sumber, (5) harga+URL+tanggal+total, (6) disclaimer, (7) tanggal dokumen. Pilih library PDF (⛔).
- Orkestrasi `src/app/api/plan/route.ts` merakit: tanggal (engine / `OtonanCalculator` / `HariRayaResolver`, sesuai tab) → BantenResolver → (harga via `/api/price`) → SummaryWriter.
- State loading/error (belum ada di Figma): sederhana & konsisten, tandai keputusan desain sementara.
- Bahasa Indonesia; desktop-first, responsif dasar. Aksesibilitas: target WCAG TODO; minimal semantik HTML, kontras, fokus keyboard.

**DoD:** ketiga tab berjalan end-to-end dengan data seed (Hari Raya menampilkan "Aturan penentuan belum tersedia" selama `hari_raya_aturan` kosong); tidak ada data mockup tampil sebagai data nyata; PDF identik isinya dengan halaman Hasil untuk ketiga varian.

### Fase 6 — Chat AI (M6)
**Tujuan:** chat berbatas topik, berbasis sumber.
- `src/lib/chat/TopicGuard.ts` (`in_scope`/`out_of_scope`/`ambiguous`; ambiguous → minta klarifikasi); pesan penolakan baku (FR-C3): "Maaf, Ayukara hanya dapat membantu pertanyaan seputar upacara, banten, wariga, dewasa ayu, serta agama Hindu Bali dan upakara."
- `src/lib/chat/ChatService.ts`: grounding hanya dari DB + sumber whitelist terverifikasi; sitasi [n]; "Saya tidak tahu / data belum tersedia" bila tidak ada.
- Pertanyaan tanggal/dewasa dirutekan ke `WarigaRuleEngine` (bukan jawaban bebas LLM).
- Streaming lewat `src/app/api/chat/route.ts`; klien membaca dengan `features/chat/hooks/useChatStream.ts`; **tanpa persistensi percakapan**.
- UI `src/app/chat/page.tsx` (47:2) dengan `ChatMessageList`, `ChatInput`, dan `ChatEmptyState` (47:67): salam "Om Swastyastu, ada yang bisa dibantu?", chip saran dari Figma, "Percakapan tidak disimpan."
- `CreatePlanCta.tsx`: "Buat Rencana dari Jawaban Ini" → membuka `/planner` dengan parameter terisi.
- Guardrail injection (termasuk dari konten web).

**DoD:** dataset in/out-of-scope dan red-team lulus; setiap klaim bersitasi; tidak ada riwayat chat tersimpan.

### Fase 7 — Validasi Cultural Lead & Admin (M7)
**Tujuan:** alur `unverified → verified/rejected` dengan jejak audit.
- `src/features/validation/actions.ts`: Server Actions ubah status `banten_set` (log `validasi_log`) dan `aturan_dewasa_upacara` (log `validasi_aturan_log`, status juga `konflik`).
- Layar admin/validator memakai `features/validation/components/ValidationTable.tsx` (belum ada di Figma, desain ⛔; route admin belum ada di `src/app/`), dengan autentikasi/otorisasi (TODO: mekanisme).
- Tampilan kutipan + sumber saat meninjau; antrian hasil fallback LLM.
- Keputusan produksi: engine hanya `verified` atau tampil unverified berlabel (⛔).
- `hari_raya_aturan` hanya punya status `unverified`/`verified` dan **belum punya tabel log validasi** (berbeda dari `banten_set` dan `aturan_dewasa_upacara`). Tentukan model validasi + cara Cultural Lead memasukkan aturan (⛔) sebelum membangun UI-nya.
- Keputusan 45 dewasa tanpa sifat (⛔) dan penyelesaian aturan yang dilewati (§Fase 1).
- Admin data: pengelolaan seed, sumber, kutipan.

**DoD:** setiap perubahan status tercatat di log; hanya peran validator yang dapat mengubah status; perubahan terlihat di hasil Perencana/Chat sesuai mode.

### Fase 8 — QA, Uji Pengguna & Rilis (M8)
- Regresi penuh + red-team ulang; uji beban untuk menetapkan `pool.max`/idle dan `maxDuration` (TODO nilai).
- Uji pengguna (riset pengguna belum ada: TODO); perbaikan UX.
- Tetapkan target & instrumen metrik (PRD §14: % selesai sampai Hasil, % banten dari DB vs fallback, % kutipan ditolak, % chat ditolak, jumlah verified). Kebijakan log anonim ⛔.
- Hardening: rate limiting endpoint LLM/search, biaya LLM, monitoring error.
- Rilis ke Production (target Bali DigiFest 2026, TODO konfirmasi).

**DoD:** checklist rilis hijau; semua `Aturan Mutlak` §2 terverifikasi lewat test/ulasan; disclaimer tampil di semua layar relevan.

### Fase 9 — Pasca-MVP (M9)
- Versi mobile.
- Pemesanan/pembelian banten: **di luar lingkup**, TODO konfirmasi product owner.
- Pertimbangan variasi antar-daerah (saat ini tidak ditangani karena tidak ada input daerah).

---

## 12. Isu Terbuka (rujukan cepat)

⛔ Menunggu manusia; agen **tidak boleh memutuskan**:

- Isi `hari_raya_aturan` (saat ini 0 baris) beserta `penjelasan_penentuan`; aturan ranking tanggal
- Pemetaan `jenis_penentuan` per upacara (seed sementara: 8 `hari_raya_tetap`, 1 `otonan`, 19 `dewasa`; PRD masih menyebut default `dewasa`). Termasuk: Kajeng Kliwon dan Purnama/Tilem bertipe `hari_raya_tetap` padahal berulang, jadi arti "hari raya berikutnya" perlu dijelaskan
- Tab Hari Raya tanpa tingkatan: pakai default, tampilkan semua, atau tambah pemilih
- Otonan: acuan "otonan ke-n", tanggal acuan "3 terdekat", dan apakah banten Otonan (seed: "Bayi Umur 6 Bulan") berlaku untuk semua usia/tingkatan
- Kandidat `UpacaraMatcher` (semua upacara vs hanya `dewasa`) dan perilaku bila memilih upacara bertipe hari raya/otonan di tab Cari Hari Baik
- Akurasi sasih `balinese-date-js-lib` untuk Nyepi/Siwaratri (butuh fixture tervalidasi)
- Model validasi `hari_raya_aturan` (tanpa tabel log, status tanpa `rejected`/`konflik`)
- Sinkronisasi ID node Figma untuk 3 tab dan teks "Cara Kerja" di Beranda
- Nilai fixture kalender; validasi master wewaran/wuku/sasih
- Domain whitelist; keputusan aturan unverified di produksi; label unverified
- 45 dewasa tanpa sifat; aturan wariga yang dilewati; "Sri" ambigu; konflik di `warigaRules.draft.json`
- Review alias banten; bentuk kutipan Otonan
- Library PDF; nilai `pool.max`/`maxDuration`; log anonim; mekanisme auth validator; target metrik & WCAG
- Selisih `asal` (`internet` di DDL vs `llm` di PRD §11)