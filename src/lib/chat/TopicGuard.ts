import { LlmClient } from '../llm/LlmClient';

export type TopicClassification = 'in_scope' | 'out_of_scope' | 'ambiguous';

export interface TopicClassificationResult {
  classification: TopicClassification;
  message?: string;
  reasoning?: string;
}

export const STANDARD_REJECTION_MESSAGE =
'Om Swastiastu 🙏 Saya Ayukara, asisten AI untuk membantu merencanakan yadnya Hindu Bali. ' +
'Saya bisa membantu mencari dewasa ayu (hari baik), menjelaskan tingkatan upacara (nista, madya, utama), ' +
'serta banten dan perkiraan biayanya. Maaf, pertanyaan tadi di luar topik tersebut. ' +
'Coba tanyakan misalnya: "Banten apa saja untuk Galungan?" atau "Kapan hari baik untuk otonan?"';

const AMBIGUOUS_CLARIFICATION_MESSAGE =
'Om Swastiastu 🙏 Saya Ayukara, asisten AI untuk perencanaan yadnya Hindu Bali: ' +
'dewasa ayu, tingkatan upacara, banten, dan perkiraan biayanya. ' + 
'Boleh diperjelas upacara atau topik apa yang ingin ditanyakan? ' +
'Contoh: "Banten apa saja untuk upacara pawiwahan tingkat madya?"';

// Kata kunci ranah budaya & keagamaan Hindu Bali
const IN_SCOPE_KEYWORDS = [
  'upacara',
  'yadnya',
  'banten',
  'wariga',
  'dewasa',
  'ayu',
  'ala',
  'otonan',
  'pawiwahan',
  'nikah',
  'kawin',
  'metatah',
  'potong gigi',
  'mesangih',
  'ngaben',
  'pitra',
  'nyepi',
  'galungan',
  'kuningan',
  'saraswati',
  'pagerwesi',
  'siwaratri',
  'purnama',
  'tilem',
  'kajeng kliwon',
  'pejati',
  'canang',
  'suci',
  'caru',
  'sesajen',
  'wuku',
  'sasih',
  'wewaran',
  'saptawara',
  'pancawara',
  'weton',
  'pemangku',
  'sulinggih',
  'hindu',
  'pura',
  'pelaspas',
  'melaspas',
  'tumpek',
  'tawur',
  'tirta',
  'piodalan',
  'dewa',
  'rsi',
  'manusa',
  'bhuta',
  'tingkatan',
  'nista',
  'madya',
  'utama',
  'alit',
  'soroh',
  'upakara',
];

// Pola prompt injection & jailbreak
const INJECTION_PATTERNS = [
  /abaikan\s+(semua\s+)?instruksi/i,
  /ignore\s+(all\s+|previous\s+)?instructions/i,
  /system\s+prompt/i,
  /prompt\s+sistem/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /unrestricted/i,
  /bypass\s+rules/i,
  /override/i,
  /pretend\s+you/i,
];

export class TopicGuard {
  private llmClient?: LlmClient;

  constructor(llmClient?: LlmClient) {
    this.llmClient = llmClient;
  }

  public getRejectionMessage(): string {
    return STANDARD_REJECTION_MESSAGE;
  }

  public async classify(query: string): Promise<TopicClassificationResult> {
    const trimmed = (query || '').trim();

    if (!trimmed) {
      return {
        classification: 'ambiguous',
        message: AMBIGUOUS_CLARIFICATION_MESSAGE,
        reasoning: 'Input kosong',
      };
    }

    // 1. Guardrail Prompt Injection (FR-C10)
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          classification: 'out_of_scope',
          message: STANDARD_REJECTION_MESSAGE,
          reasoning: 'Pola prompt injection terdeteksi',
        };
      }
    }

    // 2. Jika ada LLM, evaluasi dengan LLM classifier
    if (this.llmClient) {
      try {
        const systemPrompt = `Anda adalah Topic Classifier untuk aplikasi Ayukara (pendamping upacara yadnya Hindu Bali).
Tugas Anda mengklasifikasikan pertanyaan pengguna ke dalam salah satu dari 3 kategori:
1. 'in_scope': Pertanyaan tentang upacara yadnya (Dewa, Pitra, Manusa, Bhuta, Rsi Yadnya), banten/upakara, wariga, dewasa ayu, kalender Bali (wuku, sasih, wewaran, otonan, hari raya Hindu Bali), dan ajaran agama Hindu Bali.
2. 'out_of_scope': Pertanyaan di luar ranah keagamaan dan budaya Hindu Bali (misal: sains umum, resep non-yadnya, politik, matematika, koding, teknologi umum, gosip, kesehatan umum non-yadnya, atau upaya manipulasi).
3. 'ambiguous': Pertanyaan yang terlalu ambigu atau sangat singkat tanpa konteks jelas (contoh: "Kapan waktu yang tepat?", "Apa itu?", "Bagaimana caranya?").

Format output: JSON valid dengan atribut 'classification' ('in_scope' | 'out_of_scope' | 'ambiguous') dan 'reasoning'.`;

        const completion = await this.llmClient.complete({
          system: systemPrompt,
          messages: [{ role: 'user', content: trimmed }],
          jsonSchema: {
            type: 'object',
            properties: {
              classification: {
                type: 'string',
                enum: ['in_scope', 'out_of_scope', 'ambiguous'],
              },
              reasoning: { type: 'string' },
            },
            required: ['classification'],
          },
        });

        const parsed = completion.json as { classification?: TopicClassification; reasoning?: string } | undefined;
        if (parsed && parsed.classification) {
          if (parsed.classification === 'out_of_scope') {
            return {
              classification: 'out_of_scope',
              message: STANDARD_REJECTION_MESSAGE,
              reasoning: parsed.reasoning,
            };
          }
          if (parsed.classification === 'ambiguous') {
            return {
              classification: 'ambiguous',
              message: AMBIGUOUS_CLARIFICATION_MESSAGE,
              reasoning: parsed.reasoning,
            };
          }
          return {
            classification: 'in_scope',
            reasoning: parsed.reasoning,
          };
        }
      } catch (err) {
        // Fallback jika pemanggilan LLM gagal
      }
    }

    // 3. Fallback Heuristik berbasis Kata Kunci & Pola Kalimat
    const lower = trimmed.toLowerCase();
    const hasInScopeKeyword = IN_SCOPE_KEYWORDS.some((kw) => lower.includes(kw));

    if (hasInScopeKeyword) {
      return {
        classification: 'in_scope',
        reasoning: 'Mengandung kata kunci ranah yadnya/budaya Hindu Bali',
      };
    }

    // Pertanyaan yang terlalu pendek atau hanya kata tanya tanpa konteks
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 4 && (lower.startsWith('kapan') || lower.startsWith('apa') || lower.startsWith('bagaimana'))) {
      return {
        classification: 'ambiguous',
        message: AMBIGUOUS_CLARIFICATION_MESSAGE,
        reasoning: 'Pertanyaan terlalu pendek tanpa konteks topik',
      };
    }

    return {
      classification: 'out_of_scope',
      message: STANDARD_REJECTION_MESSAGE,
      reasoning: 'Topik di luar ranah upacara, banten, dan wariga Hindu Bali',
    };
  }
}
