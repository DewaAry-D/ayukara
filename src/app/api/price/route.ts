import { NextRequest, NextResponse } from 'next/server';
import { PriceEstimator, PriceItemInput } from '@/lib/pricing/PriceEstimator';
import { getWitaDateString } from '@/lib/cache/PriceCache';
import { getPriceCache } from '@/lib/cache/createPriceCache';
import { createSearchClient } from '@/lib/search/createSearchClient';
import { createLlmClient } from '@/lib/llm/OpenAiLlmClient';
import { QuoteVerifier } from '@/lib/banten/QuoteVerifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cache = getPriceCache();
    const searchClient = createSearchClient();
    const llmClient = createLlmClient();
    const verifier = new QuoteVerifier();

    const estimator = new PriceEstimator(cache, searchClient, llmClient, verifier);

    // Opsi 1: Pencarian langsung paket upacara berdasarkan nama dan tingkatan
    if (body.upacaraNama) {
      const packageResult = await estimator.estimateCeremonyPackagePrice({
        upacaraId: Number(body.upacaraId || 0),
        upacaraNama: String(body.upacaraNama),
        tingkatanId: body.tingkatanId ? Number(body.tingkatanId) : undefined,
        tingkatanNama: body.tingkatanNama ? String(body.tingkatanNama) : undefined,
      });

      return NextResponse.json({
        packagePrice: packageResult,
        waktuPengambilanWita: getWitaDateString(),
      });
    }

    // Opsi 2: Pencarian per item banten
    const items: PriceItemInput[] = body.items || [];
    const result = await estimator.estimatePrices(items);

    return NextResponse.json({
      items: result.items,
      total: result.total,
      waktuPengambilanWita: getWitaDateString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan internal server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
