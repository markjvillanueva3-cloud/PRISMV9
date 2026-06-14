#!/usr/bin/env node
// tier: T2
// .claude/hooks/cag-cold-cache-anchor.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-CACHE-CONTROL (sierra 2026-05-27):
// SessionStart anchor for the broader CAG cold-tier doctrine set.
//
// SIBLING — `cag-soul-cache-block.mjs` (U-CAG-01-SOUL-TO-SESSIONSTART) already
// anchors the per-slot soul ONCE per session as a SessionStart additionalContext
// block so the Anthropic prompt-cache can keep it warm. This hook does the same
// thing for the *broader* CAG cold-tier doctrine surface enumerated by
// `scripts/lib/cag-router.mjs#COLD_SOURCES` (claude-md, memory-md, engine-digest,
// dispatcher-digest, …). The block emitted here is a SUMMARY — paths, sizes,
// the canonical-source ID and rationale — not the doctrine text itself
// (that would explode SessionStart context with ~500KB across the 4-5 cold
// sources combined). The summary anchor lets a downstream consumer or operator
// know what IS cacheable for cache_control:ephemeral marking.
//
// Article-2 (akshay_pachaar) cold/hot split: COLD sources rarely change
// (≤ 1 mod/month + each must be referenced by ≥3 surfaces per the COLD_SOURCES
// rationale fields). They are the textbook candidates for cache_control:ephemeral
// per the Anthropic prompt-cache API. Today the harness doesn't read a hook-level
// cache_control hint; once it does, the JSON sidecar this hook writes is the
// spec the harness can consume to know which blocks to mark.
//
// SIDECAR  state/shared/cag-route/cold-cache-anchor-<sid>.json
//          schemaVersion 1, includes per-source mtime + sizeBytes for staleness.
//
// KARPATHY R3 surgical: pure-read hook, no engine touch, no settings.json edit
// from inside the hook. R12 fail-loud: throws nothing — SessionStart MUST NOT
// block; on any error, emits empty additionalContext via { continue: true }.
//
// KNOBS:
//   PRISM_CAG_COLD_ANCHOR_DISABLE=1   skip the hook entirely
//   PRISM_CAG_COLD_ANCHOR_VERBOSE=1   list every source's full sizeBytes + path
//   PRISM_CAG_COLD_ANCHOR_MAX_BYTES=N override the 4096 byte cap

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { COLD_SOURCES } from "../../scripts/lib/cag-router.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SIDECAR_DIR = path.join(PRISM_ROOT, "state/shared/cag-route");
const DEFAULT_MAX_BYTES = 4096;
const SCHEMA_VERSION = 1;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
function emitEmpty() { emit({ continue: true }); }

function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}

/**
 * Pure-core: build the freshness snapshot for each cold source. Returns a
 * shape downstream tools (and our sidecar) consume. Sources that can't be
 * stat-ed are still listed with `present: false` — caller can decide whether
 * to fail loud or proceed.
 */
export function snapshotColdSources(coldSources = COLD_SOURCES, stat = statSafe) {
  return coldSources.map((src) => {
    const st = stat(src.path);
    return {
      id: src.id,
      path: src.path,
      coldRationale: src.coldRationale,
      declaredSizeBytes: src.sizeBytes,
      actualSizeBytes: st ? st.size : null,
      mtimeMs: st ? Math.round(st.mtimeMs) : null,
      present: !!st,
    };
  });
}

/**
 * Pure-core: render the SessionStart additionalContext block from the snapshot.
 * `maxBytes` truncates the rendered block (last-resort guard — the structured
 * summary is small enough that the cap is just defensive).
 */
export function renderAnchorBlock(snap, { verbose = false, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const header = "## 🧊 CAG cold-cache anchor (SessionStart, akshay_pachaar pattern)\n";
  const intro = "_Static cold-tier doctrine cataloged once per session so the Anthropic prompt-cache can anchor them. cache_control:ephemeral candidates per `scripts/lib/cag-router.mjs#COLD_SOURCES`._\n\n";
  const lines = snap.map((s) => {
    const kb = s.actualSizeBytes ? (s.actualSizeBytes / 1024).toFixed(0) + "KB" : "(missing)";
    const status = s.present ? "✓" : "✗";
    const why = verbose ? ` — ${s.coldRationale}` : "";
    return `- [${status}] **${s.id}** (${kb}) \`${s.path}\`${why}`;
  });
  const footer = `\n\n_Sidecar: state/shared/cag-route/cold-cache-anchor-<sid>.json. Disable: PRISM_CAG_COLD_ANCHOR_DISABLE=1._`;
  let body = header + intro + lines.join("\n") + footer;
  if (body.length > maxBytes) {
    body = body.slice(0, maxBytes - 32) + "\n…(cold-anchor truncated)";
  }
  return body;
}

/**
 * IO layer: write the sidecar. Returns the path on success or null on any IO
 * failure (telemetry — never crashes the SessionStart hook).
 */
export function writeAnchorSidecar({ sid, snap, blockBytes, ts, sidecarDir = SIDECAR_DIR }) {
  try {
    if (!fs.existsSync(sidecarDir)) fs.mkdirSync(sidecarDir, { recursive: true });
    const p = path.join(sidecarDir, `cold-cache-anchor-${sid}.json`);
    fs.writeFileSync(p, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      ts,
      sid,
      blockBytes,
      kind: "cag-cold-cache-anchor",
      coldSources: snap,
      cacheControlRecommendation: "ephemeral", // Anthropic cache_control type per akshay_pachaar tweet
    }, null, 2));
    return p;
  } catch { return null; }
}

async function main() {
  if (process.env.PRISM_CAG_COLD_ANCHOR_DISABLE === "1") return emitEmpty();

  let raw = "";
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  } catch { return emitEmpty(); }
  let env = {};
  try { env = raw ? JSON.parse(raw) : {}; } catch { /* tolerated */ }
  const sid = env.session_id || "";
  if (!sid) return emitEmpty();

  // U-GCF-CAG-REGEN-WIRE: keep the galaxy-cards bundle fresh before anchoring (fail-soft, mtime-throttled).
  // Detached spawn => THIS session may anchor the prior bundle (intra-session stable); the regen lands for the NEXT.
  try {
    const idxPath = path.join(PRISM_ROOT, "state/shared/galaxy-cards/INDEX.json");
    let stale = true;
    try { stale = (Date.now() - fs.statSync(idxPath).mtimeMs) > 6 * 3600 * 1000; } catch { stale = true; } // missing => stale
    if (stale && process.env.PRISM_GCF_CAG_REGEN_DISABLE !== "1") {
      const { spawn } = await import("node:child_process");
      spawn(process.execPath, [path.join(PRISM_ROOT, "scripts/galaxy-context-card.mjs"), "build"],
        { detached: true, stdio: "ignore" }).unref(); // fire-and-forget; next session reads the fresh bundle
    }
  } catch { /* never block the anchor */ }

  const verbose = process.env.PRISM_CAG_COLD_ANCHOR_VERBOSE === "1";
  const maxBytes = Number.parseInt(process.env.PRISM_CAG_COLD_ANCHOR_MAX_BYTES || "", 10) || DEFAULT_MAX_BYTES;

  const snap = snapshotColdSources();
  const block = renderAnchorBlock(snap, { verbose, maxBytes });
  const ts = new Date().toISOString();
  writeAnchorSidecar({ sid, snap, blockBytes: block.length, ts });

  return emit({
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: block },
  });
}

// Run only when invoked as the main entry — keeps the module importable for tests.
// pathToFileURL handles the Windows triple-slash absolute-path quirk that a
// bare string template can't (file:///H:/... vs file://H:/...).
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) main();
