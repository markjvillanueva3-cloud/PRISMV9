// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine is consumed
// by the /wiki-ingest command (U-WIKI06) and the U-WIKI04B harvest cron until then.
/**
 * WikiIngestRouterEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI04
 *
 * Routes raw-source ingest through the 5-stage Ollama-then-Claude pipeline
 * defined in WIKI_SCHEMA.md §3.1:
 *
 *   1  Read raw source                                — caller (existing
 *                                                       prism_knowledge:
 *                                                       learn_ingest_*)
 *   2  Summarize (200-500 word)                       — Ollama
 *   3  Suggest cross-refs vs known slugs              — Ollama
 *   4  Synthesize + resolve contradictions            — Claude (caller)
 *   5  File: WikiIndexMaintainer.upsert + LogAppender.append — engine
 *
 * Why split 4 from {2,3,5}: Claude lives outside the engine boundary; we
 * return a synthesis prompt + the prior-stage payloads so the caller's chat
 * runs the high-value reasoning, then calls `finalizeIngest` to commit.
 *
 * Token-accounting target: ≥70% of total ingest tokens flow through Ollama
 * (WIKI_SCHEMA §3.1). The engine returns per-stage `TokenSpend` records so
 * callers can verify the share OR forward to TokenEconomyTrackerEngine.
 *
 * All external deps (fetch, index engine, log engine) are constructor-
 * injectable so tests can mock without touching real Ollama/disk.
 */

import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import {
  WikiIndexMaintainerEngine,
  type WikiEntry,
} from "./WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine, type LogEntry } from "./WikiLogAppenderEngine.js";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:32b";
const OLLAMA_TIMEOUT_MS = 30_000;
const TOKEN_SHARE_FLOOR = 0.70;

/** Crude token estimate — 1 token ≈ 4 characters of English. Good enough
 *  for the ≥70% share assertion since both Ollama and Claude legs use the
 *  same heuristic. Replace with a real tokenizer when one's available. */
const CHARS_PER_TOKEN = 4;

type OllamaModel = "qwen2.5-coder:32b" | "qwen2.5:14b" | "deepseek-coder:6.7b" | string;
type ClaudeModel = "opus" | "sonnet" | "haiku";

export type IngestStageId = 1 | 2 | 3 | 4 | 5;
export type ProvenanceModel = "ollama" | ClaudeModel;

export interface StageSpend {
  stage: IngestStageId;
  label: string;
  inputTokens: number;
  outputTokens: number;
  model: ProvenanceModel;
  durationMs: number;
}

export interface IngestStartInput {
  /** Pre-read raw text from the source. Stage 1 is caller's responsibility. */
  rawText: string;
  /** Target slug for the wiki page. */
  slug: string;
  /** Target category — must be in WikiIndexMaintainerEngine's enum. */
  category: string;
  /** Caller identity for log attribution: `claude-XXXXXXXX`. */
  agent: string;
  /** Existing slugs known to the wiki — used by stage 3 cross-ref suggestion. */
  knownSlugs?: string[];
  /** Source path (file/url) cited as the wiki entry's source. */
  sourcePath: string;
}

export interface IngestPrepared {
  ok: true;
  slug: string;
  category: string;
  summary: string;
  suggestedRefs: string[];
  synthesisPrompt: string;
  /** Caller hands this back to `finalizeIngest` after Claude synthesis. */
  pipelineToken: PipelineToken;
}

export interface PipelineToken {
  slug: string;
  category: string;
  summary: string;
  suggestedRefs: string[];
  sourcePath: string;
  agent: string;
  spends: StageSpend[];
}

export interface FinalizeInput {
  pipelineToken: PipelineToken;
  /** Synthesized payload from Claude (stage 4 output). */
  synthesizedSummary: string;
  /** Confidence assigned by Claude during synthesis (0..1). */
  confidence: number;
  /** Token cost of the Claude synthesis call. */
  claudeStageSpend: { inputTokens: number; outputTokens: number; model: ClaudeModel; durationMs: number };
  /** Optional override for the `last_verified` date; defaults to today. */
  lastVerified?: string;
}

export interface FinalizeResult {
  ok: true;
  indexResult: { slug: string; added: boolean; updated: boolean };
  logAppended: boolean;
  spends: StageSpend[];
  totalTokens: number;
  ollamaTokens: number;
  ollamaShare: number;
  /** True iff the run honors the WIKI_SCHEMA §3.1 ≥70% Ollama floor. */
  meetsSavingsFloor: boolean;
}

interface FetchLike {
  (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }): Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
  }>;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class WikiIngestRouterEngine extends BaseEngine {
  private readonly ollamaUrl: string;
  private readonly ollamaModel: OllamaModel;
  private readonly fetchImpl: FetchLike;
  private readonly indexEngine: WikiIndexMaintainerEngine;
  private readonly logEngine: WikiLogAppenderEngine;
  private readonly estimateTokens: (text: string) => number;

  constructor(
    deps: {
      ollamaUrl?: string;
      ollamaModel?: OllamaModel;
      fetchImpl?: FetchLike;
      indexEngine?: WikiIndexMaintainerEngine;
      logEngine?: WikiLogAppenderEngine;
      estimateTokens?: (text: string) => number;
    } = {}
  ) {
    super({
      name: "WikiIngestRouterEngine",
      version: "1.0.0",
      domain: "knowledge-wiki",
      description:
        "5-stage ingest pipeline. Stages 2+3 → Ollama, stage 4 → caller's Claude, stage 5 → WikiIndex+WikiLog. Targets ≥70% Ollama token share.",
    });
    this.ollamaUrl = deps.ollamaUrl ?? DEFAULT_OLLAMA_URL;
    this.ollamaModel = deps.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    this.fetchImpl = deps.fetchImpl ?? (defaultFetch as FetchLike);
    this.indexEngine = deps.indexEngine ?? new WikiIndexMaintainerEngine();
    this.logEngine = deps.logEngine ?? new WikiLogAppenderEngine();
    this.estimateTokens = deps.estimateTokens ?? defaultEstimateTokens;
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "runIngest", description: "Stages 2+3 — returns synthesis prompt + pipeline token." },
      { name: "finalizeIngest", description: "Stage 5 — index upsert + log append after Claude synthesis." },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(): Promise<never> {
    throw new Error(
      "Use runIngest(...) then finalizeIngest(...) explicitly — execute() does not capture the synthesis step."
    );
  }

  /**
   * Runs stages 2 + 3 (Ollama summarize + cross-ref). Returns a `pipelineToken`
   * the caller threads back into `finalizeIngest` after handling stage 4.
   */
  async runIngest(input: IngestStartInput): Promise<IngestPrepared> {
    if (!input.rawText || input.rawText.trim().length === 0) {
      throw new Error("WikiIngestRouterEngine.runIngest: rawText required");
    }
    if (!input.slug) throw new Error("WikiIngestRouterEngine.runIngest: slug required");
    if (!input.category) throw new Error("WikiIngestRouterEngine.runIngest: category required");
    if (!input.agent) throw new Error("WikiIngestRouterEngine.runIngest: agent required");
    if (!input.sourcePath) throw new Error("WikiIngestRouterEngine.runIngest: sourcePath required");

    const knownSlugs = input.knownSlugs ?? [];
    const spends: StageSpend[] = [];

    const stage2 = await this.stage2Summarize(input.rawText);
    spends.push(stage2.spend);

    const stage3 = await this.stage3SuggestRefs(stage2.summary, knownSlugs);
    spends.push(stage3.spend);

    const synthesisPrompt = this.stage4BuildSynthesisPrompt({
      slug: input.slug,
      category: input.category,
      sourcePath: input.sourcePath,
      summary: stage2.summary,
      suggestedRefs: stage3.refs,
    });

    return {
      ok: true,
      slug: input.slug,
      category: input.category,
      summary: stage2.summary,
      suggestedRefs: stage3.refs,
      synthesisPrompt,
      pipelineToken: {
        slug: input.slug,
        category: input.category,
        summary: stage2.summary,
        suggestedRefs: stage3.refs,
        sourcePath: input.sourcePath,
        agent: input.agent,
        spends,
      },
    };
  }

  /**
   * Stage 5. Records Claude's synthesis spend, calls
   * `WikiIndexMaintainerEngine.upsert` and `WikiLogAppenderEngine.append`,
   * and returns the per-stage spend ledger plus Ollama-share ratio.
   */
  async finalizeIngest(input: FinalizeInput): Promise<FinalizeResult> {
    if (!input.pipelineToken) throw new Error("finalizeIngest: pipelineToken required");
    if (!input.synthesizedSummary || input.synthesizedSummary.trim().length === 0) {
      throw new Error("finalizeIngest: synthesizedSummary required");
    }
    if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence)) {
      throw new Error("finalizeIngest: confidence must be finite number");
    }
    if (input.confidence < 0 || input.confidence > 1) {
      throw new Error("finalizeIngest: confidence must be in [0, 1]");
    }

    const t0 = Date.now();
    const today = input.lastVerified ?? new Date().toISOString().slice(0, 10);
    const token = input.pipelineToken;

    const stage4Spend: StageSpend = {
      stage: 4,
      label: "synthesize",
      inputTokens: input.claudeStageSpend.inputTokens,
      outputTokens: input.claudeStageSpend.outputTokens,
      model: input.claudeStageSpend.model,
      durationMs: input.claudeStageSpend.durationMs,
    };

    const entry: WikiEntry = {
      slug: token.slug,
      category: token.category,
      summary: input.synthesizedSummary,
      sources: [token.sourcePath],
      confidence: input.confidence,
      last_verified: today,
      source: "merge",
    };

    const indexResult = await this.indexEngine.upsert(entry);

    const logEntry: LogEntry = {
      date: today,
      op: "ingest",
      title: `${token.slug} — ${input.synthesizedSummary.slice(0, 80)}`,
      agent: token.agent,
      details: [
        `category: ${token.category}`,
        `confidence: ${input.confidence}`,
        `cross-refs suggested: ${token.suggestedRefs.length}`,
      ],
    };
    const logResult = await this.logEngine.append(logEntry);

    const stage5Spend: StageSpend = {
      stage: 5,
      label: "file",
      inputTokens: 0,
      outputTokens: 0,
      // Stage 5 is local I/O only — flag as ollama=0/claude=0 by tagging
      // ollama (treated as "free" in the savings tally per WIKI_SCHEMA §3.1).
      model: "ollama",
      durationMs: Date.now() - t0,
    };

    const allSpends: StageSpend[] = [...token.spends, stage4Spend, stage5Spend];
    const totalTokens = sumTokens(allSpends);
    const ollamaTokens = sumTokens(allSpends.filter((s) => s.model === "ollama"));
    const ollamaShare = totalTokens > 0 ? ollamaTokens / totalTokens : 0;

    return {
      ok: true,
      indexResult: {
        slug: indexResult.slug,
        added: indexResult.added,
        updated: indexResult.updated,
      },
      logAppended: logResult.appended,
      spends: allSpends,
      totalTokens,
      ollamaTokens,
      ollamaShare,
      meetsSavingsFloor: ollamaShare >= TOKEN_SHARE_FLOOR,
    };
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private async stage2Summarize(rawText: string): Promise<{ summary: string; spend: StageSpend }> {
    const prompt =
      "You are a knowledge-base summarizer. Produce a 200-500 word neutral summary of the source. " +
      "Cite specific facts, no opinion, no marketing language. Return only the summary text.\n\n" +
      "SOURCE:\n" +
      rawText;
    const t0 = Date.now();
    const result = await this.callOllama(prompt);
    const summary = result.response.trim();
    return {
      summary,
      spend: {
        stage: 2,
        label: "summarize",
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: "ollama",
        durationMs: Date.now() - t0,
      },
    };
  }

  private async stage3SuggestRefs(
    summary: string,
    knownSlugs: string[]
  ): Promise<{ refs: string[]; spend: StageSpend }> {
    if (knownSlugs.length === 0) {
      // Nothing to cross-reference against — short-circuit, no Ollama call.
      return {
        refs: [],
        spend: { stage: 3, label: "cross-ref", inputTokens: 0, outputTokens: 0, model: "ollama", durationMs: 0 },
      };
    }
    const prompt =
      "You are a knowledge-graph cross-referencer. Given a summary and a list of existing wiki slugs, " +
      "return ONLY a comma-separated list of slugs from the list that are likely related. " +
      "No explanation, no markdown, no slugs not in the input list.\n\n" +
      "SUMMARY:\n" +
      summary +
      "\n\nKNOWN SLUGS:\n" +
      knownSlugs.join(", ");
    const t0 = Date.now();
    const result = await this.callOllama(prompt);
    const knownSet = new Set(knownSlugs);
    const refs = result.response
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && knownSet.has(s));
    return {
      refs,
      spend: {
        stage: 3,
        label: "cross-ref",
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        model: "ollama",
        durationMs: Date.now() - t0,
      },
    };
  }

  private stage4BuildSynthesisPrompt(args: {
    slug: string;
    category: string;
    sourcePath: string;
    summary: string;
    suggestedRefs: string[];
  }): string {
    return [
      `# Synthesis prompt for wiki entry \`${args.slug}\` (${args.category})`,
      ``,
      `Source: \`${args.sourcePath}\``,
      ``,
      `## Ollama summary (stage 2 output)`,
      args.summary,
      ``,
      `## Suggested cross-references (stage 3 output, may be empty)`,
      args.suggestedRefs.length > 0 ? args.suggestedRefs.map((r) => `- [[${r}]]`).join("\n") : "_none_",
      ``,
      `## Your task`,
      `Resolve any contradictions vs adjacent pages, tighten the summary to ≤500 words, and produce a confidence score in [0,1]. Then call \`WikiIngestRouterEngine.finalizeIngest\` with the synthesized summary and confidence.`,
    ].join("\n");
  }

  private async callOllama(
    prompt: string
  ): Promise<{ response: string; inputTokens: number; outputTokens: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
    try {
      const resp = await this.fetchImpl(this.ollamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        throw new Error(`Ollama HTTP ${resp.status}`);
      }
      const json = (await resp.json()) as OllamaGenerateResponse;
      // Prefer Ollama's reported counts; fall back to char-based estimate.
      const inputTokens = typeof json.prompt_eval_count === "number" ? json.prompt_eval_count : this.estimateTokens(prompt);
      const outputTokens = typeof json.eval_count === "number" ? json.eval_count : this.estimateTokens(json.response ?? "");
      return { response: json.response ?? "", inputTokens, outputTokens };
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function sumTokens(spends: StageSpend[]): number {
  let total = 0;
  for (const s of spends) total += s.inputTokens + s.outputTokens;
  return total;
}

function defaultEstimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

const defaultFetch: FetchLike = async (url, init) => {
  const r = await fetch(url, init);
  return {
    ok: r.ok,
    status: r.status,
    json: () => r.json(),
    text: () => r.text(),
  };
};

export const WIKI_INGEST_OLLAMA_FLOOR = TOKEN_SHARE_FLOOR;
export const WIKI_INGEST_DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;
