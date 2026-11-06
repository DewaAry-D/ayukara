import { SearchClient, SearchOptions, SearchResultItem, filterResultsByWhitelist } from './SearchClient';

export class BraveSearchClient implements SearchClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SEARCH_API_KEY || '';
  }

  public async search(query: string, opts?: SearchOptions): Promise<SearchResultItem[]> {
    if (!this.apiKey) {
      throw new Error('Brave API key is not configured.');
    }

    // Brave Search API uses query parameters
    let q = query;
    if (opts?.includeDomains && opts.includeDomains.length > 0) {
      const siteFilter = opts.includeDomains.map((d) => `site:${d}`).join(' OR ');
      q = `${query} (${siteFilter})`;
    }

    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', q);
    url.searchParams.set('count', String(opts?.maxResults || 5));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave search failed with status ${response.status}`);
    }

    const data = await response.json();
    const webResults = data.web?.results || [];
    const rawResults: SearchResultItem[] = webResults.map((r: { url: string; title: string; description?: string }) => ({
      url: r.url,
      title: r.title,
      content: r.description || '',
    }));

    return filterResultsByWhitelist(rawResults, opts?.includeDomains || []);
  }
}

