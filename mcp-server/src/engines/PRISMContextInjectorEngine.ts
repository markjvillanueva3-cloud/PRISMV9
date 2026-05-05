/**
 * PRISMContextInjectorEngine — assemble a per-call PRISM context bundle that
 * external reasoners (Codex, Gemini, Grok, Ollama) prepend to their prompt
 * so they reason WITH PRISM knowledge instead of generic.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CODEX-COORD-FIX (restore).
 *
 * Why this exists
 * ---------------
 * MultiModelConsensusEngine fans the same prompt out to N reasoners and
 * scores agreement. Without PRISM context, those reasoners answer
 * generically ("kc1.1 ≈ 1500-2200 N/mm² for steel") rather than against
 * PRISM's canonical constants ("1800 per src/physics/constants.ts P-group").
 * This engine builds a budgeted bundle from the chunked knowledge vault
 * (knowledge/claude-md/, P1-U05 output) so the reasoners share the same
 * frame of reference.
 *
 * Design
 * ------
 * Pure side-effect-free engine. Caller passes a prompt + per-model token
 * budget; engine returns a `{ text, sources }` bundle whose body is at
 * most `modelBudget` characters (rough proxy for tokens at 1 token ≈ 4
 * chars; we err on the side of keeping it small).
 *
 * Selection priority for the budget:
 *   1. Project AGENTS.md head (always first ~4K chars — operating playbook)
 *   2. Global CLAUDE.md preamble chunk (always)
 *   3. Top-K knowledge/claude-md/ chunks by keyword overlap with prompt
 *   4. (future) top-K knowledge/tribal/ entries by semantic similarity
 *
 * The engine is fail-open: if a source is missing or unreadable, it is
 * silently dropped and the next source fills the budget. The consumer
 * (MultiModelConsensusEngine.run) wraps the call in try/catch anyway, so
 * a thrown error here just falls back to a raw prompt.
 *
 * @module engines/PRISMContextInjectorEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_PROJECT_AGENTS = "H:/PRISM/AGENTS.md";
const DEFAULT_GLOBAL_CLAUDE = process.env.PRISM_GLOBAL_CLAUDE_MD
  ?? `${process.env.USERPROFILE ?? process.env.HOME ?? ""}/.claude/CLAUDE.md`;
const DEFAULT_CHUNK_DIR = "H:/prism/knowledge/claude-md";
const DEFAULT_BUDGET = 24_000;
const PROJECT_HEAD_BUDGET = 4_000;

export interface BuildContextInput {
  /** Prompt the consensus is about — used for keyword-overlap chunk ranking. */
  modelBudget?: number;
  /** Override project AGENTS.md (or CLAUDE.md) path. */
  projectPath?: string;
  /** Override global CLAUDE.md path. */
  globalPath?: string;
  /** Override knowledge/claude-md/ chunk directory. */
  chunkDir?: string;
  /** Limit how many chunks the keyword ranker picks. Default 8. */
  topK?: number;
}

export interface ContextBundle {
  text: string;
  sources: string[];
  totalChars: number;
  modelBudget: number;
  chunksUsed: number;
}

interface RankedChunk { path: string; slug: string; section: string; body: string; score: number; }

export class PRISMContextInjectorEngine {
  /**
   * Build a budgeted context bundle for a single prompt. Never throws —
   * returns an empty `{text: "", sources: []}` bundle if every source is
   * unavailable.
   */
  async buildContext(prompt: string, opts: BuildContextInput = {}): Promise<ContextBundle> {
    const budget = opts.modelBudget ?? DEFAULT_BUDGET;
    const projectPath = opts.projectPath ?? DEFAULT_PROJECT_AGENTS;
    const globalPath = opts.globalPath ?? DEFAULT_GLOBAL_CLAUDE;
    const chunkDir = opts.chunkDir ?? DEFAULT_CHUNK_DIR;
    const topK = opts.topK ?? 8;

    const sources: string[] = [];
    const segments: string[] = [];
    let used = 0;

    const append = (label: string, body: string, capChars: number): void => {
      if (!body) return;
      const remaining = budget - used;
      if (remaining <= 0) return;
      const cap = Math.min(capChars, remaining);
      const truncated = body.length > cap ? body.slice(0, cap) + "\n[…truncated]" : body;
      segments.push(`=== ${label} ===\n${truncated}`);
      used += truncated.length + label.length + 12; // header overhead estimate
      sources.push(label);
    };

    // 1. Project operating playbook head
    try {
      if (fs.existsSync(projectPath)) {
        const raw = fs.readFileSync(projectPath, "utf-8");
        append(`PROJECT (${path.basename(projectPath)})`, raw, PROJECT_HEAD_BUDGET);
      }
    } catch { /* fail-open */ }

    // 2. Global preamble
    try {
      if (fs.existsSync(globalPath)) {
        const raw = fs.readFileSync(globalPath, "utf-8");
        // Just the preamble — first ## section header marks the end of preamble
        const cut = raw.search(/\n## /);
        const head = cut > 0 ? raw.slice(0, cut) : raw.slice(0, 3_000);
        append(`GLOBAL ${path.basename(globalPath)} preamble`, head, 3_000);
      }
    } catch { /* fail-open */ }

    // 3. Top-K relevant chunks by keyword overlap with the prompt
    try {
      const chunks = this.rankChunks(prompt, chunkDir, topK);
      for (const c of chunks) {
        if (used >= budget) break;
        const headerLines = c.body.split(/\r?\n/).slice(0, 2).join("\n");
        const remaining = budget - used;
        const cap = Math.min(2_500, remaining);
        append(`CHUNK ${c.slug} (${c.section})`, c.body, cap);
        if (headerLines.length > 0) { /* ensure body uses chunk header */ }
      }
    } catch { /* fail-open */ }

    return {
      text: segments.join("\n\n"),
      sources,
      totalChars: segments.reduce((a, s) => a + s.length, 0),
      modelBudget: budget,
      chunksUsed: sources.filter((s) => s.startsWith("CHUNK ")).length,
    };
  }

  /**
   * Rank knowledge/claude-md/ chunks by keyword overlap with the prompt.
   * Tokenization: lowercase words ≥ 3 chars. Score = unique-token overlap
   * count + 0.1 × total-occurrences. Ties broken by slug alpha.
   */
  rankChunks(prompt: string, chunkDir: string, topK: number): RankedChunk[] {
    if (!fs.existsSync(chunkDir)) return [];
    const promptTokens = this.tokenize(prompt);
    if (promptTokens.size === 0) return [];

    const candidates: RankedChunk[] = [];
    let entries: string[] = [];
    try { entries = fs.readdirSync(chunkDir).filter((f) => f.toLowerCase().endsWith(".md")); }
    catch { return []; }

    for (const filename of entries) {
      const fullPath = path.join(chunkDir, filename);
      try {
        const body = fs.readFileSync(fullPath, "utf-8");
        const fmMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        const slug = (fmMatch?.[1].match(/^slug:\s*(.+)$/m)?.[1] ?? filename.replace(/\.md$/, "")).trim();
        const section = (fmMatch?.[1].match(/^section:\s*(.+)$/m)?.[1] ?? slug).trim();
        const docTokens = this.tokenize(body);
        const score = this.overlapScore(promptTokens, docTokens);
        if (score > 0) candidates.push({ path: fullPath, slug, section, body, score });
      } catch { /* skip unreadable */ }
    }

    candidates.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
    return candidates.slice(0, topK);
  }

  // ---- private helpers ----

  private tokenize(text: string): Map<string, number> {
    const out = new Map<string, number>();
    const words = String(text ?? "").toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [];
    for (const w of words) out.set(w, (out.get(w) ?? 0) + 1);
    return out;
  }

  private overlapScore(prompt: Map<string, number>, doc: Map<string, number>): number {
    let unique = 0;
    let total = 0;
    for (const [w] of prompt) {
      const docCount = doc.get(w);
      if (docCount === undefined) continue;
      unique++;
      total += docCount;
    }
    return unique + total * 0.1;
  }
}

export const prismContextInjectorEngine = new PRISMContextInjectorEngine();
