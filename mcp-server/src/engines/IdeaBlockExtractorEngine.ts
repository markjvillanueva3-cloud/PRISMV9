// WIRE-EXEMPT: downstream-deferred — composed by E3 IdeaBlockRagEngine (charlie queue) which IS dispatcher-wired via prism_knowledge. E1 is the leaf producer; E2 (dedup) + E3 (retrieval) + E4 (governance) form the upstream wiring path. Tracked in OBSIDIAN-INTELLIGENCE-MS3 envelope phase E.
/**
 * IdeaBlockExtractorEngine — OBSIDIAN-INTELLIGENCE-MS3 / E1
 * ==========================================================
 * Converts `.md` notes into atomic question/answer IdeaBlocks via Ollama's
 * structured-output JSON mode. The Akshay/Blockify pattern: each "atomic
 * claim" in a note becomes one block. Downstream E2 deduplicates, E3 RAG
 * retrieves at block granularity, E4 governance-gates, D1 reads provenance.
 *
 * Failure model:
 *  - empty-input → ok=false, error="empty-input"
 *  - Ollama unreachable → ok=false, error="ollama-unreachable"
 *  - JSON parse fails → ONE repair-retry, then ok=false, error="json-parse-failed"
 *  - All schema-invalid → ok=false, error="schema-violation"
 *  - Some valid + some invalid → ok=true, dropped invalid silently (logged via raw_response_length)
 *  - Hard timeout → ok=false, error="timeout"
 *
 * Test seam: constructor accepts an injectable `OllamaClientEngine` so the
 * test suite can supply a deterministic stub without booting the Ollama daemon.
 *
 * @module engines/IdeaBlockExtractorEngine
 * @milestone OBSIDIAN-INTELLIGENCE-MS3
 */

import { createHash } from "node:crypto";
import { OllamaClientEngine, ollamaClientEngine } from "./OllamaClientEngine.js";
import {
  IdeaBlockSchema,
  IdeaBlockExtractInputSchema,
  type IdeaBlock,
  type IdeaBlockExtractInput,
  type IdeaBlockExtractResult,
  type IdeaBlockExtractErrorClass,
} from "../schemas/ideaBlockSchema.js";

/** Default Ollama tag — qwen2.5-coder:32b is the documented local-LLM workhorse. */
const DEFAULT_MODEL = "qwen2.5-coder:32b";
/** Soft cap on returned blocks when the caller doesn't override `max_blocks`. */
const DEFAULT_MAX_BLOCKS = 50;
/** Low temperature — extraction is mechanical, not creative. */
const DEFAULT_TEMPERATURE = 0.1;
/** Maximum repair attempts after a failed JSON parse (1 = no repair, 2 = one repair). */
const MAX_PARSE_ATTEMPTS = 2;
/** Truncate the bad LLM response in the repair prompt — repair-context is not a stack trace. */
const REPAIR_PROMPT_BAD_RESPONSE_MAX = 2000;
/** Hex chars of sha256 used for the IdeaBlock id (matches schema constraint). */
const ID_HASH_PREFIX_LEN = 24;
/**
 * Unit-Separator (U+001F) is used between question + answer when hashing the id.
 * Prevents a hostile/buggy boundary like (question="A\nB", answer="") colliding
 * with (question="A", answer="B"). Schema also rejects U+001F in either field
 * via the control-char regex, so a successful hash precondition is "neither
 * field contains \x1f" — round-trip stable.
 */
const ID_HASH_SEP = "";
/**
 * Soft heuristic for catching model refusals ("I can't help with that...").
 * Anything matching AND shorter than this length without a `{` is treated as a
 * refusal. Detector exists so the `model-refused` enum value is reachable.
 */
const REFUSAL_PATTERN = /\b(i can(?:not|'t)|i'?m unable|i am unable|i refuse|sorry,? i can|as an ai)/i;
const REFUSAL_MAX_LEN = 800;

/**
 * Hard timeout (ms) for a single Ollama call. The engine doesn't kill the
 * client — it relies on the client's internal timeout — but the wall-clock
 * gets recorded so callers can spot model regressions.
 */
const HARD_TIMEOUT_MS = 60_000;

/**
 * Raw shape Ollama returns. The wire format is intentionally lax — we
 * normalize + Zod-validate before promoting to a real `IdeaBlock`.
 */
interface RawExtractedClaim {
  question?: unknown;
  answer?: unknown;
  source_offset?: unknown;
  governance_tags?: unknown;
}

interface RawExtractionResponse {
  blocks?: unknown;
}

export class IdeaBlockExtractorEngine {
  private readonly client: OllamaClientEngine;

  /**
   * @param client Injectable Ollama client. Defaults to the module singleton
   *               so production callers don't have to wire it; tests supply a
   *               stub implementing the same interface.
   */
  constructor(client: OllamaClientEngine = ollamaClientEngine) {
    this.client = client;
  }

  /**
   * Extract atomic IdeaBlocks from a markdown string.
   *
   * @param input - Validated against `IdeaBlockExtractInputSchema`.
   * @returns Result envelope. Inspect `.ok` + `.error` before consuming `.blocks`.
   */
  async extractFromMarkdown(input: IdeaBlockExtractInput): Promise<IdeaBlockExtractResult> {
    const started = Date.now();
    const parsed = IdeaBlockExtractInputSchema.safeParse(input);
    if (!parsed.success) {
      // Surface validation failure as a structured result rather than throwing
      // — callers can inspect .error and decide whether to fix and retry.
      return this.fail("schema-violation", 0, 0, started);
    }
    const opts = parsed.data;
    const model = opts.model_override ?? DEFAULT_MODEL;
    const maxBlocks = opts.max_blocks ?? DEFAULT_MAX_BLOCKS;

    // Quick path — empty markdown after trim has no extractable claims.
    if (opts.markdown.trim().length === 0) {
      return this.fail("empty-input", 0, 0, started);
    }

    if (!this.client.isConnected()) {
      const conn = await this.client.connect();
      if (!conn.ok) {
        return this.fail("ollama-unreachable", 0, 0, started);
      }
    }

    const systemPrompt = this.buildSystemPrompt(maxBlocks);
    const userPrompt = this.buildUserPrompt(opts.markdown);

    // First attempt
    let attempts = 0;
    let rawResponse: string;
    try {
      attempts = 1;
      const r = await this.callWithTimeout(model, systemPrompt, userPrompt);
      if (!r.ok) {
        // OllamaClientEngine failure (network, model not found, etc.)
        const errClass: IdeaBlockExtractErrorClass = /timeout/i.test(r.error ?? "")
          ? "timeout"
          : "ollama-unreachable";
        return this.fail(errClass, 0, attempts, started);
      }
      rawResponse = r.value;
    } catch {
      return this.fail("ollama-unreachable", 0, attempts, started);
    }

    // Refusal detector — short response matching refusal pattern with no JSON
    // body. Makes the `model-refused` enum value reachable rather than dead.
    if (this.looksLikeRefusal(rawResponse)) {
      return this.fail("model-refused", rawResponse.length, attempts, started);
    }

    // Parse — try once, then repair-retry up to MAX_PARSE_ATTEMPTS.
    let parsedResp = this.tryParseJson(rawResponse);
    if (parsedResp === null && attempts < MAX_PARSE_ATTEMPTS) {
      const repairUser = this.buildRepairPrompt(opts.markdown, rawResponse);
      try {
        attempts = MAX_PARSE_ATTEMPTS;
        const r2 = await this.callWithTimeout(model, systemPrompt, repairUser);
        if (r2.ok) {
          // Track the repair-attempt's response length so telemetry reflects
          // the LATEST attempt, not the first.
          rawResponse = r2.value;
          parsedResp = this.tryParseJson(rawResponse);
        }
      } catch {
        return this.fail("json-parse-failed", rawResponse.length, attempts, started);
      }
    }
    if (parsedResp === null) {
      return this.fail("json-parse-failed", rawResponse.length, attempts, started);
    }

    // Extract raw claims + promote to validated blocks.
    const raw = Array.isArray(parsedResp.blocks) ? parsedResp.blocks : [];
    if (raw.length === 0) {
      // Valid JSON but no claims — model returned an empty list. ok=true with empty blocks.
      return {
        ok: true,
        blocks: [],
        error: null,
        raw_response_length: rawResponse.length,
        parse_attempts: attempts,
        wall_ms: Date.now() - started,
      };
    }

    const validated: IdeaBlock[] = [];
    let droppedCount = 0;
    for (const r of raw) {
      const block = this.promoteRaw(r as RawExtractedClaim, opts.source_path, model);
      if (block === null) {
        droppedCount++;
        continue;
      }
      validated.push(block);
      if (validated.length >= maxBlocks) break;
    }

    // If everything was schema-invalid, surface as failure so callers don't get
    // a silent "0 blocks" success that looks identical to "no claims found".
    if (validated.length === 0 && droppedCount > 0) {
      return this.fail("schema-violation", rawResponse.length, attempts, started);
    }

    return {
      ok: true,
      blocks: validated,
      error: null,
      raw_response_length: rawResponse.length,
      parse_attempts: attempts,
      wall_ms: Date.now() - started,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────────

  private buildSystemPrompt(maxBlocks: number): string {
    return [
      "You extract atomic claims from markdown notes into JSON IdeaBlocks.",
      "RULES:",
      "1. One atomic claim per block. Split compound claims (joined by 'and', 'but', etc.).",
      "2. Phrase each claim as a question; answer in 2-3 sentences from the source.",
      "3. Stay close to the source — DO NOT synthesize from outside knowledge.",
      "4. Tag each block with 1-4 governance tags from: fact, interpretation, opinion, decision, regression, shop_floor, deprecated, unknown.",
      "5. Provide `source_offset` = approximate 0-based line where the claim's evidence begins.",
      `6. Return AT MOST ${maxBlocks} blocks. Quality over quantity.`,
      "OUTPUT FORMAT — emit a single JSON object only, no prose:",
      `{"blocks":[{"question":"...","answer":"...","source_offset":N,"governance_tags":["fact"]}, ...]}`,
    ].join("\n");
  }

  private buildUserPrompt(markdown: string): string {
    return [
      "Extract atomic IdeaBlocks from the following markdown. Respond with JSON only.",
      "---BEGIN MARKDOWN---",
      markdown,
      "---END MARKDOWN---",
    ].join("\n");
  }

  private buildRepairPrompt(markdown: string, badResponse: string): string {
    return [
      "Your previous response was not valid JSON. Try again. Respond with JSON only — no prose, no markdown fences, no commentary.",
      "Expected shape: {\"blocks\":[{\"question\":\"...\",\"answer\":\"...\",\"source_offset\":N,\"governance_tags\":[\"fact\"]}]}",
      "---BEGIN MARKDOWN---",
      markdown,
      "---END MARKDOWN---",
      "---YOUR PREVIOUS (INVALID) RESPONSE---",
      badResponse.slice(0, REPAIR_PROMPT_BAD_RESPONSE_MAX),
    ].join("\n");
  }

  private async callWithTimeout(
    model: string,
    system: string,
    user: string,
  ): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
    const racing = this.client.generate({
      model,
      prompt: user,
      system,
      temperature: DEFAULT_TEMPERATURE,
    });
    // KNOWN GAP — Arm A P1 review note: when the timeout branch wins, the
    // `racing` HTTP request keeps running in OllamaClientEngine (no
    // AbortController is plumbed yet). The socket eventually completes when
    // the Ollama daemon answers. Adding cancellation requires extending
    // OllamaClientEngine.generate() to accept an AbortSignal — out of scope
    // for E1; tracked as a follow-up against OllamaClientEngine. Attaching a
    // `.catch(() => {})` here prevents the post-timeout rejection from
    // surfacing as an unhandled-rejection warning.
    racing.catch(() => { /* see comment above */ });
    const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
      const t = setTimeout(() => resolve({ ok: false, error: `timeout after ${HARD_TIMEOUT_MS}ms` }), HARD_TIMEOUT_MS);
      // Unref so the timer doesn't keep node alive.
      if (typeof t.unref === "function") t.unref();
    });
    const r = await Promise.race([racing, timeout]);
    if ("value" in r) {
      // Came from OllamaClientEngine.generate(); shape is OllamaResult<string>.
      if (r.ok && typeof r.value === "string") return { ok: true, value: r.value };
      return { ok: false, error: r.error ?? "ollama returned no value" };
    }
    return r as { ok: false; error: string };
  }

  /**
   * Heuristic refusal detector — returns true when the response looks like a
   * canned LLM refusal ("I can't help with that..."). Makes the `model-refused`
   * failure class reachable rather than swept under `json-parse-failed`.
   * Conservative: requires NO `{` in the response (refusals are bare prose)
   * AND length under REFUSAL_MAX_LEN AND pattern match.
   */
  private looksLikeRefusal(raw: string): boolean {
    if (typeof raw !== "string") return false;
    if (raw.length === 0 || raw.length > REFUSAL_MAX_LEN) return false;
    if (raw.includes("{")) return false; // any JSON body → not a refusal
    return REFUSAL_PATTERN.test(raw);
  }

  /**
   * Parse JSON from the LLM response, tolerating common artifacts:
   *   - Leading/trailing whitespace
   *   - Markdown code fences (```json ... ``` or ``` ... ```)
   *   - Leading prose before the first `{`
   *
   * **Hostile-payload safety** (Arm B P0 fix): we do NOT greedy-slice between
   * `indexOf("{")` and `lastIndexOf("}")` — a model emitting
   * `{"blocks":[]}garbage{"blocks":[real]}` would otherwise silently drop the
   * real blocks. Instead we depth-scan from the first `{`, respecting strings
   * and escapes, and stop at the matching closing brace. If parse fails on
   * that span, we try the NEXT `{` rightward until we find a parseable JSON
   * object containing a `blocks` array (the contractual marker), or exhaust.
   *
   * Returns the parsed object (must be a non-null record) or null on failure.
   */
  private tryParseJson(raw: string): RawExtractionResponse | null {
    if (typeof raw !== "string" || raw.length === 0) return null;
    let s = raw.trim();
    // Strip ```json ... ``` fences (with or without language tag, with or
    // without trailing newline). Generous regex — fences are LLM-emitted noise.
    const fence = s.match(/^```(?:[A-Za-z0-9_-]+)?\s*\n?([\s\S]*?)\n?\s*```\s*$/);
    if (fence) s = fence[1].trim();

    // Walk left-to-right, depth-aware. Each top-level `{...}` span is parse-
    // attempted; the first one that yields a valid object with a `blocks`
    // array wins. Falls back to the first parseable object if none has the
    // marker (lets pure-prose responses still surface useful errors elsewhere).
    let firstValid: RawExtractionResponse | null = null;
    for (let i = 0; i < s.length; i++) {
      if (s.charAt(i) !== "{") continue;
      const end = this.findMatchingBrace(s, i);
      if (end === -1) break; // unbalanced — no point continuing
      const candidate = s.slice(i, end + 1);
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (typeof parsed === "object" && parsed !== null) {
          const obj = parsed as RawExtractionResponse;
          if (Array.isArray(obj.blocks)) return obj;
          if (firstValid === null) firstValid = obj;
        }
      } catch {
        // try the next `{`
      }
      // Skip past the consumed span — we've already searched inside it.
      i = end;
    }
    return firstValid;
  }

  /**
   * Returns the index of the `}` matching `s[openIdx]` (which must be `{`),
   * respecting strings + escape sequences. Returns -1 if unbalanced.
   */
  private findMatchingBrace(s: string, openIdx: number): number {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = openIdx; i < s.length; i++) {
      const c = s.charAt(i);
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === "\\") {
          escape = true;
        } else if (c === '"') {
          inString = false;
        }
        continue;
      }
      if (c === '"') {
        inString = true;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) return i;
        if (depth < 0) return -1;
      }
    }
    return -1;
  }

  /**
   * Promote a raw LLM-emitted claim to a validated IdeaBlock.
   *
   * Steps:
   *  1. Shape-check (question + answer are non-empty strings).
   *  2. NFC-normalize question + answer (so homoglyph variants collapse).
   *  3. Compute content-addressed id.
   *  4. Build the full block + Zod-validate.
   *  5. Return null on any failure — caller drops it from results.
   */
  private promoteRaw(raw: RawExtractedClaim, sourcePath: string, model: string): IdeaBlock | null {
    if (typeof raw.question !== "string" || typeof raw.answer !== "string") return null;
    const question = raw.question.normalize("NFC").trim();
    const answer = raw.answer.normalize("NFC").trim();
    if (question.length === 0 || answer.length === 0) return null;

    const offset = typeof raw.source_offset === "number" && Number.isInteger(raw.source_offset) && raw.source_offset >= 0
      ? raw.source_offset
      : 0;
    // Filter to non-empty strings; if the filter empties the array, fall back
    // to ["unknown"] so the IdeaBlockSchema's `governance_tags.min(1)` doesn't
    // silently drop the block (Arm B P1 fix).
    let tags: string[] = ["unknown"];
    if (Array.isArray(raw.governance_tags)) {
      const filtered = raw.governance_tags.filter(
        (t): t is string => typeof t === "string" && t.length > 0,
      );
      if (filtered.length > 0) tags = filtered;
    }

    // Hash uses Unit-Separator (U+001F) between fields so (question="A\nB",
    // answer="") cannot collide with (question="A", answer="B"). Schema rejects
    // U+001F in either field via the control-char regex.
    const id = createHash("sha256")
      .update(question + ID_HASH_SEP + answer, "utf8")
      .digest("hex")
      .slice(0, ID_HASH_PREFIX_LEN);

    const candidate = {
      id,
      question,
      answer,
      source_path: sourcePath,
      source_offset: offset,
      governance_tags: tags,
      schema_version: 1 as const,
      extracted_at: new Date().toISOString(),
      model,
    };

    const validated = IdeaBlockSchema.safeParse(candidate);
    if (!validated.success) return null;
    return validated.data;
  }

  /**
   * Build a typed failure envelope. The closed-enum `error` field is the
   * caller-facing contract; for human-readable detail (debugging the model
   * choking, etc.) consult the wall-clock + raw_response_length telemetry or
   * the OllamaClientEngine's own error logs. We deliberately do NOT add a
   * free-form `error_message` field — Arm B's review on the schema rejected
   * that attack surface.
   */
  private fail(
    errClass: IdeaBlockExtractErrorClass,
    rawLen: number,
    attempts: number,
    started: number,
  ): IdeaBlockExtractResult {
    return {
      ok: false,
      blocks: [],
      error: errClass,
      raw_response_length: rawLen,
      parse_attempts: attempts,
      wall_ms: Date.now() - started,
    };
  }
}

/**
 * Module-level singleton — production callers import `ideaBlockExtractorEngine`
 * and call `.extractFromMarkdown()`. Tests construct their own instance with a
 * stub client.
 */
export const ideaBlockExtractorEngine = new IdeaBlockExtractorEngine();
