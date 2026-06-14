// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
// with mtime-keyed cache layer for the Zebra orchestrator sweep.
//
// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
// to build) so the Zebra orchestrator's `planSlotAction` can make
// goal-aware decisions in MS1 without each consumer re-implementing fs reads,
// cache invalidation, and staleness checking.
//
// This is U-ZO-MS0-01 of the ZEBRA-OMNISCIENT-MS0 plan
// (`state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md`). U-ZO-MS0-06 will
// compose this with the other 4 MS0 surfaces into a single `loadSlotContext`
// reader; today this ships standalone with a forward-compat composite
// (`loadBriefAndVision`).
//
// Design invariants (mirrored from zebra-awareness-consumer.mjs):
//   1. Fail-soft — every helper returns a stable envelope with a `reason`
//      field when the file is missing/unreadable; never throws. R12: every
//      empty result names a reason.
//   2. Pure-core + injected reader — the default `defaultReader` uses fs, but
//      tests pass a synthetic reader. Real-data E2E test verifies the lib
//      actually opens disk files on this checkout (per the MS1 P0 lesson:
//      "pure-core+injected-readers MUST ship a real-data E2E").
//   3. mtime-keyed cache — re-stat the file on cache-hit; advancing mtime
//      invalidates the entry. TTL fallback (default 60s) caps stale cache.
//   4. Stale-mark — files older than `STALE_HRS` (default 24h) are still
//      returned but with `stale: true`, so callers can degrade decisions.
//
// Knobs (env):
//   PRISM_ZEBRA_CONTEXT_DISABLE=1       — every reader returns disabled envelope
//   PRISM_ZEBRA_CONTEXT_BRIEF_PATH      — override CLAUDE-BRIEF.md path
//   PRISM_ZEBRA_CONTEXT_VISION_PATH     — override PRISM-BUILD-VISION.md path
//   PRISM_ZEBRA_CONTEXT_TTL_MS          — cache TTL in ms (default 60000)
//   PRISM_ZEBRA_CONTEXT_STALE_HRS       — stale threshold in hours (default 24)

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";

export const DEFAULT_BRIEF_PATH = process.env.PRISM_ZEBRA_CONTEXT_BRIEF_PATH
  || path.join(PRISM, "state/shared/CLAUDE-BRIEF.md");
export const DEFAULT_VISION_PATH = process.env.PRISM_ZEBRA_CONTEXT_VISION_PATH
  || path.join(PRISM, "state/shared/PRISM-BUILD-VISION.md");

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_HRS = 24;

function envTtlMs() {
  const v = Number(process.env.PRISM_ZEBRA_CONTEXT_TTL_MS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_TTL_MS;
}

function envStaleHrs() {
  const v = Number(process.env.PRISM_ZEBRA_CONTEXT_STALE_HRS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_STALE_HRS;
}

const EMPTY_ENVELOPE = Object.freeze({
  ok: false,
  reason: "not-loaded",
  content: "",
  mtime: null,
  ageSeconds: null,
  stale: false,
  path: "",
  source: "fresh",
});

// Per-path cache: absPath -> { envelope, readAt, mtime }
const _cache = new Map();

// Default reader: stat + read. Returns a small intermediate shape that
// `buildEnvelope` translates into the public envelope.
//   success → { ok:true, content, mtime }
//   ENOENT  → { ok:false, reason:"missing" }
//   other   → { ok:false, reason:"read-error", errno }
export function defaultReader(filePath) {
  try {
    const st = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    return { ok: true, content, mtime: st.mtimeMs };
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: false, reason: "missing" };
    return { ok: false, reason: "read-error", errno: e?.code || null };
  }
}

// Safe JSON.parse with prototype-pollution guard. Drops `__proto__`,
// `constructor`, and `prototype` keys via the reviver — a malicious
// upstream artifact (e.g. an LLM-hallucinated ROADMAP-CONSOLIDATED.json
// or a tampered loop-state.json) cannot poison the proto chain of the
// returned object. Returns null on any parse error. Cheap; defense-in-depth
// for every JSON reader that consumes disk content this lib touches.
export function safeJsonParse(s) {
  if (typeof s !== "string") return null;
  try {
    return JSON.parse(s, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return undefined;
      return value;
    });
  } catch { return null; }
}

function buildEnvelope({ filePath, readResult, now, staleHrs, source }) {
  if (!readResult || !readResult.ok) {
    return {
      ...EMPTY_ENVELOPE,
      reason: readResult?.reason || "not-loaded",
      path: filePath,
      source: source || "fresh",
    };
  }
  const mtime = typeof readResult.mtime === "number" ? readResult.mtime : null;
  // Clamp negative ageSeconds (clock drift / mtime in future) to 0.
  const ageSeconds = mtime === null ? null : Math.max(0, (now - mtime) / 1000);
  const stale = ageSeconds !== null && ageSeconds > staleHrs * 3600;
  return {
    ok: true,
    reason: null,
    content: typeof readResult.content === "string" ? readResult.content : "",
    mtime,
    ageSeconds,
    stale,
    path: filePath,
    source: source || "fresh",
  };
}

// Internal: load one file with cache. Public callers use loadBrief/loadVision.
//
// Cache key is `path.resolve(filePath)` so callers passing the same file
// under different string forms (mixed Windows separators, `./` prefixes,
// relative paths) hit the same cache entry. Without normalization, Windows
// consumers commonly thrash the cache (P1 finding from per-file scrutiny).
function loadFile(filePath, opts = {}) {
  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return { ...EMPTY_ENVELOPE, reason: "disabled-env", path: filePath || "" };
  }
  if (typeof filePath !== "string" || !filePath) {
    return { ...EMPTY_ENVELOPE, reason: "no-path", path: filePath || "" };
  }
  const reader = typeof opts.reader === "function" ? opts.reader : defaultReader;
  const now = typeof opts.now === "function" ? opts.now() : Date.now();
  // Both env knob and opts agree on TTL > 0 (TTL=0 = "always re-read", but we
  // never cache then; so we skip writes when ttl is 0 to avoid dead entries).
  const ttlMs = typeof opts.ttlMs === "number" && opts.ttlMs >= 0 ? opts.ttlMs : envTtlMs();
  const staleHrs = typeof opts.staleHrs === "number" && opts.staleHrs > 0 ? opts.staleHrs : envStaleHrs();

  // Normalize cache key — Windows mixed-separator + ./-prefix variants alias
  // to the same canonical path. Cheap pure function; no fs touch.
  const key = path.resolve(filePath);

  const cached = _cache.get(key);
  if (cached && cached.envelope.ok && (now - cached.readAt) < ttlMs) {
    // Re-stat to catch mtime advance — but only when we have an mtime to compare.
    // Reader injection means we should NOT use fs.statSync here when a synthetic
    // reader is in play; only the defaultReader path gets the mtime check.
    if (reader === defaultReader && cached.envelope.mtime !== null) {
      let curMtime = null;
      try { curMtime = fs.statSync(filePath).mtimeMs; } catch { /* fall through to re-read */ }
      if (curMtime !== null && curMtime === cached.envelope.mtime) {
        return { ...cached.envelope, source: "cache" };
      }
      // mtime advanced or stat failed → fall through to re-read
    } else if (reader !== defaultReader) {
      // Injected-reader path: trust TTL alone (no fs.statSync — would break
      // hermetic tests). NOTE: tests that mutate the source within TTL won't
      // see the change without invalidateContextCache() — intentional, so
      // future maintainers don't "fix" it.
      return { ...cached.envelope, source: "cache" };
    }
  }

  const readResult = reader(filePath);
  const env = buildEnvelope({ filePath, readResult, now, staleHrs, source: "fresh" });
  // Only cache successful reads — failed envelopes left out so repeated
  // missing-file polls don't accumulate dead Map entries (P1 fix).
  if (env.ok && ttlMs > 0) {
    _cache.set(key, { envelope: env, readAt: now });
  }
  return env;
}

// loadBrief / loadVision — R12 fail-loud on explicit empty path.
//   loadBrief()                    → DEFAULT_BRIEF_PATH (no-key = use default)
//   loadBrief({})                  → DEFAULT_BRIEF_PATH (no-key = use default)
//   loadBrief({briefPath: "/x"})   → "/x"
//   loadBrief({briefPath: ""})     → reason:"no-path" (explicit empty = error)
//   loadBrief({briefPath: null})   → reason:"no-path" (explicit null = error)
// Distinguishing "key absent" from "key present but falsy" lets callers
// surface programmer errors rather than silently fall back to the canonical
// file (which would mask a wrong path being plumbed through opts).
export function loadBrief(opts = {}) {
  const p = Object.prototype.hasOwnProperty.call(opts, "briefPath")
    ? opts.briefPath
    : DEFAULT_BRIEF_PATH;
  return loadFile(p, opts);
}

export function loadVision(opts = {}) {
  const p = Object.prototype.hasOwnProperty.call(opts, "visionPath")
    ? opts.visionPath
    : DEFAULT_VISION_PATH;
  return loadFile(p, opts);
}

// Forward-compat composite. U-ZO-MS0-06 will replace this with the full
// 5-surface bundle reader (`loadSlotContext`). Today the composite returns
// brief + vision so the public API doesn't churn when the other 3 surfaces
// (soul refuse_list, loop-state, token-zone) land.
export function loadBriefAndVision(opts = {}) {
  return {
    brief: loadBrief(opts),
    vision: loadVision(opts),
    composedAt: typeof opts.now === "function" ? opts.now() : Date.now(),
  };
}

// Cache invalidation. Pass null/undefined to clear everything; pass a path
// (any form) to clear that one entry. Path is resolved to match the cache
// key normalization, so callers don't have to remember the canonical form.
export function invalidateContextCache(filePath = null) {
  if (filePath === null || filePath === undefined) {
    _cache.clear();
    return;
  }
  if (typeof filePath !== "string" || !filePath) return;
  _cache.delete(path.resolve(filePath));
}

// Diagnostics — used by tests and observability surfaces. Returns a shallow
// snapshot of the cache so callers can verify cache state without poking
// the private Map.
export function getCacheSnapshot() {
  const out = {};
  for (const [k, v] of _cache.entries()) {
    out[k] = {
      readAt: v.readAt,
      ok: v.envelope.ok,
      mtime: v.envelope.mtime,
      stale: v.envelope.stale,
    };
  }
  return out;
}

// ============================================================================
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-02 — ROADMAP-CONSOLIDATED bridge_units reader
// ============================================================================
// Reads `state/shared/specs/ROADMAP-CONSOLIDATED.json` and returns the bridge
// units (wiring + deep-integration) that connect already-built capability.
// The Zebra sweep uses this as a work-source for future MS1 SUGGESTION ADTs
// (`{kind: "suggest-pick", payload: {unitId}}`).
//
// Schema (excerpt) — ROADMAP-CONSOLIDATED.json:
//   {
//     "bridge_units": {
//       "wiring": [{ "id": "U-BRIDGE-WIRE-OTHER", ... }, ...],
//       "deep_integration": [{ "id": "U-DEEP-CAD-CAM", ... }, ...]
//     },
//     "stats": { "bridgeWiringUnits": 26, "deepIntegrationUnits": 16, ... }
//   }
//
// Fail-soft: every error path returns an envelope with `bridgeUnits: []` and
// a `reason` describing why. Callers should not throw — they degrade to the
// legacy 2-action decider.

export const DEFAULT_ROADMAP_PATH = process.env.PRISM_ZEBRA_CONTEXT_ROADMAP_PATH
  || path.join(PRISM, "state/shared/specs/ROADMAP-CONSOLIDATED.json");

const VALID_BRIDGE_KINDS = Object.freeze(["all", "wiring", "deep_integration"]);

// Pure parser — splits a parsed JSON object into the bridge-units shape we
// want to return. Exported so tests + callers can verify schema independently.
//   parseBridgeUnits(json)
//     → { ok, reason, wiring: [...], deepIntegration: [...] }
export function parseBridgeUnits(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, reason: "schema-mismatch", wiring: [], deepIntegration: [] };
  }
  const bu = json.bridge_units;
  if (!bu || typeof bu !== "object") {
    return { ok: false, reason: "no-bridge-units", wiring: [], deepIntegration: [] };
  }
  const wiring = Array.isArray(bu.wiring) ? bu.wiring : [];
  const deepIntegration = Array.isArray(bu.deep_integration) ? bu.deep_integration : [];
  return { ok: true, reason: null, wiring, deepIntegration };
}

// Returns a normalized non-negative integer or null if the input is not a
// finite number ≥ 0. Used to clamp topK to a sane range without throwing.
function clampTopK(raw, totalLen) {
  if (raw === undefined || raw === null) return totalLen;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.floor(n), totalLen);
}

// loadBridgeUnits — top-level reader.
//   loadBridgeUnits()                                    → all bridge units
//   loadBridgeUnits({ kind: "wiring" })                  → only wiring
//   loadBridgeUnits({ kind: "deep_integration" })        → only deep-int
//   loadBridgeUnits({ topK: 5 })                         → top 5 across both
//   loadBridgeUnits({ roadmapPath: "" })                 → R12 fail-loud
//
// Envelope shape:
//   { ok, reason, bridgeUnits, wiringCount, deepIntegrationCount,
//     totalAvailable, kind, topK, mtime, ageSeconds, stale, path, source }
export function loadBridgeUnits(opts = {}) {
  // Skeleton envelope used for every failure path so callers see a stable
  // shape. R12 fail-loud lives in the named `reason` strings.
  const baseSkeleton = {
    bridgeUnits: [],
    wiringCount: 0,
    deepIntegrationCount: 0,
    totalAvailable: 0,
    kind: typeof opts.kind === "string" ? opts.kind : "all",
    topK: null,
    mtime: null,
    ageSeconds: null,
    stale: false,
    path: "",
    source: "fresh",
  };

  // Disable-env honored at the very top — never do path/kind/topK work
  // when the operator killed the read surface fleet-wide.
  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return { ...baseSkeleton, ok: false, reason: "disabled-env" };
  }

  // Pre-validate caller inputs BEFORE disk I/O so the most actionable
  // error surfaces first (Reviewer A P1-1). An invalid kind/topK is a
  // programmer mistake — surfacing only `no-path` from a missing file
  // would mask the real bug.
  const kindOpt = baseSkeleton.kind;
  if (!VALID_BRIDGE_KINDS.includes(kindOpt)) {
    return { ...baseSkeleton, ok: false, reason: "invalid-kind" };
  }
  if (Object.prototype.hasOwnProperty.call(opts, "topK")) {
    const t = Number(opts.topK);
    if (!Number.isFinite(t) || t < 0) {
      return { ...baseSkeleton, ok: false, reason: "invalid-topk" };
    }
  }

  const p = Object.prototype.hasOwnProperty.call(opts, "roadmapPath")
    ? opts.roadmapPath
    : DEFAULT_ROADMAP_PATH;

  const fileEnv = loadFile(p, opts);
  const base = {
    ...baseSkeleton,
    mtime: fileEnv.mtime,
    ageSeconds: fileEnv.ageSeconds,
    stale: fileEnv.stale,
    path: fileEnv.path,
    source: fileEnv.source,
  };

  if (!fileEnv.ok) {
    return { ...base, ok: false, reason: fileEnv.reason };
  }

  const json = safeJsonParse(fileEnv.content);
  if (json === null) {
    return { ...base, ok: false, reason: "parse-error" };
  }

  const parsed = parseBridgeUnits(json);
  if (!parsed.ok) {
    return { ...base, ok: false, reason: parsed.reason };
  }

  let combined;
  if (kindOpt === "wiring") combined = parsed.wiring.slice();
  else if (kindOpt === "deep_integration") combined = parsed.deepIntegration.slice();
  else combined = parsed.wiring.concat(parsed.deepIntegration);

  const totalAvailable = combined.length;
  const sliceTo = clampTopK(opts.topK, totalAvailable);
  // sliceTo is guaranteed non-null here — adversarial values were rejected
  // by the pre-validation block above.
  const bridgeUnits = combined.slice(0, sliceTo);

  return {
    ...base,
    ok: true,
    reason: null,
    bridgeUnits,
    wiringCount: parsed.wiring.length,
    deepIntegrationCount: parsed.deepIntegration.length,
    totalAvailable,
    kind: kindOpt,
    topK: sliceTo,
  };
}

// ============================================================================
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-03 — Slot soul refuse_list reader
// ============================================================================
// Reads `state/shared/slot-souls/<slot>.md` (the same file consumed by the
// `slot-soul-inject` UserPromptSubmit hook) and extracts the YAML-frontmatter
// `refuse_list`, `hermes_role`, and `domain_filter` fields.
//
// The refuse_list is a HARD CONSTRAINT — if the soul refuses
// "inline-physics-constants", Zebra must NOT suggest that slot inline a
// physics constant. Treat it as a post-filter on the suggestion stream
// (NEVER a pre-filter — see ZEBRA-OMNISCIENT-MS0-PLAN §6 P2 risk).

export const DEFAULT_SOULS_DIR = process.env.PRISM_ZEBRA_CONTEXT_SOULS_DIR
  || path.join(PRISM, "state/shared/slot-souls");

// Frozen list of 26 NATO slot names. SOURCE OF TRUTH is
// `.claude/helpers/chat-slots.mjs` SLOT_NAMES — this is a local mirror to
// keep the lib pure (no chat-slots dependency). If SLOT_NAMES expands beyond
// alpha..zulu, update this constant in lockstep with the chat-slots change
// (existing precedent — CLAUDE.md §"Fleet-design directive").
export const KNOWN_SLOTS = Object.freeze([
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango",
  "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
]);

// Pure helper: extract YAML frontmatter block as text. Returns null if no
// well-formed `---\n...\n---\n` block is present at the start.
export function extractFrontmatterText(text) {
  if (typeof text !== "string") return null;
  // Allow optional BOM + leading whitespace before the first `---`.
  const m = text.match(/^﻿?\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return m ? m[1] : null;
}

// Pure helper: parse the slot-soul subset we care about from a frontmatter
// text block. Returns { refuseList, hermesRole, domainFilter }.
// We do NOT use a full YAML parser — the soul format is tightly controlled
// (generated by U-HERMES02), and the fields we read are flat with one
// list-of-strings. Reduces dependency surface; matches U-ZPSN03 lesson on
// "sanitise via known shape, not arbitrary YAML".
export function parseSoulFrontmatter(frontmatterText) {
  const out = { refuseList: [], hermesRole: null, domainFilter: null, malformed: false };
  if (typeof frontmatterText !== "string") {
    out.malformed = true;
    return out;
  }
  const lines = frontmatterText.split(/\r?\n/);
  let inRefuseList = false;
  for (const line of lines) {
    // `refuse_list:` opens a multi-line YAML list.
    if (/^\s*refuse_list\s*:/i.test(line)) {
      inRefuseList = true;
      // Inline form `refuse_list: [a, b]` not supported (soul template uses
      // multi-line). If we see inline brackets, mark malformed.
      const inlineMatch = line.match(/refuse_list\s*:\s*\[([^\]]*)\]/i);
      if (inlineMatch) {
        out.malformed = true;
      }
      continue;
    }
    if (inRefuseList) {
      // List items start with `  - <value>`. Stop on any non-blank line that
      // doesn't match the list-item shape (signals next key).
      const itemMatch = line.match(/^\s+-\s+(.+?)\s*$/);
      if (itemMatch) {
        // Strip surrounding quotes if present.
        const v = itemMatch[1].replace(/^['"](.*)['"]$/, "$1");
        if (v) out.refuseList.push(v);
        continue;
      }
      if (line.trim() === "") continue;
      inRefuseList = false;
      // Fall through to other-key matches.
    }
    const roleMatch = line.match(/^\s*hermes_role\s*:\s*(.+?)\s*$/i);
    if (roleMatch) {
      out.hermesRole = roleMatch[1].replace(/^['"](.*)['"]$/, "$1");
      continue;
    }
    const filterMatch = line.match(/^\s*domain_filter\s*:\s*(.+?)\s*$/i);
    if (filterMatch) {
      out.domainFilter = filterMatch[1].replace(/^['"](.*)['"]$/, "$1");
      continue;
    }
  }
  return out;
}

// loadSlotSoulRefuseList(slot, opts) — top-level reader.
//   loadSlotSoulRefuseList("bravo")              → bravo's refuse_list
//   loadSlotSoulRefuseList("../etc/passwd")      → reason "invalid-slot"
//   loadSlotSoulRefuseList("BRAVO")              → normalized lowercase ok
//
// Envelope:
//   { ok, reason, slot, refuseList, hermesRole, domainFilter, mtime,
//     ageSeconds, stale, path, source }
export function loadSlotSoulRefuseList(slot, opts = {}) {
  const norm = typeof slot === "string" ? slot.trim().toLowerCase() : "";
  // Disable-env honored at the very top — never do slot validation or
  // path interpolation when the read surface is killed.
  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return {
      ok: false, reason: "disabled-env",
      slot: null, refuseList: [], hermesRole: null, domainFilter: null,
      mtime: null, ageSeconds: null, stale: false, path: "", source: "fresh",
    };
  }
  const base = {
    // Use validated lower-case norm ONLY when it's a known slot — otherwise
    // null so we never reflect attacker-controlled input back through the
    // envelope (P0-C: prevents log-channel injection via slot field).
    slot: KNOWN_SLOTS.includes(norm) ? norm : null,
    refuseList: [],
    hermesRole: null,
    domainFilter: null,
    mtime: null,
    ageSeconds: null,
    stale: false,
    path: "",
    source: "fresh",
  };

  if (!norm || !KNOWN_SLOTS.includes(norm)) {
    return { ...base, ok: false, reason: "invalid-slot" };
  }

  const soulsDir = typeof opts.soulsDir === "string" && opts.soulsDir
    ? opts.soulsDir
    : DEFAULT_SOULS_DIR;
  // Defense-in-depth: even though `norm` is in KNOWN_SLOTS (all lowercase
  // letters), build the path explicitly and re-check the basename doesn't
  // escape the souls dir.
  const filePath = path.join(soulsDir, `${norm}.md`);

  const fileEnv = loadFile(filePath, opts);
  Object.assign(base, {
    mtime: fileEnv.mtime,
    ageSeconds: fileEnv.ageSeconds,
    stale: fileEnv.stale,
    path: fileEnv.path,
    source: fileEnv.source,
  });

  if (!fileEnv.ok) {
    return { ...base, ok: false, reason: fileEnv.reason };
  }

  const fmText = extractFrontmatterText(fileEnv.content);
  if (fmText === null) {
    return { ...base, ok: false, reason: "no-frontmatter" };
  }
  const parsed = parseSoulFrontmatter(fmText);
  if (parsed.malformed) {
    // Any malformedness surfaces explicitly — half-loaded envelopes are
    // worse than no envelope (Reviewer B P2-2). Inline `refuse_list: [a]`
    // form is the most common trigger; force the operator to fix the soul.
    return { ...base, ok: false, reason: "malformed-frontmatter" };
  }
  // Soul present but no refuse_list key → ok with empty array (the soul
  // simply chose to refuse nothing — distinct from a missing soul file).
  return {
    ...base,
    ok: true,
    reason: null,
    refuseList: parsed.refuseList,
    hermesRole: parsed.hermesRole,
    domainFilter: parsed.domainFilter,
  };
}

// ============================================================================
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-04 — Loop-state per-slot reader
// ============================================================================
// Reads `state/shared/loop-state/loop-<sessionId>.json` files. The Zebra
// orchestrator's CURRENT bug (named in ZEBRA-OMNISCIENT-MS0-PLAN §5 unit
// U-ZO-MS0-04): without this reader, a `/compact` may be emitted to a slot
// that is mid-`/loop` — interrupting an autonomous run. This reader gives
// the sweep the per-slot "running loop?" signal.

export const DEFAULT_LOOP_STATE_DIR = process.env.PRISM_ZEBRA_CONTEXT_LOOP_DIR
  || path.join(PRISM, "state/shared/loop-state");

// Session ID validator. Accepts the lowercase-UUIDv4-ish shape that
// `loop-state.mjs` emits (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Rejects
// anything else to keep the file-path interpolation safe.
export function isValidSessionId(s) {
  if (typeof s !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// Allowlist of loop-state schemaVersions this reader understands. The writer
// is `.claude/helpers/loop-state.mjs` (currently emits `"1.0.0"`). When the
// writer bumps the schema, this allowlist MUST be extended in the same
// commit — per CLAUDE.md §SCHEMA VERSIONING (N-1 back-compat). Silently
// accepting an unknown schema risks reading `status: "running" → "active"`
// rename and emitting `/compact` to live loops (Reviewer B P1-F).
export const KNOWN_LOOP_SCHEMA_VERSIONS = Object.freeze(["1.0.0"]);

// Pure parser: take a parsed loop-state JSON and return the decision-relevant
// subset. Status normalized: anything other than "running" → running:false.
export function parseLoopState(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, reason: "schema-mismatch" };
  }
  // Fail-loud on unknown schemaVersion — prevents silent decision-drift if
  // the writer renames fields without updating consumers.
  if (json.schemaVersion !== undefined
      && !KNOWN_LOOP_SCHEMA_VERSIONS.includes(json.schemaVersion)) {
    return { ok: false, reason: "schema-version-unsupported", parsedVersion: json.schemaVersion };
  }
  const status = typeof json.status === "string" ? json.status : "unknown";
  return {
    ok: true,
    reason: null,
    sessionId: typeof json.sessionId === "string" ? json.sessionId : null,
    task: typeof json.task === "string" ? json.task : null,
    target: Number.isFinite(json.target) ? json.target : null,
    iter: Number.isFinite(json.iter) ? json.iter : 0,
    startedAt: typeof json.startedAt === "string" ? json.startedAt : null,
    lastTickAt: typeof json.lastTickAt === "string" ? json.lastTickAt : null,
    status,
    running: status === "running",
  };
}

// loadLoopState(sessionId, opts) — top-level single-loop reader.
//   loadLoopState("00a9c6dc-0c91-4629-88da-a181fbfef41f")
//     → { ok:true, running:true|false, iter, target, status, ... }
//   loadLoopState("bad-id") → reason "invalid-session-id"
//   loadLoopState("<valid-id-but-no-file>") → reason "no-loop"
export function loadLoopState(sessionId, opts = {}) {
  // Disable-env honored at the top — short-circuit before any sessionId
  // reflection (P0-B).
  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return {
      ok: false, reason: "disabled-env",
      sessionId: null, running: false, iter: 0, target: null, status: null,
      task: null, startedAt: null, lastTickAt: null,
      mtime: null, ageSeconds: null, stale: false, path: "", source: "fresh",
    };
  }
  // Only echo sessionId in the envelope when it's a valid UUID-shape —
  // otherwise null so attacker-controlled input doesn't reflect.
  const validSid = isValidSessionId(sessionId);
  const base = {
    sessionId: validSid ? sessionId : null,
    running: false,
    iter: 0,
    target: null,
    status: null,
    task: null,
    startedAt: null,
    lastTickAt: null,
    mtime: null,
    ageSeconds: null,
    stale: false,
    path: "",
    source: "fresh",
  };

  if (!validSid) {
    return { ...base, ok: false, reason: "invalid-session-id" };
  }

  const loopDir = typeof opts.loopDir === "string" && opts.loopDir
    ? opts.loopDir
    : DEFAULT_LOOP_STATE_DIR;
  const filePath = path.join(loopDir, `loop-${sessionId}.json`);
  const fileEnv = loadFile(filePath, opts);

  Object.assign(base, {
    mtime: fileEnv.mtime,
    ageSeconds: fileEnv.ageSeconds,
    stale: fileEnv.stale,
    path: fileEnv.path,
    source: fileEnv.source,
  });

  if (!fileEnv.ok) {
    // Specialize "missing" → "no-loop" so the sweep can branch on it.
    const reason = fileEnv.reason === "missing" ? "no-loop" : fileEnv.reason;
    return { ...base, ok: false, reason };
  }

  const json = safeJsonParse(fileEnv.content);
  if (json === null) {
    return { ...base, ok: false, reason: "parse-error" };
  }

  const parsed = parseLoopState(json);
  if (!parsed.ok) {
    return { ...base, ok: false, reason: parsed.reason };
  }
  return { ...base, ok: true, reason: null, ...parsed };
}

// ============================================================================
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-05 — TOKEN-AWARENESS zone reader
// ============================================================================
// Reads `state/shared/token-budget-<slot>.json` written by
// `.claude/hooks/token-awareness-sidecar.mjs` (TOKEN-AWARENESS-MS0/U-TA01..12).
//
// The Zebra sweep's G3 fix (post-13-gap) added a coarse 90s wait after every
// `/compact` SendKeys. This reader gives the sweep the real per-slot
// token-budget zone (GREEN/YELLOW/RED/CRITICAL) so:
//   - GREEN slot          → never /compact, even if handoff is stale
//   - YELLOW slot          → /compact only with corroborating signal (stale handoff)
//   - RED/CRITICAL slot   → /compact immediately, override coarse wait
//
// Schema written by U-TA01..12: per-slot file with {schemaVersion, capturedAt,
// zone, worstPct, worstSource, ctx, quota, cumulative, offload, action,
// stale, ageMs, slot, sessionId, host}.
//
// Fail-soft: missing sidecar → reason "missing"; stale (>180s default per
// TOKEN-AWARENESS-MS0) → ok:true with stale:true so caller can degrade.

export const DEFAULT_TOKEN_BUDGET_DIR = process.env.PRISM_ZEBRA_CONTEXT_TOKEN_DIR
  || path.join(PRISM, "state/shared");

// Same KNOWN_SLOTS whitelist for path-traversal defense (slot-soul reader
// established the pattern). Re-use KNOWN_SLOTS rather than duplicate.

const VALID_ZONES = Object.freeze(["GREEN", "YELLOW", "RED", "CRITICAL"]);
export const KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS = Object.freeze(["1.0.0"]);

// Pure parser: take parsed token-budget JSON and return the decision-relevant
// subset. Zone normalized: unknown → "UNKNOWN" with running:false-equivalent.
export function parseTokenBudget(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, reason: "schema-mismatch" };
  }
  if (json.schemaVersion !== undefined
      && !KNOWN_TOKEN_BUDGET_SCHEMA_VERSIONS.includes(json.schemaVersion)) {
    return { ok: false, reason: "schema-version-unsupported", parsedVersion: json.schemaVersion };
  }
  const zone = typeof json.zone === "string" && VALID_ZONES.includes(json.zone)
    ? json.zone
    : "UNKNOWN";
  const ctx = (json.ctx && typeof json.ctx === "object") ? json.ctx : {};
  return {
    ok: true,
    reason: null,
    zone,
    worstPct: Number.isFinite(json.worstPct) ? json.worstPct : null,
    worstSource: typeof json.worstSource === "string" ? json.worstSource : null,
    action: typeof json.action === "string" ? json.action : null,
    stale: json.stale === true,
    ageMs: Number.isFinite(json.ageMs) ? json.ageMs : null,
    ctxTokens: Number.isFinite(ctx.tokens) ? ctx.tokens : null,
    ctxMaxTokens: Number.isFinite(ctx.maxTokens) ? ctx.maxTokens : null,
    ctxPct: Number.isFinite(ctx.pct) ? ctx.pct : null,
    sessionId: typeof json.sessionId === "string" ? json.sessionId : null,
    capturedAt: typeof json.capturedAt === "string" ? json.capturedAt : null,
  };
}

// loadTokenAwarenessZone(slot, opts) — top-level reader.
//   loadTokenAwarenessZone("bravo") → { ok:true, zone:"YELLOW", worstPct:0.45, ... }
//   loadTokenAwarenessZone("../etc/passwd") → { ok:false, reason:"invalid-slot" }
//   loadTokenAwarenessZone("bravo") on missing sidecar → { ok:false, reason:"missing" }
export function loadTokenAwarenessZone(slot, opts = {}) {
  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return {
      ok: false, reason: "disabled-env",
      slot: null, zone: null, worstPct: null, worstSource: null,
      action: null, stale: false, ageMs: null,
      ctxTokens: null, ctxMaxTokens: null, ctxPct: null,
      sessionId: null, capturedAt: null,
      mtime: null, ageSeconds: null, path: "", source: "fresh",
    };
  }
  const norm = typeof slot === "string" ? slot.trim().toLowerCase() : "";
  const base = {
    slot: KNOWN_SLOTS.includes(norm) ? norm : null,
    zone: null,
    worstPct: null,
    worstSource: null,
    action: null,
    stale: false,
    ageMs: null,
    ctxTokens: null,
    ctxMaxTokens: null,
    ctxPct: null,
    sessionId: null,
    capturedAt: null,
    mtime: null,
    ageSeconds: null,
    path: "",
    source: "fresh",
  };
  if (!norm || !KNOWN_SLOTS.includes(norm)) {
    return { ...base, ok: false, reason: "invalid-slot" };
  }

  const dir = typeof opts.tokenBudgetDir === "string" && opts.tokenBudgetDir
    ? opts.tokenBudgetDir
    : DEFAULT_TOKEN_BUDGET_DIR;
  const filePath = path.join(dir, `token-budget-${norm}.json`);

  const fileEnv = loadFile(filePath, opts);
  Object.assign(base, {
    mtime: fileEnv.mtime,
    ageSeconds: fileEnv.ageSeconds,
    stale: fileEnv.stale,
    path: fileEnv.path,
    source: fileEnv.source,
  });

  if (!fileEnv.ok) {
    return { ...base, ok: false, reason: fileEnv.reason };
  }

  const json = safeJsonParse(fileEnv.content);
  if (json === null) {
    return { ...base, ok: false, reason: "parse-error" };
  }
  const parsed = parseTokenBudget(json);
  if (!parsed.ok) {
    return { ...base, ok: false, reason: parsed.reason };
  }
  // The sidecar's internal `stale` flag is distinct from loadFile's
  // age-based `stale` flag (the former tracks 180s data freshness from
  // U-TA01..12; the latter tracks 24h-default file-age). Preserve both —
  // file `stale` from loadFile; merge sidecar-reported staleness via OR.
  return {
    ...base,
    ok: true,
    reason: null,
    ...parsed,
    stale: base.stale || parsed.stale,
  };
}

// ============================================================================
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-06 — Sweep composition + cache layer
// ============================================================================
// The integration unit. `loadSlotContext(slot, opts)` calls all 5 MS0 readers
// and returns the bundle in a single envelope so the Zebra sweep's
// `planSlotAction(slot, ctx)` can branch on rich inputs without each
// consumer re-implementing fs reads.
//
// Acceptance criteria from ZEBRA-OMNISCIENT-MS0-PLAN §7:
//   - Tests pin: loop-state-running suppresses /compact; soul refuse_list
//     filters; token-zone overrides G3 wait length.
//   - Sweep wall-time under load (26 slots, warm cache, all surfaces present)
//     ≤ 30s p95.
//
// Design: composite reader is fail-soft on EVERY surface (any one missing
// degrades to the legacy boolean path; never throws). Returns a stable
// envelope with `surfaces.<name>` sub-envelopes so callers can inspect
// per-surface health.

// Helper: shape a generic per-surface envelope into the bundle shape.
// Preserves ok/reason from each surface without unwrapping all fields.
function bundleSurface(surfaceEnv) {
  return {
    ok: surfaceEnv?.ok === true,
    reason: surfaceEnv?.reason ?? null,
    stale: surfaceEnv?.stale === true,
    mtime: surfaceEnv?.mtime ?? null,
  };
}

// loadSlotContext(slot, opts) — full 5-surface bundle for the Zebra sweep.
//
// Args:
//   slot — NATO slot name; validated against KNOWN_SLOTS.
//   opts — { sessionId?, reader?, now?, ttlMs?, briefPath?, visionPath?,
//            roadmapPath?, soulsDir?, loopDir?, tokenBudgetDir? }
//
// Returns:
//   { ok, reason, slot, sessionId, composedAt,
//     brief, vision, bridgeUnits, soul, loop, tokenZone,
//     surfaces: {brief, vision, bridgeUnits, soul, loop, tokenZone},
//     decision: {recommend, rationale, suppressCompact, allowedSuggestions} }
//
// `decision` is the Zebra-orchestrator-facing recommendation derived from the
// bundle. Per ZEBRA-OMNISCIENT-MS0-PLAN §3, this stays SUGGESTION-only —
// never executes; G4 operator-gate doctrine preserved.
export function loadSlotContext(slot, opts = {}) {
  const composedAt = typeof opts.now === "function" ? opts.now() : Date.now();

  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return {
      ok: false, reason: "disabled-env",
      slot: null, sessionId: null, composedAt,
      brief: null, vision: null, bridgeUnits: null, soul: null, loop: null, tokenZone: null,
      surfaces: {},
      decision: { recommend: "noop", rationale: "context-bundle-disabled",
                  suppressCompact: true, allowedSuggestions: [] },
    };
  }

  const norm = typeof slot === "string" ? slot.trim().toLowerCase() : "";
  if (!norm || !KNOWN_SLOTS.includes(norm)) {
    return {
      ok: false, reason: "invalid-slot",
      slot: null, sessionId: null, composedAt,
      brief: null, vision: null, bridgeUnits: null, soul: null, loop: null, tokenZone: null,
      surfaces: {},
      decision: { recommend: "noop", rationale: "invalid-slot",
                  suppressCompact: true, allowedSuggestions: [] },
    };
  }

  // Read all 5 surfaces. Each is fail-soft; we surface per-surface ok via
  // `surfaces.<name>.ok`. Top-level ok is true only if at least the soul
  // surface resolves (the hard-constraint input — without refuse_list we
  // can't safely emit any suggestion).
  const brief = loadBrief(opts);
  const vision = loadVision(opts);
  const bridgeUnits = loadBridgeUnits(opts);
  const soul = loadSlotSoulRefuseList(norm, opts);
  // Loop-state requires sessionId; if absent, return no-loop without crashing.
  const sessionId = typeof opts.sessionId === "string" ? opts.sessionId : null;
  const loop = sessionId
    ? loadLoopState(sessionId, opts)
    : {
        ok: false, reason: "no-session-id", sessionId: null, running: false,
        iter: 0, target: null, status: null, task: null,
        startedAt: null, lastTickAt: null,
        mtime: null, ageSeconds: null, stale: false, path: "", source: "fresh",
      };
  const tokenZone = loadTokenAwarenessZone(norm, opts);

  // Derive a Zebra-orchestrator-facing decision from the bundle.
  // This is the LIBRARY-LAYER recommendation; the actual `decideSlotAction`
  // lives in MS1. Today MS0 only ships these advisory fields so consumers
  // can wire them up incrementally.
  const decision = deriveZebraDecision({
    soul, loop, tokenZone, bridgeUnits,
  });

  return {
    ok: soul.ok === true,
    reason: soul.ok === true ? null : "soul-required",
    slot: norm,
    sessionId,
    composedAt,
    brief, vision, bridgeUnits, soul, loop, tokenZone,
    surfaces: {
      brief: bundleSurface(brief),
      vision: bundleSurface(vision),
      bridgeUnits: bundleSurface(bridgeUnits),
      soul: bundleSurface(soul),
      loop: bundleSurface(loop),
      tokenZone: bundleSurface(tokenZone),
    },
    decision,
  };
}

// Pure decision derivation — exported for tests so callers can verify the
// suggestion-emission contract independently of disk I/O.
//
// Contract per ZEBRA-OMNISCIENT-MS0-PLAN §3 + §6:
//   - recommend ∈ {"clear", "compact", "noop"}
//   - suppressCompact: true when loop is running OR token-zone is GREEN+fresh
//     (mid-loop /compact bug fix)
//   - allowedSuggestions: future MS1 ADT kinds the soul DOESN'T refuse
//     (post-filter, never pre-filter — preserves operator-gate doctrine)
export function deriveZebraDecision({ soul, loop, tokenZone, bridgeUnits } = {}) {
  // Default: noop, no suggestions, no compact suppression
  const decision = {
    recommend: "noop",
    rationale: "default",
    suppressCompact: false,
    allowedSuggestions: [],
  };

  // If soul is missing/invalid, suggest nothing — soul is the hard-constraint.
  if (!soul || !soul.ok) {
    decision.rationale = "no-soul";
    decision.suppressCompact = true;
    return decision;
  }

  // Mid-loop suppression — loop-running is a HARD signal that this slot is
  // actively working. Never /compact a running loop.
  if (loop && loop.ok === true && loop.running === true) {
    decision.recommend = "noop";
    decision.rationale = "loop-running";
    decision.suppressCompact = true;
    return decision;
  }

  // Token-zone overrides:
  //   GREEN  → never /compact (suppression on)
  //   YELLOW → /compact only with corroborating signal (sweep adds it)
  //   RED    → /compact immediately
  //   CRITICAL → /compact immediately + escalate
  //   UNKNOWN/missing → leave to default boolean path (G3 wait)
  //
  // STALE override (reviewer P1-1): if the sidecar's own data-freshness
  // flag is stale (>180s default per TOKEN-AWARENESS-MS0), demote RED/CRITICAL
  // to noop. A dead sidecar pinning a slot in "always compact" off a stale
  // reading is worse than missing the compact entirely.
  if (tokenZone && tokenZone.ok === true) {
    if (tokenZone.zone === "GREEN") {
      decision.suppressCompact = true;
      decision.rationale = "token-zone-green";
    } else if (tokenZone.zone === "RED" || tokenZone.zone === "CRITICAL") {
      if (tokenZone.stale === true) {
        decision.recommend = "noop";
        decision.rationale = `token-zone-${tokenZone.zone.toLowerCase()}-but-stale`;
        decision.suppressCompact = true;
      } else {
        decision.recommend = "compact";
        decision.rationale = `token-zone-${tokenZone.zone.toLowerCase()}`;
      }
    }
  }

  // Compute allowed-suggestions list (post-filter via soul refuse_list).
  // Today this is the static MS1 ADT list; MS2 will weight it by goal-state.
  const ALL_SUGGESTIONS = ["suggest-pick", "suggest-handoff", "suggest-fork", "suggest-skill"];
  const refused = new Set(soul.refuseList || []);
  decision.allowedSuggestions = ALL_SUGGESTIONS.filter(s => !refused.has(s));

  // If the bundle has bridge_units AND the slot is not mid-loop, surface a
  // "suggest-pick" hint via the recommendation rationale (not the action —
  // operator approves keystroke per G4).
  if (bridgeUnits && bridgeUnits.ok === true && (bridgeUnits.bridgeUnits || []).length > 0
      && decision.allowedSuggestions.includes("suggest-pick")
      && decision.recommend !== "compact") {
    decision.rationale += ";bridge-units-available";
  }

  return decision;
}

// findActiveLoops(opts) — fleet-level scan.
// Returns { ok, reason, active: [{sessionId, iter, target, task, lastTickAt}], scanned, skipped }.
// "active" includes only status === "running" loops, sorted by lastTickAt DESC.
// Used by the Zebra sweep to avoid /compact on any slot whose session has a
// running loop. Reader-injectable for tests via opts.readdir + opts.reader.
//
// IMPORTANT: intentionally bypasses `loadFile`'s TTL cache — fleet-wide scan
// must see fresh ticks each call (correctness > token cost). Other sweeps
// that need a loop's full envelope can call `loadLoopState(sid)` which DOES
// use the cache. A future maintainer must not "helpfully" route this
// through `loadFile` (Reviewer B P1-E).
export function findActiveLoops(opts = {}) {
  if (process.env.PRISM_ZEBRA_CONTEXT_DISABLE === "1") {
    return { ok: false, reason: "disabled-env", active: [], scanned: 0, skipped: 0 };
  }
  const loopDir = typeof opts.loopDir === "string" && opts.loopDir
    ? opts.loopDir
    : DEFAULT_LOOP_STATE_DIR;
  // Default readdir distinguishes ENOENT (missing dir) from EACCES + other
  // errors so operators investigating "Zebra missed my loop" get the right
  // signal (Reviewer B P1-D).
  const readdir = typeof opts.readdir === "function"
    ? opts.readdir
    : (dir) => {
        try { return { ok: true, names: fs.readdirSync(dir) }; }
        catch (e) {
          const code = e?.code || null;
          return { ok: false, code };
        }
      };
  const reader = typeof opts.reader === "function" ? opts.reader : defaultReader;

  const dirResult = readdir(loopDir);
  // Back-compat with injected readdir that returns the array directly OR
  // null. Synthetic tests passing `() => ["loop-..."]` keep working.
  let entries;
  if (Array.isArray(dirResult)) {
    entries = dirResult;
  } else if (dirResult === null) {
    return { ok: false, reason: "loop-dir-missing", active: [], scanned: 0, skipped: 0 };
  } else if (dirResult && dirResult.ok) {
    entries = dirResult.names;
  } else {
    const reason = dirResult?.code === "ENOENT" || !dirResult?.code
      ? "loop-dir-missing"
      : "loop-dir-error";
    return { ok: false, reason, active: [], scanned: 0, skipped: 0 };
  }

  const active = [];
  let scanned = 0;
  let skipped = 0;
  for (const name of entries) {
    if (typeof name !== "string") continue;
    const m = name.match(/^loop-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.json$/i);
    if (!m) continue;
    scanned += 1;
    const sessionId = m[1];
    const filePath = path.join(loopDir, name);
    // try/catch around the injected reader — a misbehaving reader cannot
    // crash the whole fleet scan (Reviewer B P1-D).
    let r;
    try { r = reader(filePath); }
    catch { skipped += 1; continue; }
    if (!r || !r.ok) { skipped += 1; continue; }
    const json = safeJsonParse(r.content);
    if (json === null) { skipped += 1; continue; }
    const parsed = parseLoopState(json);
    if (parsed.ok && parsed.running) {
      active.push({
        sessionId,
        iter: parsed.iter,
        target: parsed.target,
        task: parsed.task,
        lastTickAt: parsed.lastTickAt,
      });
    }
  }

  // Sort newest-first by lastTickAt. Null/falsy timestamps sink to the
  // bottom. Stable when both are equal (Node sort is stable since v10).
  active.sort((a, b) => {
    if (a.lastTickAt === b.lastTickAt) return 0;
    if (!a.lastTickAt) return 1;
    if (!b.lastTickAt) return -1;
    return a.lastTickAt < b.lastTickAt ? 1 : -1;
  });

  return { ok: true, reason: null, active, scanned, skipped };
}
