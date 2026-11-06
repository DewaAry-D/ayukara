import { SearchClient, SearchOptions, SearchResultItem, filterResultsByWhitelist } from './SearchClient';

export class MockSearchClient implements SearchClient {
  public cannedResults: SearchResultItem[];
  public lastQuery: string | null = null;
  public lastOptions: SearchOptions | null = null;

  constructor(cannedResults: SearchResultItem[] = []) {
    this.cannedResults = cannedResults;
  }

  public async search(query: string, opts?: SearchOptions): Promise<SearchResultItem[]> {
    this.lastQuery = query;
    this.lastOptions = opts || null;

    if (opts?.includeDomains && opts.includeDomains.length > 0) {
      return filterResultsByWhitelist(this.cannedResults, opts.includeDomains);
    }

    return this.cannedResults;
  }
}

