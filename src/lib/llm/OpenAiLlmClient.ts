import OpenAI from 'openai';
import { LlmClient, LlmCompletionArgs, LlmCompletionResult, Msg } from './LlmClient';
import { MockLlmClient } from './MockLlmClient';

export interface OpenAiClientOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export function cleanEnv(val?: string | null): string | undefined {
  if (!val) return undefined;
  let s = val.trim();
  s = s.replace(/[\r\n]/g, '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.length > 0 ? s : undefined;
}

export class OpenAiLlmClient implements LlmClient {
  private client: OpenAI;
  private model: string;
  private apiKey: string;
  private baseURL?: string;

  constructor(options?: OpenAiClientOptions) {
    const rawApiKey =
      options?.apiKey ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY;

    this.apiKey = cleanEnv(rawApiKey) || 'dummy-key-for-test';

    // Mendukung baseURL kustom (misal: 9router / proxy gateway OpenAI-compatible)
    const rawBaseURL =
      options?.baseURL ||
      process.env.LLM_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.OPENAI_API_BASE;

    let baseURL = cleanEnv(rawBaseURL);
    if (baseURL) {
      baseURL = baseURL.replace(/\/+$/, '');
    }
    this.baseURL = baseURL;

    const rawModel = options?.model || process.env.LLM_MODEL;
    this.model = cleanEnv(rawModel) || 'gpt-4o-mini';

    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL || undefined,
      timeout: 60000,   
      maxRetries: 1,
    });
  }

  public async complete(args: LlmCompletionArgs): Promise<LlmCompletionResult> {
    const targetEndpoint = this.baseURL || 'https://api.openai.com/v1';
    console.log(
      `[Ayukara LLM] Mengirim permintaan ke ${targetEndpoint} (model: ${this.model})`
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (args.system) {
      messages.push({ role: 'system', content: args.system });
    }

    for (const msg of args.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Pastikan kata 'json' terdapat pada pesan jika response_format json_object diminta (aturan wajib OpenAI API)
    if (args.jsonSchema) {
      const hasJsonKeyword = messages.some(
        (m) => typeof m.content === 'string' && /json/i.test(m.content)
      );
      if (!hasJsonKeyword) {
        messages.push({
          role: 'system',
          content: 'Respons harus berformat JSON valid sesuai spesifikasi skema.',
        });
      }
    }

    const payload: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages,
      temperature: args.temperature ?? 0.2,
      max_tokens: 800
    };

    if (args.jsonSchema) {
      payload.response_format = { type: 'json_object' };
    }

    let content = '';
    try {
      const response = await this.client.chat.completions.create(payload);
      content = response.choices[0]?.message?.content || '';
    } catch (createErr) {
      // Jika model proxy atau endpoint kustom tidak mendukung response_format json_object:
      if (args.jsonSchema && payload.response_format) {
        try {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.response_format;
          const retryResp = await this.client.chat.completions.create(fallbackPayload);
          content = retryResp.choices[0]?.message?.content || '';
        } catch {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }

    // Jika respons teks dari proxy/gateway sebenarnya adalah pesan error otentikasi upstream (misal 9Router)
    if (
      /invalid api key|unauthorized|error:|failed to authenticate/i.test(content)
    ) {
      throw new Error(content.trim());
    }

    let json: unknown = undefined;
    if (args.jsonSchema && content) {
      try {
        json = JSON.parse(content);
      } catch {
        // Fallback ekstraksi JSON blok ```json ... ``` atau objek pertama { ... }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            json = JSON.parse(jsonMatch[0]);
          } catch {
            json = undefined;
          }
        }
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
      max_tokens: 800,
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
  const p = cleanEnv(provider || process.env.LLM_PROVIDER || 'openai')?.toLowerCase() || 'openai';
  if (p === 'mock') {
    return new MockLlmClient();
  }
  return new OpenAiLlmClient(options);
}

