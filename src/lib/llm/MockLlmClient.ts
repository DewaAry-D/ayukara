import { LlmClient, LlmCompletionArgs, LlmCompletionResult } from './LlmClient';

export class MockLlmClient implements LlmClient {
  public mockJson: unknown = null;
  public mockText: string = '';
  public lastArgs: LlmCompletionArgs | null = null;

  constructor(options?: { mockJson?: unknown; mockText?: string }) {
    if (options?.mockJson !== undefined) this.mockJson = options.mockJson;
    if (options?.mockText !== undefined) this.mockText = options.mockText;
  }

  public async complete(args: LlmCompletionArgs): Promise<LlmCompletionResult> {
    this.lastArgs = args;
    return {
      text: this.mockText,
      json: this.mockJson,
    };
  }

  public async *stream(): AsyncIterable<string> {
    if (this.mockText) {
      yield this.mockText;
    }
  }
}

