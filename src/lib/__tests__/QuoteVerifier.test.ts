import { describe, it, expect } from 'vitest';
import { QuoteVerifier } from '@/lib/banten/QuoteVerifier';

describe('QuoteVerifier (Fase 3)', () => {
  const verifier = new QuoteVerifier();

  it('matches exact quotes when present in source text', () => {
    const source = 'Upacara pernikahan Hindu di Bali membutuhkan banten Pejati lengkap dan banten Ayaban.';
    const quote = 'banten Pejati lengkap dan banten Ayaban.';

    expect(verifier.verify(quote, source)).toBe(true);
  });

  it('matches quotes across multiple lines, tabs, and uneven whitespace (whitespace normalization)', () => {
    const source = `
      Pada tingkatan nista,
      sarana upakara yang digunakan
      meliputi:
         1. Pejati
         2. Canang Sari
    `;
    const quote = 'sarana upakara yang digunakan meliputi: 1. Pejati 2. Canang Sari';

    expect(verifier.verify(quote, source)).toBe(true);
  });

  it('rejects hallucinated quotes that do not exist in source text', () => {
    const source = 'Banten yang digunakan adalah Pejati dan Canang.';
    const hallucinatedQuote = 'Banten yang digunakan adalah Suci Laksana dan Bebangkit.';

    expect(verifier.verify(hallucinatedQuote, source)).toBe(false);
  });

  it('rejects empty or whitespace-only quotes', () => {
    const source = 'Ada teks sumber di sini.';
    expect(verifier.verify('', source)).toBe(false);
    expect(verifier.verify('   \n  \t  ', source)).toBe(false);
  });

  it('rejects quotes when source text is empty', () => {
    expect(verifier.verify('Pejati', '')).toBe(false);
  });

  it('matches quotes against multiple source documents', () => {
    const sources = [
      { url: 'https://babadbali.com/b1', content: 'Dokumen pertama tidak menyebut banten.' },
      { url: 'https://phdi.or.id/p1', content: 'Dokumen kedua menyebutkan perlengkapan Banten Pejati dan Daksina.' },
    ];

    const match = verifier.findSourceForQuote('Banten Pejati dan Daksina.', sources);
    expect(match).not.toBeNull();
    expect(match?.url).toBe('https://phdi.or.id/p1');
  });
});
