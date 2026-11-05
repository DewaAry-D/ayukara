import { SearchClient, SearchOptions, SearchResultItem, filterResultsByWhitelist } from './SearchClient';
import { cleanEnv } from '../llm/OpenAiLlmClient';

export class TavilySearchClient implements SearchClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    const rawKey =
      apiKey ||
      process.env.SEARCH_API_KEY ||
      process.env.TAVILY_API_KEY ||
      process.env.TAVILY_KEY ||
      process.env.SEARCH_KEY ||
      '';
    this.apiKey = cleanEnv(rawKey) || '';
  }

  public async search(query: string, opts?: SearchOptions): Promise<SearchResultItem[]> {
    if (!this.apiKey) {
      console.warn('[Ayukara TavilySearch] Kunci API Tavily belum terpasang di environment variable.');
      throw new Error('Tavily API key is not configured.');
    }

    const maskedKey = `${this.apiKey.substring(0, 8)}...`;
    console.log(`[Ayukara TavilySearch] Mengirim pencarian web: "${query}" (key: ${maskedKey}, limit: ${opts?.maxResults || 5})`);

    const payload: Record<string, unknown> = {
      api_key: this.apiKey,
      query,
      search_depth: 'basic',
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
      console.warn(`[Ayukara TavilySearch] Permintaan Tavily gagal dengan status HTTP ${response.status}`);
      throw new Error(`Tavily search failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Ayukara TavilySearch] Diterima ${data.results?.length || 0} hasil dari Tavily.`);
    const rawResults: SearchResultItem[] = (data.results || []).map((r: { url: string; title: string; content: string }) => ({
      url: r.url,
      title: r.title,
      content: r.content,
    }));

    // Aturan Mutlak #7: Whitelist domain dicek ulang di kode (hostname)
    return filterResultsByWhitelist(rawResults, opts?.includeDomains || []);
  }
}

