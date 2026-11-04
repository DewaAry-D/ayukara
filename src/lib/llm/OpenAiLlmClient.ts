import OpenAI from 'openai';
import { LlmClient, LlmCompletionArgs, LlmCompletionResult, Msg } from './LlmClient';
import { MockLlmClient } from './MockLlmClient';

export interface OpenAiClientOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export class OpenAiLlmClient implements LlmClient {
  private client: OpenAI;
  private model: string;

  constructor(options?: OpenAiClientOptions) {
    const apiKey =
      options?.apiKey ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      'dummy-key-for-test';

    // Mendukung baseURL kustom (misal: 9router / proxy gateway OpenAI-compatible)
    const baseURL = options?.baseURL || process.env.LLM_BASE_URL || undefined;
    this.model = options?.model || process.env.LLM_MODEL || 'gpt-4o-mini';

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  public async complete(args: LlmCompletionArgs): Promise<LlmCompletionResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (args.system) {
      messages.push({ role: 'system', content: args.system });
    }

    for (const msg of args.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const payload: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages,
      temperature: args.temperature ?? 0.2,
    };

    if (args.jsonSchema) {
      payload.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(payload);
    const content = response.choices[0]?.message?.content || '';

    let json: unknown = undefined;
    if (args.jsonSchema && content) {
      try {
        json = JSON.parse(content);
      } catch {
        json = undefined;
      }
    }

    return {
      text: content,
      json,
    };
  }

  public async *stream(args: { system?: string; messages: Msg[] }): AsyncIterable<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (args.system) {
      messages.push({ role: 'system', content: args.system });
    }

    for (const msg of args.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        yield text;
      }
    }
  }
}

export function createLlmClient(provider?: string, options?: OpenAiClientOptions): LlmClient {
  const p = (provider || process.env.LLM_PROVIDER || 'openai').toLowerCase();
  if (p === 'mock') {
    return new MockLlmClient();
  }
  return new OpenAiLlmClient(options);
}

