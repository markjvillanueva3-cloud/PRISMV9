#!/usr/bin/env node
/**
 * generate-hermes-features.mjs — system-viz augmentation: the Nous Hermes desktop app.
 *
 * Spec: state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md (P4 — system-viz roost).
 *
 * Surfaces the EXTERNAL Nous Research Hermes desktop app (Electron GUI + Python
 * agent at C:/Users/wompu/AppData/Local/hermes/, "external agent #8" — never a
 * NATO slot) as a visible node cluster in the PRISM live system map so the
 * Hermes↔PRISM↔Obsidian↔system-viz synergy is observable. Emits:
 *   - parent roost `ghost.hermes_app` (kind ghost-roost, under `ghost.planned_features`).
 *   - `hermes-capability.native-mcp` node + a `bridges` edge to PRISM's MCP node
 *     `tr.mcp` (MCP Server :3100) — the channel Hermes connects in over.
 *   - one `hermes-skill` child per skill category directory (24+).
 *   - one `hermes-cron` child per cron skill-file (empty until P3 ships shop briefs).
 *   - one `hermes-output` child per `knowledge/hermes-outputs/<lane>` vault sub-lane.
 *
 * SAFETY (per spec §4 risks): source = DIRECTORY NAMES ONLY via readdirSync,
 * fail-soft. NEVER reads state.db (Electron WAL lock), .env / auth.json /
 * config.yaml (secrets) — names are never opened, contents never read. The
 * resolved app path is never emitted into the graph (no home-dir leak); only
 * dir/file *names* (trimmed to MAX_INFO) reach the augmentation.
 *
 * Idempotent on empty input — the roost emits even with zero children so the
 * surface exists; children fill in as skills/crons/outputs accumulate.
 *
 * Modeled on generate-dream-artifacts-features.mjs (DREAM-RECEIPT-MS0/U-DR09).
 * Registered in scripts/regen-viz.mjs FAST[] and spliced by
 * scripts/merge-augmentations.mjs.
 *
 * Usage:  node scripts/generate-hermes-features.mjs
 *         PRISM_HERMES_APP_DIR=<path> node scripts/generate-hermes-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const HERMES_ROOST_ID = "ghost.hermes_app";
export const PLANNED_PARENT = "ghost.planned_features";
export const MCP_NODE_ID = "tr.mcp"; // PRISM MCP Server :3100 (L2 transport) — verified via system-viz find.
export const CAPABILITY_ID = "hermes-capability.native-mcp";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 240;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "hermes-augmentation.json");
const OUTPUTS_DIR = path.join(ROOT, "knowledge/hermes-outputs");

// Default probe order for the external Hermes install (read-only, names only).
// Live install first, then the H: archive copy. Env override wins.
const APP_DIR_CANDIDATES = [
  process.env.PRISM_HERMES_APP_DIR,
  "C:/Users/wompu/AppData/Local/hermes",
  path.join("H:/hermes-install", "AppData-Local-hermes"),
].filter(Boolean);

// Child kind → display colour (PRISM convention; distinct per child type).
const CHILD_COLOUR = {
  "hermes-skill": "#8be9fd",   // cyan — capabilities
  "hermes-cron": "#ffb86c",    // amber — scheduled (pending until P3)
  "hermes-output": "#50fa7b",  // green — vault outputs lane
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
 * Pure: build {newNodes,newEdges,stats} from a structured Hermes app model.
 * model = { appPresent:boolean, skills:string[], crons:string[], outputs:string[] }
 * — all arrays are bare dir/file NAMES (no paths, no contents). existingNodeIds
 * lets the merge step pre-seed dedup (the splice also dedups, so this is belt+braces).
 */
export function generate(model = {}, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const appPresent = Boolean(model.appPresent);
  const skills = Array.isArray(model.skills) ? model.skills.filter((s) => s != null && String(s).length) : [];
  const crons = Array.isArray(model.crons) ? model.crons.filter((s) => s != null && String(s).length) : [];
  const outputs = Array.isArray(model.outputs) ? model.outputs.filter((s) => s != null && String(s).length) : [];

  const newNodes = [];
  const newEdges = [];
  const seenChild = new Set(); // de-dup within this generation (case-folded ids collide)

  // Parent roost — always emit; surfaces the substrate even when the app is absent.
  if (!ids.has(HERMES_ROOST_ID)) {
    newNodes.push({
      id: HERMES_ROOST_ID,
      kind: "ghost-roost",
      layer: ROOST_LAYER,
      label: "Hermes App",
      info: trim(
        `Nous Research Hermes desktop app — external autonomous runtime (external agent #8, never a NATO slot). ${appPresent ? "Installed" : "NOT detected on this host"}. ${skills.length} skills · ${crons.length} crons · ${outputs.length} vault output lanes. Connects to PRISM via MCP-over-HTTP :3100.`,
        MAX_INFO
      ),
      colour: "#bd93f9",
      appPresent,
    });
    if (!ids.has(PLANNED_PARENT)) {
      newEdges.push({ from: PLANNED_PARENT, to: HERMES_ROOST_ID, kind: "contains" });
    }
  }

  // Native-MCP capability node + bridges edge to PRISM's MCP server node.
  if (!ids.has(CAPABILITY_ID)) {
    newNodes.push({
      id: CAPABILITY_ID,
      kind: "hermes-capability",
      layer: ROOST_LAYER,
      label: "Hermes native MCP client",
      info: trim(
        "Hermes' built-in MCP client (skills/mcp) auto-registers PRISM's prism_* dispatchers as mcp_prism_* tools over StreamableHTTP at http://127.0.0.1:3100/mcp. sampling disabled (PRISM never drives Hermes' LLM).",
        MAX_INFO
      ),
      colour: "#ff79c6",
    });
    newEdges.push({ from: HERMES_ROOST_ID, to: CAPABILITY_ID, kind: "contains" });
    // The synergy edge — Hermes bridges INTO PRISM's MCP transport node.
    newEdges.push({ from: CAPABILITY_ID, to: MCP_NODE_ID, kind: "bridges" });
  }

  // Helper to emit a typed child under the roost.
  const emitChildren = (names, kind, descFn) => {
    for (const name of names) {
      const childId = `${kind}.${safeId(name)}`;
      if (ids.has(childId) || seenChild.has(childId)) continue;
      seenChild.add(childId);
      newNodes.push({
        id: childId,
        kind,
        layer: CHILD_LAYER,
        label: trim(String(name), MAX_LABEL),
        info: trim(descFn(name), MAX_INFO),
        colour: CHILD_COLOUR[kind] || "#888888",
      });
      newEdges.push({ from: HERMES_ROOST_ID, to: childId, kind: "contains" });
    }
  };

  emitChildren(skills, "hermes-skill", (n) => `Hermes skill category "${n}" — a SKILL.md-driven capability bundle in the app's skills/ dir.`);
  emitChildren(crons, "hermes-cron", (n) => `Hermes scheduled skill-file "${n}" — periodic manufacturing brief writing to knowledge/hermes-outputs/ (P3).`);
  emitChildren(outputs, "hermes-output", (n) => `Hermes vault output lane "knowledge/hermes-outputs/${n}" — collision-safe write target outside every Stop-hook sync target.`);

  return {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    newNodes,
    newEdges,
    stats: {
      appPresent,
      skills: skills.length,
      crons: crons.length,
      outputs: outputs.length,
      totalChildren: skills.length + crons.length + outputs.length,
    },
  };
}

/** Resolve the first existing Hermes app dir from the candidate list (names only later). */
export function resolveAppDir(candidates = APP_DIR_CANDIDATES, fsImpl = fs) {
  for (const c of candidates) {
    try {
      if (c && fsImpl.existsSync(c) && fsImpl.statSync(c).isDirectory()) return c;
    } catch {
      // unreadable candidate — try next
    }
  }
  return null;
}

/** Safe directory listing — returns NAMES only, never opens file contents. */
function listDir(dir, { dirsOnly = false, filesOnly = false } = {}, fsImpl = fs) {
  try {
    if (!fsImpl.existsSync(dir)) return [];
    const entries = fsImpl.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => {
        if (dirsOnly) return e.isDirectory();
        if (filesOnly) return e.isFile();
        return true;
      })
      .map((e) => e.name)
      .filter((n) => n && !n.startsWith(".")); // skip dotfiles (.env, .gitkeep, etc.)
  } catch {
    return [];
  }
}

/** I/O wrapper — enumerates app + vault dirs (names only), writes augmentation JSON. */
export function run({ outPath = OUT_PATH, appDir, outputsDir = OUTPUTS_DIR, fsImpl = fs } = {}) {
  const resolvedApp = appDir !== undefined ? appDir : resolveAppDir(APP_DIR_CANDIDATES, fsImpl);
  const appPresent = Boolean(resolvedApp);

  // Skills + crons come from the external app dir (names only). README is a file, skip.
  const skills = appPresent ? listDir(path.join(resolvedApp, "skills"), { dirsOnly: true }, fsImpl) : [];
  const crons = appPresent ? listDir(path.join(resolvedApp, "cron"), { filesOnly: true }, fsImpl) : [];
  // Output lanes come from the in-repo vault (always present); README.md is a file, skip via dirsOnly.
  const outputs = listDir(outputsDir, { dirsOnly: true }, fsImpl);

  const augmentation = generate({ appPresent, skills, crons, outputs });
  const dir = path.dirname(outPath);
  if (!fsImpl.existsSync(dir)) fsImpl.mkdirSync(dir, { recursive: true });
  fsImpl.writeFileSync(outPath, JSON.stringify(augmentation, null, 2), "utf8");
  return {
    ok: true,
    outPath,
    appPresent,
    skills: skills.length,
    crons: crons.length,
    outputs: outputs.length,
    nodes: augmentation.newNodes.length,
    edges: augmentation.newEdges.length,
  };
}

// CLI entry point.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generate-hermes-features.mjs")) {
  try {
    const result = run();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`generate-hermes-features: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
