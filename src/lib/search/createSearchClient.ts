import { SearchClient } from './SearchClient';
import { TavilySearchClient } from './TavilySearchClient';
import { ExaSearchClient } from './ExaSearchClient';
import { BraveSearchClient } from './BraveSearchClient';
import { MockSearchClient } from './MockSearchClient';
import { cleanEnv } from '../llm/OpenAiLlmClient';

export function createSearchClient(provider?: string, apiKey?: string): SearchClient {
  const p = cleanEnv(provider || process.env.SEARCH_PROVIDER || 'tavily')?.toLowerCase() || 'tavily';
  switch (p) {
    case 'exa':
      return new ExaSearchClient(apiKey);
    case 'brave':
      return new BraveSearchClient(apiKey);
    case 'mock':
      return new MockSearchClient();
    default:
      return new TavilySearchClient(apiKey);
  }
}

