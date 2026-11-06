import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/price/route';
import { NextRequest } from 'next/server';

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Price API Route (Fase 4)', () => {
  it('handles empty items safely', async () => {
    const req = createJsonRequest({ items: [] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items.length).toBe(0);
    expect(data.total.totalMin).toBe(0);
    expect(data.total.totalMax).toBe(0);
    expect(data.waktuPengambilanWita).toBeDefined();
  });

  it('calculates prices for provided banten items', async () => {
    const req = createJsonRequest({
      items: [
        { bantenId: 1, nama: 'Pejati', jumlah: 1 },
      ],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items.length).toBe(1);
    expect(data.total).toBeDefined();
    expect(data.total.disclaimer).toContain('Harga merupakan estimasi');
  });

  it('handles package ceremony price request directly', async () => {
    const req = createJsonRequest({
      upacaraId: 17,
      upacaraNama: 'Melaspas Bangunan',
      tingkatanNama: 'Madya',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.packagePrice).toBeDefined();
    expect(data.packagePrice.upacaraNama).toBe('Melaspas Bangunan');
    expect(data.packagePrice.tingkatanNama).toBe('Madya');
    expect(data.waktuPengambilanWita).toBeDefined();
  });
});

