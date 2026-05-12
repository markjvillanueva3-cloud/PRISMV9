/**
 * OllamaContextFloorEngine — canonical PRISM brief on every local-LLM call.
 *
 * Prepends `state/shared/CLAUDE-BRIEF.md` as a system prompt to Ollama API
 * calls so deepseek-r1:14b and qwen2.5-coder:7b have the same baseline
 * awareness as Claude/Gemini/Codex without per-call repetition.
 *
 * Design
 * ------
 * - In-memory cache of the brief, refreshed when file mtime changes or after
 *   FRESH_TTL_MS (default 12h). Concurrent reads are safe.
 * - Skip-list of task tags that bypass injection (raw text formatting,
 *   embedding-only pipelines, deterministic stringification) — saves ~2K
 *   tokens per call when context isn't needed.
 * - Brief never throws — missing/empty file returns `{ briefIncluded: false }`
 *   with a reason string so callers can log a warning and continue.
 * - Oversize prompts (>1MB) throw with a descriptive error so Ollama isn't
 *   asked to swallow accidental dumps of source files.
 *
 * Wiring
 * ------
 * - Dispatcher: `prism_context` actions `ollama_context_wrap`,
 *   `ollama_context_status`, `ollama_context_refresh`.
 * - **Not auto-wired into `OllamaHookBridgeEngine.query()`** because hook
 *   queries have a 500ms timeout and the brief would push every hook past
 *   that. Callers that want the floor invoke `wrap()` first and pass the
 *   returned `system` string as `options.systemPrompt`. Suitable for deep
 *   reasoning / code explain / multi-turn — NOT for sub-second hook fire.
 *
 * @see knowledge/wiki/concepts/ollama_context_floor.md (added by mirror sync)
 * @see scripts/generate-claude-brief.mjs — produces the source brief
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { z } from "zod";

const BRIEF_PATH = "H:/prism/state/shared/CLAUDE-BRIEF.md";
const BUNDLE_SCRIPT = "H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs";
const FRESH_TTL_MS = 12 * 60 * 60 * 1000;       // 12h re-read window
const STALE_HARD_HOURS = 24;                     // surface staleness flag past this
const MAX_PROMPT_BYTES = 1_048_576;              // 1MiB — guards against full-file dumps
const MAX_BRIEF_BYTES = 64 * 1024;               // 64KiB — anything larger is a config error
const MAX_BUNDLE_BYTES = 256 * 1024;             // 256KiB — bundle modes can be larger than the bare brief

/**
 * Task tags that bypass brief injection. These are short, deterministic, or
 * embedding-only operations where the PRISM brief adds noise without value.
 */
export const BARE_OLLAMA_TAGS = Object.freeze([
  "bare-ollama",
  "embedding",
  "format",
  "stringify",
  "summarize-raw",
  "tokenize",
] as const);

export type BareOllamaTag = typeof BARE_OLLAMA_TAGS[number];

const AwarenessModeSchema = z.enum(["brief", "standard", "full"]);
export type AwarenessMode = z.infer<typeof AwarenessModeSchema>;

const WrapInputSchema = z.object({
  prompt: z.string().min(1, "prompt must be non-empty"),
  model: z.string().min(1).default("qwen2.5-coder:7b"),
  taskTag: z.string().optional(),
  briefOverride: z.string().nullable().optional(),
  /**
   * Awareness depth: `brief` = CLAUDE-BRIEF only (default, fastest, ~13KB);
   * `standard` = brief + memory index + active claims + position (~22KB);
   * `full` = standard + master-index excerpt + GSD-quick (~26KB).
   * Higher modes invoke `prism-awareness-bundle.mjs` and cache the result.
   */
  mode: AwarenessModeSchema.default("brief"),
});

export type WrapInput = z.infer<typeof WrapInputSchema>;

export interface WrapResult {
  system: string;
  prompt: string;
  model: string;
  briefIncluded: boolean;
  briefAgeHours: number | null;
  reason: string;
  briefStale: boolean;
  /** Mode that actually produced the system content. */
  modeUsed: AwarenessMode;
  /** True when content came from the awareness-bundle script (standard/full). */
  fromBundle: boolean;
}

export interface StatusResult {
  briefPath: string;
  briefExists: boolean;
  briefSizeBytes: number;
  briefAgeHours: number | null;
  isFresh: boolean;
  isStale: boolean;
  cacheLoadedAt: string | null;
  cacheBytes: number;
  skipTags: readonly string[];
}

interface CacheEntry {
  content: string;
  mtimeMs: number;
  loadedAt: number;
  ageHoursAtLoad: number;
}

interface BundleCacheEntry {
  content: string;
  loadedAt: number;
  briefMtimeMs: number;
}

export class OllamaContextFloorEngine {
  private cache: CacheEntry | null = null;
  /** Per-mode bundle cache keyed by awareness mode. */
  private bundleCache: Partial<Record<AwarenessMode, BundleCacheEntry>> = {};

  /**
   * Wrap a prompt with the canonical PRISM brief as a system prompt.
   *
   * Skip conditions (return `briefIncluded: false`):
   * - taskTag is in BARE_OLLAMA_TAGS
   * - briefOverride is explicitly null (caller opting out)
   * - brief file is missing or empty
   *
   * Throws on:
   * - empty prompt (zod)
   * - prompt larger than 1MiB (defensive — Ollama would truncate or OOM)
   */
  wrap(input: z.input<typeof WrapInputSchema>): WrapResult {
    const parsed = WrapInputSchema.parse(input);
    if (Buffer.byteLength(parsed.prompt, "utf-8") > MAX_PROMPT_BYTES) {
      throw new Error(
        `prompt exceeds ${MAX_PROMPT_BYTES} bytes — refuse to inject context floor; trim the prompt first`,
      );
    }

    if (parsed.briefOverride === null) {
      return this.skip(parsed, "caller passed briefOverride=null (explicit opt-out)");
    }

    if (parsed.taskTag && (BARE_OLLAMA_TAGS as readonly string[]).includes(parsed.taskTag)) {
      return this.skip(parsed, `taskTag '${parsed.taskTag}' on skip-list`);
    }

    if (typeof parsed.briefOverride === "string" && parsed.briefOverride.length > 0) {
      return {
        system: parsed.briefOverride,
        prompt: parsed.prompt,
        model: parsed.model,
        briefIncluded: true,
        briefAgeHours: 0,
        briefStale: false,
        reason: "used briefOverride",
        modeUsed: parsed.mode,
        fromBundle: false,
      };
    }

    // Standard / full modes invoke the awareness-bundle script (cached per-mode).
    if (parsed.mode === "standard" || parsed.mode === "full") {
      const bundle = this.loadBundle(parsed.mode);
      if (bundle !== null) {
        return {
          system: bundle.content,
          prompt: parsed.prompt,
          model: parsed.model,
          briefIncluded: true,
          briefAgeHours: bundle.briefMtimeMs > 0
            ? (Date.now() - bundle.briefMtimeMs) / 3_600_000
            : null,
          briefStale: bundle.briefMtimeMs > 0
            ? (Date.now() - bundle.briefMtimeMs) / 3_600_000 > STALE_HARD_HOURS
            : false,
          reason: `wrapped with awareness bundle (mode=${parsed.mode})`,
          modeUsed: parsed.mode,
          fromBundle: true,
        };
      }
      // Bundle failed — fall through to brief mode rather than skipping entirely.
    }

    const cached = this.loadBrief();
    if (cached === null) {
      return this.skip(parsed, `brief file missing or empty at ${BRIEF_PATH}`);
    }

    const ageHours = this.ageHoursOfCache(cached);
    return {
      system: cached.content,
      prompt: parsed.prompt,
      model: parsed.model,
      briefIncluded: true,
      briefAgeHours: ageHours,
      briefStale: ageHours > STALE_HARD_HOURS,
      reason: parsed.mode !== "brief"
        ? `wrapped with cached brief (bundle ${parsed.mode} unavailable)`
        : "wrapped with cached brief",
      modeUsed: "brief",
      fromBundle: false,
    };
  }

  /** Inspect cache + brief freshness without invoking wrap. */
  status(): StatusResult {
    const exists = existsSync(BRIEF_PATH);
    if (!exists) {
      return {
        briefPath: BRIEF_PATH,
        briefExists: false,
        briefSizeBytes: 0,
        briefAgeHours: null,
        isFresh: false,
        isStale: false,
        cacheLoadedAt: this.cache ? new Date(this.cache.loadedAt).toISOString() : null,
        cacheBytes: this.cache?.content.length ?? 0,
        skipTags: BARE_OLLAMA_TAGS,
      };
    }
    const stat = statSync(BRIEF_PATH);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageHours = ageMs / 3_600_000;
    return {
      briefPath: BRIEF_PATH,
      briefExists: true,
      briefSizeBytes: stat.size,
      briefAgeHours: ageHours,
      isFresh: ageMs < FRESH_TTL_MS,
      isStale: ageHours > STALE_HARD_HOURS,
      cacheLoadedAt: this.cache ? new Date(this.cache.loadedAt).toISOString() : null,
      cacheBytes: this.cache?.content.length ?? 0,
      skipTags: BARE_OLLAMA_TAGS,
    };
  }

  /** Force cache invalidation — next wrap() re-reads from disk. */
  refresh(): { cleared: boolean; previousBytes: number } {
    const previousBytes = this.cache?.content.length ?? 0;
    this.cache = null;
    return { cleared: true, previousBytes };
  }

  // ---------- internals ----------

  private skip(parsed: WrapInput, reason: string): WrapResult {
    return {
      system: "",
      prompt: parsed.prompt,
      model: parsed.model,
      briefIncluded: false,
      briefAgeHours: null,
      briefStale: false,
      reason,
      modeUsed: parsed.mode,
      fromBundle: false,
    };
  }

  /**
   * Load the awareness bundle for the given mode by invoking
   * `prism-awareness-bundle.mjs --<mode>`. Cached per-mode keyed on the
   * brief file mtime so the cache invalidates when CLAUDE-BRIEF is regenerated.
   * Returns null on script error / missing file — caller falls back to brief.
   */
  private loadBundle(mode: AwarenessMode): { content: string; briefMtimeMs: number } | null {
    if (!existsSync(BUNDLE_SCRIPT)) return null;
    let briefMtimeMs = 0;
    if (existsSync(BRIEF_PATH)) {
      try { briefMtimeMs = statSync(BRIEF_PATH).mtimeMs; } catch { briefMtimeMs = 0; }
    }
    const cached = this.bundleCache[mode];
    const now = Date.now();
    const cacheValid =
      cached !== undefined &&
      cached.briefMtimeMs === briefMtimeMs &&
      now - cached.loadedAt < FRESH_TTL_MS;
    if (cacheValid && cached !== undefined) {
      return { content: cached.content, briefMtimeMs: cached.briefMtimeMs };
    }
    try {
      const stdout = execFileSync(process.execPath, [BUNDLE_SCRIPT, `--${mode}`], {
        encoding: "utf-8",
        timeout: 15_000,
        maxBuffer: MAX_BUNDLE_BYTES,
        windowsHide: true,
      });
      if (!stdout || stdout.trim().length === 0) return null;
      this.bundleCache[mode] = { content: stdout, loadedAt: now, briefMtimeMs };
      return { content: stdout, briefMtimeMs };
    } catch {
      return null;
    }
  }

  private loadBrief(): CacheEntry | null {
    if (!existsSync(BRIEF_PATH)) return null;
    const stat = statSync(BRIEF_PATH);
    if (stat.size === 0) return null;
    if (stat.size > MAX_BRIEF_BYTES) {
      // Anything larger than 64KiB is a config error — refuse to inject so we
      // don't silently bloat every Ollama call with a runaway file.
      return null;
    }

    const now = Date.now();
    const cacheValid =
      this.cache !== null &&
      this.cache.mtimeMs === stat.mtimeMs &&
      now - this.cache.loadedAt < FRESH_TTL_MS;
    if (cacheValid && this.cache !== null) return this.cache;

    const content = readFileSync(BRIEF_PATH, "utf-8");
    if (content.trim().length === 0) return null;

    const ageHoursAtLoad = (now - stat.mtimeMs) / 3_600_000;
    this.cache = {
      content,
      mtimeMs: stat.mtimeMs,
      loadedAt: now,
      ageHoursAtLoad,
    };
    return this.cache;
  }

  private ageHoursOfCache(entry: CacheEntry): number {
    return (Date.now() - entry.mtimeMs) / 3_600_000;
  }
}

export const ollamaContextFloorEngine = new OllamaContextFloorEngine();
