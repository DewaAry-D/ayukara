# AI & Technology Disclosure

**Tim Pengembang: Ayukara**  
**Kompetisi: AI Web Innovation Challenge — Bali DigiFest 2026**

---

## 1. Core Framework & Infrastructure

Pengembangan Ayukara menggunakan teknologi web modern untuk mendukung kinerja aplikasi, keandalan pengelolaan data, dan kecepatan penyajian informasi kepada pengguna:

- **Web Framework**: Next.js (App Router), React, dan TypeScript dengan Node.js sebagai lingkungan runtime di sisi server.
- **Database & ORM**: PostgreSQL yang di-hosting melalui infrastruktur cloud Neon Serverless dan dikelola menggunakan Sequelize ORM (skema 22 tabel terelasi).
- **Caching System**: Upstash Redis (REST API) digunakan untuk menyimpan sementara hasil pencarian harga pasar dengan masa berlaku satu hari (*Time-To-Live* / TTL 1 hari zona waktu WITA), sehingga mengurangi beban pemanggilan API berulang dan mempercepat respons sistem.
- **Deployment & Hosting**: Vercel digunakan sebagai platform deployment utama untuk aplikasi web frontend dan serverless Route Handlers backend.

---

## 2. AI Implementation (Models & Services)

Ayukara menerapkan pendekatan *hybrid* dalam pemanfaatan kecerdasan buatan (AI). AI difokuskan secara spesifik pada pengolahan informasi dan pencarian data dinamis, **bukan untuk menentukan, mengubah, atau menghasilkan aturan keagamaan secara bebas**:

- **Batas Kewenangan Budaya**: Seluruh logika wariga (dewasa ayu dan ala), perhitungan penanggalan, dan rincian kebutuhan sarana upakara tetap mengacu pada aturan mesin deterministik (*WarigaRuleEngine*) serta basis data pustaka sastra yang tervalidasi.
- **AI Model / LLM**: OpenAI GPT API (`gpt-4o-mini`) digunakan secara terkontrol di sisi server untuk:
  1. Mengekstrak informasi rentang harga sarana banten dari hasil pencarian web ke dalam format JSON terstruktur dengan validasi skema ketat.
  2. Mendukung fitur Chat AI interaktif dalam menjawab pertanyaan seputar upakara, banten, dan wariga berdasarkan konteks pustaka rujukan dan batasan domain (*TopicGuard*).
  3. Memetakan deskripsi bebas upacara dari pengguna ke daftar tertutup (*closed-list*) ID upacara yang terdaftar resmi di database.
- **Web Search API**: Tavily Search API (dengan opsi adapter alternatif Exa API / Brave Search) digunakan pada modul *PriceEstimator* dan grounding chat untuk mencari referensi harga dan informasi terkini dari internet. Hasil penelusuran dibatasi secara ketat menggunakan daftar domain terpercaya (*domain whitelist*).

---

## 3. Datasets & Third-Party Libraries

- **Open-Source Library**: `balinese-date-js-lib` digunakan pada modul adapter kalender (*CalendarAdapter*) untuk komputasi penanggalan Hindu Bali, mencakup Wewaran (ekawara hingga dasawara), Wuku, Sasih, penanggal/pangelong, dan fase bulan Purnama/Tilem berdasarkan konversi penanggalan Masehi.
- **Sumber Data Banten (Database Seed)**: Pangkalan data awal banten disusun mengacu pada pustaka keagamaan resmi:
  - *Buku Pedoman Praktis Upakara (Banten) dalam Upacara Yajna* (PSN / Yayasan Dharma Pinandita, 2012).
  - Naskah Lontar Wariga Dewasa dan referensi Panca Yadnya.
  - Setiap data budaya yang dimasukkan ke dalam sistem secara baku (*default*) diberi status `unverified` hingga melalui proses peninjauan dan validasi oleh pakar adat / Cultural Lead.

---

## 4. AI-Assisted Development Tools

Selama siklus perancangan dan rekayasa perangkat lunak, tim pengembang Ayukara memanfaatkan beberapa kakas bantu berbasis AI untuk meningkatkan efisiensi kerja teknis:

- **Alat yang Digunakan**: Cursor IDE, GitHub Copilot, ChatGPT, dan Claude.
- **Cakupan Penggunaan**:
  - Eksplorasi ide dan perumusan arsitektur sistem.
  - Penyusunan kerangka kode (*boilerplate code*) seperti React Server/Client Components, Next.js Route Handlers, dan skema migrasi database Sequelize.
  - Akselerasi proses *debugging*, penulisan *unit test* (Vitest), dan optimasi performa.
- **Prinsip Pertanggungjawaban**:
  - Seluruh kode yang dihasilkan dengan bantuan AI telah ditinjau ulang (*peer-reviewed*), disesuaikan dengan standar arsitektur proyek, dan diuji fungsionalitasnya secara menyeluruh.
  - Tim pengembang bertanggung jawab penuh terhadap implementasi akhir, kebenaran fungsional, dan pemenuhan etika budaya.
  - Dipastikan tidak ada kredensial sensitif (*secrets*, token, maupun API Keys) yang tersimpan atau terekspos ke repositori publik.

---

## 5. Status Proyek (Project Status)

- **Status Pengembangan**: *Development for Competition*.
- **Tujuan Pengembangan**: Ayukara dikembangkan secara khusus untuk berpartisipasi dalam kompetisi **AI Web Innovation Challenge — Bali DigiFest 2026** dan saat ini belum dikomersialisasikan secara luas kepada publik.

---

## Deklarasi Kepatuhan

Kami menyatakan bahwa seluruh informasi teknologi dalam dokumen ini disusun secara faktual berdasarkan arsitektur nyata dan proses pengembangan aplikasi **Ayukara**:

1. **Keamanan Kredensial**: Seluruh kunci API dan kredensial rahasia disimpan secara aman pada *environment variables* sisi server dengan panduan konfigurasi mengacu pada berkas `.env.example`. Repositori publik dilindungi dari kebocoran kredensial melalui aturan `.gitignore`.
2. **Kepatuhan Lisensi & HAKI**: Seluruh penggunaan pustaka sumber terbuka (*open-source libraries*), dataset pustaka upakara, dan antarmuka pemrograman aplikasi (API) pihak ketiga menghormati ketentuan lisensi yang berlaku serta hak kekayaan intelektual (HAKI) dari masing-masing pemilik karya.
