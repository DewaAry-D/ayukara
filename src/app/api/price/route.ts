import { NextRequest, NextResponse } from 'next/server';
import { PriceEstimator, PriceItemInput } from '@/lib/pricing/PriceEstimator';
import { PriceCache, getWitaDateString } from '@/lib/cache/PriceCache';
import { InMemoryPriceCache } from '@/lib/cache/InMemoryPriceCache';
import { UpstashPriceCache } from '@/lib/cache/UpstashPriceCache';
import { createSearchClient } from '@/lib/search/createSearchClient';
import { createLlmClient } from '@/lib/llm/OpenAiLlmClient';
import { QuoteVerifier } from '@/lib/banten/QuoteVerifier';

const inMemoryCacheSingleton = new InMemoryPriceCache();

function getPriceCache(): PriceCache {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashPriceCache();
  }
  return inMemoryCacheSingleton;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: PriceItemInput[] = body.items || [];

    const cache = getPriceCache();
    const searchClient = createSearchClient();
    const llmClient = createLlmClient();
    const verifier = new QuoteVerifier();

    const estimator = new PriceEstimator(cache, searchClient, llmClient, verifier);
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
