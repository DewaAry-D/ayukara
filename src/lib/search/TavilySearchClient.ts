import { SearchClient, SearchOptions, SearchResultItem, filterResultsByWhitelist } from './SearchClient';

export class TavilySearchClient implements SearchClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SEARCH_API_KEY || '';
  }

  public async search(query: string, opts?: SearchOptions): Promise<SearchResultItem[]> {
    if (!this.apiKey) {
      throw new Error('Tavily API key is not configured.');
    }

    const payload: Record<string, unknown> = {
      api_key: this.apiKey,
      query,
      search_depth: 'advanced',
      include_answer: false,
      max_results: opts?.maxResults || 5,
    };

    if (opts?.includeDomains && opts.includeDomains.length > 0) {
      payload.include_domains = opts.includeDomains;
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawResults: SearchResultItem[] = (data.results || []).map((r: { url: string; title: string; content: string }) => ({
      url: r.url,
      title: r.title,
      content: r.content,
    }));

    // Aturan Mutlak #7: Whitelist domain dicek ulang di kode (hostname)
    return filterResultsByWhitelist(rawResults, opts?.includeDomains || []);
  }
}

