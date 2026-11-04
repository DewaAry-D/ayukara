export interface Msg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionArgs {
  system?: string;
  messages: Msg[];
  jsonSchema?: object;
  temperature?: number;
}

export interface LlmCompletionResult {
  text?: string;
  json?: unknown;
}

export interface LlmClient {
  complete(args: LlmCompletionArgs): Promise<LlmCompletionResult>;
  stream(args: { system?: string; messages: Msg[] }): AsyncIterable<string>;
}

