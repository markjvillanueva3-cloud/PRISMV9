#!/usr/bin/env node
// tier: T2 — slot:sierra custom system-viz graph-health inject (U-PSGB-SIERRA 2026-05-29).
// UserPromptSubmit hook. SLOT-GATED no-op for every slot except sierra (zero blast radius
// for 25/26 slots). Surfaces LIVE system-viz graph-regen health (last-success vs last-failure,
// graph size, pendingCount, the exit-134 merge-OOM class) so slot:sierra knows whether the
// canonical graph is safe to touch BEFORE acting. The graph is the fleet search substrate
// ([[feedback_sierra_graph_correctness_is_fleet_search]]) so a stale/failed graph is fleet-wide.
// Fail-soft (never throws / never blocks; every error path -> {continue:true}, exit 0).
// Knob: PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const VIZ = `${PRISM}/state/shared/system-viz`;
const SURFACE_WINDOW_MS = 24 * 3.6e6; // cross-substrate surface window (drift + embeds blocks; half-open, parity)

function safeJsonRead(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function resolveSlot(sessionId, doc) {
  if (!sessionId || !doc || !doc.slots) return null;
  for (const [name, data] of Object.entries(doc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    const short = data.chatId && data.chatId.replace(/^claude-/, "");
    if (short && sessionId.startsWith(short)) return name;
  }
  return null;
}

/**
 * Format the cross-substrate embeds-degradation warning line from the A3 sidecar
 * (state/shared/system-viz/cross-substrate-warnings.json, written by
 * generate-cross-substrate-edges.mjs via buildDegradationWarnings). Pure + total:
 * returns a single-line markdown suffix (leading newline + "- ") or null when there
 * is nothing recent to surface. A 24h window on `at` matches the drift block (alert
 * for a day, then quiet) -- a stale warning is already covered by the staleness
 * verdict rendered above. Exported for unit testing.
 * @param {object|null} warn - parsed sidecar { at, warnings:string[], embedsEdges, oracleLoaded }
 * @param {number} now - Date.now() (injected for deterministic tests)
 * @returns {string|null}
 */
export function formatEmbedsWarning(warn, now) {
  if (!warn || typeof warn !== "object") return null;
  if (!Array.isArray(warn.warnings) || warn.warnings.length === 0) return null;
  const warnT = warn.at ? Date.parse(warn.at) : 0;
  if (!Number.isFinite(warnT) || warnT === 0) return null;
  if (now - warnT >= SURFACE_WINDOW_MS) return null; // stale -> staleness verdict already covers it
  const n = warn.warnings.length;
  const head = String(warn.warnings[0]);
  const more = n > 1 ? ` (+${n - 1} more)` : "";
  const edges = warn.embedsEdges != null ? warn.embedsEdges : "?";
  const oracle = warn.oracleLoaded === true ? "yes" : "no";
  return `\n- ⚠ cross-substrate embeds DEGRADED (last 24h): ${head}${more}. embedsEdges=${edges} oracleLoaded=${oracle}. Build the offset oracle (\`node scripts/build-card-offset-index.mjs\`) then regen \`node scripts/generate-cross-substrate-edges.mjs\` ([[cross-substrate-embeds-and-docby-oracle]]).`;
}

/**
 * Format the augmentation-freshness line from the .augmentation-freshness.json sidecar
 * (written by audit-augmentation-freshness.mjs, refreshed each regen). Surfaces
 * "stale-orphan" augmentations -- files the MERGE folds into the graph but with no fresh
 * producer, so their stale data keeps folding in every regen. This closes the
 * GREEN-badge-masks-rotting-inputs gap: GREEN means the graph was RE-MERGED recently, not
 * that its augmentation INPUTS are fresh (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21).
 * 24h window (parity with the drift/embeds blocks); the regen-viz post-merge audit keeps
 * the sidecar current. Pure + total. Exported for unit testing.
 * @param {object|null} sc - parsed sidecar { at, summary:{ staleOrphan, orphanList } }
 * @param {number} now - Date.now() (injected for deterministic tests)
 * @returns {string|null}
 */
export function formatAugmentationStaleness(sc, now) {
  if (!sc || typeof sc !== "object" || !sc.summary) return null;
  const n = Number(sc.summary.staleOrphan);
  if (!Number.isFinite(n) || n <= 0) return null;
  const t = sc.at ? Date.parse(sc.at) : 0;
  if (!Number.isFinite(t) || t === 0 || now - t >= SURFACE_WINDOW_MS) return null; // stale sidecar -> covered by the health verdict
  const list = Array.isArray(sc.summary.orphanList) ? sc.summary.orphanList : [];
  const head = list.slice(0, 3).join(", ");
  const more = list.length > 3 ? ` (+${list.length - 3} more)` : "";
  return `\n- ⚠ ${n} merged augmentation(s) STALE-ORPHAN (stale data folding into the live graph): ${head}${more}. GREEN = re-merge recency, NOT input freshness. Audit: \`node scripts/audit-augmentation-freshness.mjs\`; fix by re-wiring the generator into regen-viz or removing its loadOptional() from merge-augmentations.mjs ([[reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21]]).`;
}

function renderBlock() {
  const ok = safeJsonRead(`${VIZ}/.last-successful-regen.json`);
  const fail = safeJsonRead(`${VIZ}/.last-regen-failure.json`);
  if (!ok && !fail) return null;
  const okT = ok && ok.ts ? Date.parse(ok.ts) : 0;
  const failT = fail && fail.ts ? Date.parse(fail.ts) : 0;
  const healthy = okT >= failT;
  const mb = ok && ok.graphBytes ? Math.round(ok.graphBytes / 1e6) : "?";
  const ageH = okT ? ((Date.now() - okT) / 3.6e6).toFixed(1) : "?";
  const verdict = healthy ? (Number(ageH) > 24 ? "🟡 STALE" : "🟢 GREEN") : "🔴 FAILED-LAST";
  let line = `## 🛰️ system-viz graph health (sierra)\n- ${verdict} — last good regen ${ageH}h ago · ${mb}MB · pending=${ok && ok.pendingCount != null ? ok.pendingCount : "?"} · sidecar=${ok && ok.sidecarOk != null ? ok.sidecarOk : "?"}`;
  if (!healthy && fail) {
    line += `\n- ⚠ most recent run FAILED: stage="${fail.stage}" exit=${fail.exitCode}${fail.exitCode === 134 ? " (merge-augmentations OOM class — [[reference_sierra_graph_oom_classes]])" : ""}. Re-run \`node scripts/regen-viz.mjs\` before trusting downstream.`;
  }
  // cross-substrate edge-spine DRIFT (U-XSUB-DRIFT-DETECT): surface a RECENT silent
  // edge-type collapse (the documented-by 320->0 class) so a sierra session SEES it
  // -- the detector logs to this sidecar; a 24h window bounds the noise (alert for a
  // day, then quiet). This is the surface the headless regen-log drift warning lacked.
  try {
    const drift = safeJsonRead(`${VIZ}/cross-substrate-drift.json`);
    const last = drift && Array.isArray(drift.events) && drift.events.length ? drift.events[drift.events.length - 1] : null;
    const lastT = last && last.at ? Date.parse(last.at) : 0;
    if (last && lastT && Date.now() - lastT < SURFACE_WINDOW_MS && Array.isArray(last.events) && last.events.length) {
      const ev = last.events.map((e) => `${e.type} ${e.baseline}->${e.current} (${e.severity})`).join(", ");
      line += `\n- ⚠ cross-substrate edge DRIFT (last 24h): ${ev}. A typed edge collapsed -- check its source/confirmation ([[cross-substrate-embeds-and-docby-oracle]]); regen \`node scripts/generate-cross-substrate-edges.mjs\`.`;
    }
  } catch { /* drift surfacing is best-effort */ }

  // cross-substrate embeds DEGRADATION (U-SVH-XSUB-SURFACE): the A3 generator writes
  // structured degradation warnings to cross-substrate-warnings.json when the embeds
  // edge-type silently collapses (offset-oracle absent / a source jsonl absent / 0
  // edges confirmed). Without surfacing it the sidecar is itself silent -- the exact
  // silent-GREEN class A3 was built to kill, one level up. Pure helper + 24h window
  // (parity with the drift block above).
  try {
    const warnLine = formatEmbedsWarning(safeJsonRead(`${VIZ}/cross-substrate-warnings.json`), Date.now());
    if (warnLine) line += warnLine;
  } catch { /* embeds-warning surfacing is best-effort */ }

  // augmentation-input STALENESS (U-VIZ-AUG-FRESHNESS-GUARD): the regen-viz post-merge
  // audit writes .augmentation-freshness.json; surface any stale-orphan so the GREEN
  // badge cannot mask a merged-but-stale augmentation folding stale data into the graph.
  try {
    const augLine = formatAugmentationStaleness(safeJsonRead(`${VIZ}/.augmentation-freshness.json`), Date.now());
    if (augLine) line += augLine;
  } catch { /* augmentation-staleness surfacing is best-effort */ }
  line += `\n_Custom sierra awareness. Disable: PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1._`;
  return line;
}

async function main() {
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let env; try { env = JSON.parse(stdin); } catch { env = {}; }
  const sessionId = env.session_id || env.sessionId || null;
  const out = (o) => process.stdout.write(JSON.stringify(o));

  if (process.env.PRISM_SIERRA_GRAPH_HEALTH_DISABLE === "1") return out({ continue: true });

  const slot = resolveSlot(sessionId, safeJsonRead(SLOTS_FILE));
  if (slot !== "sierra") return out({ continue: true });

  let block;
  try { block = renderBlock(); } catch { return out({ continue: true }); }
  if (!block) return out({ continue: true });
  return out({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: block } });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
