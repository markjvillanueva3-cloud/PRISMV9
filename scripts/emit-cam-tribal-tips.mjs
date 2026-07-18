#!/usr/bin/env node
/**
 * scripts/emit-cam-tribal-tips.mjs — CAM-AI-TRAINING-MS0/U-CAMT-TRIBAL-EMIT
 *
 * Extracts shop-floor tribal knowledge from catalog parameter descriptions.
 * The catalogs under data/cam-functions/<system>/ contain operator-written
 * descriptions (e.g. "set spindle to 8000 RPM for aluminum, slow to 1500 for
 * tool steel; never below 500 or chip welds form on the cutter").
 *
 * Output: state/shared/corpus/cam-tribal-tips.jsonl
 * One record per tip: { id, tip, op, system, parameter, domain, source }
 *
 * REAL DATA ONLY (operator constraint 2026-05-25) — every tip traces to a
 * catalog .json file.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CAM_FN_ROOT = join(REPO_ROOT, "mcp-server", "data", "cam-functions");
const CORPUS_ROOT = join(REPO_ROOT, "state", "shared", "corpus");
const TARGET_SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listJsonFiles(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

/** Walk every nested object/array, find {description: string} pairs paired with sibling id/name. */
function walkForDescriptions(node, ctx, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkForDescriptions(item, ctx, out);
    return;
  }
  const desc = node.description ?? node.help ?? node.tooltip;
  if (typeof desc === "string" && desc.length > 20) {
    const id = node.id ?? node.name ?? node.label;
    const op = ctx.op ?? null;
    out.push({
      tip: desc,
      op,
      system: ctx.system,
      parameter: id ?? null,
      domain: inferDomain(ctx.system, ctx.fileName, op, id),
      source: ctx.fileName,
    });
  }
  // Walk children. Set op context if we see toolpath/operation keys.
  for (const [k, v] of Object.entries(node)) {
    if (k === "description" || k === "help" || k === "tooltip") continue;
    let newCtx = ctx;
    if (k === "operations" || k === "toolpaths" || k === "cycles") {
      // Iterate keyed children, threading the op name in.
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [opKey, opBody] of Object.entries(v)) {
          walkForDescriptions(opBody, { ...ctx, op: opKey }, out);
        }
        continue;
      }
    }
    walkForDescriptions(v, newCtx, out);
  }
}

function inferDomain(system, file, op, paramId) {
  const lower = `${file ?? ""} ${op ?? ""} ${paramId ?? ""}`.toLowerCase();
  if (/turn|lathe/.test(lower)) return "turning";
  if (/drill|hole|tap|bore|ream/.test(lower)) return "drilling";
  if (/wedm|wire/.test(lower)) return "wire_edm";
  if (/sinker/.test(lower)) return "sinker_edm";
  if (/laser/.test(lower)) return "laser";
  if (/waterjet/.test(lower)) return "waterjet";
  if (/5axis|5-axis|swarf|trunnion/.test(lower)) return "milling_5axis";
  if (/probe|inspect/.test(lower)) return "probing";
  if (/additive|ded|pbf|fdm/.test(lower)) return "additive";
  if (/finish/.test(lower)) return "milling_finishing";
  return "milling_general";
}

function main() {
  mkdirSync(CORPUS_ROOT, { recursive: true });
  const allLines = [];
  const perSystem = {};
  for (const sys of TARGET_SYSTEMS) {
    const dir = join(CAM_FN_ROOT, sys);
    if (!existsSync(dir)) {
      perSystem[sys] = { tips: 0 };
      console.log(`[${sys}] no catalog dir`);
      continue;
    }
    const files = listJsonFiles(dir);
    const tips = [];
    for (const file of files) {
      let parsed;
      try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      walkForDescriptions(parsed, { system: sys, fileName: basename(file) }, tips);
    }
    // Dedupe by tip text.
    const seen = new Set();
    let count = 0;
    for (const t of tips) {
      const key = t.tip.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const id = `tribal-${sys}-${count}`;
      allLines.push(JSON.stringify({ id, ...t }));
      count++;
    }
    perSystem[sys] = { tips: count };
    console.log(`[${sys}] tips=${count}`);
  }
  const outFile = join(CORPUS_ROOT, "cam-tribal-tips.jsonl");
  writeFileSync(outFile, allLines.join("\n") + (allLines.length ? "\n" : ""));
  const summary = { totalTips: allLines.length, perSystem, generatedAt: new Date().toISOString() };
  writeFileSync(join(CORPUS_ROOT, "cam-tribal-tips-summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nTotal tribal tips: ${allLines.length} → ${outFile}`);
}

main();
