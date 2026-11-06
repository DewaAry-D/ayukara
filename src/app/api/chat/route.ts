import { NextRequest, NextResponse } from 'next/server';
import { createLlmClient } from '@/lib/llm/OpenAiLlmClient';
import { createSearchClient } from '@/lib/search/createSearchClient';
import { ChatService, ChatMessage } from '@/lib/chat/ChatService';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Format pesan tidak valid atau kosong.' },
        { status: 400 }
      );
    }

    let ruleRepository = undefined;
    try {
      const { getSequelize } = await import('@/lib/db');
      const { RuleRepository } = await import('@/lib/db/repositories/RuleRepository');
      const seq = getSequelize();
      ruleRepository = new RuleRepository({ sequelize: seq });
    } catch {
      // Abaikan bila DB offline
    }

    const llm = createLlmClient();
    const searchClient = createSearchClient();
    const chatService = new ChatService({
      llmClient: llm,
      searchClient,
      ruleRepository,
    });

    // Cek mode respons
    const wantStream = body.stream !== false;

    if (wantStream) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of chatService.streamChat(messages)) {
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (err: any) {
            console.error('[Ayukara Chat API Stream Error]:', err);
            controller.enqueue(
              encoder.encode(
                '\n\nTerjadi kendala saat memproses jawaban. Silakan coba kembali.'
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    const result = await chatService.chat(messages);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Ayukara Chat API Error]:', error);
    return NextResponse.json(
      { error: 'Terjadi kendala pada server saat memproses chat.' },
      { status: 500 }
    );
  }
}
