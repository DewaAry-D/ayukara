import { PriceCache, PriceEntry } from './PriceCache';

interface CacheItem {
  value: PriceEntry;
  expireAt: number;
}

export class InMemoryPriceCache implements PriceCache {
  private store = new Map<string, CacheItem>();

  private makeKey(bantenId: number, tanggalWita: string): string {
    return `harga:${bantenId}:${tanggalWita}`;
  }

  public async get(bantenId: number, tanggalWita: string): Promise<PriceEntry | null> {
    const key = this.makeKey(bantenId, tanggalWita);
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expireAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  public async set(
    bantenId: number,
    tanggalWita: string,
    value: PriceEntry,
    expireAt: Date
  ): Promise<void> {
    const key = this.makeKey(bantenId, tanggalWita);
    this.store.set(key, {
      value,
      expireAt: expireAt.getTime(),
    });
  }

  public clear(): void {
    this.store.clear();
  }
}

