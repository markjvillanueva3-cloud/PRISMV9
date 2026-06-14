#!/usr/bin/env node
/**
 * generate-domain-pipeline-features.mjs — system-viz augmentation: per-domain
 * print-to-part pipelines.
 *
 * Spec: DOMAIN-PIPELINE-MS0 (slot juliett, 2026-05-17).
 *
 * Reads state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json and emits:
 *   - ghost.domain_pipelines roost (L8)
 *   - one domain-pipeline node per domain (L9), color-coded by domain
 *   - one pipeline-stage node per (domain, stage) pair (L10), status-coded
 *     (built / partial / missing) — outline opacity reflects status
 *   - flow edges between consecutive stages within each domain
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 * The CONFIG is the editable surface; operators refine engine mappings and
 * statuses there; the next regen-viz auto-updates the visualization.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.domain_pipelines";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const DOMAIN_LAYER = "L9";
export const STAGE_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 400;

const STATUS_GLYPH = { built: "●", partial: "◐", missing: "○", "missing-critical": "✕" };
const STATUS_OPACITY = { built: 1.0, partial: 0.6, missing: 0.35, "missing-critical": 0.9 };

function safeId(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export function generate(config, existingNodeIds = new Set()) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  const domains = config && config.domains ? config.domains : {};
  const canonicalStages = Array.isArray(config?.canonical_stages) ? config.canonical_stages : [];
  let roostEmitted = 0;
  const stageCount = {};
  let totalStages = 0;
  let builtStages = 0, partialStages = 0, missingStages = 0;

  // Roost.
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: "Domain Pipelines (print → part, per-domain stage map)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `Per-domain print-to-part pipeline visualization. ${Object.keys(domains).length} domains × ${canonicalStages.length} canonical stages. Status: built (solid) / partial (dimmed) / missing (outline). Source: DOMAIN-PIPELINE-MS0-CONFIG.json — operators refine engine mappings there.`.slice(0, MAX_INFO),
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // Per-domain pipeline nodes + stage children.
  for (const [domainKey, domainCfg] of Object.entries(domains)) {
    const domainNid = "ghost.pipeline." + safeId(domainKey);
    if (!ids.has(domainNid)) {
      const stagesObj = domainCfg.stages || {};
      const stageKeys = Object.keys(stagesObj);
      const built = stageKeys.filter((k) => stagesObj[k]?.status === "built").length;
      const partial = stageKeys.filter((k) => stagesObj[k]?.status === "partial").length;
      const missing = stageKeys.filter(
        (k) => stagesObj[k]?.status === "missing" || stagesObj[k]?.status === "missing-critical"
      ).length;
      newNodes.push({
        id: domainNid,
        label: `${domainKey.toUpperCase()} pipeline · ${domainCfg.scope || "—"}`.slice(0, MAX_LABEL),
        layer: DOMAIN_LAYER,
        ghost: true,
        status: "ghost",
        kind: "domain-pipeline",
        parent: ROOST_ID,
        color: domainCfg.color || "#94a3b8",
        slot: domainCfg.slot || null,
        scope: domainCfg.scope || null,
        info: `[${domainKey} · slot ${domainCfg.slot || "—"} · ${domainCfg.scope || "—"}] ${stageKeys.length} stages: ${built}● ${partial}◐ ${missing}○`.slice(0, MAX_INFO),
      });
      ids.add(domainNid);
    }

    // Stage children — preserve config order.
    const stagesObj = domainCfg.stages || {};
    let prevStageNid = null;
    for (const [stageKey, stageCfg] of Object.entries(stagesObj)) {
      const stageNid = `ghost.pipeline.${safeId(domainKey)}.${safeId(stageKey)}`;
      if (ids.has(stageNid)) { prevStageNid = stageNid; continue; }
      const status = stageCfg?.status || "missing";
      const glyph = STATUS_GLYPH[status] || "○";
      const opacity = STATUS_OPACITY[status] ?? 0.35;
      const engineName = stageCfg?.engine || "—";
      const adaptiveNote = stageCfg?.adaptive ? ` · adaptive: ${stageCfg.adaptive}` : "";
      const extraNote = stageCfg?.note ? ` · ${stageCfg.note}` : "";
      newNodes.push({
        id: stageNid,
        label: `${glyph} ${stageKey} · ${engineName}`.slice(0, MAX_LABEL),
        layer: STAGE_LAYER,
        ghost: true,
        status: "ghost",
        kind: "pipeline-stage",
        parent: domainNid,
        color: domainCfg.color || "#94a3b8",
        opacity,
        stage: stageKey,
        engine: engineName,
        engineStatus: status,
        info: `[${domainKey}/${stageKey} · ${status}] engine: ${engineName}${adaptiveNote}${extraNote}`.slice(0, MAX_INFO),
      });
      ids.add(stageNid);
      stageCount[status] = (stageCount[status] || 0) + 1;
      totalStages++;
      if (status === "built") builtStages++;
      else if (status === "partial") partialStages++;
      else missingStages++;

      // Flow edge from previous stage in this domain (linear pipeline flow).
      if (prevStageNid) {
        newEdges.push({ from: prevStageNid, to: stageNid, type: "pipeline-flow" });
      }
      prevStageNid = stageNid;
    }
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      domainsEmitted: Object.keys(domains).length,
      totalStages,
      built: builtStages,
      partial: partialStages,
      missing: missingStages,
      byStatus: stageCount,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const CONFIG_PATH = path.join(ROOT, "state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json");
const OUT_PATH = path.join(VIZ_DIR, "domain-pipeline-augmentation.json");

export function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`FATAL: ${CONFIG_PATH} missing`);
    return 1;
  }
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(config, new Set());
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH + ".tmp", JSON.stringify(result, null, 2));
    fs.renameSync(OUT_PATH + ".tmp", OUT_PATH);
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:        ${result.stats.roostEmitted}`);
  console.log(`  domains:      ${result.stats.domainsEmitted}`);
  console.log(`  stages:       ${result.stats.totalStages} (${result.stats.built}● ${result.stats.partial}◐ ${result.stats.missing}○)`);
  console.log(`  edges:        ${result.newEdges.length} (pipeline-flow)`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
