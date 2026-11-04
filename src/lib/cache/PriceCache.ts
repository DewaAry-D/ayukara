export interface PriceEntry {
  bantenId: number;
  hargaMin: number | null;
  hargaMax: number | null;
  mataUang: 'IDR';
  urlSumber?: string | null;
  kutipan?: string | null;
  fetchedAt: string; // ISO string
  status: 'ditemukan' | 'tidak_ditemukan';
}

export interface PriceCache {
  get(bantenId: number, tanggalWita: string): Promise<PriceEntry | null>;
  set(bantenId: number, tanggalWita: string, value: PriceEntry, expireAt: Date): Promise<void>;
}

/**
 * Mengambil tanggal dalam format YYYY-MM-DD pada zona waktu WITA (Asia/Makassar / UTC+8).
 */
export function getWitaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Menghitung waktu kedaluwarsa tepat pada 23:59:59.999 WITA untuk tanggal yang diberikan.
 * Karena WITA adalah UTC+8, 23:59:59 WITA setara dengan 15:59:59 UTC pada hari yang sama.
 */
export function getWitaEndOfDay(date: Date = new Date()): Date {
  const witaDateStr = getWitaDateString(date);
  return new Date(`${witaDateStr}T15:59:59.999Z`);
}

