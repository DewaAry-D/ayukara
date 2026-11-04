import { SearchClient, SearchOptions, SearchResultItem, filterResultsByWhitelist } from './SearchClient';

export class ExaSearchClient implements SearchClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SEARCH_API_KEY || '';
  }

  public async search(query: string, opts?: SearchOptions): Promise<SearchResultItem[]> {
    if (!this.apiKey) {
      throw new Error('Exa API key is not configured.');
    }

    const payload: Record<string, unknown> = {
      query,
      numResults: opts?.maxResults || 5,
      contents: { text: true },
    };

    if (opts?.includeDomains && opts.includeDomains.length > 0) {
      payload.includeDomains = opts.includeDomains;
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Exa search failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawResults: SearchResultItem[] = (data.results || []).map((r: { url: string; title?: string; text?: string }) => ({
      url: r.url,
      title: r.title || '',
      content: r.text || '',
    }));

    return filterResultsByWhitelist(rawResults, opts?.includeDomains || []);
  }
}

