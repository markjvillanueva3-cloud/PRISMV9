#!/usr/bin/env node
/**
 * generate-dream-artifacts-features.mjs — system-viz augmentation: dream-receipt artifacts.
 *
 * Spec: state/shared/specs/HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md (U-DR09).
 *
 * Reads `state/shared/dream-artifacts/<artifact-id>/manifest.json` for every
 * staged/validated/applied/discarded receipt-bundle artifact (Hermes Dreaming
 * v0.1.0 interop, written via prism_session:dream_* actions) and emits a
 * system-viz augmentation that adds:
 *   - parent roost `ghost.dream_artifacts` (kind ghost-roost, under
 *     `ghost.planned_features`).
 *   - one `dream-artifact` child per artifact, colour/info-tagged by status.
 *
 * The generator is idempotent on empty input — a roost with zero artifacts
 * still emits the parent node so operators see the surface exists. As
 * artifacts accumulate from real dream_propose / dream_consolidate runs,
 * children fill in.
 *
 * Modeled on generate-bridge-synergy-features.mjs. Registered in
 * scripts/regen-viz.mjs FAST[] and spliced by scripts/merge-augmentations.mjs.
 *
 * Usage:  node scripts/generate-dream-artifacts-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const DREAM_ROOST_ID = "ghost.dream_artifacts";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const ARTIFACT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 240;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const ARTIFACTS_DIR = path.join(ROOT, "state/shared/dream-artifacts");
const OUT_PATH = path.join(VIZ_DIR, "dream-artifacts-augmentation.json");

// Status → display colour (matches PRISM convention: green=applied, amber=staged/validated, red=failed, grey=discarded).
const STATUS_COLOUR = {
  staged: "#ffb86c",     // amber
  validated: "#ffb86c",  // amber
  applied: "#50fa7b",    // green
  discarded: "#6272a4",  // grey
  failed: "#ff5555",     // red
};

/** Filesystem-safe node id fragment (letters/digits/dash/underscore). */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  if (!s || s.includes("..")) return "x";
  return s;
}

/** Trim string to maxLen with ellipsis. */
export function trim(s, maxLen) {
  const str = String(s == null ? "" : s);
  return str.length <= maxLen ? str : `${str.slice(0, Math.max(0, maxLen - 1))}…`;
}

/**
 * Pure: build {newNodes,newEdges,stats} from a list of artifact manifests.
 * Each artifact manifest must have { artifact_id, status, schemaVersion,
 * created_at, created_by, proposal_count, source_summary, parent_trace }
 * (the shape DreamArtifactBundleEngine writes).
 */
export function generate(manifests, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  const statusCounts = { staged: 0, validated: 0, applied: 0, discarded: 0, failed: 0 };

  // Parent roost — always emit; surfaces the substrate even with 0 artifacts.
  if (!ids.has(DREAM_ROOST_ID)) {
    newNodes.push({
      id: DREAM_ROOST_ID,
      kind: "ghost-roost",
      layer: ROOST_LAYER,
      label: "Dream Artifacts",
      info: `Hermes Dreaming v0.1.0 receipt-bundle artifacts staged via prism_session:dream_* actions. Verbs: status/diff/validate/apply/discard. Bundles: ${manifests.length}.`,
      colour: "#bd93f9",
    });
    if (!ids.has(PLANNED_PARENT)) {
      newEdges.push({ from: PLANNED_PARENT, to: DREAM_ROOST_ID, kind: "contains" });
    }
  }

  for (const m of manifests) {
    if (!m || typeof m !== "object" || !m.artifact_id) continue;
    const status = String(m.status || "staged");
    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
      statusCounts[status] += 1;
    }
    const childId = `dream-artifact.${safeId(m.artifact_id)}`;
    if (ids.has(childId)) continue;
    const label = trim(`${m.artifact_id} [${status}]`, MAX_LABEL);
    const info = trim(
      `${status} · ${m.proposal_count || 0} proposals · by ${m.created_by || "?"} at ${m.created_at || "?"}. ${m.source_summary || ""}`.trim(),
      MAX_INFO
    );
    newNodes.push({
      id: childId,
      kind: "dream-artifact",
      layer: ARTIFACT_LAYER,
      label,
      info,
      colour: STATUS_COLOUR[status] || "#888888",
      status,
      proposalCount: m.proposal_count || 0,
    });
    newEdges.push({ from: DREAM_ROOST_ID, to: childId, kind: "contains" });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    newNodes,
    newEdges,
    stats: {
      totalArtifacts: manifests.length,
      ...statusCounts,
    },
  };
}

/** I/O wrapper — reads on-disk artifacts, writes augmentation JSON. */
export function run({ outPath = OUT_PATH, artifactsDir = ARTIFACTS_DIR, fsImpl = fs } = {}) {
  let manifests = [];
  try {
    if (fsImpl.existsSync(artifactsDir)) {
      const entries = fsImpl.readdirSync(artifactsDir, { withFileTypes: true });
      for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        const mPath = path.join(artifactsDir, ent.name, "manifest.json");
        try {
          if (fsImpl.existsSync(mPath)) {
            const raw = fsImpl.readFileSync(mPath, "utf8");
            manifests.push(JSON.parse(raw));
          }
        } catch {
          // Malformed manifest — skip; do not poison the whole roost.
        }
      }
    }
  } catch {
    manifests = [];
  }

  const augmentation = generate(manifests);
  // Ensure parent dir exists.
  const dir = path.dirname(outPath);
  if (!fsImpl.existsSync(dir)) fsImpl.mkdirSync(dir, { recursive: true });
  fsImpl.writeFileSync(outPath, JSON.stringify(augmentation, null, 2), "utf8");
  return { ok: true, outPath, totalArtifacts: manifests.length, nodes: augmentation.newNodes.length, edges: augmentation.newEdges.length };
}

// CLI entry point.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generate-dream-artifacts-features.mjs")) {
  try {
    const result = run();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`generate-dream-artifacts-features: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
