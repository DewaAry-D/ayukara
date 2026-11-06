import { LlmClient } from '../llm/LlmClient';
import { TopicGuard, STANDARD_REJECTION_MESSAGE } from './TopicGuard';
import { RuleRepository } from '../db/repositories/RuleRepository';
import { BantenRepository } from '../db/repositories/BantenRepository';
import { SearchClient } from '../search/SearchClient';
import { ChatCalendarAdvisor } from './ChatCalendarAdvisor';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCitation {
  id: number;
  title: string;
  url?: string;
  text?: string;
}

export interface SuggestedPlan {
  upacaraId?: number;
  upacaraNama: string;
  tingkatanNama?: string;
  tab?: 'dewasa' | 'otonan' | 'hari_raya';
}

export interface ChatServiceResult {
  text: string;
  citations: ChatCitation[];
  suggestedPlan?: SuggestedPlan;
  isOutOfScope?: boolean;
}

export interface ChatServiceOptions {
  llmClient: LlmClient;
  topicGuard?: TopicGuard;
  ruleRepository?: RuleRepository;
  bantenRepository?: BantenRepository;
  searchClient?: SearchClient;
  calendarAdvisor?: ChatCalendarAdvisor;
}

const CULTURAL_DISCLAIMER_TEXT =
  'Penjelasan ini bersifat pendamping; keputusan akhir pada sulinggih atau pemangku.';

// Data referensi baku Ayukara untuk grounding dasar
const GROUNDING_SOURCES: Array<{ id: number; title: string; text: string; keywords: string[] }> = [
  {
    id: 1,
    title: 'Buku Pedoman Praktis Upakara (Banten) dalam Upacara Yajna (ISBN 978-602-14516-0-1)',
    text: 'Banten Pejati merupakan sarana persaksian wajib kehadapan Ida Sang Hyang Widhi Wasa yang terdiri dari daksina, peras, sodan/ajuman, dan tipat kelanan.',
    keywords: ['pejati', 'daksina', 'peras', 'ajuman', 'sodan', 'kelanan', 'banten'],
  },
  {
    id: 2,
    title: 'Lontar Wariga Dewasa & Pedoman Kalender Bali',
    text: 'Penentuan dewasa ayu mempertimbangkan perhitungan wewaran, wuku, sasih, dan penanggal/pangelong untuk menghindari dewasa ala.',
    keywords: ['wariga', 'dewasa', 'ayu', 'ala', 'wuku', 'sasih', 'wewaran'],
  },
  {
    id: 3,
    title: 'Pedoman Manusa Yadnya: Upacara Otonan & Dwijati',
    text: 'Upacara Otonan diperingati setiap 210 hari (siklus saptawara, pancawara, dan wuku pawukon) sebagai wujud penyucian dan rasa syukur atas kelahiran.',
    keywords: ['otonan', 'weton', 'lahir', 'kelahiran', 'manusa yadnya', 'alit', 'madya'],
  },
  {
    id: 4,
    title: 'Tuntunan Hari Raya Hindu Bali: Galungan, Kuningan, dan Nyepi',
    text: 'Hari raya Galungan dirayakan pada Buda Kliwon Dungulan sebagai kemenangan Dharma atas Adharma, disusul Kuningan pada Saniscara Kliwon Kuningan, dan Nyepi pada Pinanggal 1 Sasih Kedasa.',
    keywords: ['galungan', 'kuningan', 'nyepi', 'saraswati', 'pagerwesi', 'siwaratri'],
  },
];

export class ChatService {
  private llmClient: LlmClient;
  private topicGuard: TopicGuard;
  private ruleRepository?: RuleRepository;
  private bantenRepository?: BantenRepository;
  private searchClient?: SearchClient;
  private calendarAdvisor: ChatCalendarAdvisor;

  constructor(options: ChatServiceOptions) {
    this.llmClient = options.llmClient;
    this.topicGuard = options.topicGuard || new TopicGuard(options.llmClient);
    this.ruleRepository = options.ruleRepository;
    this.bantenRepository = options.bantenRepository;
    this.searchClient = options.searchClient;
    this.calendarAdvisor = options.calendarAdvisor || new ChatCalendarAdvisor();
  }

  /**
   * Menyiapkan konteks rujukan dari kalkulasi kalender/wariga, penelusuran internet, dan literatur dresta Bali.
   * Sumber bebas dari internet/literatur umum dan tidak dibatasi hanya pangkalan data internal.
   */
  private async getGroundingContext(query: string): Promise<{
    contextText: string;
    citations: ChatCitation[];
    suggestedPlan?: SuggestedPlan;
  }> {
    const citations: ChatCitation[] = [];
    let detectedPlan: SuggestedPlan | undefined = undefined;
    const calculationSections: string[] = [];

    // 1. Hitung hari raya bila pertanyaan menanyakan tanggal hari raya tertentu
    const holyDayCalculation = this.calendarAdvisor.findUpcomingHolyDays(query);
    if (holyDayCalculation) {
      calculationSections.push(`[DATA RESMI PENANGGALAN HARI RAYA BALI]:\n${holyDayCalculation}`);
    }

    // 2. Hitung hari baik (dewasa ayu) bila pertanyaan menanyakan kapan baiknya upacara
    let warigaRuleSet = undefined;
    if (this.ruleRepository) {
      try {
        warigaRuleSet = await this.ruleRepository.getWarigaRuleSet();
      } catch {
        // DB offline fallback
      }
    }
    const hariBaikCalculation = this.calendarAdvisor.findCeremonyHariBaik(query, warigaRuleSet);
    if (hariBaikCalculation) {
      calculationSections.push(`[DATA RESMI REKOMENDASI HARI BAIK / DEWASA AYU]:\n${hariBaikCalculation.adviceText}`);
      if (hariBaikCalculation.suggestedPlan) {
        detectedPlan = hariBaikCalculation.suggestedPlan;
      }
    }

    // 3. Telusuri sumber bebas dari internet jika searchClient tersedia
    if (this.searchClient) {
      try {
        const webQuery = `${query} upacara hindu bali banten wariga`;
        const webResults = await this.searchClient.search(webQuery, {
          maxResults: 3,
        });

        if (Array.isArray(webResults) && webResults.length > 0) {
          for (const item of webResults) {
            citations.push({
              id: citations.length + 1,
              title: item.title || 'Informasi Internet',
              url: item.url,
              text: item.content ? item.content.slice(0, 300) : '',
            });
          }
        }
      } catch (err) {
        console.warn('[Ayukara ChatService] Penelusuran web tidak aktif atau mengalami kendala:', err);
      }
    }

    // 4. Sertakan pustaka dasar jika relevan atau jika penelusuran web belum menghasilkan
    const lower = query.toLowerCase();
    const matchedPustaka = GROUNDING_SOURCES.filter((s) =>
      s.keywords.some((kw) => lower.includes(kw))
    );

    const pustakaToInclude = matchedPustaka.length > 0
      ? matchedPustaka
      : (citations.length === 0 ? [GROUNDING_SOURCES[0], GROUNDING_SOURCES[1]] : []);

    for (const p of pustakaToInclude) {
      citations.push({
        id: citations.length + 1,
        title: p.title,
        text: p.text,
      });
    }

    const citationText = citations.length > 0
      ? citations
          .map((c) => {
            const urlPart = c.url ? ` (Tautan: ${c.url})` : '';
            return `[${c.id}] ${c.title}${urlPart}:\n"${c.text}"`;
          })
          .join('\n\n')
      : 'Gunakan pengetahuan luas tradisi agama Hindu Bali dan informasi umum dari internet.';

    const contextParts: string[] = [];
    if (calculationSections.length > 0) {
      contextParts.push(calculationSections.join('\n\n'));
    }
    contextParts.push(citationText);

    return {
      contextText: contextParts.join('\n\n---\n\n'),
      citations,
      suggestedPlan: detectedPlan,
    };
  }

  /**
   * Mendeteksi upacara dari teks untuk menghasilkan CTA "Buat Rencana dari Jawaban Ini" (FR-C9)
   */
  private detectSuggestedPlan(text: string): SuggestedPlan | undefined {
    const lower = text.toLowerCase();

    if (lower.includes('otonan')) {
      let tingkatan = 'Alit';
      if (lower.includes('utama')) tingkatan = 'Utama';
      else if (lower.includes('madya')) tingkatan = 'Madya';
      return {
        upacaraId: 23,
        upacaraNama: 'Otonan',
        tingkatanNama: tingkatan,
        tab: 'otonan',
      };
    }

    if (lower.includes('galungan')) {
      return { upacaraId: 3, upacaraNama: 'Galungan', tab: 'hari_raya' };
    }
    if (lower.includes('kuningan')) {
      return { upacaraId: 4, upacaraNama: 'Kuningan', tab: 'hari_raya' };
    }
    if (lower.includes('nyepi')) {
      return { upacaraId: 8, upacaraNama: 'Nyepi', tab: 'hari_raya' };
    }
    if (lower.includes('saraswati')) {
      return { upacaraId: 5, upacaraNama: 'Saraswati', tab: 'hari_raya' };
    }
    if (lower.includes('pagerwesi')) {
      return { upacaraId: 6, upacaraNama: 'Pagerwesi', tab: 'hari_raya' };
    }
    if (lower.includes('siwaratri')) {
      return { upacaraId: 7, upacaraNama: 'Siwaratri', tab: 'hari_raya' };
    }

    if (lower.includes('pawiwahan') || lower.includes('pernikahan') || lower.includes('perkawinan')) {
      return { upacaraId: 9, upacaraNama: 'Pawiwahan', tab: 'dewasa' };
    }
    if (lower.includes('metatah') || lower.includes('potong gigi') || lower.includes('mesangih')) {
      return { upacaraId: 10, upacaraNama: 'Metatah / Potong Gigi', tab: 'dewasa' };
    }
    if (lower.includes('melaspas') || lower.includes('pelaspas')) {
      return { upacaraId: 17, upacaraNama: 'Melaspas Bangunan', tab: 'dewasa' };
    }
    if (lower.includes('ngaben')) {
      return { upacaraId: 12, upacaraNama: 'Ngaben', tab: 'dewasa' };
    }

    return undefined;
  }

  /**
   * Menjalankan percakapan dengan validasi guardrail dan grounding terstruktur
   */
  public async chat(messages: ChatMessage[]): Promise<ChatServiceResult> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMessage?.content || '';

    // 1. Validasi Topik (FR-C1, FR-C2, FR-C3, FR-C10)
    const guardRes = await this.topicGuard.classify(query);
    if (guardRes.classification === 'out_of_scope') {
      return {
        text: guardRes.message || STANDARD_REJECTION_MESSAGE,
        citations: [],
        isOutOfScope: true,
      };
    }
    if (guardRes.classification === 'ambiguous') {
      return {
        text: guardRes.message || 'Mohon perjelas pertanyaan Anda seputar yadnya, banten, atau wariga.',
        citations: [],
        isOutOfScope: false,
      };
    }

    // 2. Siapkan Grounding Data
    const { contextText, citations, suggestedPlan: planFromAdvisor } = await this.getGroundingContext(query);

    const systemPrompt = `Bantulah pengguna aplikasi Ayukara dengan memberikan penjelasan informatif seputar penanggalan kalender Bali, hari raya, dewasa ayu (hari baik/duase), banten upakara, dan kebudayaan yadnya di Bali.
Bahasa komunikasi: Bahasa Indonesia yang santun, jelas, dan edukatif.

DATA & RUJUKAN ACUAN:
${contextText}

PETUNJUK MENJAWAB:
1. Jika pengguna menanyakan tanggal hari raya atau hari baik (dewasa ayu/duase), berikan tanggal Masehi, weton (saptawara & pancawara), wuku, sasih, dan keterangannya secara jelas berdasarkan data di atas.
2. Anda dapat melengkapi penjelasan dengan wawasan umum tradisi Hindu Bali dan literatur di internet yang relevan.
3. Hargai prinsip keberagaman tradisi lokal (Desa Kala Patra).
4. SELALU sertakan penutup resmi di akhir jawaban:
"${CULTURAL_DISCLAIMER_TEXT}"
5. Tolak dengan santun jika pertanyaan sama sekali di luar topik kebudayaan Bali atau agama Hindu.`;

    let text = '';
    try {
      const completion = await this.llmClient.complete({
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      text = completion.text || '';
    } catch (llmErr) {
      console.warn('[Ayukara ChatService] Panggilan LLM mengalami kendala, menggunakan rujukan pustaka:', llmErr);
      const topCitation = citations[0];
      text = topCitation
        ? `Berdasarkan ${topCitation.title}: ${topCitation.text} [1]`
        : 'Informasi belum dapat dimuat saat ini. Silakan coba kembali sesaat lagi.';
    }

    // Tangani kemungkinan penolakan identitas dari model upstream (misal persona Kiro / model coding)
    const isIdentityRefusal =
      /bertentangan dengan identitas|identitas Kiro|fungsi Kiro|asisten pengembangan|i can't help with this|i cannot help with this|adopt a different identity|i'm kiro|i am kiro|overrides my actual design/i.test(
        text
      );

    if (isIdentityRefusal || !text.trim()) {
      const calculationMatch = contextText.match(/\[DATA RESMI [^\]]+\]:\s*([\s\S]*?)(?=\n\n---|\n\n\[\d+\]|$)/);
      if (calculationMatch) {
        text = `${calculationMatch[1].trim()}\n\n${CULTURAL_DISCLAIMER_TEXT}`;
      } else {
        const topCitation = citations[0];
        text = topCitation
          ? `Berdasarkan ${topCitation.title}: ${topCitation.text} [1]\n\n${CULTURAL_DISCLAIMER_TEXT}`
          : `Informasi belum dapat dimuat saat ini. Silakan tanyakan kembali sesaat lagi.\n\n${CULTURAL_DISCLAIMER_TEXT}`;
      }
    }

    // Pastikan disclaimer selalu ada jika belum tertulis
    if (!text.includes('sulinggih atau pemangku')) {
      text += `\n\n${CULTURAL_DISCLAIMER_TEXT}`;
    }

    const suggestedPlan = planFromAdvisor || this.detectSuggestedPlan(query + ' ' + text);

    return {
      text,
      citations,
      suggestedPlan,
      isOutOfScope: false,
    };
  }

  /**
   * Menjalankan streaming percakapan langsung ke klien (FR-C)
   */
  public async *streamChat(messages: ChatMessage[]): AsyncIterable<string> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMessage?.content || '';

    const recent = messages
    .slice(-5, -1)
    .map((m) => `${m.role === 'user' ? 'User' : 'Ayukara'}: ${m.content.slice(0, 300)}`)
    .join('\n');
    // 1. Validasi Topik
    const guardRes = await this.topicGuard.classify(query, recent);
    if (guardRes.classification === 'out_of_scope') {
      yield guardRes.message || STANDARD_REJECTION_MESSAGE;
      return;
    }
    if (guardRes.classification === 'ambiguous') {
      yield guardRes.message || 'Mohon perjelas pertanyaan Anda seputar yadnya, banten, atau wariga.';
      return;
    }
  
    // 2. Grounding (gabung pertanyaan user sebelumnya supaya topiknya tidak hilang)
    const prevUser = messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content).join(' ');
    const { contextText, citations } = await this.getGroundingContext(prevUser || query);

    const systemPrompt = `Bantulah pengguna aplikasi Ayukara dengan memberikan penjelasan informatif seputar penanggalan kalender Bali, hari raya, dewasa ayu (hari baik/duase), banten upakara, dan kebudayaan yadnya di Bali.
Bahasa komunikasi: Bahasa Indonesia yang santun, jelas, dan edukatif.

DATA & RUJUKAN ACUAN:
${contextText}

PETUNJUK MENJAWAB:
1. Jika pengguna menanyakan tanggal hari raya atau hari baik (dewasa ayu/duase), berikan tanggal Masehi, weton (saptawara & pancawara), wuku, sasih, dan keterangannya secara jelas berdasarkan data di atas.
2. Anda dapat melengkapi penjelasan dengan wawasan umum tradisi Hindu Bali dan literatur di internet yang relevan.
3. Hargai prinsip keberagaman tradisi lokal (Desa Kala Patra).
4. SELALU sertakan penutup resmi di akhir jawaban:
"${CULTURAL_DISCLAIMER_TEXT}"
5. Tolak dengan santun jika pertanyaan sama sekali di luar topik kebudayaan Bali atau agama Hindu.`;

    let fullText = '';
    let isIdentityRefusal = false;
    let initialBuffer = '';

    try {
      for await (const chunk of this.llmClient.stream({
        system: systemPrompt,
        messages: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      })) {
        if (!isIdentityRefusal) {
          initialBuffer += chunk;
          if (
            /bertentangan dengan identitas|identitas Kiro|fungsi Kiro|i can't help with this|i cannot help with this|adopt a different identity|i'm kiro|i am kiro|overrides my actual design/i.test(
              initialBuffer
            )
          ) {
            isIdentityRefusal = true;
            break;
          }
          if (initialBuffer.length > 50 || initialBuffer.includes('\n')) {
            fullText += initialBuffer;
            yield initialBuffer;
            initialBuffer = '';
          }
        }
      }

      if (!isIdentityRefusal && initialBuffer) {
        fullText += initialBuffer;
        yield initialBuffer;
      }
    } catch (streamErr) {
      console.warn('[Ayukara ChatService] Streaming LLM mengalami kendala:', streamErr);
      isIdentityRefusal = true;
    }

    if (isIdentityRefusal) {
      const calculationMatch = contextText.match(/\[DATA RESMI [^\]]+\]:\s*([\s\S]*?)(?=\n\n---|\n\n\[\d+\]|$)/);
      let fallbackMsg = '';
      if (calculationMatch) {
        fallbackMsg = `${calculationMatch[1].trim()}\n\n${CULTURAL_DISCLAIMER_TEXT}`;
      } else {
        const topCitation = citations[0];
        fallbackMsg = topCitation
          ? `Berdasarkan ${topCitation.title}: ${topCitation.text} [1]\n\n${CULTURAL_DISCLAIMER_TEXT}`
          : `Informasi belum dapat dimuat saat ini. Silakan coba kembali sesaat lagi.\n\n${CULTURAL_DISCLAIMER_TEXT}`;
      }
      yield fallbackMsg;
      return;
    }

    if (fullText && !fullText.includes('sulinggih atau pemangku')) {
      yield `\n\n${CULTURAL_DISCLAIMER_TEXT}`;
    }
  }
}

