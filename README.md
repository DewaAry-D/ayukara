# Ayukara — Pendamping Perencanaan Upacara Yadnya Hindu Bali

Ayukara adalah platform web berbasis kecerdasan buatan (AI) dan perhitungan wariga teruji yang dirancang untuk mendampingi umat Hindu Bali dalam merencanakan upacara yadnya secara runtut, tepat sasaran, dan transparan.

Platform ini mengintegrasikan kearifan lokal kalender Saka Bali, pustaka sastra lontar upakara, data banten terstruktur, serta estimasi biaya pasar terkini.

> Catatan: Ayukara hadir sebagai pendamping teknis perencanaan, bukan sebagai pengganti otoritas spiritual sulinggih atau pemangku.

---

## Fitur Utama

1. **Perencana Upacara (/planner)**
   Menyediakan tiga alur perencanaan yang bermuara pada satu format hasil seragam:
   - **Cari Hari Baik**: Evaluasi dewasa ayu dan ala berdasarkan nama/deskripsi upacara, rentang tanggal kalender, dan tingkatan pelaksanaan melalui mesin Wariga (*WarigaRuleEngine*).
   - **Otonan**: Perhitungan kelahiran berdasarkan kalender Pawukon (weton, wuku, saptawara, pancawara) serta penentuan 3 siklus otonan terdekat (jarak 210 hari).
   - **Hari Raya**: Katalog hari raya suci Hindu Bali (Galungan, Kuningan, Nyepi, Saraswati, Pagerwesi, Siwaratri, Purnama/Tilem, Kajeng Kliwon) beserta perhitungan waktu pelaksanaan berikutnya dan narasi makna sastra.

2. **Penyusunan Kebutuhan Banten (BantenResolver)**
   Menyusun rincian sarana banten sesuai upacara dan tingkatan (Nista, Madya, Utama) yang dirujuk langsung dari database terstruktur dan pustaka keagamaan tervalidasi.

3. **Estimasi Biaya Transparan (PriceEstimator)**
   Menyediakan rentang taksasi biaya bahan dan sarana upacara bersumber dari agregasi pasar digital terkini, dilengkapi sistem caching harian berbasis Redis.

4. **Ekspor Dokumen PDF**
   Mengunduh rincian rencana, jadwal hari baik, daftar banten, taksasi biaya, dan ringkasan tata pelaksanaan dalam format PDF siap cetak.

5. **Chat AI Konsultatif (/chat)**
   Asisten tanya-jawab interaktif seputar upakara, banten, wariga dewasa ayu, serta tata upacara Hindu Bali yang dilengkapi filter topik terarah (*TopicGuard*) dan penelusuran web rujukan.

---

## Tech Stack

- **Framework Web**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon Serverless)
- **ORM & Migrations**: Sequelize & Sequelize CLI
- **Kalender Bali**: `balinese-date-js-lib`
- **Cache Penyimpanan Harga**: Upstash Redis (REST API)
- **Large Language Model (LLM)**: OpenAI API (mendukung kustomisasi Base URL / gateway OpenAI-compatible seperti 9Router)
- **Web Search**: Tavily Search API (tersedia adapter alternatif Exa dan Brave Search)
- **PDF Engine**: PDFKit
- **Testing**: Vitest, PGlite

---

## Prasyarat Sistem

Sebelum memulai instalasi, pastikan sistem komputer telah terpasang:
- **Node.js**: Versi 18.x atau 20.x ke atas
- **npm** (atau package manager pilihan seperti yarn / pnpm)
- **Git**

Layanan eksternal yang dibutuhkan:
- Akun **Neon PostgreSQL** untuk basis data
- API Key **OpenAI** (atau endpoint proxy LLM)
- API Key **Tavily** untuk penelusuran referensi web
- Database **Upstash Redis** untuk caching harga

---

## Panduan Instalasi dan Konfigurasi

### 1. Clone Repositori dan Pasang Dependensi

Buka terminal dan unduh repositori proyek:

```bash
git clone https://github.com/username/ayukara.git
cd ayukara
```

Pasang semua paket dependensi:

```bash
npm install
```

---

### 2. Penyiapan Variabel Lingkungan (.env / .env.local)

Salin berkas template `.env.example` menjadi `.env.local` atau `.env`:

```bash
cp .env.example .env.local
```

Buka berkas `.env.local` dan lengkapi konfigurasi berikut:

#### A. Database (Neon PostgreSQL)
- `DATABASE_URL`: Connection string PostgreSQL mode pooled (melewati PgBouncer, memiliki akhiran `-pooler` pada hostname) untuk koneksi runtime aplikasi web.
- `DATABASE_URL_UNPOOLED`: Connection string PostgreSQL mode direct (tanpa `-pooler`) untuk eksekusi migrasi skema DDL dan seeder.

Contoh format:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.neon.tech/ayukara?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-sample.region.neon.tech/ayukara?sslmode=require"
```

#### B. LLM Provider (OpenAI / Proxy Gateway)
- `LLM_PROVIDER`: Provider LLM yang digunakan (default: `openai`).
- `LLM_MODEL`: Model yang digunakan (default: `gpt-4o-mini`).
- `LLM_API_KEY`: Kunci API OpenAI Anda.
- `LLM_BASE_URL` *(opsional)*: URL proxy/gateway bila menggunakan penyedia OpenAI-compatible (misal: `https://api.9router.com/v1`).

Contoh format:
```env
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4o-mini"
LLM_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxx"
# LLM_BASE_URL="https://api"
```

#### C. Search Provider (Tavily)
- `SEARCH_PROVIDER`: Provider mesin pencari web (default: `tavily`).
- `SEARCH_API_KEY`: Kunci API Tavily Search Anda.

Contoh format:
```env
SEARCH_PROVIDER="tavily"
SEARCH_API_KEY="tvly-xxxxxxxxxxxxxxxxxxxx"
```

#### D. Cache Redis (Upstash)
- `UPSTASH_REDIS_REST_URL`: Alamat REST endpoint database Upstash Redis.
- `UPSTASH_REDIS_REST_TOKEN`: Token akses REST database Upstash Redis.

Contoh format:
```env
UPSTASH_REDIS_REST_URL="https://sample-xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxx"
```

---

### 3. Menjalankan Migrasi Database

Jalankan perintah migrasi skema tabel (22 tabel utama mencakup banten, wariga, penanggalan, dan aturan hari raya):

```bash
npm run db:migrate
```

*Catatan: Pastikan `DATABASE_URL_UNPOOLED` atau `DATABASE_URL` telah terkonfigurasi dengan benar di environment variable.*

---

### 4. Menjalankan Seeder Data Awal

Masukkan data referensi awal upacara, master wewaran/wuku/sasih, relasi banten, dan aturan wariga:

```bash
npm run db:seed
```

Perintah di atas akan mengeksekusi rangkaian seeder terurut yang ada pada folder `src/lib/db/seeders/`:
1. `01-seed-banten.js`: Master upacara, banten, tingkatan, lokasi, dan set banten.
2. `02-seed-wariga.js`: Master dewasa ayu/ala, syarat penanggalan, dan aturan upacara.
3. `03-seed-hari-raya.js`: Aturan penentuan kalender hari raya tetap.
4. `04-seed-banten-v2.js` & `05-seed-hari-raya-v2.js`: Penambahan dan pembaruan relasi set banten.
5. `06-update-deskripsi-upacara.js` & `07-clean-catatan-otomatis.js`: Penyesuaian deskripsi dan normalisasi data.

---

### 5. Menjalankan Skrip Tambahan (Folder scripts/)

Untuk memperbarui teks deskripsi narasi hari raya suci dan upacara pada database Neon agar tampil lengkap di kartu UI Perencana:

```bash
node scripts/update-hari-raya-texts.js
```

Skrip ini akan mengisi kolom `penjelasan_penentuan` pada tabel `hari_raya_aturan` dan deskripsi upacara pada tabel `upacara`.

---

### 6. Menjalankan Server Pengembangan

Setelah migrasi, seeder, dan skrip selesai dijalankan, jalankan dev server Next.js:

```bash
npm run dev
```

Buka peramban (*browser*) dan akses:
```
http://localhost:3000
```

---

## Daftar Perintah Tambahan (Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan Next.js lokal |
| `npm run build` | Melakukan kompilasi build produksi Next.js |
| `npm run start` | Menjalankan build produksi di server lokal |
| `npm run typecheck` | Menjalankan pemeriksaan validasi tipe statis TypeScript (`tsc --noEmit`) |
| `npm run lint` | Menjalankan analisis linting kode sumber menggunakan ESLint |
| `npm test` | Menjalankan seluruh pengujian unit dan integrasi dengan Vitest |
| `npm run test:watch` | Menjalankan pengujian Vitest dalam mode watch |
| `npm run db:migrate` | Menjalankan migrasi skema database Sequelize |
| `npm run db:migrate:undo` | Membatalkan satu langkah migrasi skema terakhir |
| `npm run db:seed` | Menjalankan seluruh seeder data ke database |
| `npm run db:seed:undo` | Menghapus seluruh data hasil seeder |

---

## Kebijakan Keamanan dan Perlindungan Kunci API

1. **Kredensial Server-Only**: Seluruh kunci API (`LLM_API_KEY`, `SEARCH_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`) hanya diakses di sisi server (Node.js runtime).
2. **Tidak Ada Kunci yang Terbuka ke Klien**: Tidak ada kunci rahasia yang memakai prefiks `NEXT_PUBLIC_`.
3. **Pembersihan Log**: Sistem tidak mencatat maupun menampilkan kunci API ke log terminal atau konsol server.
4. **Git Protection**: Berkas `.gitignore` secara baku mengabaikan semua berkas `.env*` (kecuali `.env.example`) untuk mencegah kebocoran kredensial ke repositori Git.
