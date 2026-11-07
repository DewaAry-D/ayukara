# AI & Technology Disclosure

**Tim Ayukara**

Disusun ulang dari dokumen yang diberikan. Penanda `[Perlu konfirmasi]` menunjukkan informasi yang belum tersedia atau belum pasti dalam dokumen sumber.

| Komponen | Isi Peserta |
|---|---|
| **Nama Produk** | Ayukara — Tim Ayukara. |
| **Framework / Frontend** | Next.js (App Router), React, dan TypeScript. |
| **Backend / Runtime** | Node.js sebagai lingkungan runtime. OpenAI GPT API digunakan pada sisi server. Sequelize ORM digunakan untuk pengelolaan database. |
| **Database / Storage** | PostgreSQL yang di-hosting melalui Neon. Upstash Redis (REST API) untuk caching hasil pencarian harga pasar, dengan TTL 1 hari, guna mengurangi permintaan API berulang dan mempercepat respons sistem. |
| **Hosting / Deployment** | Vercel untuk deployment aplikasi dan serverless functions. |
| **AI Model / API / Method** | OpenAI GPT API; pendekatan hybrid. Web Search API: Tavily Search API. |
| **Peran AI dalam Produk** | Mengekstrak rentang harga dari hasil pencarian web ke format JSON terstruktur; mendukung chatbot untuk pertanyaan seputar upakara, banten, dan wariga berdasarkan konteks serta sumber informasi yang tersedia. Pencarian web digunakan untuk mencari referensi harga banten terkini. AI berfokus pada pengolahan informasi dan data dinamis, bukan menentukan atau menghasilkan aturan keagamaan. Informasi wariga dan kebutuhan banten tetap mengacu pada aturan sistem serta sumber budaya yang telah ditentukan. |
| **Dataset / Data Source** | • Buku Pedoman Praktis Upakara (Banten) dalam Upacara Yajna (PSN / Yayasan Dharma Pinandita, 2012, ISBN 978-602-14516-0-1, hlm. 115–169).<br>• Lontar Sundarigama.<br>• Lontar Aji Gurnita.<br>• Lontar Dewa Tatwa & Lontar Kusuma Dewa.<br>• Lontar Yama Purwana Tatwa & Lontar Kala Tatwa.<br>• Upakara Yajna & Hari Raya Hindu (Dra. Ni Made Sri Arwati).<br>• Website resmi PHDI.<br>• Data duase / padewasan diperoleh dari https://kalenderbali.org/referensialaayu.php |
| **Open-source Libraries** | • `balinese-date-js-lib` untuk Wariga Rule Engine: membantu perhitungan Wewaran, Wuku, dan Sasih berdasarkan tanggal Masehi.<br>• Pustaka dan framework lain: Next.js, React, TypeScript, Sequelize ORM, dan PDFKit untuk library unduh PDF. |
| **Template / Boilerplate** | Menggunakan starter bawaan Next.js melalui `create-next-app` sebagai struktur awal proyek; fitur dan tampilan Ayukara dikembangkan secara orisinal oleh tim. |
| **AI Coding Assistant** | Tim menggunakan beberapa alat bantu berbasis AI selama pengembangan:<br>1. **ChatGPT**: membantu brainstorming, penulisan dokumentasi, dan debugging.<br>2. **Cursor**: membantu penulisan dan refactoring kode.<br>3. **Google Antigravity (Gemini)**: membantu proses coding.<br>4. **Claude**: membantu perencanaan tahapan pengembangan kode.<br>5. **Grok Bot**: membantu persiapan query SQL untuk data wariga dan banten.<br>Seluruh kode, desain, dan konten budaya tetap ditinjau, diuji, dan diverifikasi oleh anggota tim; data wariga dan banten dikurasi oleh Cultural Knowledge & Data Lead. |
| **Pre-existing Components** | Status yang dinyatakan: *Development for Competition*. Ayukara dikembangkan khusus untuk kompetisi AI Web Innovation Challenge Bali DigiFest 2026 dan belum dikomersialisasikan secara luas. |
| **Third-party Assets / Credits** | Tidak menggunakan aset pihak ketiga; seluruh aset visual dibuat oleh tim. |

---

## Deklarasi Kepatuhan

Kami menyatakan bahwa informasi teknologi dalam dokumen ini disusun berdasarkan teknologi dan proses pengembangan Ayukara. Tim memastikan bahwa kredensial serta informasi sensitif tidak disimpan dalam repositori publik, dengan menggunakan konfigurasi lingkungan yang mengacu pada file `.env.example`. Selain itu, penggunaan pustaka dan API pihak ketiga tetap memperhatikan ketentuan lisensi serta hak kekayaan intelektual (HAKI) masing-masing penyedia.
