/**
 * HookCreationGuardEngine — HOOK-SYNERGY-MS0 / U-HOOK-CREATION-GATE  (H5)
 *
 * Hook-domain mirror of {@link DuplicationGuardEngine}. Where the generic guard
 * blocks on (assetType, name) collisions across all asset families, this engine
 * adds the two dimensions only hooks have:
 *   1. **event** — Claude Code lifecycle event (PreToolUse, Stop, …);
 *   2. **matcher** — the tool-name matcher regex (`^Bash$`, `^(Edit|Write)$`, …).
 *
 * The (event, matcher) tuple is the **signature** of a hook. Two hooks with the
 * same signature compete on the same harness trigger, and "another `^Bash$`
 * PreToolUse hook?" is a real duplication-risk class the existing name-only
 * guards (`ai-duplication-guard`, `duplication-hard-block`) cannot see.
 *
 * Inputs come from a {@link HookManifest} produced by HookManifestEngine
 * (P0-U01) or the equivalent {@link HookCatalogEntry[]} read from
 * `state/shared/HOOK_REGISTRY.json` (the .mjs-friendly format the runtime hook
 * uses). Either source maps cleanly to {@link HookCatalogEntry}.
 *
 * Duplication check (manual — DuplicationGuardEngine's dynamic import chokes on
 * Windows `h:` paths from .mjs callers): closest existing assets are
 *   - `DuplicationGuardEngine` — generic name-similarity over all asset families;
 *     no event/matcher dimension. Complementary, not redundant.
 *   - `ai-duplication-guard.mjs` / `duplication-hard-block.mjs` — runtime hooks
 *     that BLOCK on exact-name collisions. They don't compute signature overlap.
 *   - `HookManifestEngine` (P0-U01) — produces the catalog. No guard logic.
 *   - `HookDAGValidatorEngine` (P0-U02) — runtime DAG checks. No creation check.
 * No existing `HookCreationGuard*` engine. Proceed.
 *
 * Scoring (composite, 0..1):
 *   - exact basename match           → score 1.0, recommendation "skip"
 *   - fuzzy name similarity ≥ 0.7    → similarity is the base score
 *     (Levenshtein-derived ratio on normalized basenames)
 *   - description token overlap      → +0.2 boost per match (cap at 1.0)
 *   - signature collision            → +0.3 boost per match (cap at 1.0)
 * Decision:
 *   - ≥ 1 exact match                → shouldProceed=false, "skip"
 *   - top score ≥ 0.85 OR signature  → shouldProceed=false, "extend"
 *   - top score 0.7..0.85            → shouldProceed=false, "rename"
 *   - no matches ≥ 0.7               → shouldProceed=true,  "proceed"
 *
 * Determinism: every iteration runs over sorted arrays. Same catalog + same
 * input → byte-identical result.
 *
 * @module engines/HookCreationGuardEngine
 */

import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import type { HookManifest } from "../schemas/hookManifestSchema.js";
import {
  HOOK_CREATION_GUARD_SCHEMA_VERSION,
  HookCreationCheckInputSchema,
  HookCreationCheckResultSchema,
  type HookCreationCheckInput,
  type HookCreationCheckResult,
  type HookCreationMatch,
  type HookCreationMatchReason,
  type HookCreationRecommendation,
} from "../schemas/hookCreationGuardSchema.js";

// ── Catalog adapter ────────────────────────────────────────────────────────

/** Minimal hook record the guard consumes — both `HookManifest.hooks[i]` and
 *  the `state/shared/HOOK_REGISTRY.json` entries reduce to this shape. */
export interface HookCatalogEntry {
  /** Basename without extension (`hook-cross-worktree-block`). */
  id: string;
  /** Repo-relative path (forward-slashed). */
  file: string;
  /** First JSDoc/comment line of the source. May be empty. */
  description: string;
  /** Events the hook is wired to. */
  events: string[];
  /** One representative matcher per wiring; the guard checks (event, matcher) pairs. */
  matchers: string[];
  /** Distinct (event, matcher) pairs the hook is wired to — the signature set. */
  signatures: Array<{ event: string; matcher: string }>;
}

// ── Tunables ───────────────────────────────────────────────────────────────

const FUZZY_NAME_THRESHOLD = 0.7;       // below this we don't bother considering
const HIGH_CONFIDENCE_OVERLAP = 0.85;   // ≥ this → recommend "extend"
const DESC_TOKEN_MIN_LEN = 4;           // tokens shorter than this don't count
const DESC_OVERLAP_MIN_TOKENS = 2;      // shared tokens required for an overlap match
const DESC_OVERLAP_BOOST = 0.2;
const SIGNATURE_BOOST = 0.3;
const MAX_MATCHES_RETURNED = 10;        // cap the array — keep responses scannable

const HOOK_REGISTRY_REL = "state/shared/HOOK_REGISTRY.json";

// ── String helpers ─────────────────────────────────────────────────────────

/**
 * Lowercase, strip extension, normalize separators, drop "hook-" prefix.
 *
 * NOTE: we intentionally do NOT strip suffixes (`-guard`, `-engine`, `-block`, …).
 * Stripping asymmetrically tanks similarity for the most common case the guard
 * cares about: "is the proposed name almost identical to an existing one?"
 *   e.g. normalize("file-claim-guard") would strip `-guard` and become "file-claim"
 *        normalize("file-claim-guardx") doesn't match the suffix and stays "file-claim-guardx"
 *   Levenshtein(file-claim, file-claim-guardx) = 7, similarity = 7/17 ≈ 0.59 → false negative.
 * The prefix strip is safe because "hook-foo" and "foo" are usually genuinely the same
 * intent under the PRISM naming convention (only some hook files use the `hook-` prefix).
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(mjs|cjs|js|ts)$/i, "")
    .replace(/^.*[\\/]/, "")               // basename
    .replace(/[_\s.]+/g, "-")              // separators → "-"
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^(hook|hooks)-/, "");        // drop "hook-" prefix only (suffixes stay — see note)
}

/** Tokens of 4+ chars from a description; lowercased, stopword-stripped. */
const STOP = new Set([
  "this", "that", "with", "from", "into", "have", "been", "when", "where", "what", "which",
  "will", "would", "should", "could", "must", "does", "they", "them", "their", "than",
  "then", "these", "those", "some", "such", "only", "also", "other", "more", "most",
  "every", "each", "case", "true", "false", "null", "type", "kind", "name", "file",
  "path", "step", "list", "kind", "code", "test", "tests", "hook", "hooks", "guard",
  "block", "engine", "module", "system", "input", "output", "value", "values",
]);
function tokens(description: string): Set<string> {
  const out = new Set<string>();
  for (const raw of description.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < DESC_TOKEN_MIN_LEN) continue;
    if (STOP.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/** Levenshtein distance — iterative DP, O(n·m) but n,m are short here. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

/** Similarity ratio in [0, 1]. 1 ⇔ identical, 0 ⇔ no characters in common. */
function nameSimilarity(a: string, b: string): number {
  const n = Math.max(a.length, b.length);
  if (n === 0) return 1;
  return 1 - levenshtein(a, b) / n;
}

// ── Catalog adapters (from manifest, from registry json) ──────────────────

/** Build a HookCatalogEntry[] from a HookManifest. */
export function entriesFromManifest(manifest: HookManifest): HookCatalogEntry[] {
  return manifest.hooks.map((h) => {
    const matchers = [...new Set(h.wirings.map((w) => w.matcher))].sort();
    const sigKeys = new Set<string>();
    const signatures: Array<{ event: string; matcher: string }> = [];
    for (const w of h.wirings) {
      const k = `${w.event}::${w.matcher}`;
      if (!sigKeys.has(k)) {
        sigKeys.add(k);
        signatures.push({ event: w.event, matcher: w.matcher });
      }
    }
    return {
      id: h.id,
      file: h.file,
      description: h.description ?? "",
      events: [...h.events].sort(),
      matchers,
      signatures: signatures.sort((a, b) => a.event.localeCompare(b.event) || a.matcher.localeCompare(b.matcher)),
    };
  });
}

/** Build a HookCatalogEntry[] from the .mjs-friendly HOOK_REGISTRY.json shape. */
export function entriesFromRegistry(raw: unknown): HookCatalogEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const hooks = (raw as { hooks?: unknown }).hooks;
  if (!Array.isArray(hooks)) return [];
  const out: HookCatalogEntry[] = [];
  for (const h of hooks) {
    if (!h || typeof h !== "object") continue;
    const entry = h as Record<string, unknown>;
    const file = typeof entry.file === "string" ? entry.file : "";
    if (!file) continue;
    const id = typeof entry.id === "string" && entry.id ? entry.id : nodePath.basename(file).replace(/\.[^.]+$/, "");
    const description = typeof entry.description === "string" ? entry.description : "";
    const eventsField = entry.events;
    const events = Array.isArray(eventsField) ? eventsField.filter((x): x is string => typeof x === "string") : [];
    const wirings = Array.isArray(entry.wirings) ? entry.wirings : [];
    const sigKeys = new Set<string>();
    const signatures: Array<{ event: string; matcher: string }> = [];
    for (const w of wirings) {
      if (!w || typeof w !== "object") continue;
      const wo = w as Record<string, unknown>;
      const event = typeof wo.event === "string" ? wo.event : "";
      const matcher = typeof wo.matcher === "string" ? wo.matcher : "";
      if (!event) continue;
      const k = `${event}::${matcher}`;
      if (!sigKeys.has(k)) {
        sigKeys.add(k);
        signatures.push({ event, matcher });
      }
    }
    const matchers = [...new Set(signatures.map((s) => s.matcher))].sort();
    out.push({
      id,
      file,
      description,
      events: events.sort(),
      matchers,
      signatures: signatures.sort((a, b) => a.event.localeCompare(b.event) || a.matcher.localeCompare(b.matcher)),
    });
  }
  return out;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export interface HookCreationGuardOptions {
  /** Pre-built catalog (preferred — fastest, fully testable). */
  catalog?: HookCatalogEntry[];
  /** Pre-built manifest (auto-converted via entriesFromManifest). */
  manifest?: HookManifest;
  /** Path to HOOK_REGISTRY.json. Defaults to <repoRoot>/state/shared/HOOK_REGISTRY.json. */
  registryPath?: string;
  /** Repo root for path resolution. Defaults to process.cwd() walk-up. */
  repoRoot?: string;
  /** Injectable filesystem (for tests). */
  fsImpl?: Pick<typeof nodeFs, "existsSync" | "readFileSync">;
}

export class HookCreationGuardEngine extends BaseEngine {
  constructor() {
    super({
      name: "HookCreationGuardEngine",
      version: "1.0.0",
      domain: "infrastructure/hooks",
      description:
        "Hook-domain mirror of DuplicationGuardEngine. Surfaces name + description + (event,matcher) signature collisions before a new hook is written.",
    });
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "checkBeforeCreating", description: "Check a proposed hook against the existing catalog; return {shouldProceed, recommendation, matches}." },
      { name: "mustCheckBeforeCreating", description: "Same as checkBeforeCreating but THROWS when shouldProceed is false. Mirrors DuplicationGuardEngine." },
      { name: "loadCatalog", description: "Load the catalog from a HookManifest, HOOK_REGISTRY.json, or explicit catalog. Useful when the runtime hook wants the engine's view of state." },
    ];
  }

  validateInput(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "expected an input object";
    const o = input as { proposedName?: unknown };
    if (typeof o.proposedName !== "string" || !o.proposedName.trim()) return "proposedName is required and must be a non-empty string";
    return null;
  }

  /** BaseEngine compliance. The default `execute()` path calls `checkBeforeCreating`. */
  protected async executeImpl(input: unknown): Promise<HookCreationCheckResult> {
    const parsed = HookCreationCheckInputSchema.parse(input);
    return this.checkBeforeCreating(parsed);
  }

  /** Resolve the active catalog from options (prefer catalog → manifest → registry file). */
  loadCatalog(opts: HookCreationGuardOptions = {}): HookCatalogEntry[] {
    if (opts.catalog) return opts.catalog;
    if (opts.manifest) return entriesFromManifest(opts.manifest);
    const fs = opts.fsImpl ?? nodeFs;
    const root = opts.repoRoot ?? resolveRepoRoot(process.cwd(), fs);
    const p = opts.registryPath ?? nodePath.join(root, HOOK_REGISTRY_REL).replace(/\\/g, "/");
    if (!fs.existsSync(p)) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(p, "utf-8") as string);
      return entriesFromRegistry(raw);
    } catch {
      return [];
    }
  }

  /**
   * Check a proposed hook against the catalog. Pure compute apart from the
   * optional registry-file read (handled by loadCatalog).
   */
  checkBeforeCreating(input: HookCreationCheckInput, opts: HookCreationGuardOptions = {}): HookCreationCheckResult {
    const parsed = HookCreationCheckInputSchema.parse(input);
    const catalog = this.loadCatalog(opts);
    const proposedNorm = normalizeName(parsed.proposedName);
    const proposedDescTokens = tokens(parsed.description);

    const matches: HookCreationMatch[] = [];

    for (const entry of catalog) {
      const entryNorm = normalizeName(entry.id);
      const reasons: HookCreationMatchReason[] = [];
      const details: string[] = [];
      let score = 0;

      // 1. Exact-name (after normalization)
      if (entryNorm && entryNorm === proposedNorm) {
        score = 1;
        reasons.push("exact-name");
        details.push(`exact-name`);
      } else {
        // 2. Fuzzy name
        const sim = nameSimilarity(entryNorm, proposedNorm);
        if (sim >= FUZZY_NAME_THRESHOLD) {
          score = sim;
          reasons.push("fuzzy-name");
          details.push(`fuzzy-name@${sim.toFixed(2)}`);
        }
      }

      // 3. Description overlap
      if (proposedDescTokens.size > 0 && entry.description) {
        const entryTokens = tokens(entry.description);
        let shared = 0;
        for (const t of proposedDescTokens) if (entryTokens.has(t)) shared++;
        if (shared >= DESC_OVERLAP_MIN_TOKENS) {
          score = Math.min(1, score + DESC_OVERLAP_BOOST);
          reasons.push("description-overlap");
          details.push(`description-overlap:${shared} tokens`);
        }
      }

      // 4. Signature collision: only if the proposal declared (event, matcher)
      if (parsed.event) {
        const matcherPart = parsed.matcher ?? "";
        for (const sig of entry.signatures) {
          if (sig.event === parsed.event && sig.matcher === matcherPart) {
            score = Math.min(1, score + SIGNATURE_BOOST);
            if (!reasons.includes("signature-match")) reasons.push("signature-match");
            details.push(`signature-match:${sig.event}${sig.matcher ? `|${sig.matcher}` : ""}`);
            break;
          }
        }
      }

      if (reasons.length > 0) {
        matches.push({
          file: entry.file,
          id: entry.id,
          events: [...entry.events],
          score: round3(score),
          reasons,
          detail: details.join(" · "),
        });
      }
    }

    // Sort by score desc, then by id for stability.
    matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const trimmed = matches.slice(0, MAX_MATCHES_RETURNED);

    const top = trimmed[0];
    const hasExact = top?.reasons.includes("exact-name") ?? false;
    const hasSignatureColl = top?.reasons.includes("signature-match") ?? false;

    let recommendation: HookCreationRecommendation;
    let shouldProceed: boolean;
    let reason: string;

    if (hasExact) {
      shouldProceed = false;
      recommendation = "skip";
      reason = `Exact name collision with existing hook '${top!.id}' (${top!.file}). Reuse or rename.`;
    } else if (!top) {
      shouldProceed = true;
      recommendation = "proceed";
      reason = "No name, description, or signature overlap with existing hooks.";
    } else if (top.score >= HIGH_CONFIDENCE_OVERLAP || hasSignatureColl) {
      shouldProceed = false;
      recommendation = "extend";
      const why = hasSignatureColl
        ? `signature already covered by '${top.id}'`
        : `score=${top.score.toFixed(2)} overlap with '${top.id}'`;
      reason = `High-confidence overlap: ${why}. Consider extending the existing hook instead.`;
    } else {
      shouldProceed = false;
      recommendation = "rename";
      reason = `Name is too similar to existing hook '${top.id}' (score=${top.score.toFixed(2)}). Choose a more distinctive name.`;
    }

    const result: HookCreationCheckResult = {
      schemaVersion: HOOK_CREATION_GUARD_SCHEMA_VERSION,
      shouldProceed,
      recommendation,
      reason,
      matches: trimmed,
      topMatch: top,
    };
    return HookCreationCheckResultSchema.parse(result); // self-check
  }

  /** Throwing variant — mirrors DuplicationGuardEngine.mustCheckBeforeCreating. */
  mustCheckBeforeCreating(input: HookCreationCheckInput, opts: HookCreationGuardOptions = {}): HookCreationCheckResult {
    const r = this.checkBeforeCreating(input, opts);
    if (!r.shouldProceed) {
      const err = new Error(`HookCreationGuard: ${r.reason}`);
      (err as Error & { result?: HookCreationCheckResult }).result = r;
      throw err;
    }
    return r;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────

/** Round to 3 decimal places for stable JSON output. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Repo-root walk-up. Looks for the standard `.claude/hooks` + `mcp-server` markers. */
function resolveRepoRoot(startDir: string, fs: Pick<typeof nodeFs, "existsSync">): string {
  let dir = nodePath.resolve(startDir).replace(/\\/g, "/");
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(nodePath.join(dir, ".claude", "hooks")) && fs.existsSync(nodePath.join(dir, "mcp-server"))) return dir;
    const parent = nodePath.dirname(dir).replace(/\\/g, "/");
    if (parent === dir) break;
    dir = parent;
  }
  return startDir.replace(/\\/g, "/");
}

/** Singleton for dispatcher use. */
export const hookCreationGuardEngine = new HookCreationGuardEngine();
