import { NextRequest, NextResponse } from 'next/server';
import { PdfGenerator, PdfPlanData } from '@/lib/pdf/PdfGenerator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: PdfPlanData = await request.json();

    if (!body || !body.upacaraNama) {
      return NextResponse.json(
        { error: 'Data rencana upacara tidak lengkap.' },
        { status: 400 }
      );
    }

    const generator = new PdfGenerator();
    const pdfBuffer = await generator.generate(body);

    const cleanFilename = body.upacaraNama.replace(/[^a-zA-Z0-9]/g, '_');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rencana_Yadnya_${cleanFilename}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memproses dokumen PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
