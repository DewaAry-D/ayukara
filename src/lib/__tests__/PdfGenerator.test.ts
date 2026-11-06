import { describe, it, expect } from 'vitest';
import { PdfGenerator, PdfPlanData } from '../pdf/PdfGenerator';

describe('PdfGenerator', () => {
  it('harus menghasilkan buffer PDF yang valid dari data terstruktur tab dewasa', async () => {
    const generator = new PdfGenerator();
    const mockData: PdfPlanData = {
      tab: 'dewasa',
      upacaraNama: 'Pawiwahan',
      tingkatanNama: 'Madya',
      dateSummary: 'Senin, 10 Maret 2025',
      dateDetail: 'Soma Umanis Medangkungan · Dewasa Ayu: Subacara, Amerta Dadi',
      bantenItems: [
        {
          nama: 'Banten Pejati',
          lokasi: 'Pelinggih',
          jumlah: '1 soroh',
          status: 'verified',
          hargaStr: 'Rp 50.000 – Rp 75.000',
          sumber: 'Lontar Upadesa',
        },
      ],
      totalHargaStr: 'Rp 50.000 – Rp 75.000',
      waktuPengambilanWita: '2025-03-10 10:00 WITA',
      aiSummary: 'Rencana upacara Pawiwahan telah disusun berdasarkan hari baik yang memenuhi syarat.',
    };

    const pdfBuffer = await generator.generate(mockData);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(500);
    // PDF Magic Number: %PDF-
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('harus menghasilkan buffer PDF yang valid untuk tab otonan dan hari raya', async () => {
    const generator = new PdfGenerator();
    const otonanData: PdfPlanData = {
      tab: 'otonan',
      upacaraNama: 'Otonan',
      tingkatanNama: 'Nista',
      personName: 'I Putu Arya',
      dateSummary: 'Rabu, 15 Januari 2025',
      dateDetail: 'Buda Kliwon Dungulan · Otonan ke-4',
      bantenItems: [],
      totalHargaStr: 'Harga belum tersedia',
      waktuPengambilanWita: '2025-01-15 08:00 WITA',
    };

    const pdfBuffer = await generator.generate(otonanData);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(500);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('harus memproses aiSummary dengan markdown dan daftar banten panjang tanpa error', async () => {
    const generator = new PdfGenerator();
    const complexData: PdfPlanData = {
      tab: 'dewasa',
      upacaraNama: 'Melaspas Bangunan',
      tingkatanNama: 'Madya',
      dateSummary: 'Minggu, 15 November 2026',
      dateDetail: 'Redite Kliwon Tolu · Sasih Kanem',
      bantenItems: Array.from({ length: 15 }, (_, i) => ({
        nama: `Banten Uji Coba Ke-${i + 1} dengan Nama Panjang Penempatan`,
        lokasi: 'Pelinggih Utama dan Natar',
        jumlah: '1 soroh',
        status: i % 2 === 0 ? 'verified' : 'unverified',
      })),
      totalHargaStr: 'Rp 250.000 – Rp 500.000',
      waktuPengambilanWita: '2026-11-04 23:25 WITA',
      aiSummary: `Melaspas Bangunan tingkatan Madya dilaksanakan 2026-11-15, hari baik Amerta Dewa.

## Rangkaian upacara dan banten:
• **Nyikut Karang:** Pras, Daksina, Sodan/Rayunan/Ajuman, Tipat Kelanan
• **Ngeruak Karang:** Pras, Daksina, Caru Ngeruak Karang, Pemogpog
• **Nasarin / Mendem Dasar:** Pras, Daksina, Pras Pemendeman

[1] Buku Pedoman Praktis Upakara (Banten) dalam Upacara Yajna`,
    };

    const pdfBuffer = await generator.generate(complexData);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // Pastikan tidak ada halaman kosong ekstra yang tertambah oleh loop running footer
    const testData: PdfPlanData = {
      ...complexData,
      bantenItems: complexData.bantenItems.slice(0, 3),
    };
    const testBuf = await generator.generate(testData);
    const testRaw = testBuf.toString('latin1');
    const testMatches = testRaw.match(/\/Type\s*\/Page\b/g);
    // Data pendek harus tepat 1 halaman, tanpa halaman kosong tambahan
    expect(testMatches ? testMatches.length : 0).toBe(1);

    // 15 item banten muat dalam tepat 1 halaman tanpa halaman kosong tambahan
    const complexRaw = pdfBuffer.toString('latin1');
    const complexMatches = complexRaw.match(/\/Type\s*\/Page\b/g);
    expect(complexMatches ? complexMatches.length : 0).toBe(1);

    // 35 item banten harus tepat 2 halaman (bukan 4 halaman karena blank pages)
    const data35: PdfPlanData = {
      ...complexData,
      bantenItems: Array.from({ length: 35 }, (_, i) => ({
        nama: `Banten Item ${i + 1} Panjang`,
        lokasi: 'Pelinggih Surya, Kemulan dan Natar',
        jumlah: '1 soroh',
        status: 'unverified',
      })),
    };
    const buf35 = await generator.generate(data35);
    const raw35 = buf35.toString('latin1');
    const matches35 = raw35.match(/\/Type\s*\/Page\b/g);
    expect(matches35 ? matches35.length : 0).toBe(2);
  });
});

