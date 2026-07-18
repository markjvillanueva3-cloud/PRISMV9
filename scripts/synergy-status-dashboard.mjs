#!/usr/bin/env node
/**
 * synergy-status-dashboard.mjs — one-shot health snapshot across the named
 * PRISM synergy surfaces: bridge-synergy roost, build-state (wired vs
 * unwired engines), chat-slot bindings.
 *
 * Backend dev tool. Read-only. No PRISM-engine imports — only node:fs/path.
 * Each source reader gracefully degrades on missing/malformed input (R12-
 * soft per-surface, R12-loud on bad CLI args). A future caller can add more
 * sources by appending one entry to SOURCES — the orchestrator is uniform.
 *
 * Created 2026-05-19 slot kilo per /goal synergize-everything /loop iter
 * 1/20. Closes the discoverability gap surfaced by the prior turn's
 * /system-viz audit: 42 curated bridges, 40 still ghost — the operator
 * has no one-call view of which surfaces are "synergized" and which are
 * pending. This dashboard answers that in one command.
 *
 * Usage:
 *   node scripts/synergy-status-dashboard.mjs            # human markdown
 *   node scripts/synergy-status-dashboard.mjs --json     # machine-readable
 *   node scripts/synergy-status-dashboard.mjs --terse    # one-line per surface
 *   node scripts/synergy-status-dashboard.mjs --repo-root <path>
 *   node scripts/synergy-status-dashboard.mjs --help
 *
 * Exit codes: 0 ok · 1 bad CLI args.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA_VERSION = "1.0.0";

// Canonical paths — pinned to current PRISM layout. If any of these move,
// the surface reader returns ok=false with a descriptive error, never
// crashes. A future PR can update the constants without changing reader
// shape.
const BRIDGE_AUG_REL = "state/shared/system-viz/bridge-synergy-augmentation.json";
const BUILD_STATE_REL = "state/shared/BUILD_STATE.json";
const CHAT_SLOTS_REL = "state/shared/chat-slots.json";

const HELP_TEXT = `synergy-status-dashboard — multi-source synergy health snapshot

  --json              machine-readable JSON on stdout
  --terse             one-line per surface (default: full markdown)
  --repo-root PATH    override repo root (default: parent of this script's dir)
  -h, --help          this text

Surfaces:
  • bridgeSynergy   — 42-bridge curated roost: built / partial / ghost
  • buildState      — wired vs unwired engines (from BUILD_STATE.json)
  • chatSlots       — current slot claims across the 26-slot fleet
`;

/**
 * Parse argv into typed opts. Unknown flag throws — R12-loud per the
 * fail-fast contract documented above.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {{help: boolean, json: boolean, terse: boolean, repoRoot: string | null}} */
  const out = { help: false, json: false, terse: false, repoRoot: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { out.help = true; continue; }
    if (a === "--json") { out.json = true; continue; }
    if (a === "--terse") { out.terse = true; continue; }
    if (a === "--repo-root") {
      const v = argv[++i];
      if (!v || typeof v !== "string" || v.startsWith("--")) {
        throw new Error("--repo-root requires a path value");
      }
      out.repoRoot = v;
      continue;
    }
    throw new Error(`unknown argument: ${a} (use --help)`);
  }
  return out;
}

// ─── source readers ────────────────────────────────────────────────
//
// Convention: every reader returns `{ ok: boolean, source: string, error?: string, ...payload }`.
// Never throws. Tests pass an injected `readFileSyncImpl` to make them
// hermetic; real callers default to node:fs.

/**
 * Read the bridge-synergy augmentation JSON and tally built / partial /
 * ghost bridge-units. Empty file or missing roost → ghost-only verdict.
 *
 * @param {string} repoRoot
 * @param {(p: string, enc?: string) => string} [readImpl]
 * @param {(p: string) => boolean} [existsImpl]
 */
export function readBridgeSynergy(repoRoot, readImpl = readFileSync, existsImpl = existsSync) {
  const path = resolve(repoRoot, BRIDGE_AUG_REL);
  if (!existsImpl(path)) {
    return { ok: false, source: BRIDGE_AUG_REL, error: "source missing — run scripts/generate-bridge-synergy-features.mjs first" };
  }
  let parsed;
  try {
    parsed = JSON.parse(readImpl(path, "utf8"));
  } catch (e) {
    return { ok: false, source: BRIDGE_AUG_REL, error: `json parse failed: ${(e && e.message) || String(e)}` };
  }
  const nodes = Array.isArray(parsed && parsed.newNodes) ? parsed.newNodes : [];
  let built = 0, partial = 0, ghost = 0;
  for (const n of nodes) {
    if (!n || n.kind !== "bridge-unit") continue;
    if (n.status === "built") built++;
    else if (n.status === "partial") partial++;
    else ghost++;
  }
  const total = built + partial + ghost;
  return {
    ok: true,
    source: BRIDGE_AUG_REL,
    total,
    built,
    partial,
    ghost,
    pctBuilt: total > 0 ? Math.round((built / total) * 1000) / 10 : 0,
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
  };
}

/**
 * Read BUILD_STATE.json and surface wired/unwired counts + frontend pending.
 *
 * @param {string} repoRoot
 */
export function readBuildState(repoRoot, readImpl = readFileSync, existsImpl = existsSync) {
  const path = resolve(repoRoot, BUILD_STATE_REL);
  if (!existsImpl(path)) {
    return { ok: false, source: BUILD_STATE_REL, error: "source missing" };
  }
  let parsed;
  try {
    parsed = JSON.parse(readImpl(path, "utf8"));
  } catch (e) {
    return { ok: false, source: BUILD_STATE_REL, error: `json parse failed: ${(e && e.message) || String(e)}` };
  }
  // BUILD_STATE shape varies across versions; defensive .get-style access.
  // Current schema (1.0.0) keeps scalar counts under `headline`; older shapes
  // used top-level / `summary` keys — pickNumber probes all of them.
  const wired = pickNumber(parsed, ["wiredCount", "BUILT_AND_WIRED", "wired", "built_engines"]);
  const unwired = pickNumber(parsed, ["unwiredCount", "NEEDS_WIRING", "unwired", "needs_wiring"]);
  const frontendPending = pickNumber(parsed, [
    "frontendPending",
    "NEEDS_FRONTEND",
    "frontend",
    "needs_frontend_merge_count",
  ]);
  const total = (wired ?? 0) + (unwired ?? 0);
  return {
    ok: true,
    source: BUILD_STATE_REL,
    wired: wired ?? null,
    unwired: unwired ?? null,
    frontendPending: frontendPending ?? null,
    coveragePct: total > 0 && wired != null ? Math.round((wired / total) * 1000) / 10 : null,
  };
}

/**
 * Read chat-slots.json and surface which of the 26 slots are claimed,
 * with stale-heartbeat detection (≥5 min = stale advisory).
 *
 * @param {string} repoRoot
 */
export function readChatSlots(repoRoot, readImpl = readFileSync, existsImpl = existsSync, now = () => Date.now()) {
  const path = resolve(repoRoot, CHAT_SLOTS_REL);
  if (!existsImpl(path)) {
    return { ok: false, source: CHAT_SLOTS_REL, error: "source missing" };
  }
  let parsed;
  try {
    parsed = JSON.parse(readImpl(path, "utf8"));
  } catch (e) {
    return { ok: false, source: CHAT_SLOTS_REL, error: `json parse failed: ${(e && e.message) || String(e)}` };
  }
  const slots = parsed && typeof parsed === "object" && parsed.slots && typeof parsed.slots === "object"
    ? parsed.slots : {};
  const STALE_MS = 5 * 60 * 1000;
  const t = now();
  /** @type {Array<{ name: string, chatId: string, ageMs: number, stale: boolean, topic: string }>} */
  const active = [];
  let claimed = 0, stale = 0;
  for (const name of Object.keys(slots)) {
    const s = slots[name];
    if (!s || typeof s !== "object" || !s.chatId) continue;
    claimed++;
    const last = typeof s.lastHeartbeat === "string" ? Date.parse(s.lastHeartbeat) : NaN;
    const ageMs = Number.isFinite(last) ? t - last : Number.POSITIVE_INFINITY;
    const isStale = ageMs > STALE_MS;
    if (isStale) stale++;
    active.push({
      name,
      chatId: s.chatId,
      ageMs: Number.isFinite(ageMs) ? ageMs : -1,
      stale: isStale,
      topic: typeof s.topic === "string" ? s.topic : "",
    });
  }
  // Sort newest heartbeat first
  active.sort((a, b) => a.ageMs - b.ageMs);
  return {
    ok: true,
    source: CHAT_SLOTS_REL,
    schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : null,
    totalSlots: Object.keys(slots).length,
    claimed,
    stale,
    active,
  };
}

/**
 * Helper: pull the first non-null numeric value from `obj` matching any of
 * the candidate keys. Tolerant of object-of-objects shapes by also looking
 * one level deep under common container names ("summary", "totals").
 *
 * @param {unknown} obj
 * @param {readonly string[]} keys
 * @returns {number | null}
 */
export function pickNumber(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (obj);
  for (const k of keys) {
    if (typeof o[k] === "number" && Number.isFinite(o[k])) return /** @type {number} */ (o[k]);
  }
  // Look one level deep under common container names.
  for (const container of ["summary", "totals", "counts", "headline"]) {
    const sub = o[container];
    if (sub && typeof sub === "object") {
      for (const k of keys) {
        const v = /** @type {Record<string, unknown>} */ (sub)[k];
        if (typeof v === "number" && Number.isFinite(v)) return v;
      }
    }
  }
  return null;
}

// ─── aggregator ────────────────────────────────────────────────────

/**
 * Build the full snapshot. Each surface reader runs in isolation; one
 * failure does not block the others.
 *
 * @param {string} repoRoot
 * @param {{ readImpl?: typeof readFileSync, existsImpl?: typeof existsSync, now?: () => number, frozenTime?: string }} [opts]
 */
export function buildSnapshot(repoRoot, opts = {}) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    throw new TypeError("buildSnapshot(): repoRoot must be a non-empty string");
  }
  const readImpl = opts.readImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  const now = opts.now || (() => Date.now());
  const generatedAt = opts.frozenTime || new Date(now()).toISOString();

  const surfaces = {
    bridgeSynergy: readBridgeSynergy(repoRoot, readImpl, existsImpl),
    buildState: readBuildState(repoRoot, readImpl, existsImpl),
    chatSlots: readChatSlots(repoRoot, readImpl, existsImpl, now),
  };

  // Compute a simple health score: fraction of surfaces that read ok, plus
  // a bonus for bridge-synergy progress (built / total).
  const surfaceCount = Object.keys(surfaces).length;
  const okCount = Object.values(surfaces).filter((s) => s.ok).length;
  let bridgeBonus = 0;
  if (surfaces.bridgeSynergy.ok && surfaces.bridgeSynergy.total > 0) {
    bridgeBonus = surfaces.bridgeSynergy.built / surfaces.bridgeSynergy.total;
  }
  const score = Math.round(((okCount / surfaceCount) * 0.7 + bridgeBonus * 0.3) * 1000) / 1000;

  /** @type {string[]} */
  const issues = [];
  /** @type {string[]} */
  const recommendations = [];

  for (const [name, s] of Object.entries(surfaces)) {
    if (!s.ok) issues.push(`${name}: ${s.error}`);
  }
  if (surfaces.bridgeSynergy.ok) {
    const bs = surfaces.bridgeSynergy;
    if (bs.ghost > 0) {
      issues.push(`bridge-synergy: ${bs.ghost}/${bs.total} bridges still ghost (no detector entry or unshipped)`);
      recommendations.push("extend EVIDENCE_TABLE in scripts/lib/bridge-evidence-detector.mjs with detectors for shipped bridges");
    }
  }
  if (surfaces.buildState.ok && surfaces.buildState.unwired != null && surfaces.buildState.unwired > 0) {
    issues.push(`build-state: ${surfaces.buildState.unwired} unwired engines`);
    recommendations.push("pick a bridge from U-BRIDGE-WIRE-* family (e.g. lathe = 82 engines, other = 131 engines)");
  }
  if (surfaces.chatSlots.ok && surfaces.chatSlots.stale > 0) {
    issues.push(`chat-slots: ${surfaces.chatSlots.stale}/${surfaces.chatSlots.claimed} claimed slots have stale heartbeats (≥5min)`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    repoRoot,
    surfaces,
    health: { score, okCount, surfaceCount, issues, recommendations },
  };
}

// ─── renderers ─────────────────────────────────────────────────────

/**
 * Render the snapshot as human-readable markdown (default mode).
 *
 * @param {ReturnType<typeof buildSnapshot>} snap
 * @returns {string}
 */
export function renderMarkdown(snap) {
  const L = [];
  L.push(`# Synergy Status Dashboard — ${snap.generatedAt}`);
  L.push("");
  L.push(`**Health score:** ${snap.health.score.toFixed(3)}  (surfaces ok: ${snap.health.okCount}/${snap.health.surfaceCount})`);
  L.push("");

  L.push("## Surfaces");
  L.push("");
  // bridgeSynergy
  const bs = snap.surfaces.bridgeSynergy;
  if (bs.ok) {
    L.push(`- **bridgeSynergy** — ${bs.built} built · ${bs.partial} partial · ${bs.ghost} ghost (of ${bs.total} bridges, ${bs.pctBuilt}% built)`);
    if (bs.generatedAt) L.push(`  - aug generated: ${bs.generatedAt}`);
  } else {
    L.push(`- **bridgeSynergy** — ✗ ${bs.error}`);
  }
  // buildState
  const bst = snap.surfaces.buildState;
  if (bst.ok) {
    const cov = bst.coveragePct != null ? `${bst.coveragePct}%` : "?";
    L.push(`- **buildState** — ${bst.wired ?? "?"} wired · ${bst.unwired ?? "?"} unwired · coverage ${cov} · frontend pending: ${bst.frontendPending ?? "?"}`);
  } else {
    L.push(`- **buildState** — ✗ ${bst.error}`);
  }
  // chatSlots
  const cs = snap.surfaces.chatSlots;
  if (cs.ok) {
    L.push(`- **chatSlots** — ${cs.claimed}/${cs.totalSlots} claimed · ${cs.stale} stale (schema v${cs.schemaVersion ?? "?"})`);
    if (cs.active.length > 0) {
      L.push("  - active (freshest first):");
      for (const a of cs.active.slice(0, 6)) {
        const ageMin = a.ageMs >= 0 ? Math.round(a.ageMs / 1000 / 60) : "?";
        const flag = a.stale ? " ⚠ stale" : "";
        L.push(`    - ${a.name} → ${a.chatId} (${ageMin}min)${flag} ${a.topic ? `[${a.topic}]` : ""}`);
      }
    }
  } else {
    L.push(`- **chatSlots** — ✗ ${cs.error}`);
  }
  L.push("");

  if (snap.health.issues.length > 0) {
    L.push("## Issues");
    L.push("");
    for (const i of snap.health.issues) L.push(`- ${i}`);
    L.push("");
  }
  if (snap.health.recommendations.length > 0) {
    L.push("## Recommendations");
    L.push("");
    for (const r of snap.health.recommendations) L.push(`- ${r}`);
    L.push("");
  }
  return L.join("\n");
}

/**
 * Terse one-line-per-surface mode for log scraping / grep-able output.
 *
 * @param {ReturnType<typeof buildSnapshot>} snap
 * @returns {string}
 */
export function renderTerse(snap) {
  const L = [];
  L.push(`health=${snap.health.score} ok=${snap.health.okCount}/${snap.health.surfaceCount}`);
  const bs = snap.surfaces.bridgeSynergy;
  L.push(bs.ok
    ? `bridgeSynergy: ${bs.built}/${bs.partial}/${bs.ghost} (built/partial/ghost of ${bs.total})`
    : `bridgeSynergy: ERR ${bs.error}`);
  const bst = snap.surfaces.buildState;
  L.push(bst.ok
    ? `buildState: wired=${bst.wired} unwired=${bst.unwired} coverage=${bst.coveragePct ?? "?"}%`
    : `buildState: ERR ${bst.error}`);
  const cs = snap.surfaces.chatSlots;
  L.push(cs.ok
    ? `chatSlots: claimed=${cs.claimed}/${cs.totalSlots} stale=${cs.stale}`
    : `chatSlots: ERR ${cs.error}`);
  return L.join("\n");
}

// ─── main / CLI ────────────────────────────────────────────────────

/**
 * @param {string[]} argv
 * @param {{ stdout?: (s: string) => void, stderr?: (s: string) => void, cwd?: string, scriptDir?: string }} [io]
 */
export function main(argv, io = {}) {
  const stdout = io.stdout || ((s) => process.stdout.write(s + "\n"));
  const stderr = io.stderr || ((s) => process.stderr.write(s + "\n"));
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    stderr(`error: ${(e && e.message) || String(e)}`);
    stderr("");
    stderr(HELP_TEXT);
    return { ok: false, exitCode: 1 };
  }
  if (opts.help) {
    stdout(HELP_TEXT);
    return { ok: true, exitCode: 0 };
  }
  const here = io.scriptDir || dirname(fileURLToPath(import.meta.url));
  const repoRoot = opts.repoRoot ? resolve(opts.repoRoot) : resolve(here, "..");
  const snap = buildSnapshot(repoRoot);
  if (opts.json) {
    stdout(JSON.stringify(snap, null, 2));
  } else if (opts.terse) {
    stdout(renderTerse(snap));
  } else {
    stdout(renderMarkdown(snap));
  }
  return { ok: true, exitCode: 0, snapshot: snap };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const r = main(process.argv.slice(2));
  process.exit(r.exitCode);
}
