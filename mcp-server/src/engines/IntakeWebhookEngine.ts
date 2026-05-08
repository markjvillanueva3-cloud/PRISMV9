/**
 * IntakeWebhookEngine
 * ===================
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
 *
 * Validates external webhook ingests from personal-knowledge sources
 * (Readwise, Telegram bot, RSS, manual paste) and lands them in
 * `knowledge/memories/inbox/<source>-<ts>-<sig8>.md` with frontmatter.
 *
 * Pure-logic boundary: takes raw body bytes + signature + source string,
 * returns {ok, status, file?, error?}. Knows nothing about Express, so
 * tests run without spinning up a server.
 *
 * Security guarantees enforced before any disk write:
 *   1. Payload size ≤ 256 KB                              → 413
 *   2. Source ∈ {readwise, telegram, rss, manual}         → 400 otherwise
 *   3. Signature header present                           → 401 otherwise
 *   4. HMAC-SHA256 over raw body, timing-safe compare     → 401 otherwise
 *   5. JSON parses to a non-null object with content      → 400 otherwise
 *   6. Optional payload.timestamp within ±5 min skew      → 401 otherwise
 *   7. ≤ 60 requests per source per 60s sliding window    → 429 otherwise
 *
 * Source enum is checked BEFORE the filename is built — no path
 * traversal via crafted source strings.
 *
 * Filename includes the first 8 hex chars of the HMAC so two distinct
 * payloads in the same millisecond do not collide.
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const INTAKE_SOURCES = ["readwise", "telegram", "rss", "manual"] as const;
export type IntakeSource = typeof INTAKE_SOURCES[number];

export const PAYLOAD_CAP_BYTES = 256 * 1024;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX = 60;
export const TS_SKEW_MAX_MS = 5 * 60 * 1000;
export const DEFAULT_INBOX_ROOT = "H:/prism/knowledge/memories/inbox";

export interface IngestParams {
  /** Raw body bytes — HMAC is computed over EXACTLY these bytes, never re-stringified JSON. */
  rawBody: Buffer;
  /** Hex signature (with optional `sha256=` prefix) from X-Intake-Signature header. */
  signature?: string;
  /** Source ID — must be one of INTAKE_SOURCES. */
  source: string;
}

export interface IngestOptions {
  /** Override env INTAKE_WEBHOOK_SECRET (for tests + secret rotation). */
  secret?: string;
  /** Override Date.now() for deterministic timestamps in tests. */
  now?: number;
  /** Override the on-disk inbox root (test isolation). */
  inboxRoot?: string;
}

export interface IngestResult {
  ok: boolean;
  status: 200 | 400 | 401 | 413 | 429 | 500;
  file?: string;
  error?: string;
  source?: IntakeSource;
}

function decodeHex(s: string): Buffer | null {
  if (!/^[0-9a-fA-F]+$/.test(s) || s.length % 2 !== 0) return null;
  try { return Buffer.from(s, "hex"); } catch { return null; }
}

function timingSafeEqualHex(expectedHex: string, providedHex: string): boolean {
  const a = decodeHex(expectedHex);
  const b = decodeHex(providedHex);
  if (!a || !b || a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

/** Render frontmatter values safely — strings are JSON-encoded; primitives cast. */
function renderFrontmatterValue(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null) return "null";
  return JSON.stringify(v);
}

export class IntakeWebhookEngine {
  readonly name = "IntakeWebhookEngine";

  /** Per-source sliding-window timestamp buckets. */
  private rateBuckets = new Map<IntakeSource, number[]>();

  /**
   * Ingest one webhook request.
   *
   * @param params  raw body, signature, source string
   * @param opts    secret/now/inboxRoot overrides (test injection)
   * @returns       {ok, status, file?, error?, source?}
   */
  ingest(params: IngestParams, opts: IngestOptions = {}): IngestResult {
    // 1. Payload size cap — checked on raw bytes, BEFORE any parsing.
    if (params.rawBody.length > PAYLOAD_CAP_BYTES) {
      return { ok: false, status: 413, error: `payload exceeds ${PAYLOAD_CAP_BYTES} bytes` };
    }

    // 2. Source enum — must be validated BEFORE any path concatenation.
    if (!INTAKE_SOURCES.includes(params.source as IntakeSource)) {
      return { ok: false, status: 400, error: `unknown source '${params.source}'` };
    }
    const source = params.source as IntakeSource;

    // 3. Signature header present.
    if (!params.signature || typeof params.signature !== "string") {
      return { ok: false, status: 401, error: "missing X-Intake-Signature header" };
    }

    // 4. HMAC-SHA256 over raw body, timing-safe compare.
    const secret = opts.secret ?? process.env.INTAKE_WEBHOOK_SECRET;
    if (!secret) {
      return { ok: false, status: 500, error: "INTAKE_WEBHOOK_SECRET not configured" };
    }
    const expected = createHmac("sha256", secret).update(params.rawBody).digest("hex");
    const provided = params.signature.replace(/^sha256=/i, "").trim();
    if (!timingSafeEqualHex(expected, provided)) {
      return { ok: false, status: 401, error: "invalid signature" };
    }

    // 5. Body must parse to a JSON object with non-empty content.
    let payload: { content?: unknown; timestamp?: unknown; metadata?: unknown };
    try {
      payload = JSON.parse(params.rawBody.toString("utf8"));
    } catch {
      return { ok: false, status: 400, error: "malformed JSON body" };
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, status: 400, error: "body must be a JSON object" };
    }
    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content) {
      return { ok: false, status: 400, error: "'content' field required and non-empty" };
    }

    const now = opts.now ?? Date.now();

    // 6. Optional anti-replay: payload.timestamp must be within ±5 min skew.
    if (typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)) {
      if (Math.abs(now - payload.timestamp) > TS_SKEW_MAX_MS) {
        return { ok: false, status: 401, error: "timestamp skew exceeds 5 minutes" };
      }
    }

    // 7. Sliding-window rate limit, isolated per source.
    const bucket = this.rateBuckets.get(source) ?? [];
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const fresh = bucket.filter((t) => t > cutoff);
    if (fresh.length >= RATE_LIMIT_MAX) {
      this.rateBuckets.set(source, fresh);
      return { ok: false, status: 429, error: `rate limit ${RATE_LIMIT_MAX}/min exceeded for ${source}` };
    }
    fresh.push(now);
    this.rateBuckets.set(source, fresh);

    // 8. Write to inbox. Filename is deterministic per (now, payload) pair —
    //    the HMAC prefix discriminates two requests landing in the same ms.
    const inboxRoot = resolve(opts.inboxRoot ?? DEFAULT_INBOX_ROOT);
    const tsLabel = new Date(now).toISOString().replace(/[:.]/g, "-");
    const sigPrefix = expected.slice(0, 8);
    const filename = `${source}-${tsLabel}-${sigPrefix}.md`;
    const fullPath = join(inboxRoot, filename);
    const ingestedAt = new Date(now).toISOString();

    const fmLines = [
      "---",
      `source: ${source}`,
      `ingested_at: ${ingestedAt}`,
      "signature_verified: true",
    ];
    if (payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)) {
      for (const [k, v] of Object.entries(payload.metadata as Record<string, unknown>)) {
        // Only include keys that look like safe yaml identifiers.
        if (!/^[a-z][a-z0-9_]*$/i.test(k)) continue;
        fmLines.push(`${k}: ${renderFrontmatterValue(v)}`);
      }
    }
    fmLines.push("---", "", content, "");

    mkdirSync(inboxRoot, { recursive: true });
    writeFileSync(fullPath, fmLines.join("\n"), "utf8");

    return { ok: true, status: 200, file: fullPath, source };
  }

  /** Test helper: clear all rate-limit buckets. Not exposed via dispatcher. */
  resetRateLimits(): void {
    this.rateBuckets.clear();
  }

  /** Test helper: snapshot rate-limit bucket sizes. Not exposed via dispatcher. */
  rateLimitState(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.rateBuckets) out[k] = v.length;
    return out;
  }
}

export const intakeWebhookEngine = new IntakeWebhookEngine();
