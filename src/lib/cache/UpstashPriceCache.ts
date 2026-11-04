import { Redis } from '@upstash/redis';
import { PriceCache, PriceEntry } from './PriceCache';

export class UpstashPriceCache implements PriceCache {
  private redis: Redis;

  constructor(options?: { url?: string; token?: string }) {
    const url = options?.url || process.env.UPSTASH_REDIS_REST_URL;
    const token = options?.token || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      // Dummy credentials untuk test environment jika tidak diset
      this.redis = new Redis({
        url: url || 'https://dummy.upstash.io',
        token: token || 'dummy-token',
      });
    } else {
      this.redis = new Redis({ url, token });
    }
  }

  private makeKey(bantenId: number, tanggalWita: string): string {
    return `harga:${bantenId}:${tanggalWita}`;
  }

  public async get(bantenId: number, tanggalWita: string): Promise<PriceEntry | null> {
    try {
      const key = this.makeKey(bantenId, tanggalWita);
      const data = await this.redis.get<PriceEntry>(key);
      return data || null;
    } catch (error) {
      console.warn('UpstashPriceCache: Gagal membaca cache Redis, melanjutkan live search.', error);
      return null;
    }
  }

  public async set(
    bantenId: number,
    tanggalWita: string,
    value: PriceEntry,
    expireAt: Date
  ): Promise<void> {
    try {
      const key = this.makeKey(bantenId, tanggalWita);
      const expireEpochSeconds = Math.floor(expireAt.getTime() / 1000);
      await this.redis.set(key, JSON.stringify(value), {
        exat: expireEpochSeconds,
      });
    } catch (error) {
      console.warn('UpstashPriceCache: Gagal menyimpan cache Redis.', error);
      // Abaikan error penulisan cache (best-effort)
    }
  }
}

