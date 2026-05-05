/**
 * PdfChunkExtractorEngine — split extracted PDF text into overlapping
 * chunks suitable for embedding into Qdrant under kind='wiki'.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02.
 *
 * Why this exists
 * ---------------
 * The 116 manufacturer-catalog PDFs (P14-U01 inventory) are large
 * (avg ~46 MB) and a single embedding can carry only ~8K tokens
 * before nomic-embed-text starts losing fidelity. Naive line-split
 * loses semantic boundaries (an insert spec sheet's parameter table
 * cuts across a page break). This engine splits on paragraph + size
 * with overlap so contiguous chunks share enough context that
 * cross-page queries still match.
 *
 * Algorithm
 * ---------
 * 1. Split input on blank lines (paragraph boundaries).
 * 2. Greedily pack paragraphs into chunks until `targetChars`.
 * 3. When a paragraph alone exceeds `targetChars`, split on sentence
 *    boundaries (`. ! ?` followed by whitespace).
 * 4. When a sentence still exceeds, hard-split at `targetChars`.
 * 5. Each chunk carries the previous chunk's last `overlapChars`
 *    characters as a prefix (semantic glue across boundaries).
 *
 * The overlap is plain-text duplication, not a soft attention token —
 * Qdrant's cosine similarity benefits from each chunk being readable
 * standalone, and recall happens to surface adjacent chunks naturally
 * when the user query straddles a boundary.
 *
 * Pure functions, no I/O. Caller (the ingest driver) does the PDF
 * text extraction (via Python pypdf) and feeds the string in.
 *
 * @module engines/PdfChunkExtractorEngine
 */

const DEFAULT_TARGET_CHARS = 1_500;
const DEFAULT_OVERLAP_CHARS = 200;
const MIN_CHUNK_CHARS = 50;
const HARD_MAX_CHUNK_CHARS = 4_000;

const PARAGRAPH_SPLIT_RE = /\r?\n\s*\r?\n+/;
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/;
const WHITESPACE_NORMALIZE_RE = /\s+/g;

export interface ChunkOpts {
  /** Target characters per chunk. Default 1500. */
  targetChars?: number;
  /** Characters of previous-chunk text to prepend as glue. Default 200. */
  overlapChars?: number;
  /** Source identifier carried into each chunk's metadata. */
  source?: string;
  /** Optional page hint — when text was extracted page-by-page, pass
   *  the page number this paragraph block came from. */
  pageHint?: number;
}

export interface PdfChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  source: string;
  pageHint: number | null;
}

export class PdfChunkExtractorEngine {
  /**
   * Split raw extracted PDF text into chunks. Returns [] for empty input.
   * Chunks are guaranteed:
   *   - Non-empty
   *   - At most HARD_MAX_CHUNK_CHARS long (sentinel — should be rare)
   *   - At least MIN_CHUNK_CHARS unless the entire input is shorter
   */
  chunk(text: string, opts: ChunkOpts = {}): PdfChunk[] {
    const targetChars = this.clampTarget(opts.targetChars ?? DEFAULT_TARGET_CHARS);
    const overlapChars = this.clampOverlap(opts.overlapChars ?? DEFAULT_OVERLAP_CHARS, targetChars);
    const source = opts.source ?? "unknown";
    const pageHint = typeof opts.pageHint === "number" ? opts.pageHint : null;

    const cleaned = this.normalize(text);
    if (cleaned.length === 0) return [];

    // Short input → single chunk
    if (cleaned.length <= targetChars) {
      return [{
        index: 0,
        text: cleaned,
        charStart: 0,
        charEnd: cleaned.length,
        source,
        pageHint,
      }];
    }

    // Paragraph + sentence + hard-split greedy packing
    const segments = this.segment(cleaned, targetChars);

    // Repack segments into chunks ≤ targetChars
    const chunks: PdfChunk[] = [];
    let buf = "";
    let bufStart = 0;
    let charCursor = 0;
    let prevTail = "";

    for (const seg of segments) {
      const candidate = buf.length === 0 ? seg : buf + "\n\n" + seg;
      if (candidate.length <= targetChars) {
        buf = candidate;
        continue;
      }
      // Flush current buf
      if (buf.length > 0) {
        const withOverlap = prevTail.length > 0 ? prevTail + " " + buf : buf;
        chunks.push({
          index: chunks.length,
          text: withOverlap.slice(0, HARD_MAX_CHUNK_CHARS),
          charStart: bufStart,
          charEnd: bufStart + buf.length,
          source,
          pageHint,
        });
        prevTail = buf.slice(Math.max(0, buf.length - overlapChars));
        charCursor = bufStart + buf.length;
        bufStart = charCursor;
      }
      buf = seg;
      bufStart = charCursor;
    }
    if (buf.length > 0) {
      const withOverlap = prevTail.length > 0 ? prevTail + " " + buf : buf;
      chunks.push({
        index: chunks.length,
        text: withOverlap.slice(0, HARD_MAX_CHUNK_CHARS),
        charStart: bufStart,
        charEnd: bufStart + buf.length,
        source,
        pageHint,
      });
    }

    return chunks.filter((c) => c.text.length >= MIN_CHUNK_CHARS || chunks.length === 1);
  }

  /**
   * Segment text into paragraph → sentence → hard-split units, each
   * ≤ targetChars. Public for tests; not normally called directly.
   */
  segment(text: string, targetChars: number): string[] {
    const out: string[] = [];
    const paragraphs = text.split(PARAGRAPH_SPLIT_RE).map((p) => p.trim()).filter((p) => p.length > 0);
    for (const para of paragraphs) {
      if (para.length <= targetChars) {
        out.push(para);
        continue;
      }
      // Sentence-split oversized paragraphs
      const sentences = para.split(SENTENCE_SPLIT_RE).map((s) => s.trim()).filter((s) => s.length > 0);
      let buf = "";
      for (const sent of sentences) {
        if (sent.length > targetChars) {
          if (buf.length > 0) { out.push(buf); buf = ""; }
          // Hard-split a runaway sentence
          for (let i = 0; i < sent.length; i += targetChars) {
            out.push(sent.slice(i, i + targetChars));
          }
          continue;
        }
        const candidate = buf.length === 0 ? sent : buf + " " + sent;
        if (candidate.length <= targetChars) {
          buf = candidate;
        } else {
          if (buf.length > 0) out.push(buf);
          buf = sent;
        }
      }
      if (buf.length > 0) out.push(buf);
    }
    return out;
  }

  /**
   * Normalize whitespace: collapse runs of internal whitespace to single
   * space WITHIN a paragraph, preserve blank-line paragraph boundaries.
   */
  normalize(text: string): string {
    const s = String(text ?? "");
    if (s.length === 0) return "";
    // Replace tabs/CR with space, collapse runs of spaces, then preserve
    // paragraph breaks (\n\n+) as exactly two newlines.
    return s
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n+/)
      .map((p) => p.replace(WHITESPACE_NORMALIZE_RE, " ").trim())
      .filter((p) => p.length > 0)
      .join("\n\n");
  }

  // ---- private helpers ----

  private clampTarget(n: number): number {
    if (!Number.isFinite(n) || n < MIN_CHUNK_CHARS) return DEFAULT_TARGET_CHARS;
    if (n > HARD_MAX_CHUNK_CHARS) return HARD_MAX_CHUNK_CHARS;
    return Math.floor(n);
  }

  private clampOverlap(n: number, target: number): number {
    if (!Number.isFinite(n) || n < 0) return 0;
    // Overlap can never exceed half the target, else chunks become majority-overlap noise
    return Math.min(Math.floor(n), Math.floor(target / 2));
  }
}

export const pdfChunkExtractorEngine = new PdfChunkExtractorEngine();
