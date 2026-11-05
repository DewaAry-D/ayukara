import { PriceCache } from './PriceCache';
import { InMemoryPriceCache } from './InMemoryPriceCache';
import { UpstashPriceCache } from './UpstashPriceCache';
import { cleanEnv } from '../llm/OpenAiLlmClient';

let inMemorySingleton: PriceCache | null = null;

export function getPriceCache(): PriceCache {
  if (
    cleanEnv(process.env.UPSTASH_REDIS_REST_URL) &&
    cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return new UpstashPriceCache();
  }
  if (!inMemorySingleton) {
    inMemorySingleton = new InMemoryPriceCache();
  }
  return inMemorySingleton;
}

