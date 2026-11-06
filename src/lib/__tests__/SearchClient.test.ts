import { describe, it, expect } from 'vitest';
import {
  isDomainAllowed,
  filterResultsByWhitelist,
  SearchResultItem,
} from '@/lib/search/SearchClient';
import { MockSearchClient } from '@/lib/search/MockSearchClient';

describe('SearchClient & Whitelist Filtering (Fase 3)', () => {
  const whitelist = ['babadbali.com', 'phdi.or.id', 'kalenderbali.org'];

  describe('isDomainAllowed', () => {
    it('accepts exact whitelist domain matches', () => {
      expect(isDomainAllowed('https://babadbali.com/upacara/pawiwahan', whitelist)).toBe(true);
      expect(isDomainAllowed('https://phdi.or.id/artikel/banten', whitelist)).toBe(true);
    });

    it('accepts valid subdomains of whitelist domains', () => {
      expect(isDomainAllowed('https://pustaka.babadbali.com/page', whitelist)).toBe(true);
      expect(isDomainAllowed('https://bali.phdi.or.id/info', whitelist)).toBe(true);
    });

    it('strictly rejects domains outside whitelist (Aturan Mutlak #7)', () => {
      expect(isDomainAllowed('https://randomblog.wordpress.com/banten', whitelist)).toBe(false);
      expect(isDomainAllowed('https://evil-babadbali.com/spoof', whitelist)).toBe(false);
      expect(isDomainAllowed('https://babadbali.com.attacker.com/fake', whitelist)).toBe(false);
    });

    it('handles malformed URLs safely by returning false', () => {
      expect(isDomainAllowed('not-a-valid-url', whitelist)).toBe(false);
      expect(isDomainAllowed('', whitelist)).toBe(false);
    });
  });

  describe('filterResultsByWhitelist', () => {
    it('discards results from non-whitelisted domains', () => {
      const rawResults: SearchResultItem[] = [
        { url: 'https://babadbali.com/pejati', title: 'Pejati', content: 'Konten resmi' },
        { url: 'https://unverified-blog.id/pejati', title: 'Pejati Blog', content: 'Konten tidak resmi' },
        { url: 'https://phdi.or.id/sarana', title: 'Sarana PHDI', content: 'Konten PHDI' },
      ];

      const filtered = filterResultsByWhitelist(rawResults, whitelist);
      expect(filtered.length).toBe(2);
      expect(filtered.map((r) => r.url)).toEqual([
        'https://babadbali.com/pejati',
        'https://phdi.or.id/sarana',
      ]);
    });
  });

  describe('MockSearchClient', () => {
    it('executes search and applies whitelist filter', async () => {
      const mock = new MockSearchClient([
        { url: 'https://babadbali.com/pawiwahan', title: 'Pawiwahan', content: 'Data resmi' },
        { url: 'https://spam-site.com/pawiwahan', title: 'Spam', content: 'Data spam' },
      ]);

      const results = await mock.search('upacara pawiwahan', { includeDomains: whitelist });
      expect(results.length).toBe(1);
      expect(results[0].url).toBe('https://babadbali.com/pawiwahan');
    });
  });
});

