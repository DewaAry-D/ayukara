import path from 'path';
import fs from 'fs';
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
  weton?: string;
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
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const leftMargin = 45;
        const rightMargin = 550;
        const contentWidth = rightMargin - leftMargin; // 505pt
        const pageMaxY = 780;

        const doc = new PDFDocument({
          size: 'A4',
          margin: 0, // Dikelola presisi secara manual untuk mencegah page-break tak disengaja
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

        // -------------------------------------------------------------
        // HELPER FUNCTIONS
        // -------------------------------------------------------------
        const drawSectionHeader = (title: string, y: number): number => {
          const badgeSize = 22;
          doc.save();

          // Kotak badge hijau tua
          doc.fillColor('#24473F').rect(leftMargin, y, badgeSize, badgeSize).fill();

          // Bintang / bunga emas 8 kelopak di dalam badge
          const cx = leftMargin + badgeSize / 2;
          const cy = y + badgeSize / 2;
          const radius = badgeSize * 0.28;
          doc.strokeColor('#C9A24A').lineWidth(1.8).lineCap('round');
          for (let angle = 0; angle < 180; angle += 45) {
            const rad = (angle * Math.PI) / 180;
            const dx = Math.cos(rad) * radius;
            const dy = Math.sin(rad) * radius;
            doc.moveTo(cx - dx, cy - dy).lineTo(cx + dx, cy + dy).stroke();
          }

          // Banner bar hijau tua
          const bannerX = leftMargin + badgeSize + 6;
          const bannerW = contentWidth - badgeSize - 6;
          doc.fillColor('#24473F').rect(bannerX, y, bannerW, badgeSize).fill();
          doc.restore();

          // Teks banner putih tebal
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#FFFFFF')
            .text(title, bannerX + 10, y + 6, {
              width: bannerW - 20,
              lineBreak: false,
            });

          return y + badgeSize;
        };

        const colWidths = [30, 210, 185, 80];
        const colPositions = [
          leftMargin,
          leftMargin + colWidths[0],
          leftMargin + colWidths[0] + colWidths[1],
          leftMargin + colWidths[0] + colWidths[1] + colWidths[2],
        ];

        const drawTableHeader = (y: number): number => {
          const headerH = 18;
          doc.save();
          doc.fillColor('#24473F').rect(leftMargin, y, contentWidth, headerH).fill();
          doc.strokeColor('#3D6359').lineWidth(0.75);
          doc.moveTo(colPositions[1], y).lineTo(colPositions[1], y + headerH).stroke();
          doc.moveTo(colPositions[2], y).lineTo(colPositions[2], y + headerH).stroke();
          doc.moveTo(colPositions[3], y).lineTo(colPositions[3], y + headerH).stroke();
          doc.restore();

          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF');
          doc.text('No', colPositions[0], y + 4, { width: colWidths[0], align: 'center', lineBreak: false });
          doc.text('Nama Banten', colPositions[1] + 6, y + 4, { width: colWidths[1] - 12, lineBreak: false });
          doc.text('Lokasi Penempatan', colPositions[2] + 6, y + 4, { width: colWidths[2] - 12, lineBreak: false });
          doc.text('Jumlah', colPositions[3], y + 4, { width: colWidths[3], align: 'center', lineBreak: false });

          return y + headerH;
        };

        // -------------------------------------------------------------
        // 1. BRAND HEADER (Logo & Rencana Ayukara)
        // -------------------------------------------------------------
        const logoCandidates = [
          path.resolve(process.cwd(), 'public/images/logo_ayukara_hd.png'),
          path.resolve(process.cwd(), 'public/images/logo_ayukara.png'),
          path.join(__dirname, '../../../public/images/logo_ayukara_hd.png'),
        ];
        let foundLogoPath: string | null = null;
        for (const candidate of logoCandidates) {
          if (fs.existsSync(candidate)) {
            foundLogoPath = candidate;
            break;
          }
        }

        if (foundLogoPath) {
          try {
            doc.image(foundLogoPath, leftMargin + 2, 42, { width: 48, height: 48 });
          } catch {
            // Abaikan jika berkas gambar tidak dapat dimuat
          }
        }

        doc
          .fontSize(21)
          .font('Times-Bold')
          .fillColor('#1F3B3A')
          .text('Rencana', leftMargin + 60, 46, { lineBreak: false })
          .text('Ayukara', leftMargin + 60, 68, { lineBreak: false });

        // -------------------------------------------------------------
        // 2. METADATA SECTION (2 Kolom x 2 Baris dengan Garis Bawah)
        // -------------------------------------------------------------
        const metaY = 104;
        const col1X = leftMargin;
        const col1W = 235;
        const col2X = 315;
        const col2W = 235;

        // Baris 1: Nama Upacara & Tingkatan Upacara
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1F3B3A').text('Nama Upacara:', col1X, metaY, { lineBreak: false });
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#374151').text(data.upacaraNama || '-', col1X, metaY + 12, { width: col1W - 10, lineBreak: false });
        doc.strokeColor('#9CA3AF').lineWidth(0.75).moveTo(col1X, metaY + 24).lineTo(col1X + col1W, metaY + 24).stroke();

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1F3B3A').text('Tingkatan Upacara:', col2X, metaY, { lineBreak: false });
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#374151').text(data.tingkatanNama || '-', col2X, metaY + 12, { width: col2W, lineBreak: false });
        doc.strokeColor('#9CA3AF').lineWidth(0.75).moveTo(col2X, metaY + 24).lineTo(col2X + col2W, metaY + 24).stroke();

        // Baris 2: Tanggal & Weton
        const metaY2 = metaY + 31;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1F3B3A').text('Tanggal:', col1X, metaY2, { lineBreak: false });
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#374151').text(data.dateSummary || '-', col1X, metaY2 + 12, { width: col1W - 10, lineBreak: false });
        doc.strokeColor('#9CA3AF').lineWidth(0.75).moveTo(col1X, metaY2 + 24).lineTo(col1X + col1W, metaY2 + 24).stroke();

        const wetonText = data.weton || data.dateDetail || '-';
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1F3B3A').text('Weton:', col2X, metaY2, { lineBreak: false });
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#374151').text(wetonText, col2X, metaY2 + 12, { width: col2W, lineBreak: false });
        doc.strokeColor('#9CA3AF').lineWidth(0.75).moveTo(col2X, metaY2 + 24).lineTo(col2X + col2W, metaY2 + 24).stroke();

        // -------------------------------------------------------------
        // 3. SECTION 1: RINCIAN UPAKARA / KEBUTUHAN BANTEN
        // -------------------------------------------------------------
        let curY = metaY2 + 36;
        curY = drawSectionHeader('Rincian Upakara / Kebutuhan Banten', curY);

        curY += 5;
        curY = drawTableHeader(curY);

        if (!data.bantenItems || data.bantenItems.length === 0) {
          const emptyH = 22;
          doc.strokeColor('#24473F').lineWidth(0.6);
          doc.rect(leftMargin, curY, contentWidth, emptyH).stroke();
          doc
            .fontSize(8.5)
            .font('Helvetica-Oblique')
            .fillColor('#6B7280')
            .text('Data banten belum tersedia di pangkalan data terverifikasi.', leftMargin + 10, curY + 6, {
              width: contentWidth - 20,
              align: 'center',
              lineBreak: false,
            });
          curY += emptyH;
        } else {
          for (let idx = 0; idx < data.bantenItems.length; idx++) {
            const item = data.bantenItems[idx];
            doc.font('Helvetica').fontSize(8);
            const nameH = doc.heightOfString(item.nama, { width: colWidths[1] - 12 });
            const locText = item.lokasi || '-';
            const locH = doc.heightOfString(locText, { width: colWidths[2] - 12 });
            const rowH = Math.max(nameH, locH, 11) + 4;

            // Periksa batas halaman
            if (curY + rowH > pageMaxY) {
              doc.addPage();
              curY = drawTableHeader(48);
            }

            // Garis baris tabel
            doc.strokeColor('#24473F').lineWidth(0.6);
            doc.rect(leftMargin, curY, contentWidth, rowH).stroke();
            doc.moveTo(colPositions[1], curY).lineTo(colPositions[1], curY + rowH).stroke();
            doc.moveTo(colPositions[2], curY).lineTo(colPositions[2], curY + rowH).stroke();
            doc.moveTo(colPositions[3], curY).lineTo(colPositions[3], curY + rowH).stroke();

            // Isi teks sel
            doc.fontSize(8).font('Helvetica').fillColor('#1F2937');
            doc.text(String(idx + 1), colPositions[0], curY + 4, { width: colWidths[0], align: 'center', lineBreak: false });
            doc.text(item.nama, colPositions[1] + 6, curY + 4, { width: colWidths[1] - 12 });
            doc.text(locText, colPositions[2] + 6, curY + 4, { width: colWidths[2] - 12 });
            doc.text(item.jumlah || '1 soroh', colPositions[3], curY + 4, { width: colWidths[3], align: 'center', lineBreak: false });

            curY += rowH;
          }
        }

        // -------------------------------------------------------------
        // 4. SECTION 2: PERKIRAAN ANGGARAN BIAYA
        // -------------------------------------------------------------
        if (curY + 76 > pageMaxY) {
          doc.addPage();
          curY = 48;
        } else {
          curY += 10;
        }

        curY = drawSectionHeader('Perkiraan Anggaran Biaya', curY);
        curY += 5;

        const boxH = 46;
        doc.save();
        doc.fillColor('#24473F').rect(leftMargin, curY, contentWidth, boxH).fill();
        doc.restore();

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF').text('Total Estimasi:', leftMargin + 14, curY + 11, { lineBreak: false });
        const labelW = doc.widthOfString('Total Estimasi: ') + 20;

        doc
          .fontSize(15)
          .font('Helvetica-Bold')
          .fillColor('#4ADE80')
          .text(data.totalHargaStr || 'Harga belum tersedia', leftMargin + labelW, curY + 9, { lineBreak: false });

        doc
          .fontSize(7.5)
          .font('Helvetica-Oblique')
          .fillColor('#9CA3AF')
          .text('*Harga merupakan estimasi bisa jadi berbeda beda tergantung harga bahan dan daerah.', leftMargin + 14, curY + 30, {
            width: contentWidth - 28,
            lineBreak: false,
          });

        curY += boxH;

        // -------------------------------------------------------------
        // 5. SECTION 3: CATATAN PELAKSANAAN SASTRA (Bila aiSummary ada)
        // -------------------------------------------------------------
        if (data.aiSummary) {
          const lines = data.aiSummary
            .split(/\n+/)
            .map((l) => l.trim())
            .filter((l) => l && l.replace(/^[•\-*.\s]+$/, '').length > 0);

          if (lines.length > 0) {
            if (curY + 45 > pageMaxY) {
              doc.addPage();
              curY = 48;
            } else {
              curY += 10;
            }

            curY = drawSectionHeader('Catatan Pelaksanaan Sastra', curY);
            curY += 6;

            for (const line of lines) {
              if (curY + 16 > pageMaxY) {
                doc.addPage();
                curY = 48;
              }

              if (line.startsWith('## ') || line.startsWith('### ')) {
                const headingText = line.replace(/^#{2,3}\s*/, '').replace(/\*\*/g, '').trim();
                doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1F3B3A').text(headingText, leftMargin, curY, { width: contentWidth, lineBreak: false });
                curY += 12;
                continue;
              }

              if (/^[•\-*]\s*/.test(line) || /^\d+\.\s*/.test(line)) {
                const itemRaw = line.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
                const boldMatch = itemRaw.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
                const bulletX = leftMargin + 8;
                const bulletW = contentWidth - 8;

                if (boldMatch) {
                  const titleStr = boldMatch[1].replace(/:$/, '').trim();
                  const descStr = boldMatch[2].replace(/\*\*/g, '').trim();
                  doc
                    .fontSize(7.5)
                    .font('Helvetica-Bold')
                    .fillColor('#1F3B3A')
                    .text(`• ${titleStr}: `, bulletX, curY, { continued: true, width: bulletW })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(descStr, { continued: false, width: bulletW });
                  curY += Math.max(doc.heightOfString(`${titleStr}: ${descStr}`, { width: bulletW }), 10) + 2;
                } else {
                  const cleanItem = itemRaw.replace(/\*\*/g, '').trim();
                  doc.fontSize(7.5).font('Helvetica').fillColor('#374151').text(`• ${cleanItem}`, bulletX, curY, { width: bulletW });
                  curY += doc.heightOfString(`• ${cleanItem}`, { width: bulletW }) + 2;
                }
                continue;
              }

              if (/^\[\d+\]/.test(line)) {
                doc.fontSize(7).font('Helvetica-Oblique').fillColor('#6B7280').text(line, leftMargin, curY, { width: contentWidth, lineBreak: false });
                curY += 10;
                continue;
              }

              const cleanParagraph = line.replace(/\*\*/g, '').trim();
              doc.fontSize(7.5).font('Helvetica').fillColor('#374151').text(cleanParagraph, leftMargin, curY, { width: contentWidth });
              curY += doc.heightOfString(cleanParagraph, { width: contentWidth }) + 2;
            }
          }
        }

        // -------------------------------------------------------------
        // RUNNING DECORATIONS OVER ALL PAGES
        // -------------------------------------------------------------
        const pageRange = doc.bufferedPageRange();
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i);

          // Lengkungan sudut emas atas (kiri & kanan)
          doc.save();
          doc.fillColor('#C9A24A');
          doc.path('M 0 0 L 75 0 C 35 0 0 35 0 75 Z').fill();
          doc.path(
            `M ${pageWidth} 0 L ${pageWidth - 75} 0 C ${pageWidth - 35} 0 ${pageWidth} 35 ${pageWidth} 75 Z`
          ).fill();

          // Garis strip emas bawah
          doc.rect(0, pageHeight - 5, pageWidth, 5).fill('#C9A24A');
          doc.restore();

          // URL terpusat di atas dokumen
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#4B5563')
            .text('https://ayukara.vercel.app', 0, 15, {
              width: pageWidth,
              align: 'center',
              underline: true,
              lineBreak: false,
            });

          // Peringatan / disclaimer budaya di kaki halaman
          doc
            .fontSize(7.5)
            .font('Helvetica-Oblique')
            .fillColor('#4B5563')
            .text(
              'Ayukara adalah pendamping, bukan pengganti sulinggih/pemangku. Segala penentuan hari baik dan rincian upakara tetap merujuk pada petunjuk sulinggih serta desa kala patra setempat.',
              leftMargin,
              pageHeight - 34,
              { width: contentWidth, align: 'center', lineBreak: true }
            );

          // Penomoran halaman jika dokumen lebih dari 1 halaman
          if (pageRange.count > 1) {
            doc
              .fontSize(7)
              .font('Helvetica')
              .fillColor('#9CA3AF')
              .text(`Halaman ${i + 1} dari ${pageRange.count}`, leftMargin, pageHeight - 16, {
                width: contentWidth,
                align: 'right',
                lineBreak: false,
              });
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default PdfGenerator;
