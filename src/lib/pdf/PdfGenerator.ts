import PDFDocument from 'pdfkit';

export interface PdfBantenItem {
  nama: string;
  lokasi?: string | null;
  jumlah?: string | null;
  status: string;
  hargaStr?: string;
  sumber?: string;
}

export interface PdfPlanData {
  tab: 'dewasa' | 'otonan' | 'hari_raya';
  upacaraNama: string;
  tingkatanNama: string;
  dateSummary: string;
  dateDetail?: string;
  bantenItems: PdfBantenItem[];
  totalHargaStr?: string;
  waktuPengambilanWita?: string;
  aiSummary?: string;
  personName?: string;
  createdAtWita?: string;
}

export class PdfGenerator {
  public async generate(data: PdfPlanData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 45,
          size: 'A4',
          info: {
            Title: `Rencana Yadnya - ${data.upacaraNama}`,
            Author: 'Ayukara - Pendamping Upacara Yadnya Hindu Bali',
            Subject: 'Rencana Yadnya & Kebutuhan Upakara',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const nowWita =
          data.createdAtWita ||
          new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'full',
            timeStyle: 'medium',
            timeZone: 'Asia/Makassar',
          }).format(new Date()) + ' WITA';

        // HEADER
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('AYUKARA', { align: 'left' });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#C25E2E')
          .text('Pendamping Perencanaan Upacara Yadnya Hindu Bali', { align: 'left' });

        doc.moveDown(0.5);
        doc
          .strokeColor('#E5DFD5')
          .lineWidth(1)
          .moveTo(45, doc.y)
          .lineTo(550, doc.y)
          .stroke();
        doc.moveDown(0.8);

        // (1) & (2) DETAIL UPACARA & TINGKATAN
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text(`Rencana Upacara: ${data.upacaraNama}`);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#5C6B5E')
          .text(`Tingkatan: ${data.tingkatanNama} · Jalur: ${this.formatTabName(data.tab)}`);

        if (data.personName) {
          doc.text(`Pemohon / Nama Anak: ${data.personName}`);
        }

        doc.moveDown(0.6);

        // (3) BAGIAN TANGGAL SESUAI TAB
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('1. Penetapan Hari & Kalender Bali');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#C25E2E')
          .text(data.dateSummary);

        if (data.dateDetail) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#5C6B5E')
            .text(data.dateDetail);
        }

        doc.moveDown(0.8);

        // (4) DAFTAR BANTEN
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('2. Rincian Upakara / Kebutuhan Banten');

        if (!data.bantenItems || data.bantenItems.length === 0) {
          doc
            .fontSize(9)
            .font('Helvetica-Oblique')
            .fillColor('#78716C')
            .text('Data banten belum tersedia di pangkalan data terverifikasi.');
        } else {
          // Table header
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#57534E');
          const startY = doc.y + 4;
          doc.text('No', 45, startY, { width: 25 });
          doc.text('Nama Banten', 70, startY, { width: 170 });
          doc.text('Lokasi', 245, startY, { width: 90 });
          doc.text('Jumlah', 340, startY, { width: 65 });
          doc.text('Status', 410, startY, { width: 60 });
          doc.text('Estimasi Harga', 475, startY, { width: 75, align: 'right' });

          doc.moveDown(0.8);
          doc
            .strokeColor('#E7E5E4')
            .lineWidth(0.5)
            .moveTo(45, doc.y)
            .lineTo(550, doc.y)
            .stroke();
          doc.moveDown(0.4);

          // Table rows
          doc.font('Helvetica').fontSize(8).fillColor('#1C1917');
          data.bantenItems.forEach((item, idx) => {
            if (doc.y > 720) {
              doc.addPage();
            }
            const rowY = doc.y;
            doc.text(`${idx + 1}`, 45, rowY, { width: 25 });
            doc.text(item.nama, 70, rowY, { width: 170 });
            doc.text(item.lokasi || '-', 245, rowY, { width: 90 });
            doc.text(item.jumlah || '1 soroh', 340, rowY, { width: 65 });
            doc.text(item.status === 'verified' ? 'Tervalidasi' : 'Belum Valid', 410, rowY, {
              width: 60,
            });
            doc.text(item.hargaStr || 'Belum tersedia', 475, rowY, {
              width: 75,
              align: 'right',
            });
            doc.moveDown(0.5);
          });
        }

        doc.moveDown(0.8);

        // (5) ESTIMASI BIAYA & TOTAL
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('3. Perkiraan Anggaran Biaya');

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text(`Total Estimasi: ${data.totalHargaStr || 'Harga belum tersedia'}`);

        if (data.waktuPengambilanWita) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#78716C')
            .text(`Data harga pasar per: ${data.waktuPengambilanWita}`);
        }

        doc.moveDown(0.8);

        // (6) RINGKASAN & CATATAN
        if (data.aiSummary) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#1B3022')
            .text('4. Catatan Pelaksanaan Sastra');

          doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor('#292524')
            .text(data.aiSummary, { lineGap: 2 });

          doc.moveDown(0.8);
        }

        // (6 & 7) DISCLAIMER & FOOTER
        if (doc.y > 690) {
          doc.addPage();
        }

        doc
          .strokeColor('#E5DFD5')
          .lineWidth(0.5)
          .moveTo(45, doc.y)
          .lineTo(550, doc.y)
          .stroke();
        doc.moveDown(0.5);

        doc
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor('#C25E2E')
          .text(
            'PERINGATAN BUDAYA & KEAGAMAAN: Ayukara adalah pendamping, bukan pengganti sulinggih/pemangku. Segala penentuan hari baik dan rincian upakara tetap merujuk pada petunjuk sulinggih serta desa kala patra setempat.'
          );

        doc.moveDown(0.3);

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#78716C')
          .text(
            'DISCLAIMER HARGA: Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah.'
          );

        doc.moveDown(0.3);

        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#A8A29E')
          .text(`Dokumen ini dicetak pada: ${nowWita} · Ayukara Platform (Bali DigiFest 2026)`, {
            align: 'right',
          });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private formatTabName(tab: 'dewasa' | 'otonan' | 'hari_raya'): string {
    switch (tab) {
      case 'dewasa':
        return 'Cari Hari Baik (Dewasa Ayu)';
      case 'otonan':
        return 'Perhitungan Otonan';
      case 'hari_raya':
        return 'Jadwal Hari Raya Tetap';
    }
  }
}

export default PdfGenerator;
