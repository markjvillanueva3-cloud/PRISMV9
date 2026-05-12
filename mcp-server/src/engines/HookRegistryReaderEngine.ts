/**
 * HookRegistryReaderEngine — HOOK-SYNERGY-MS0 / U-HOOK-REGISTRY (H2)
 *
 * Pure read-only consumer of `state/shared/HOOK_REGISTRY.json` (produced by
 * `scripts/build-hook-registry.mjs`). The registry is ~228 KB / 455 hooks, so
 * every method on this engine returns a *projection* — never the full blob —
 * and an mtime-keyed cache avoids re-parsing on every dispatcher call.
 *
 * Surfaces:
 *   getCounts()                        — small summary (file count + byEvent/byType/byLayer)
 *   getCompactMap(maxPerEvent?)        — { event → top-N hook ids } (mirrors DispatcherMapEngine.getCompactMap)
 *   findHook(idOrSubstring)            — single hook by exact id, then case-insensitive substring
 *   searchHooks(query, max?)           — scored matches across id/description/event
 *   byEvent(event)                     — every hook registered to a specific event
 *   byTier(tier)                       — every hook tagged with a tier (mostly null until U-HOOK-TIERS / H3)
 *   wired()                            — every hook referenced by ≥1 settings layer
 *   orphaned()                         — every hook *not* referenced by any settings layer
 *   isStale()                          — registry mtime older than the newest .mjs in .claude/hooks/ → true
 *   getMeta()                          — schemaVersion + generatedAt + counts (cheap)
 *
 * Failure semantics:
 *   - Registry missing  → methods return null (counts/find), [] (search/byEvent/etc), true (isStale).
 *   - Registry malformed→ same as missing; one warn-log per process per error.
 *   - No throws. Callers (dispatchers) decide whether to surface the error envelope.
 *
 * Sizing rules (so big projections don't blow the dispatcher response budget):
 *   - findHook returns the full row for one hook (cap ~2 KB).
 *   - searchHooks caps at max (default 25, ceiling 100).
 *   - getCompactMap returns ≤ maxPerEvent * #events entries (default 5).
 *   - byEvent / byTier / wired / orphaned return *summaries* (id + file + tier + wired), not full rows.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REGISTRY_PATH = "H:/prism/state/shared/HOOK_REGISTRY.json";
const HOOKS_SRC_DIR = "H:/prism/.claude/hooks";

// Sizing caps — defended in tests; tuned for dispatcher response budget.
const DEFAULT_COMPACT_MAX_PER_EVENT = 5;
const ABSOLUTE_COMPACT_MAX_PER_EVENT = 50;
const DEFAULT_SEARCH_MAX = 25;
const ABSOLUTE_SEARCH_MAX = 100;
const MAX_QUERY_LEN = 200;        // adversarial-input guard for searchHooks
const DESCRIPTION_SUMMARY_LEN = 160;

// Scoring weights for searchHooks (deterministic, documented for tests).
const SCORE_ID_EXACT = 20;
const SCORE_ID_PREFIX = 10;
const SCORE_ID_SUBSTRING = 5;
const SCORE_DESCRIPTION = 2;
const SCORE_EVENT_NAME = 1;

// Lightweight warn helper — routes through a single sink so tests can override
// it and so the call sites read uniformly (no scattered console.warn calls).
function logWarn(msg: string): void {
  // console is a TS-known global; no cast or eslint-disable needed.
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(msg);
  }
}

function errCode(e: unknown): string | undefined {
  if (e && typeof e === "object" && "code" in e) {
    const c = (e as { code?: unknown }).code;
    return typeof c === "string" ? c : undefined;
  }
  return undefined;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}

/**
 * Structural type guard for the registry shape. We only validate the fields
 * this engine actually reads (counts, hooks[]) — extra/unknown fields pass
 * through so future generator versions don't break consumers.
 */
function isHookRegistryShape(v: unknown): v is HookRegistryShape {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.hooks)) return false;
  if (!o.counts || typeof o.counts !== "object") return false;
  if (typeof o.schemaVersion !== "string") return false;
  if (typeof o.generatedAt !== "string") return false;
  return true;
}

export interface HookEventRecord {
  event: string;            // "PreToolUse" | "PostToolUse" | "Stop" | "SessionStart" | ...
  matcher: string | null;   // e.g. "Edit|Write|MultiEdit", "^Bash$", or null
  timeout: number | null;
  type: string;             // "command"
  layer: string;            // "user" | "project" | "local"
}

export interface HookRecord {
  id: string;
  file: string;
  wired: boolean;
  disabled: boolean;
  events: HookEventRecord[];
  description: string;
  descriptionInferred: boolean;
  tier: string | null;
  sizeBytes: number;
  lines: number;
}

export interface HookRegistryShape {
  schemaVersion: string;
  generatedAt: string;
  generatedBy: string;
  repoRoot: string;
  hooksDir: string;
  settingsLayers: Array<{ layer: string; file: string; present: boolean }>;
  counts: {
    hookFiles: number;
    wired: number;
    orphaned: number;
    disabled: number;
    skipped: number;
    byEvent: Record<string, number>;
    byType: Record<string, number>;
    byLayer: Record<string, number>;
  };
  hooks: HookRecord[];
  skipped?: Array<{ file: string; reason: string }>;
}

export interface HookSummary {
  id: string;
  file: string;
  wired: boolean;
  tier: string | null;
  events: string[];          // unique event names (deduped)
  description: string;
}

export interface SearchHit extends HookSummary {
  score: number;
  matchedIn: string[];       // which fields contributed ("id" | "description" | "event:<name>")
}

export interface CountsProjection {
  hookFiles: number;
  wired: number;
  orphaned: number;
  disabled: number;
  byEvent: Record<string, number>;
  byLayer: Record<string, number>;
  byType: Record<string, number>;
  generatedAt: string;
  schemaVersion: string;
}

export interface HookRegistryReaderOptions {
  /** Override the registry JSON path (defaults to state/shared/HOOK_REGISTRY.json). For tests + alternate trees. */
  registryPath?: string;
  /** Override the hook-source directory used by isStale() (defaults to .claude/hooks). */
  hooksSrcDir?: string;
}

export class HookRegistryReaderEngine {
  private readonly registryPath: string;
  private readonly hooksSrcDir: string;
  private cache: HookRegistryShape | null = null;
  private cacheMtimeMs = 0;
  private warned = new Set<string>();

  constructor(options: HookRegistryReaderOptions = {}) {
    this.registryPath = options.registryPath ?? REGISTRY_PATH;
    this.hooksSrcDir = options.hooksSrcDir ?? HOOKS_SRC_DIR;
  }

  /** Force-clear the cache; tests + the regen hook bump this. */
  clearCache(): void {
    this.cache = null;
    this.cacheMtimeMs = 0;
    this.warned.clear();
  }

  /** Load + cache the registry. Returns null on missing/corrupt — caller surfaces the error. */
  private load(): HookRegistryShape | null {
    let st: fs.Stats;
    try {
      st = fs.statSync(this.registryPath);
    } catch (e) {
      const code = errCode(e) ?? "ENOENT";
      this.warnOnce("missing:" + code, `[HookRegistryReader] registry missing at ${this.registryPath} (${code})`);
      return null;
    }
    if (this.cache && this.cacheMtimeMs === st.mtimeMs) return this.cache;
    let raw: string;
    try {
      raw = fs.readFileSync(this.registryPath, "utf8");
    } catch (e) {
      this.warnOnce("read:" + (errCode(e) ?? "EIO"), `[HookRegistryReader] read failed: ${errMessage(e)}`);
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this.warnOnce("parse", `[HookRegistryReader] malformed JSON at ${this.registryPath}: ${errMessage(e)}`);
      return null;
    }
    if (!isHookRegistryShape(parsed)) {
      this.warnOnce("shape", `[HookRegistryReader] registry shape invalid (no hooks[] array)`);
      return null;
    }
    this.cache = parsed;
    this.cacheMtimeMs = st.mtimeMs;
    return this.cache;
  }

  private warnOnce(key: string, msg: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    logWarn(msg);
  }

  /** Cheap header — counts + provenance, no per-hook rows. */
  getMeta(): { schemaVersion: string; generatedAt: string; counts: HookRegistryShape["counts"] } | null {
    const r = this.load();
    if (!r) return null;
    return { schemaVersion: r.schemaVersion, generatedAt: r.generatedAt, counts: r.counts };
  }

  /** Just the counts block (alias for getMeta-without-provenance, but flat). */
  getCounts(): CountsProjection | null {
    const r = this.load();
    if (!r) return null;
    return {
      hookFiles: r.counts.hookFiles,
      wired: r.counts.wired,
      orphaned: r.counts.orphaned,
      disabled: r.counts.disabled,
      byEvent: r.counts.byEvent,
      byLayer: r.counts.byLayer,
      byType: r.counts.byType,
      generatedAt: r.generatedAt,
      schemaVersion: r.schemaVersion,
    };
  }

  /** event → first N hook ids (wired only, alphabetical). Default cap = DEFAULT_COMPACT_MAX_PER_EVENT. */
  getCompactMap(maxPerEvent: number = DEFAULT_COMPACT_MAX_PER_EVENT): Record<string, string[]> {
    const r = this.load();
    if (!r) return {};
    const cap = Math.max(
      1,
      Math.min(ABSOLUTE_COMPACT_MAX_PER_EVENT, Math.floor(maxPerEvent) || DEFAULT_COMPACT_MAX_PER_EVENT),
    );
    const out: Record<string, string[]> = {};
    for (const h of r.hooks) {
      if (!h.wired) continue;
      for (const ev of h.events) {
        if (!out[ev.event]) out[ev.event] = [];
        if (!out[ev.event].includes(h.id)) out[ev.event].push(h.id);
      }
    }
    for (const k of Object.keys(out)) {
      out[k].sort();
      if (out[k].length > cap) out[k] = out[k].slice(0, cap);
    }
    return out;
  }

  /** Exact-id then case-insensitive substring. Returns one full HookRecord or null. */
  findHook(idOrSubstring: string): HookRecord | null {
    const r = this.load();
    if (!r) return null;
    const q = String(idOrSubstring || "").trim();
    if (!q) return null;
    const exact = r.hooks.find((h) => h.id === q);
    if (exact) return exact;
    const lower = q.toLowerCase();
    const sub = r.hooks.find((h) => h.id.toLowerCase().includes(lower));
    return sub || null;
  }

  /**
   * Scored search across id / description / event names.
   * Scoring (deterministic): id-prefix=10, id-substring=5, description-substring=2, event-name-substring=1.
   * Returns top `max` hits as summaries (small), sorted by score desc then id asc.
   */
  searchHooks(query: string, max: number = DEFAULT_SEARCH_MAX): SearchHit[] {
    const r = this.load();
    if (!r) return [];
    const q = String(query || "").trim();
    if (!q || q.length > MAX_QUERY_LEN) return [];
    const cap = Math.max(1, Math.min(ABSOLUTE_SEARCH_MAX, Math.floor(max) || DEFAULT_SEARCH_MAX));
    const lower = q.toLowerCase();
    const hits: SearchHit[] = [];
    for (const h of r.hooks) {
      let score = 0;
      const matchedIn: string[] = [];
      const idLower = h.id.toLowerCase();
      if (idLower === lower) {
        score += SCORE_ID_EXACT;
        matchedIn.push("id-exact");
      } else if (idLower.startsWith(lower)) {
        score += SCORE_ID_PREFIX;
        matchedIn.push("id-prefix");
      } else if (idLower.includes(lower)) {
        score += SCORE_ID_SUBSTRING;
        matchedIn.push("id-substring");
      }
      if (h.description && h.description.toLowerCase().includes(lower)) {
        score += SCORE_DESCRIPTION;
        matchedIn.push("description");
      }
      const evs = new Set<string>();
      for (const ev of h.events) {
        if (ev.event.toLowerCase().includes(lower)) {
          if (!evs.has(ev.event)) {
            score += SCORE_EVENT_NAME;
            matchedIn.push("event:" + ev.event);
            evs.add(ev.event);
          }
        }
      }
      if (score > 0) {
        hits.push({
          id: h.id,
          file: h.file,
          wired: h.wired,
          tier: h.tier,
          events: Array.from(new Set(h.events.map((e) => e.event))),
          description: h.description,
          score,
          matchedIn,
        });
      }
    }
    hits.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
    return hits.slice(0, cap);
  }

  /** Every hook registered to a specific event (e.g. "PreToolUse"). Returns summaries. */
  byEvent(event: string): HookSummary[] {
    const r = this.load();
    if (!r) return [];
    const ev = String(event || "").trim();
    if (!ev) return [];
    const out: HookSummary[] = [];
    for (const h of r.hooks) {
      if (h.events.some((e) => e.event === ev)) out.push(toSummary(h));
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  /** Every hook tagged with a tier (T0/T1/T2/…). Mostly empty until H3 backfills. */
  byTier(tier: string): HookSummary[] {
    const r = this.load();
    if (!r) return [];
    const t = String(tier || "").trim().toUpperCase();
    if (!t) return [];
    return r.hooks.filter((h) => (h.tier || "").toUpperCase() === t).map(toSummary).sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Wired hooks (referenced by ≥1 settings layer). */
  wired(): HookSummary[] {
    const r = this.load();
    if (!r) return [];
    return r.hooks.filter((h) => h.wired).map(toSummary).sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Orphaned hooks (source file exists but no settings layer references it). */
  orphaned(): HookSummary[] {
    const r = this.load();
    if (!r) return [];
    return r.hooks.filter((h) => !h.wired).map(toSummary).sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * True if the registry is older than the newest .mjs in .claude/hooks/, OR if it doesn't exist.
   * Used by the regen hook to decide whether to rebuild.
   */
  isStale(): boolean {
    let regMtime = 0;
    try {
      regMtime = fs.statSync(this.registryPath).mtimeMs;
    } catch {
      return true; // no registry → stale
    }
    let newestSrc = 0;
    try {
      walkMjs(this.hooksSrcDir, (full) => {
        try {
          const st = fs.statSync(full);
          if (st.mtimeMs > newestSrc) newestSrc = st.mtimeMs;
        } catch { /* ignore single-file stat errors */ }
      });
    } catch {
      // hooks dir missing — treat as not-stale (nothing to rebuild from)
      return false;
    }
    return newestSrc > regMtime;
  }
}

function toSummary(h: HookRecord): HookSummary {
  return {
    id: h.id,
    file: h.file,
    wired: h.wired,
    tier: h.tier,
    events: Array.from(new Set(h.events.map((e) => e.event))),
    description: (h.description || "").slice(0, DESCRIPTION_SUMMARY_LEN),
  };
}

function walkMjs(dir: string, visit: (full: string) => void): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip bundles/ — they're aggregators, not standalone hooks tracked separately.
      // (Their content mtime won't drift the registry's hook list.)
      walkMjs(full, visit);
    } else if (e.isFile() && e.name.endsWith(".mjs")) {
      visit(full);
    }
  }
}

export const hookRegistryReaderEngine = new HookRegistryReaderEngine();
