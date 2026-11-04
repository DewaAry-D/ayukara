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
    expect(pdfBuffer.length).toBeGreaterThan(500);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});

