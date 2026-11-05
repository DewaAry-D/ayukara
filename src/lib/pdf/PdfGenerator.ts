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
        const leftMargin = 45;
        const rightMargin = 550;
        const contentWidth = rightMargin - leftMargin; // 505pt

        const doc = new PDFDocument({
          margin: leftMargin,
          size: 'A4',
          bufferPages: true,
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

        // -------------------------------------------------------------
        // HEADER PERUSAHAAN / PLATFORM
        // -------------------------------------------------------------
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('AYUKARA', leftMargin, doc.y, { width: contentWidth });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#C25E2E')
          .text('Pendamping Perencanaan Upacara Yadnya Hindu Bali', leftMargin, doc.y, {
            width: contentWidth,
          });

        doc.moveDown(0.4);
        doc
          .strokeColor('#E5DFD5')
          .lineWidth(1)
          .moveTo(leftMargin, doc.y)
          .lineTo(rightMargin, doc.y)
          .stroke();
        doc.y += 8;
        doc.x = leftMargin;

        // -------------------------------------------------------------
        // DETAIL UPACARA & TINGKATAN
        // -------------------------------------------------------------
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text(`Rencana Upacara: ${data.upacaraNama}`, leftMargin, doc.y, {
            width: contentWidth,
          });

        doc.moveDown(0.2);
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#5C6B5E')
          .text(
            `Tingkatan: ${data.tingkatanNama} · Jalur: ${this.formatTabName(data.tab)}`,
            leftMargin,
            doc.y,
            { width: contentWidth }
          );

        if (data.personName) {
          doc.moveDown(0.2);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#5C6B5E')
            .text(`Pemohon / Nama Anak: ${data.personName}`, leftMargin, doc.y, {
              width: contentWidth,
            });
        }

        doc.y += 10;
        doc.x = leftMargin;

        // -------------------------------------------------------------
        // 1. BAGIAN TANGGAL
        // -------------------------------------------------------------
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('1. Penetapan Hari & Kalender Bali', leftMargin, doc.y, {
            width: contentWidth,
          });

        doc.moveDown(0.2);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#C25E2E')
          .text(data.dateSummary, leftMargin, doc.y, { width: contentWidth });

        if (data.dateDetail) {
          doc.moveDown(0.2);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#5C6B5E')
            .text(data.dateDetail, leftMargin, doc.y, { width: contentWidth });
        }

        doc.y += 10;
        doc.x = leftMargin;

        // -------------------------------------------------------------
        // 2. DAFTAR BANTEN / UPAKARA
        // -------------------------------------------------------------
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('2. Rincian Upakara / Kebutuhan Banten', leftMargin, doc.y, {
            width: contentWidth,
          });

        doc.y += 6;
        doc.x = leftMargin;

        const printTableHeader = () => {
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#57534E');
          const hY = doc.y;
          doc.text('No', 45, hY, { width: 25 });
          doc.text('Nama Banten', 75, hY, { width: 220 });
          doc.text('Lokasi Penempatan', 300, hY, { width: 130 });
          doc.text('Jumlah', 435, hY, { width: 55 });
          doc.text('Status', 495, hY, { width: 55, align: 'right' });
          doc.y = hY + 12;
          doc.x = leftMargin;

          doc
            .strokeColor('#E7E5E4')
            .lineWidth(0.5)
            .moveTo(leftMargin, doc.y)
            .lineTo(rightMargin, doc.y)
            .stroke();
          doc.y += 5;
          doc.x = leftMargin;
        };

        if (!data.bantenItems || data.bantenItems.length === 0) {
          doc
            .fontSize(9)
            .font('Helvetica-Oblique')
            .fillColor('#78716C')
            .text('Data banten belum tersedia di pangkalan data terverifikasi.', leftMargin, doc.y, {
              width: contentWidth,
            });
          doc.y += 6;
          doc.x = leftMargin;
        } else {
          printTableHeader();

          doc.font('Helvetica').fontSize(8).fillColor('#1C1917');
          data.bantenItems.forEach((item, idx) => {
            const nameH = doc.heightOfString(item.nama, { width: 220 });
            const locText = item.lokasi || '-';
            const locH = doc.heightOfString(locText, { width: 130 });
            const rowH = Math.max(nameH, locH, 12);

            // Periksa batas halaman bawah
            if (doc.y + rowH + 8 > 740) {
              doc.addPage();
              printTableHeader();
            }

            const rowY = doc.y;
            doc.text(String(idx + 1), 45, rowY, { width: 25 });
            doc.text(item.nama, 75, rowY, { width: 220 });
            doc.text(locText, 300, rowY, { width: 130 });
            doc.text(item.jumlah || '1 soroh', 435, rowY, { width: 55 });
            doc.text(
              item.status === 'verified' ? 'Tervalidasi' : 'Belum Valid',
              495,
              rowY,
              { width: 55, align: 'right' }
            );

            doc.y = rowY + rowH + 4;
            doc.x = leftMargin;
          });
        }

        doc.y += 8;
        doc.x = leftMargin;

        // -------------------------------------------------------------
        // 3. ESTIMASI BIAYA & TOTAL
        // -------------------------------------------------------------
        if (doc.y > 690) {
          doc.addPage();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text('3. Perkiraan Anggaran Biaya', leftMargin, doc.y, {
            width: contentWidth,
          });

        doc.moveDown(0.2);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1B3022')
          .text(
            `Total Estimasi: ${data.totalHargaStr || 'Harga belum tersedia'}`,
            leftMargin,
            doc.y,
            { width: contentWidth }
          );

        if (data.waktuPengambilanWita) {
          doc.moveDown(0.2);
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#78716C')
            .text(`Data harga pasar per: ${data.waktuPengambilanWita}`, leftMargin, doc.y, {
              width: contentWidth,
            });
        }

        doc.y += 10;
        doc.x = leftMargin;

        // -------------------------------------------------------------
        // 4. RINGKASAN & CATATAN SASTRA
        // -------------------------------------------------------------
        if (data.aiSummary) {
          if (doc.y > 670) {
            doc.addPage();
          }

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#1B3022')
            .text('4. Catatan Pelaksanaan Sastra', leftMargin, doc.y, {
              width: contentWidth,
            });

          doc.moveDown(0.3);
          doc.x = leftMargin;

          const lines = data.aiSummary
            .split(/\n+/)
            .map((l) => l.trim())
            .filter((l) => {
              if (!l) return false;
              return l.replace(/^[•\-*.\s]+$/, '').length > 0;
            });

          for (const line of lines) {
            if (doc.y > 730) {
              doc.addPage();
            }
            doc.x = leftMargin;

            // A. Heading tingkat 2 atau 3 (## atau ###)
            if (line.startsWith('## ') || line.startsWith('### ')) {
              const headingText = line.replace(/^#{2,3}\s*/, '').replace(/\*\*/g, '').trim();
              if (!headingText) continue;
              doc.moveDown(0.3);
              doc
                .fontSize(9.5)
                .font('Helvetica-Bold')
                .fillColor('#1B3022')
                .text(headingText, leftMargin, doc.y, { width: contentWidth });
              doc.moveDown(0.2);
              doc.x = leftMargin;
              continue;
            }

            // B. Poin daftar (•, -, *, atau angka 1.)
            if (/^[•\-*]\s*/.test(line) || /^\d+\.\s*/.test(line)) {
              const itemRaw = line.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
              if (!itemRaw) continue;

              const boldMatch = itemRaw.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
              const bulletX = leftMargin + 10;
              const bulletW = contentWidth - 10;

              if (boldMatch) {
                const titleStr = boldMatch[1].replace(/:$/, '').trim();
                const descStr = boldMatch[2].replace(/\*\*/g, '').trim();

                doc
                  .fontSize(8.5)
                  .font('Helvetica-Bold')
                  .fillColor('#1B3022')
                  .text(`• ${titleStr}: `, bulletX, doc.y, { continued: true, width: bulletW })
                  .font('Helvetica')
                  .fillColor('#292524')
                  .text(descStr, { continued: false, width: bulletW });
              } else {
                const cleanItem = itemRaw.replace(/\*\*/g, '').trim();
                doc
                  .fontSize(8.5)
                  .font('Helvetica')
                  .fillColor('#292524')
                  .text(`• ${cleanItem}`, bulletX, doc.y, { width: bulletW, lineGap: 1.5 });
              }

              doc.y += 3;
              doc.x = leftMargin;
              continue;
            }

            // C. Sitasi sumber [1]
            if (/^\[\d+\]/.test(line)) {
              doc
                .fontSize(8)
                .font('Helvetica-Oblique')
                .fillColor('#78716C')
                .text(line, leftMargin, doc.y, { width: contentWidth });
              doc.y += 3;
              doc.x = leftMargin;
              continue;
            }

            // D. Paragraf biasa
            const cleanParagraph = line.replace(/\*\*/g, '').trim();
            if (!cleanParagraph) continue;

            doc
              .fontSize(8.5)
              .font('Helvetica')
              .fillColor('#292524')
              .text(cleanParagraph, leftMargin, doc.y, { width: contentWidth, lineGap: 2 });

            doc.y += 4;
            doc.x = leftMargin;
          }

          doc.moveDown(0.5);
          doc.x = leftMargin;
        }

        // -------------------------------------------------------------
        // DISCLAIMER & FOOTER
        // -------------------------------------------------------------
        if (doc.y > 690) {
          doc.addPage();
        }
        doc.x = leftMargin;

        doc
          .strokeColor('#E5DFD5')
          .lineWidth(0.5)
          .moveTo(leftMargin, doc.y)
          .lineTo(rightMargin, doc.y)
          .stroke();
        doc.moveDown(0.5);
        doc.x = leftMargin;

        doc
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor('#C25E2E')
          .text(
            'PERINGATAN BUDAYA & KEAGAMAAN: Ayukara adalah pendamping, bukan pengganti sulinggih/pemangku. Segala penentuan hari baik dan rincian upakara tetap merujuk pada petunjuk sulinggih serta desa kala patra setempat.',
            leftMargin,
            doc.y,
            { width: contentWidth }
          );

        doc.moveDown(0.3);
        doc.x = leftMargin;

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#78716C')
          .text(
            'DISCLAIMER HARGA: Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah.',
            leftMargin,
            doc.y,
            { width: contentWidth }
          );

        doc.moveDown(0.3);
        doc.x = leftMargin;

        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#A8A29E')
          .text(
            `Dokumen ini dicetak pada: ${nowWita} · Ayukara Platform (Bali DigiFest 2026)`,
            leftMargin,
            doc.y,
            {
              width: contentWidth,
              align: 'right',
            }
          );

        // -------------------------------------------------------------
        // RUNNING FOOTER: NOMOR HALAMAN
        // -------------------------------------------------------------
        const pageRange = doc.bufferedPageRange();
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i);
          const oldBottomMargin = doc.page.margins.bottom;
          doc.page.margins.bottom = 0;
          doc
            .fontSize(7)
            .font('Helvetica')
            .fillColor('#A8A29E')
            .text(
              `Halaman ${i + 1} dari ${pageRange.count}`,
              leftMargin,
              800,
              { width: contentWidth, align: 'center', lineBreak: false }
            );
          doc.page.margins.bottom = oldBottomMargin;
        }

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
