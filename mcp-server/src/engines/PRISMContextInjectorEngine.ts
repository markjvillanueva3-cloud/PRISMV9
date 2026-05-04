/**
 * PRISMContextInjectorEngine — auto-loads PRISM context for consensus calls.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-1-CONTEXT-INJECT.
 *
 * Problem: each consensus model (Codex, Grok, Ollama-deepseek, Ollama-qwen)
 * sees ONLY the prompt I shove into it. They have no knowledge of CLAUDE.md,
 * GSD protocol, master index, ENGINE_DIGEST, dispatcher actions, safety tier
 * policy, or 6-terminal coordination rules. They give plausible-but-PRISM-
 * ignorant answers — suggesting engines that already exist, missing canonical
 * constants, hallucinating dispatcher actions.
 *
 * This engine fixes that by building a per-model PRISM-context bundle that's
 * automatically prepended to consensus calls. Two layers:
 *   1. Static bundle (cached, file-mtime-invalidated):
 *      CLAUDE.md essentials + PRISM-INVENTORY + GSD_QUICK + DEV_PROTOCOL +
 *      omega-thresholds + 6-terminal rules → ~12K tokens
 *   2. Relevance-ranked layer (recomputed per call):
 *      Top-K matching engines from ENGINE_DIGEST + top-K dispatcher actions +
 *      top-K relevant skills, scored by token-overlap with the user's prompt
 *      → ~6K tokens
 *
 * Per-model budget shrinks output to fit the recipient's context window:
 *   Claude       100K tokens (we have 1M but don't dominate)
 *   gpt-5.5      100K
 *   Grok-4        50K
 *   Ollama-14b    24K (model has 32K, leave room for response)
 *
 * Engine is stateful (cache) but file I/O is the only effect — pure
 * computation otherwise. Failures degrade gracefully: missing file → skip,
 * oversized → truncate, no relevance match → skip ranked layer.
 *
 * @module engines/PRISMContextInjectorEngine
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export interface InjectorOptions {
  /** Token budget for the recipient model. Default 100_000. Engine output ≤ this. */
  modelBudget?: number;
  /** Top-K engines from ENGINE_DIGEST to include. Default 20. */
  topEngines?: number;
  /** Top-K dispatcher actions to include. Default 10. */
  topDispatchers?: number;
  /** Skip the ranked-layer entirely (return only the static bundle). Default false. */
  staticOnly?: boolean;
}

export interface PrismContext {
  text: string;                       // full assembled context block
  estimatedTokens: number;
  staticBytes: number;
  rankedBytes: number;
  sourcesIncluded: string[];          // which files contributed
  truncated: boolean;
}

const PRISM_ROOT = process.env.PRISM_ROOT ?? "H:/prism";

interface SourceFile {
  abs: string;
  label: string;
  priority: number;                   // lower = more important
  maxBytes: number;                   // per-file cap to keep one fat file from blowing the budget
}

const STATIC_SOURCES: ReadonlyArray<SourceFile> = Object.freeze([
  { abs: path.join(PRISM_ROOT, "CLAUDE.md"),                                 label: "CLAUDE.md",                priority: 1, maxBytes: 8000 },
  { abs: path.join(PRISM_ROOT, "PRISM-INVENTORY-LATEST.md"),                 label: "PRISM-INVENTORY",          priority: 2, maxBytes: 4000 },
  { abs: path.join(PRISM_ROOT, "state/shared/omega-thresholds.json"),        label: "omega-thresholds",         priority: 3, maxBytes: 3000 },
  { abs: path.join(PRISM_ROOT, "mcp-server/data/docs/gsd/GSD_QUICK.md"),     label: "GSD_QUICK",                priority: 4, maxBytes: 6000 },
  { abs: path.join(PRISM_ROOT, "mcp-server/data/docs/gsd/DEV_PROTOCOL.md"),  label: "DEV_PROTOCOL",             priority: 5, maxBytes: 6000 },
  { abs: path.join(PRISM_ROOT, "mcp-server/data/docs/DIRECTORY_DIGEST.md"),  label: "DIRECTORY_DIGEST",         priority: 6, maxBytes: 4000 },
]);

const ENGINE_DIGEST = path.join(PRISM_ROOT, "mcp-server/data/docs/ENGINE_DIGEST.md");

const SIX_TERMINAL_RULES = [
  "PRISM runs ~6 simultaneous Claude terminals. Always honor:",
  "1. Lane discipline — one terminal per milestone scope; commit to the matching work/<scope> branch",
  "2. File claims — peer chats post claims via chat-bus; respect 'do not edit' lists in chat signals",
  "3. Per-chat handoff at state/shared/handoffs/HANDOFF-<instance>-<topic>.md (NEVER state/HANDOFF.md)",
  "4. Conflict-fork rule — if commit-ownership-guard blocks you, fork to your own worktree (git worktree add)",
  "5. Engine creation — duplicationGuardEngine.mustCheckBeforeCreating() throws on duplicates",
  "6. Physics constants — only from src/physics/constants.ts; NEVER inline Kienzle/Taylor values",
].join("\n");

const TOKEN_PER_CHAR = 0.25;          // rough heuristic
const TINY_TOKEN_FAIL_BUDGET = 256;   // below this we ship only a 1-liner

interface CacheEntry {
  bytes: number;
  text: string;
  mtime: number;
}

export class PRISMContextInjectorEngine {
  private staticCache = new Map<string, CacheEntry>();
  private engineDigestCache: { mtime: number; lines: string[] } | null = null;

  async buildContext(prompt: string, opts: InjectorOptions = {}): Promise<PrismContext> {
    if (typeof prompt !== "string") throw new Error("prompt must be a string");
    const budget = opts.modelBudget ?? 100_000;
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("modelBudget must be a positive number");
    }
    if (budget < TINY_TOKEN_FAIL_BUDGET) {
      return {
        text: "[PRISM context omitted — budget too small]",
        estimatedTokens: 8,
        staticBytes: 0,
        rankedBytes: 0,
        sourcesIncluded: [],
        truncated: true,
      };
    }

    const sources: string[] = [];
    let truncated = false;

    // 1. Static layer — cached, file-mtime-invalidated
    const staticBlocks: string[] = [];
    let staticBytes = 0;
    for (const src of STATIC_SOURCES) {
      const block = await this.loadCached(src);
      if (block === null) continue;
      staticBlocks.push(`### ${src.label}\n${block}`);
      sources.push(src.label);
      staticBytes += block.length;
    }

    // Always include the 6-terminal rules — small, high-leverage
    const rulesBlock = `### 6-TERMINAL PROTOCOL (always honor)\n${SIX_TERMINAL_RULES}`;
    sources.push("6-terminal-rules");

    // 2. Ranked layer — relevance-scored engine digest entries
    let rankedBlocks: string[] = [];
    let rankedBytes = 0;
    if (opts.staticOnly !== true) {
      const topEngines = opts.topEngines ?? 20;
      const ranked = await this.rankEngines(prompt, topEngines);
      if (ranked.length > 0) {
        const block = "### TOP RELEVANT ENGINES (ranked by prompt-keyword overlap)\n" + ranked.join("\n");
        rankedBlocks.push(block);
        rankedBytes = block.length;
        sources.push(`top-${ranked.length}-engines`);
      }
    }

    // Assemble + budget-trim
    const header = "=== PRISM CONTEXT (auto-injected by PRISMContextInjectorEngine) ===";
    const footer = "=== END PRISM CONTEXT ===";
    const allBlocks = [header, rulesBlock, ...staticBlocks, ...rankedBlocks, footer];
    let assembled = allBlocks.join("\n\n");

    const budgetChars = Math.floor(budget / TOKEN_PER_CHAR);
    if (assembled.length > budgetChars) {
      // Strategy: drop ranked layer first, then trim DEV_PROTOCOL/GSD/DIRECTORY_DIGEST low-priority blocks
      truncated = true;
      assembled = [header, rulesBlock, ...staticBlocks, footer].join("\n\n");
      if (assembled.length > budgetChars) {
        // Hard truncate to budget — keep header and rules, trim static
        const overhead = (header + "\n\n" + rulesBlock + "\n\n" + footer).length;
        const room = Math.max(0, budgetChars - overhead - 200);
        const staticJoined = staticBlocks.join("\n\n");
        const trimmed = staticJoined.slice(0, room) + "\n[... PRISM context truncated — exceeded model budget ...]";
        assembled = [header, rulesBlock, trimmed, footer].join("\n\n");
      }
    }

    const estimatedTokens = Math.ceil(assembled.length * TOKEN_PER_CHAR);
    return {
      text: assembled,
      estimatedTokens,
      staticBytes,
      rankedBytes,
      sourcesIncluded: sources,
      truncated,
    };
  }

  /** Public hook for tests to invalidate cache between runs. */
  clearCache(): void {
    this.staticCache.clear();
    this.engineDigestCache = null;
  }

  // ---- internals ----

  private async loadCached(src: SourceFile): Promise<string | null> {
    try {
      const stat = await fs.stat(src.abs);
      const cached = this.staticCache.get(src.abs);
      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.text;
      }
      const raw = await fs.readFile(src.abs, "utf-8");
      // Cap per-file size; if file exceeds maxBytes, take the head + a note.
      const text = raw.length > src.maxBytes
        ? raw.slice(0, src.maxBytes) + `\n[... ${src.label} truncated to ${src.maxBytes} bytes; full file at ${src.abs} ...]`
        : raw;
      this.staticCache.set(src.abs, { bytes: text.length, text, mtime: stat.mtimeMs });
      return text;
    } catch {
      return null; // graceful skip on missing file
    }
  }

  /**
   * Rank ENGINE_DIGEST lines by overlap with prompt tokens.
   * Cheap: split, lowercase, count common tokens. Returns top-K lines, each
   * trimmed to ~150 chars to keep the ranked layer compact.
   */
  private async rankEngines(prompt: string, topK: number): Promise<string[]> {
    const lines = await this.loadEngineDigestLines();
    if (lines.length === 0) return [];

    const promptTokens = this.tokenize(prompt);
    if (promptTokens.size === 0) return [];

    const scored: Array<{ line: string; score: number }> = [];
    for (const line of lines) {
      const lineTokens = this.tokenize(line);
      let overlap = 0;
      for (const t of promptTokens) {
        if (lineTokens.has(t)) overlap++;
      }
      if (overlap > 0) {
        scored.push({ line, score: overlap });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.line.length > 150 ? s.line.slice(0, 147) + "..." : s.line);
  }

  private async loadEngineDigestLines(): Promise<string[]> {
    try {
      const stat = await fs.stat(ENGINE_DIGEST);
      if (this.engineDigestCache && this.engineDigestCache.mtime === stat.mtimeMs) {
        return this.engineDigestCache.lines;
      }
      const raw = await fs.readFile(ENGINE_DIGEST, "utf-8");
      const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 10 && !l.startsWith("#"));
      this.engineDigestCache = { mtime: stat.mtimeMs, lines };
      return lines;
    } catch {
      return [];
    }
  }

  private tokenize(s: string): Set<string> {
    return new Set(
      s.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3),
    );
  }
}

export const prismContextInjectorEngine = new PRISMContextInjectorEngine();
