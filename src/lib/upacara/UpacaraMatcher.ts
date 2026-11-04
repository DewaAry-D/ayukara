import { LlmClient } from '../llm/LlmClient';

export interface UpacaraMatchItem {
  id: number;
  nama: string;
  alias?: string[];
  deskripsi?: string | null;
  jenis_penentuan?: 'dewasa' | 'hari_raya_tetap' | 'otonan';
}

export interface IUpacaraMatchRepository {
  getAllCandidates(): Promise<UpacaraMatchItem[]>;
}

export interface CandidateResult {
  upacara: UpacaraMatchItem;
  alasan: string;
  isTopMatch: boolean;
}

export interface MatchResult {
  matchType: 'exact' | 'candidates' | 'not_found';
  selectedUpacara?: UpacaraMatchItem;
  candidates: CandidateResult[];
  message: string;
}

interface LlmMatchItem {
  id: number;
  alasan?: string;
}

interface LlmMatchResponse {
  matches?: LlmMatchItem[];
}

export class UpacaraMatcher {
  private repository: IUpacaraMatchRepository;
  private llmClient: LlmClient;

  constructor(repository: IUpacaraMatchRepository, llmClient: LlmClient) {
    this.repository = repository;
    this.llmClient = llmClient;
  }

  /**
   * Mencocokkan input pengguna (maks. 300 karakter) dengan daftar upacara di database.
   */
  public async match(rawInput: string): Promise<MatchResult> {
    const input = rawInput.trim();

    // Aturan Mutlak #18: Validasi panjang input maksimal 300 karakter
    if (input.length > 300) {
      throw new Error('Input upacara melebihi batas maksimal 300 karakter.');
    }

    if (input.length === 0) {
      return {
        matchType: 'not_found',
        candidates: [],
        message: 'Upacara tidak ditemukan',
      };
    }

    const allCandidates = await this.repository.getAllCandidates();
    const candidateMap = new Map<number, UpacaraMatchItem>();
    for (const c of allCandidates) {
      candidateMap.set(c.id, c);
    }

    const lowerInput = input.toLowerCase();

    // 1. Cek kecocokan persis (nama atau alias) di DB
    for (const upacara of allCandidates) {
      if (upacara.nama.toLowerCase() === lowerInput) {
        return {
          matchType: 'exact',
          selectedUpacara: upacara,
          candidates: [{ upacara, alasan: 'Nama upacara cocok persis', isTopMatch: true }],
          message: 'Upacara sesuai',
        };
      }

      if (upacara.alias) {
        for (const al of upacara.alias) {
          if (al.toLowerCase() === lowerInput) {
            return {
              matchType: 'exact',
              selectedUpacara: upacara,
              candidates: [{ upacara, alasan: `Alias upacara '${al}' cocok persis`, isTopMatch: true }],
              message: 'Upacara sesuai',
            };
          }
        }
      }
    }

    // 2. Jika tidak cocok persis: kirim daftar tertutup upacara ke LLM
    const closedListText = allCandidates
      .map((c) => `- ID ${c.id}: ${c.nama} (alias: ${c.alias?.join(', ') || '-'})`)
      .join('\n');

    const systemPrompt = `Anda adalah asisten pencocokan upacara Yadnya Hindu Bali.
Tugas Anda adalah menganalisis deskripsi upacara dari pengguna dan HANYA memilih upacara yang relevan dari DAFTAR TERTUTUP berikut:
${closedListText}

ATURAN KETAT:
1. Anda DILARANG mengarang upacara atau ID di luar daftar di atas.
2. Keluarkan dalam format JSON { "matches": [{ "id": number, "alasan": string }] }.
3. Urutkan matches dari yang paling sesuai di urutan pertama.
4. Jika tidak ada yang relevan, kembalikan { "matches": [] }.`;

    const userPrompt = `Deskripsi upacara pengguna: "${input}"`;

    const completion = await this.llmClient.complete({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      jsonSchema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                alasan: { type: 'string' },
              },
              required: ['id'],
            },
          },
        },
        required: ['matches'],
      },
    });

    const parsed = completion.json as LlmMatchResponse | undefined;
    const rawMatches = parsed?.matches || [];

    // Aturan Mutlak #15: Validasi di kode — ID di luar daftar tertutup DB dibuang
    const validCandidates: CandidateResult[] = [];
    for (let i = 0; i < rawMatches.length; i++) {
      const matchItem = rawMatches[i];
      if (candidateMap.has(matchItem.id)) {
        const upacara = candidateMap.get(matchItem.id)!;
        validCandidates.push({
          upacara,
          alasan: matchItem.alasan || 'Deskripsi sesuai dengan upacara ini',
          isTopMatch: validCandidates.length === 0, // Urutan teratas berlabel "Paling sesuai"
        });
      }
    }

    if (validCandidates.length === 0) {
      return {
        matchType: 'not_found',
        candidates: [],
        message: 'Upacara tidak ditemukan',
      };
    }

    return {
      matchType: 'candidates',
      candidates: validCandidates,
      message: 'Upacara Teridentifikasi',
    };
  }
}

