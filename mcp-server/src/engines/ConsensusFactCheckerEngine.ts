/**
 * ConsensusFactCheckerEngine — auto-validate consensus model answers against
 * the live PRISM source-of-truth artifacts.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-FACT-CHECK.
 *
 * External models (Codex, Grok, Ollama) lack PRISM context by default. Even
 * with PRISMContextInjectorEngine prepending CLAUDE.md + ENGINE_DIGEST, models
 * still hallucinate engine names ("ToolPathOptimizationEngine — wait, does
 * that exist?") and dispatcher actions ("call prism_calc:taylor_force"). This
 * engine catches those before a roadmap or refactor proposal builds on a
 * fictional foundation.
 *
 * What it does:
 *   1. Tokenize each ModelResponse.answer for capitalized identifiers that
 *      look like engine names (`*Engine` suffix) or dispatcher actions
 *      (`prism_*:*` snake_case).
 *   2. Look each up in ENGINE_DIGEST + the live dispatcher action enum (a
 *      curated allowlist passed in at config time).
 *   3. Flag misses as `hallucination` with the exact mention + the closest
 *      legit match (Levenshtein-1).
 *   4. Compute a fact-check score: verified_mentions / total_mentions.
 *
 * Pure / cheap: no I/O during ask() — caller pre-loads the engine + dispatcher
 * sets once. Levenshtein distance is computed on tokens ≤ 80 chars.
 *
 * @module engines/ConsensusFactCheckerEngine
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export interface FactCheckResult {
  totalMentions: number;
  verifiedMentions: number;
  hallucinations: HallucinationFlag[];
  verified: VerifiedFlag[];
  /** verified / total. 1.0 = perfect, 0.0 = every mention was hallucinated, NaN if no mentions. */
  factualityScore: number;
}

export interface HallucinationFlag {
  kind: "engine" | "dispatcher_action";
  mention: string;          // what the model said
  closestMatch: string | null;  // nearest real name (edit-distance ≤ 2)
  modelName: string;
}

export interface VerifiedFlag {
  kind: "engine" | "dispatcher_action";
  mention: string;
  modelName: string;
}

const PRISM_ROOT = process.env.PRISM_ROOT ?? "H:/prism";
const ENGINE_DIGEST_PATH = path.join(PRISM_ROOT, "mcp-server/data/docs/ENGINE_DIGEST.md");

const ENGINE_PATTERN = /\b([A-Z][A-Za-z0-9]*Engine)\b/g;
const DISPATCHER_ACTION_PATTERN = /\b(prism_[a-z_]+)\s*:\s*([a-z_][a-z0-9_]*)\b/g;
const MAX_EDIT_DISTANCE = 2;
const MAX_TOKEN_LEN_FOR_LEVENSHTEIN = 80;

interface KnowledgeBase {
  engines: Set<string>;
  dispatcherActions: Set<string>; // formatted as "tool:action"
  loadedAt: number;
}

export class ConsensusFactCheckerEngine {
  private kb: KnowledgeBase | null = null;

  /**
   * Pre-load the knowledge base. Caller should invoke this once at startup
   * and pass the result to `check()`. Refresh by calling again — file mtime
   * is not auto-watched.
   */
  async loadKnowledgeBase(opts?: { dispatcherActions?: ReadonlyArray<string> }): Promise<KnowledgeBase> {
    const engines = await this.loadEngineNames();
    const dispatcherActions = new Set<string>(opts?.dispatcherActions ?? []);
    this.kb = { engines, dispatcherActions, loadedAt: Date.now() };
    return this.kb;
  }

  getKnowledgeBase(): KnowledgeBase | null {
    return this.kb;
  }

  /**
   * Scan a single ModelResponse.answer (or any text) for engine/dispatcher
   * mentions and validate them against the loaded knowledge base.
   */
  check(text: string, modelName: string = "unknown", kb?: KnowledgeBase): FactCheckResult {
    if (typeof text !== "string") {
      throw new Error("check() requires a string text argument");
    }
    const knowledge = kb ?? this.kb;
    if (!knowledge) {
      throw new Error("knowledge base not loaded — call loadKnowledgeBase() first or pass kb explicitly");
    }

    const hallucinations: HallucinationFlag[] = [];
    const verified: VerifiedFlag[] = [];
    let totalMentions = 0;

    // Engine mentions
    const seenEngines = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = ENGINE_PATTERN.exec(text)) !== null) {
      const name = m[1];
      if (seenEngines.has(name)) continue; // dedup per-answer
      seenEngines.add(name);
      totalMentions++;
      if (knowledge.engines.has(name)) {
        verified.push({ kind: "engine", mention: name, modelName });
      } else {
        hallucinations.push({
          kind: "engine",
          mention: name,
          closestMatch: this.closestMatch(name, knowledge.engines),
          modelName,
        });
      }
    }
    ENGINE_PATTERN.lastIndex = 0;

    // Dispatcher action mentions (prism_xxx:action)
    const seenActions = new Set<string>();
    while ((m = DISPATCHER_ACTION_PATTERN.exec(text)) !== null) {
      const formatted = `${m[1]}:${m[2]}`;
      if (seenActions.has(formatted)) continue;
      seenActions.add(formatted);
      totalMentions++;
      if (knowledge.dispatcherActions.has(formatted)) {
        verified.push({ kind: "dispatcher_action", mention: formatted, modelName });
      } else {
        hallucinations.push({
          kind: "dispatcher_action",
          mention: formatted,
          closestMatch: this.closestMatch(formatted, knowledge.dispatcherActions),
          modelName,
        });
      }
    }
    DISPATCHER_ACTION_PATTERN.lastIndex = 0;

    const factualityScore = totalMentions === 0
      ? Number.NaN
      : Number((verified.length / totalMentions).toFixed(3));

    return {
      totalMentions,
      verifiedMentions: verified.length,
      hallucinations,
      verified,
      factualityScore,
    };
  }

  /** Reset for tests / reload scenarios. */
  reset(): void {
    this.kb = null;
  }

  // ---- internals ----

  private async loadEngineNames(): Promise<Set<string>> {
    try {
      const raw = await fs.readFile(ENGINE_DIGEST_PATH, "utf-8");
      const names = new Set<string>();
      for (const line of raw.split("\n")) {
        let mm: RegExpExecArray | null;
        const re = /\b([A-Z][A-Za-z0-9]*Engine)\b/g;
        while ((mm = re.exec(line)) !== null) {
          names.add(mm[1]);
        }
      }
      return names;
    } catch {
      return new Set();
    }
  }

  /**
   * Find the nearest known name to `query` within edit distance ≤ MAX_EDIT_DISTANCE.
   * Returns null if no candidate is close enough. Bounded by token length to
   * avoid pathological cost on very long synthetic identifiers.
   */
  private closestMatch(query: string, candidates: Set<string>): string | null {
    if (query.length > MAX_TOKEN_LEN_FOR_LEVENSHTEIN) return null;
    let best: string | null = null;
    let bestDist = MAX_EDIT_DISTANCE + 1;
    for (const c of candidates) {
      if (c.length > MAX_TOKEN_LEN_FOR_LEVENSHTEIN) continue;
      const d = this.levenshtein(query, c);
      if (d < bestDist) {
        bestDist = d;
        best = c;
        if (d === 0) break;
      }
    }
    return bestDist <= MAX_EDIT_DISTANCE ? best : null;
  }

  /** Standard Levenshtein with single-row optimization. O(|a|·|b|). */
  private levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost,
        );
      }
      [prev, curr] = [curr, prev];
    }
    return prev[b.length];
  }
}

export const consensusFactCheckerEngine = new ConsensusFactCheckerEngine();
