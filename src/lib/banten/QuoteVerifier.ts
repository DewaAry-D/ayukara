export interface SourceDocument {
  url: string;
  content: string;
  title?: string;
}

export class QuoteVerifier {
  /**
   * Menormalisasi whitespace: collapse semua spasi, tab, newline berlebih menjadi 1 spasi tunggal, lalu trim.
   */
  public normalizeWhitespace(text: string): string {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Memverifikasi apakah kutipan persis ada di dalam teks sumber (setelah normalisasi spasi).
   * Sesuai Aturan Mutlak #3: Kutipan diverifikasi di kode (QuoteVerifier, normalisasi spasi).
   * Tidak cocok -> data dibuang.
   */
  public verify(quote: string, sourceText: string): boolean {
    const cleanQuote = this.normalizeWhitespace(quote);
    const cleanSource = this.normalizeWhitespace(sourceText);

    if (!cleanQuote || !cleanSource) {
      return false;
    }

    return cleanSource.includes(cleanQuote);
  }

  /**
   * Mencari dokumen sumber pertama yang memuat kutipan persis tersebut.
   */
  public findSourceForQuote(
    quote: string,
    sources: SourceDocument[]
  ): SourceDocument | null {
    for (const source of sources) {
      if (this.verify(quote, source.content)) {
        return source;
      }
    }
    return null;
  }
}

