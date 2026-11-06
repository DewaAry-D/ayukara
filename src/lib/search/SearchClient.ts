export interface SearchResultItem {
  url: string;
  title: string;
  content: string;
}

export interface SearchOptions {
  includeDomains?: string[];
  maxResults?: number;
}

export interface SearchClient {
  search(query: string, opts?: SearchOptions): Promise<SearchResultItem[]>;
}

/**
 * Mengecek apakah URL berasal dari hostname yang masuk dalam domain whitelist.
 * Mendukung domain persis (mis. babadbali.com) dan subdomain (mis. pustaka.babadbali.com).
 * Menolak spoofing seperti evil-babadbali.com atau babadbali.com.attacker.com.
 */
export function isDomainAllowed(rawUrl: string, whitelist: string[]): boolean {
  if (!rawUrl || !whitelist || whitelist.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();

    return whitelist.some((allowedDomain) => {
      const cleanAllowed = allowedDomain.trim().toLowerCase();
      if (!cleanAllowed) return false;
      return hostname === cleanAllowed || hostname.endsWith('.' + cleanAllowed);
    });
  } catch {
    // Malformed URL langsung ditolak
    return false;
  }
}

/**
 * Menyaring hasil pencarian agar hanya menyertakan URL dari whitelist.
 * Sesuai Aturan Mutlak #7: Whitelist domain dikirim ke search provider DAN dicek ulang di kode.
 */
export function filterResultsByWhitelist(
  results: SearchResultItem[],
  whitelist: string[]
): SearchResultItem[] {
  if (!whitelist || whitelist.length === 0) {
    return results;
  }
  return results.filter((item) => isDomainAllowed(item.url, whitelist));
}

export { createSearchClient } from './createSearchClient';



