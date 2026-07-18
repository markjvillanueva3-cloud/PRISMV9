#!/usr/bin/env node
/**
 * generate-galaxy-federation-roost-features.mjs — system-viz augmentation:
 * the GALAXY-CONTEXT-FEDERATION-MS0 roost (U-GCF-VIZ-ROOST, alpha 2026-05-31).
 *
 * Surfaces the federation in /system-viz (PSN leg #6 — System Viz). The federation
 * is the cross-galaxy Obsidian/PSN synergy backbone; until now it had artifacts +
 * a wiki page but no NODE in the brain-graph. This emits a `ghost.galaxy_federation`
 * meta-roost under `ghost.planned_features` with one child roost per federation
 * artifact (cards / digest / knows-map / dedup / savings), each label encoding the
 * artifact's LIVE stats so the viz reflects real federation state.
 *
 * Mirrors generate-substrate-meta-roost-features.mjs (R11): pure `generate()` +
 * a main() that reads the sidecars + writes ONE augmentation json. Folded into
 * system-graph.json by scripts/merge-augmentations.mjs (generic — no merge change).
 * NON-BLOCKING: writes only its own augmentation sidecar (never regen-viz's graph,
 * never a peer file). Reads are fail-soft — a missing artifact omits its child roost.
 *
 * NO `[[wikilink]]` literals in label/info (the link-audit-feedback lesson — a
 * literal wikilink here would feed the next link-audit scan and create self-drift).
 *
 * Output: state/shared/system-viz/galaxy-federation-roost-augmentation.json
 * Usage:  node scripts/generate-galaxy-federation-roost-features.mjs
 * Knob:   PRISM_GCF_VIZ_ROOST_DISABLE=1 → no-op (pure generate() still works).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const META_ROOST_ID = "ghost.galaxy_federation";
export const PLANNED_PARENT = "ghost.planned_features";
export const META_LAYER = "L7";
export const CHILD_LAYER = "L8";
export const MAX_LABEL = 80;
export const MAX_INFO = 280;

const CARDS_DIR = path.join(ROOT, "state/shared/galaxy-cards");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "galaxy-federation-roost-augmentation.json");

// Each federation artifact → its child roost id + a label/info builder from the loaded sidecar.
// Order is the deterministic edge-emission order. A builder returns null when the artifact is absent
// or unusable (→ that child roost + edge are omitted; the viz never shows a dangling node).
export const ARTIFACTS = Object.freeze([
  {
    key: "cards", roostId: "ghost.gcf_cards", file: "INDEX.json",
    build: (j) => Array.isArray(j.cards) ? { stat: `${j.cards.length} galaxies${j.salience ? ", salience-ranked" : ""}`, info: `Per-galaxy ≤1 KB context-cards (U-GCF-CARD/SALIENCE). ${j.cards.length} galaxies, schema ${j.schemaVersion || "?"}. Inject the card vs re-reading the multi-KB brain.` } : null,
  },
  {
    key: "digest", roostId: "ghost.gcf_digest", file: "MASTER-DIGEST.json",
    build: (j) => Number.isFinite(j.galaxyCount) ? { stat: `${j.galaxyCount} galaxies, ~${Math.round((j.bytes || 0) / 1024)} KB`, info: `Salience-ranked master fleet-context digest (U-GCF-ROLLUP). ${j.galaxyCount} galaxies in ~${Math.round((j.bytes || 0) / 1024)} KB — the feed-up roll-up injected instead of re-reading all brains.` } : null,
  },
  {
    key: "knowsMap", roostId: "ghost.gcf_knows_map", file: "KNOWS-MAP.json",
    build: (j) => Number.isFinite(j.totalGalaxies) ? { stat: `${j.tokenCount || 0} tokens / ${j.totalGalaxies} galaxies`, info: `Who-knows-what TF-IDF router (U-GCF-KNOWS-MAP). ${j.tokenCount || 0} capability tokens across ${j.totalGalaxies} galaxies — answers "which galaxy holds context on X".` } : null,
  },
  {
    key: "dedup", roostId: "ghost.gcf_dedup", file: "DEDUP-REPORT.json",
    build: (j) => Number.isFinite(j.clusterCount) ? { stat: `${j.clusterCount} clusters, ~${j.totalEstTokensSaved || 0} tok`, info: `Cross-galaxy memory dedup (U-GCF-XDEDUP). ${j.clusterCount} near-duplicate clusters spanning ≥2 brains, ~${j.totalEstTokensSaved || 0} tok saveable (advisory — canonical + pointers).` } : null,
  },
  {
    key: "savings", roostId: "ghost.gcf_savings", file: "SAVINGS-REPORT.json",
    build: (j) => {
      const pip = j.perInjectPotential || {};
      const ceil = Number.isFinite(pip.bestStrategyCeiling) ? pip.bestStrategyCeiling : null;
      if (ceil == null) return null;
      const realized = (j.cumulativeRealized && Number.isFinite(j.cumulativeRealized.recallFirstTokens)) ? j.cumulativeRealized.recallFirstTokens : 0;
      return { stat: `~${ceil} tok/inject ceiling`, info: `Savings telemetry capstone (U-GCF-SAVINGS-TELEMETRY). Per-inject ceiling ~${ceil} tok (UNREALIZED until inject path wired); realized ~${realized} tok. Estimated, not asserted.` };
    },
  },
]);

// ── pure: build {newNodes, newEdges, stats} from the loaded artifact sidecars ──
// loaded: { [key]: parsedJsonOrNull }. existingNodeIds: skip-list (Set/array).
export function generate(loaded = {}, existingNodeIds = []) {
  const L = loaded && typeof loaded === "object" ? loaded : {};
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  const present = [];

  for (const art of ARTIFACTS) {
    const j = L[art.key];
    if (!j || typeof j !== "object") continue;
    let built = null;
    try { built = art.build(j); } catch { built = null; }
    if (!built) continue;
    present.push({ key: art.key, roostId: art.roostId, ...built });
  }

  // meta-roost
  let rootEmitted = 0;
  if (!ids.has(META_ROOST_ID)) {
    const info = `Cross-galaxy context federation (GALAXY-CONTEXT-FEDERATION-MS0): retain (cards/salience/compact) → feed-up (rollup/knows-map) → redistribute (xgalaxy-inject/push) → Obsidian savings (recall-first/xdedup/savings). ${present.length} live artifact${present.length === 1 ? "" : "s"} surfaced. Build CLIs: galaxy-* build.`;
    newNodes.push({
      id: META_ROOST_ID,
      label: `Galaxy Context Federation (${present.length} artifact${present.length === 1 ? "" : "s"})`.slice(0, MAX_LABEL),
      layer: META_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-meta-roost",
      parent: PLANNED_PARENT,
      info: info.slice(0, MAX_INFO),
    });
    ids.add(META_ROOST_ID);
    rootEmitted = 1;
  }

  // one child roost + aggregates edge per present artifact
  let childrenEmitted = 0;
  for (const p of present) {
    if (!ids.has(p.roostId)) {
      newNodes.push({
        id: p.roostId,
        label: `${p.key}: ${p.stat}`.slice(0, MAX_LABEL),
        layer: CHILD_LAYER,
        ghost: true,
        status: "ghost",
        kind: "ghost-roost",
        parent: META_ROOST_ID,
        info: p.info.slice(0, MAX_INFO),
      });
      ids.add(p.roostId);
      childrenEmitted++;
    }
    newEdges.push({ from: META_ROOST_ID, to: p.roostId, type: "aggregates" });
  }

  return { newNodes, newEdges, stats: { rootEmitted, childrenEmitted, presentCount: present.length } };
}

// ── I/O (fail-soft) ────────────────────────────────────────────────────────────
export function loadArtifacts(opts = {}) {
  const dir = opts.cardsDir || CARDS_DIR;
  const readImpl = opts.readImpl || ((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } });
  const loaded = {};
  for (const art of ARTIFACTS) {
    try { const raw = readImpl(path.join(dir, art.file)); loaded[art.key] = raw == null ? null : JSON.parse(raw); }
    catch { loaded[art.key] = null; }
  }
  return loaded;
}

function main() {
  if (process.env.PRISM_GCF_VIZ_ROOST_DISABLE === "1") { process.stdout.write(JSON.stringify({ ok: false, disabled: true }) + "\n"); return; }
  const loaded = loadArtifacts();
  const { newNodes, newEdges, stats } = generate(loaded, []);
  const augmentation = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "generate-galaxy-federation-roost-features.mjs",
    newNodes,
    newEdges,
  };
  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); } catch { /* swallow */ }
  try { fs.writeFileSync(OUT_PATH, JSON.stringify(augmentation, null, 2)); }
  catch (e) { process.stdout.write(JSON.stringify({ ok: false, reason: "write-error", error: String((e && e.message) || e) }) + "\n"); return; }
  process.stdout.write(JSON.stringify({ ok: true, ...stats, nodes: newNodes.length, edges: newEdges.length, out: OUT_PATH }) + "\n");
}

const invokedDirectly = process.argv[1] && path.basename(process.argv[1]) === "generate-galaxy-federation-roost-features.mjs";
if (invokedDirectly) main();
