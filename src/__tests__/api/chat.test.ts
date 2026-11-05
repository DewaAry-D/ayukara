import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Chat API Route (Fase 6)', () => {
  it('menolak permintaan dengan daftar pesan kosong atau tidak valid (400)', async () => {
    const req = createJsonRequest({ messages: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('mengembalikan streaming respons untuk pertanyaan chat yang valid', async () => {
    const req = createJsonRequest({
      messages: [{ role: 'user', content: 'Apa fungsi banten pejati?' }],
      stream: true,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.body).toBeDefined();
  });

  it('mengembalikan respons JSON ketika stream: false', async () => {
    const req = createJsonRequest({
      messages: [{ role: 'user', content: 'Apa itu upacara otonan?' }],
      stream: false,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.text).toBeDefined();
    expect(Array.isArray(data.citations)).toBe(true);
  });

  it('menolak topik out_of_scope dengan pesan penolakan baku', async () => {
    const req = createJsonRequest({
      messages: [{ role: 'user', content: 'Bagaimana cara membuat robot dengan Python?' }],
      stream: false,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.isOutOfScope).toBe(true);
    expect(data.text).toContain('Maaf, Ayukara hanya dapat membantu');
  });
});

