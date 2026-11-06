# Ayukara — Pendamping Perencanaan Upacara Yadnya Hindu Bali

## Description
**Ayukara** adalah aplikasi web berbasis kecerdasan buatan (AI) terarah, sistem komputasi kalender Saka/Pawukon (wariga), dan pangkalan data upakara terstruktur yang dirancang untuk mendampingi umat Hindu Bali dalam merencanakan upacara yadnya secara runtut, tepat sasaran, dan transparan.

Aplikasi ini memadukan kearifan lokal kalender Bali, pustaka sastra upakara, algoritma penyaringan dewasa ayu/ala, rincian kebutuhan sarana banten, serta taksasi anggaran berbasis pergerakan harga pasar digital terkini.

> **Pernyataan Etika Budaya & Keagamaan:** Ayukara hadir sebagai pendamping teknis perencanaan, **bukan pengganti otoritas spiritual sulinggih atau pemangku**. Keputusan akhir pelaksanaan upacara tetap merujuk pada petunjuk sulinggih serta kearifan *desa kala patra* setempat.

---

## Problem & Target User

### Problem Statement
1. **Kompleksitas Perhitungan Kalender Bali:** Sistem penanggalan Bali mengintegrasikan siklus Pawukon (210 hari), wewaran (ekawara hingga dasawara), sasih, penanggal/pangelong, serta aturan padewasan (dewasa ayu dan ala). Hal ini menyulitkan umat awam dalam menentukan hari baik upacara secara mandiri.
2. **Keterbatasan Referensi Upakara yang Terpercaya:** Rujukan sarana banten kerap terfragmentasi antar-lontar atau buku pedoman upakara, sehingga umat sulit mengetahui rincian banten yang tepat berdasarkan tingkatan upacara (Nista, Madya, Utama).
3. **Ketidakpastian Anggaran Upacara:** Kurangnya transparansi estimasi harga bahan dan sarana banten di pasaran kerap menimbulkan keraguan dan beban finansial yang tidak terprediksi.
4. **Risiko Halusinasi AI Generatif:** Model bahasa besar (LLM) standar tanpa batasan (*guardrails*) berpotensi mengarang fakta budaya, silsilah upacara, atau aturan suci yang tidak bersumber.

### Target User
- **Keluarga / Umat Hindu Bali:** Masyarakat yang membutuhkan panduan praktis penentuan hari baik, daftar banten, dan estimasi biaya upacara keluarga (Pawiwahan, Otonan, Melaspas, dsb.).
- **Generasi Muda & Diaspora Hindu Bali:** Umat di perantauan yang memerlukan rujukan digital terstruktur mengenai makna upacara dan tata pelaksanaan upakara.
- **Penanya Umum & Pemerhati Budaya:** Pengguna yang ingin berkonsultasi secara interaktif seputar filosofi upacara yadnya berbasis sumber literatur yang dapat dipertanggungjawabkan.
- **Cultural Lead / Validator:** Pakar adat dan rohaniwan yang meninjau serta memvalidasi data aturan wariga dan set banten.

---

## Key Features

### 1. Perencana Upacara (`/planner`)
Menyediakan tiga alur perencanaan terpadu yang bermuara pada satu format hasil seragam:
- **Cari Hari Baik (Dewasa Ayu):** Input nama atau deskripsi upacara (maks. 300 karakter), pemilihan tingkatan (Nista, Madya, Utama), serta penentuan rentang tanggal dengan chip pintas. Sistem mengevaluasi hari baik menggunakan mesin aturan wariga (*WarigaRuleEngine*).
- **Perhitungan Otonan:** Input tanggal lahir untuk menghitung weton (saptawara + pancawara), wuku, serta 3 siklus hari otonan terdekat (jarak 210 hari siklus Pawukon).
- **Katalog Hari Raya Suci:** Penelusuran jadwal hari raya tetap (Galungan, Kuningan, Nyepi, Saraswati, Pagerwesi, Siwaratri, Purnama, Tilem, Kajeng Kliwon) beserta penjelasan penentuan astronomis/kalender dan narasi sastra.

### 2. Penyusunan Kebutuhan Banten (*BantenResolver*)
Menyusun daftar banten terperinci per tingkatan dan lokasi penempatan sarana (pelinggih, sanggah, natar) yang dirujuk langsung dari database terstruktur, dengan mekanisme penelusuran web berkutipan sebagai pendukung.

### 3. Estimasi Anggaran Biaya Transparan (*PriceEstimator*)
Menyajikan taksasi rentang biaya sarana dan paket banten berdasarkan agregasi pasar digital terkini. Seluruh perhitungan total dijumlahkan secara deterministik di level kode (bukan tebakan AI) dan dilengkapi cache harian berbasis Redis (zona waktu WITA).

### 4. Ekspor Dokumen Resmi PDF
Menghasilkan dokumen cetak rencana upacara dalam format PDF standar A4 berkualitas tinggi, dilengkapi ornamen khas Ayukara, tabel berpaginasi rapi, rincian biaya, dan disclaimer keagamaan.

### 5. Chat AI Konsultatif Berorientasi Topik (`/chat`)
Asisten tanya-jawab interaktif yang dibatasi topik secara ketat (*TopicGuard*). Dilengkapi sitasi sumber berkutipan numerik `[n]` dan tombol pintas *"Buat Rencana dari Jawaban Ini"* untuk langsung mengonversi saran chat ke lembar kerja Perencana.

---

## Tech Stack

| Lapisan | Teknologi | Deskripsi |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Arsitektur modern Server & Client Components |
| **Styling** | Tailwind CSS | Desain antarmuka responsif dan estetik |
| **Backend** | Next.js Route Handlers (`src/app/api/*`) & Server Actions | Endpoint pemrosesan rencana, harga, chat, dan PDF |
| **Database** | PostgreSQL di **Neon Serverless** | Skema 22 tabel DDL, relasi banten, wariga, dan aturan hari raya |
| **ORM & Migrations** | Sequelize & Sequelize CLI | Pengelolaan model, asosiasi, migrasi DDL, dan seeder data |
| **Kalender Bali** | `balinese-date-js-lib` | Konversi penanggalan Gregorian ke wewaran, wuku, sasih, dan purnama/tilem |
| **Caching Engine** | Upstash Redis (`@upstash/redis`) | REST-based Redis cache untuk estimasi harga harian per zona WITA |
| **LLM Provider** | OpenAI API (`gpt-4o-mini`) | Ekstraksi entitas upacara, perangkuman sastra, dan agen chat |
| **Web Search** | Tavily Search API | Pencarian referensi web rujukan ber-grounding kuat |
| **PDF Engine** | PDFKit | Pembuatan dokumen PDF dinamis di runtime server (Node.js) |
| **Testing** | Vitest & PGlite | Pengujian unit murni, mock provider, dan database in-memory |

---

## AI Implementation

Ayukara menerapkan prinsip **Strict Cultural Grounding** untuk memastikan kecerdasan buatan bekerja secara bertanggung jawab tanpa mengarang ajaran agama:

1. **Closed-List Ceremony Matching (`UpacaraMatcher`)**:
   - Ketika pengguna memasukkan deskripsi bebas, LLM hanya bertugas memetakan maksud pengguna ke dalam daftar tertutup (*closed list*) upacara yang sudah terdaftar resmi di database.
   - Output ID upacara divalidasi secara deterministik di kode; ID di luar daftar pangkalan data akan ditolak.

2. **Kutipan Wajib & Verifikasi Persis (`QuoteVerifier`)**:
   - Seluruh fakta budaya hasil ekstraksi LLM wajib menyertakan potongan `kutipan` persis beserta URL atau pustaka `sumber`.
   - Modul `QuoteVerifier` memverifikasi keberadaan kutipan tersebut pada teks sumber mentah melalui normalisasi spasi. Data yang gagal diverifikasi langsung digugurkan.
   - Hasil olahan AI tidak pernah langsung berstatus `verified` (selalu `unverified` sampai ditinjau Cultural Lead).

3. **Penjaga Batasan Topik (`TopicGuard`)**:
   - Setiap masukan pengguna pada Chat AI diuji melalui sistem klasifikasi dwilapis (aturan kata kunci lokal + semantik) untuk mengidentifikasi kategori `in_scope`, `out_of_scope`, atau `ambiguous`.
   - Pertanyaan di luar topik upacara, banten, wariga, dan agama Hindu Bali ditolak secara santun menggunakan pesan baku.

4. **Kalkulasi Biaya Deterministik**:
   - LLM dilarang melakukan operasi aritmatika anggaran. AI hanya mengekstrak angka satuan dan sumber harga dari internet, sedangkan total rentang biaya dijumlahkan sepenuhnya oleh kode logika program.

---

## Architecture / Data Flow

```
Pengguna (Input Web / Chat)
        │
        ▼
[Next.js App Router (UI / Server Actions)]
        │
   ┌────┴───────────────────────────┬──────────────────────────────┐
   │ (Tab Cari Hari Baik)           │ (Tab Otonan)                 │ (Tab Hari Raya)
   ▼                                ▼                              ▼
[UpacaraMatcher]             [OtonanCalculator]           [HariRayaResolver]
(Closed-list LLM Matcher)     (Pawukon 210 Hari)           (Pustaka Kalender)
   │                                │                              │
   └───────────────┬────────────────┴──────────────────────────────┘
                   ▼
         [CalendarAdapter]
       (balinese-date-js-lib)
                   │
                   ▼
         [WarigaRuleEngine] ◄── [RuleRepository] ◄── [Neon PostgreSQL]
       (Evaluasi Dewasa Ayu/Ala)
                   │
                   ▼
          [BantenResolver] ◄─── [BantenRepository] (Database First)
                   │
                   ├──► (Fallback) [TavilySearch] ──► [LlmExtractor] ──► [QuoteVerifier]
                   │
                   ▼
          [PriceEstimator] ◄─── [Upstash Redis Cache] (Cache Harian WITA)
                   │
                   ├──► (Cache Miss) [Search + LLM Price Extraction]
                   │
                   ▼
         [SummaryWriter] & [PdfGenerator]
                   │
                   ▼
   Halaman Hasil (/planner/result) & Cetak PDF
```

---

## Installation / Run Instructions

### 1. Prasyarat Sistem
- **Node.js**: Versi 18.x atau 20.x ke atas
- **npm** / **pnpm** / **yarn**
- **Git**

Layanan pihak ketiga yang diperlukan:
- Akun **Neon PostgreSQL**
- Kunci API **OpenAI** (atau proxy LLM yang kompatibel)
- Kunci API **Tavily**
- Database **Upstash Redis**

---

### 2. Kloning Repositori dan Pasang Dependensi

```bash
git clone https://github.com/username/ayukara.git
cd ayukara
npm install
```

---

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)

Salin berkas contoh `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan lengkapi kredensial berikut:

```env
# Database Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.neon.tech/ayukara?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-sample.region.neon.tech/ayukara?sslmode=require"

# Provider LLM (OpenAI)
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4o-mini"
LLM_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
# LLM_BASE_URL="https://api.openai.com/v1"

# Provider Pencarian Web (Tavily)
SEARCH_PROVIDER="tavily"
SEARCH_API_KEY="tvly-xxxxxxxxxxxxxxxxxxxxxxxx"

# Cache Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://sample-xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxx"
```

---

### 4. Eksekusi Migrasi Skema Database

Jalankan migrasi skema tabel DDL (22 tabel):

```bash
npm run db:migrate
```

---

### 5. Pengisian Data Awal (Seeding)

Jalankan seluruh rangkaian seeder terstruktur:

```bash
npm run db:seed
```

Urutan seeder mencakup:
1. `01-seed-banten.js`: Master upacara, banten, tingkatan, lokasi penempatan, dan set banten.
2. `02-seed-wariga.js`: Master dewasa ayu/ala, syarat penanggalan, dan relasi aturan upacara.
3. `03-seed-hari-raya.js`: Aturan penentuan kalender hari raya tetap.
4. `04-seed-banten-v2.js` & `05-seed-hari-raya-v2.js`: Pembaruan relasi set banten.
5. `06-update-deskripsi-upacara.js` & `07-clean-catatan-otomatis.js`: Normalisasi data deskripsi.
6. `08-seed-banten-hari-raya-v3-dewa.js`: Relasi banten dewa yadnya lanjutan.

Untuk menyinkronkan narasi deskripsi hari raya dan upacara:

```bash
node scripts/update-hari-raya-texts.js
```

---

### 6. Menjalankan Server Pengembangan

```bash
npm run dev
```

Buka peramban dan akses alamat:
```
http://localhost:3000
```

---

### 7. Perintah Pengujian & Kualitas Kode

```bash
# Menjalankan seluruh pengujian (Vitest + PGlite DB Test)
npm test

# Menjalankan validasi tipe TypeScript secara menyeluruh
npm run typecheck

# Menjalankan pemeriksaan analisis kode (ESLint)
npm run lint
```

---

## Deployment URL

Aplikasi Ayukara telah dideploy dan dapat diakses publik melalui tautan:
**[https://ayukara.vercel.app](https://ayukara.vercel.app)**

---

## Demo Account (jika diperlukan - jangan simpan password sensitif di public repo)

Aplikasi Ayukara beroperasi dengan sistem **Akses Terbuka (Open Access)** untuk seluruh alur publik:
- **Tidak memerlukan login / pembuatan akun** untuk menggunakan Perencana Upacara (Cari Hari Baik, Otonan, Hari Raya), estimasi biaya, ekspor PDF, maupun fitur Chat AI.
- Pengguna dapat langsung mencoba seluruh kapabilitas aplikasi secara instan tanpa hambatan kredensial.

---

## Known Limitations

1. **Status Validasi Budaya:** Seluruh data aturan wariga dan daftar banten hasil ekstraksi awal berstatus `unverified` sampai seluruhnya ditandatangani dan diverifikasi oleh rohaniwan / Cultural Lead resmi.
2. **Ketergantungan Astronomis Kalender:** Hari raya berbasis sasih dan fase bulan (seperti Nyepi dan Siwaratri) bergantung pada akurasi perhitungan perpustakaan `balinese-date-js-lib`.
3. **Fluktuasi Harga Pasar:** Estimasi harga banten bersumber dari penelusuran digital platform daring dan dapat bervariasi bergantung pada ketersediaan bahan lokal di masing-masing daerah (*Desa Kala Patra*).
4. **Cakupan Transaksi:** Saat ini aplikasi berfungsi sebagai pendamping perencanaan informasi dan belum melayani transaksi langsung atau *marketplace* pemesanan banten.

---

## Third-party Resources / Credits

- **Perhitungan Kalender Bali:** [`balinese-date-js-lib`](https://github.com/hariesramdhani/balinese-date-js-lib) oleh Haries Ramdhani.
- **Pustaka Rujukan Keagamaan:**
  - *Buku Pedoman Praktis Upakara (Banten) dalam Upacara Yajna*
  - Naskah Lontar Wariga Dewasa
  - Kitab Upadesa tentang Panca Yadnya
- **Infrastruktur Cloud:** [Vercel](https://vercel.com) (Hosting Web), [Neon](https://neon.tech) (Serverless Postgres), [Upstash](https://upstash.com) (Serverless Redis).
- **Penyedia AI & Mesin Pencari:** OpenAI (Model GPT), Tavily Search API.
- **Render Dokumen:** [PDFKit](https://pdfkit.org/).

---

## Team Members

I Komang Guna Januarta
I Dewa Made Ary Dwisaputra
Luh Adelia Pratiwi Djelantik