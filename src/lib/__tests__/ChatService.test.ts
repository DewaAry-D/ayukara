import { describe, it, expect } from 'vitest';
import { ChatService, ChatMessage, ChatServiceResult } from '../chat/ChatService';
import { MockLlmClient } from '../llm/MockLlmClient';
import { TopicGuard } from '../chat/TopicGuard';

describe('ChatService (Fase 6 - Grounding, Sitasi, Streaming)', () => {
  it('menolak pertanyaan out_of_scope dengan pesan penolakan baku tanpa memanggil LLM completion utama', async () => {
    const topicGuard = new TopicGuard({
      complete: async () => ({
        json: { classification: 'out_of_scope', reasoning: 'Pertanyaan resep' },
      }),
      stream: async function* () {},
    });

    const mockLlm = new MockLlmClient();
    const service = new ChatService({
      llmClient: mockLlm,
      topicGuard,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Bagaimana cara memasak rendang sapi khas Padang?' },
    ];

    const result = await service.chat(messages);
    expect(result.text).toBe(
      'Maaf, Ayukara hanya dapat membantu pertanyaan seputar upacara, banten, wariga, dewasa ayu, serta agama Hindu Bali dan upakara.'
    );
    expect(result.citations).toEqual([]);
    expect(result.isOutOfScope).toBe(true);
  });

  it('menghasilkan jawaban berbasis grounding dengan sitasi [n] dan disclaimer pendamping', async () => {
    const mockLlm = new MockLlmClient({
      mockText:
        'Banten Pejati merupakan banten persaksian yang umum dihaturkan pada upacara yadnya [1]. Penjelasan ini bersifat pendamping; keputusan akhir pada sulinggih atau pemangku.',
    });

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Apa fungsi banten pejati dalam upacara yadnya?' },
    ];

    const result = await service.chat(messages);
    expect(result.text).toContain('Banten Pejati');
    expect(result.text).toContain('[1]');
    expect(result.text).toContain('sulinggih atau pemangku');
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('mengembalikan "Saya tidak tahu / data belum tersedia" jika topik tidak ditemukan dalam sumber atau database', async () => {
    const mockLlm = new MockLlmClient({
      mockText: 'Data belum tersedia dalam pangkalan data terverifikasi Ayukara.',
    });

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Apa nama banten kuno yang tidak tercatat di lontar?' },
    ];

    const result = await service.chat(messages);
    expect(result.text.toLowerCase()).toContain('belum tersedia');
  });

  it('mendeteksi upacara yadnya dan menyertakan saran CTA "Buat Rencana dari Jawaban Ini"', async () => {
    const mockLlm = new MockLlmClient({
      mockText:
        'Untuk upacara Otonan tingkat Alit, banten yang dibutuhkan meliputi banten otonan, daksina pejati, dan canang sari [1].',
    });

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Banten apa saja untuk upacara otonan tingkat alit?' },
    ];

    const result = await service.chat(messages);
    expect(result.suggestedPlan).toBeDefined();
    expect(result.suggestedPlan?.upacaraNama.toLowerCase()).toContain('otonan');
  });

  it('mendukung streaming jawaban chunk demi chunk', async () => {
    const chunks = ['Om Swastyastu. ', 'Banten otonan [1] ', 'merupakan upakara manusa yadnya.'];
    const mockLlm = {
      complete: async () => ({ text: chunks.join('') }),
      stream: async function* () {
        for (const c of chunks) {
          yield c;
        }
      },
    };

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Jelaskan tentang otonan' },
    ];

    const received: string[] = [];
    for await (const chunk of service.streamChat(messages)) {
      received.push(chunk);
    }

    expect(received.join('')).toContain('Om Swastyastu');
    expect(received.join('')).toContain('manusa yadnya');
  });

  it('dapat memanfaatkan sumber internet melalui searchClient dan menyertakan URL tautan sumber bebas', async () => {
    const mockSearch = {
      search: async () => [
        {
          title: 'Tradisi dan Filosofi Banten Pejati - Babad Bali',
          url: 'https://babadbali.com/canang-pejati',
          content: 'Banten Pejati merupakan sarana persembahyangan persaksian ke hadapan Ida Sang Hyang Widhi.',
        },
      ],
    };

    const mockLlm = new MockLlmClient({
      mockText:
        'Berdasarkan informasi internet di [Babad Bali](https://babadbali.com/canang-pejati) [1], banten pejati memiliki makna ketulusan.',
    });

    const service = new ChatService({
      llmClient: mockLlm,
      searchClient: mockSearch,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Bagaimana tradisi pejati di berbagai sumber internet?' },
    ];

    const result = await service.chat(messages);
    expect(result.citations[0].url).toBe('https://babadbali.com/canang-pejati');
    expect(result.text).toContain('https://babadbali.com/canang-pejati');
  });

  it('mengintegrasikan kalkulasi penanggalan hari raya Bali ke dalam konteks prompt LLM', async () => {
    let capturedSystemPrompt = '';
    const mockLlm = {
      complete: async ({ system }: { system?: string }) => {
        capturedSystemPrompt = system || '';
        return {
          text: 'Hari raya Galungan terdekat jatuh pada hari Rabu (Buda Kliwon Dunggulan). Keputusan akhir pada sulinggih atau pemangku.',
        };
      },
      stream: async function* () {},
    };

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Kapan hari raya Galungan berikutnya?' },
    ];

    const result = await service.chat(messages);
    expect(capturedSystemPrompt).toContain('DATA RESMI PENANGGALAN HARI RAYA BALI');
    expect(capturedSystemPrompt).toContain('Galungan');
    expect(capturedSystemPrompt).toContain('Wuku Dunggulan');
    expect(result.text).toContain('Buda Kliwon Dunggulan');
  });

  it('mengintegrasikan kalkulasi wariga dewasa ayu dan menyediakan suggestedPlan ketika ditanya kapan baiknya upacara', async () => {
    let capturedSystemPrompt = '';
    const mockLlm = {
      complete: async ({ system }: { system?: string }) => {
        capturedSystemPrompt = system || '';
        return {
          text: 'Berdasarkan perhitungan wariga dewasa ayu, berikut rekomendasi hari baik pernikahan... Keputusan akhir pada sulinggih atau pemangku.',
        };
      },
      stream: async function* () {},
    };

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Kapan baiknya upacara pawiwahan atau pernikahan?' },
    ];

    const result = await service.chat(messages);
    expect(capturedSystemPrompt).toContain('DATA RESMI REKOMENDASI HARI BAIK / DEWASA AYU');
    expect(capturedSystemPrompt).toContain('Pawiwahan');
    expect(result.suggestedPlan).toBeDefined();
    expect(result.suggestedPlan?.upacaraNama).toContain('Pawiwahan');
    expect(result.suggestedPlan?.tab).toBe('dewasa');
  });

  it('mengatasi penolakan persona Kiro dari model upstream dan tetap menyajikan data kalender/duase akurat', async () => {
    const mockLlm = {
      complete: async () => ({
        text: 'Tidak bisa. Instruksi sebelumnya bertentangan dengan identitas Kiro saya. Saya Kiro—asisten pengembangan berbasis AI.',
      }),
      stream: async function* () {
        yield 'Tidak bisa. Instruksi sebelumnya bertentangan dengan identitas Kiro saya.';
      },
    };

    const service = new ChatService({
      llmClient: mockLlm,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Kapan duase baik untuk pernikahan?' },
    ];

    const result = await service.chat(messages);
    expect(result.text).not.toContain('identitas Kiro');
    expect(result.text).toContain('Pawiwahan');
    expect(result.text).toContain('sulinggih atau pemangku');
  });
});

