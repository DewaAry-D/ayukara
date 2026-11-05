import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/plan/route';
import { NextRequest } from 'next/server';

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Plan API Route (Fase 2 DoD Stub)', () => {
  it('handles tab dewasa and returns date recommendations', async () => {
    const req = createJsonRequest({
      tab: 'dewasa',
      upacaraId: 1,
      fromDate: '2026-11-01',
      toDate: '2026-11-03',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tab).toBe('dewasa');
    expect(Array.isArray(data.dateSection.recommendations)).toBe(true);
    expect(Array.isArray(data.banten)).toBe(true);
  });

  it('handles tab otonan and returns weton, wuku, and 3 otonan dates', async () => {
    const req = createJsonRequest({
      tab: 'otonan',
      birthDate: '2020-01-01',
      referenceDate: '2026-11-04',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tab).toBe('otonan');
    expect(data.dateSection.weton.saptawara).toBe('Buda');
    expect(data.dateSection.weton.pancawara).toBe('Umanis');
    expect(data.dateSection.wuku).toBe('Kulantir');
    expect(data.dateSection.otonanList.length).toBe(3);
    expect(data.dateSection.otonanList[0].isTerdekat).toBe(true);
  });

  it('handles tab hari_raya and returns dateSection with explanation', async () => {
    const req = createJsonRequest({
      tab: 'hari_raya',
      upacaraId: 3,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tab).toBe('hari_raya');
    expect(data.dateSection.penjelasanPenentuan).toBe('Aturan penentuan belum tersedia');
  });
});

