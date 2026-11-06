import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/pdf/route';
import { NextRequest } from 'next/server';

describe('POST /api/pdf', () => {
  it('harus mengembalikan buffer PDF dengan Content-Type application/pdf', async () => {
    const payload = {
      tab: 'dewasa',
      upacaraNama: 'Pawiwahan',
      tingkatanNama: 'Madya',
      dateSummary: 'Sabtu, 12 April 2025',
      bantenItems: [
        {
          nama: 'Banten Pejati',
          jumlah: '1 soroh',
          status: 'verified',
        },
      ],
      totalHargaStr: 'Rp 100.000',
    };

    const req = new NextRequest('http://localhost:3000/api/pdf', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('harus mengembalikan 400 jika data upacara kosong', async () => {
    const req = new NextRequest('http://localhost:3000/api/pdf', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

