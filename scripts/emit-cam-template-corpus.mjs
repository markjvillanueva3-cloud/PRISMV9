#!/usr/bin/env node
/**
 * emit-cam-template-corpus.mjs — CAM-AI-TRAINING-MS0/U-CAMT-B-EMIT
 *
 * Emits the full Phase-B template corpus to disk for consumption by
 * Phase C (LoRA training + RAG embedding + wiki injection).
 *
 * Composition:
 *   CAMTemplateGeneratorEngine.generateAll() →
 *     [CamTemplate, ...]  (one template per supported (op, system, default-feature) triple)
 *
 * Outputs:
 *   state/shared/corpus/cam-templates.jsonl       — one CamTemplate JSON per line
 *   state/shared/corpus/cam-templates.stats.json  — aggregate stats
 *   state/shared/corpus/cam-templates.lora.jsonl  — LoRA training tuples
 *                                                   (input: prompt, output: params)
 *
 * Real-data discipline (operator constraint 2026-05-25):
 *   Every emitted template has synthetic=false. Every parameter row carries
 *   source provenance from B02 (vendor-documented inputs only).
 *
 * Usage:
 *   node scripts/emit-cam-template-corpus.mjs [--out <dir>] [--feature-coverage]
 *
 * Modes:
 *   default                  — emit ONE template per (op, system) using the
 *                              op's first feature class.
 *   --feature-coverage       — emit MULTIPLE templates per (op, system) — one
 *                              per feature class the op spec lists. This is
 *                              the multiplier that turns a 67×25 grid into a
 *                              ~5000-template training corpus.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { argv, exit, stdout, cwd } from "node:process";
import { pathToFileURL } from "node:url";

// We pull the engines from the COMPILED dist/ bundle (mcp-server/dist/index.js),
// which is the canonical load surface for runner scripts. If dist isn't built
// yet, fail loud with a clear instruction (Karpathy R12 fail-loud).

function parseArgs(av) {
  const out = { outDir: "state/shared/corpus", featureCoverage: false };
  for (let i = 2; i < av.length; i++) {
    const a = av[i];
    if (a === "--out") out.outDir = av[++i];
    else if (a === "--feature-coverage") out.featureCoverage = true;
  }
  return out;
}

async function loadEngines() {
  // Try dist first (production load surface), fall back to a per-engine
  // tsx-style direct ESM import for slot-worktree dev.
  const distPath = resolve("mcp-server/dist/index.js");
  if (existsSync(distPath)) {
    return import(pathToFileURL(distPath).href);
  }
  stdout.write(`FATAL: mcp-server/dist/index.js missing. Build first:\n  cd mcp-server && npm run build:fast\n`);
  exit(1);
}

function buildLoraExample(template) {
  // Input prompt the trainer sees during fine-tuning.
  const featureLabel = template.featureClass;
  const systemLabel = template.system;
  const machineFamily = template.spec?.family ?? "milling_2d";
  const prompt =
    `Generate CAM parameters for ${systemLabel} ${template.nativeName} (canonical op: ${template.op}). ` +
    `Feature class: ${featureLabel}. Machine family: ${machineFamily}. ` +
    `Axis count: ${template.spec?.axisCount ?? "3"}. ` +
    `Stock model: ${template.spec?.defaultStock ?? "billet"}.`;
  const completion = {};
  for (const p of template.parameters) {
    completion[p.id] = p.value;
  }
  return { prompt, completion, templateId: template.id };
}

async function main() {
  const args = parseArgs(argv);
  const started = new Date().toISOString();
  stdout.write(`[emit-cam-template-corpus] started=${started} feature-coverage=${args.featureCoverage}\n`);

  const mod = await loadEngines();
  const tg = mod.camTemplateGeneratorEngine
    ?? mod.CAMTemplateGeneratorEngineSingleton
    ?? (mod.CAMTemplateGeneratorEngine ? new mod.CAMTemplateGeneratorEngine() : null);
  const tax = mod.camOperationTaxonomyEngine
    ?? (mod.CAMOperationTaxonomyEngine ? new mod.CAMOperationTaxonomyEngine() : null);
  if (!tg || !tax) {
    stdout.write(`FATAL: engines not exported from dist (camTemplateGeneratorEngine/camOperationTaxonomyEngine missing)\n`);
    exit(2);
  }

  // Build the template list
  const templates = [];
  if (args.featureCoverage) {
    for (const op of tax.listOperations()) {
      const spec = tax.getSpec(op);
      const featureClasses = spec?.featureClasses ?? [];
      for (const sys of tax.listSystems()) {
        for (const fc of featureClasses) {
          const t = tg.generate(op, sys, fc);
          if (t) templates.push(t);
        }
      }
    }
  } else {
    const all = tg.generateAll();
    for (const t of all.templates) templates.push(t);
  }

  if (templates.length === 0) {
    stdout.write(`FATAL: zero templates emitted — taxonomy / schemas misconfigured\n`);
    exit(2);
  }

  // Stats
  const perSystem = {};
  const perOp = {};
  const perFeature = {};
  for (const t of templates) {
    perSystem[t.system] = (perSystem[t.system] ?? 0) + 1;
    perOp[t.op] = (perOp[t.op] ?? 0) + 1;
    perFeature[t.featureClass] = (perFeature[t.featureClass] ?? 0) + 1;
  }
  const stats = {
    schemaVersion: "1.0.0",
    generatedAt: started,
    mode: args.featureCoverage ? "feature-coverage" : "default",
    total: templates.length,
    uniqueSystems: Object.keys(perSystem).length,
    uniqueOps: Object.keys(perOp).length,
    uniqueFeatures: Object.keys(perFeature).length,
    perSystem,
    perOp,
    perFeature,
  };

  // Emit
  const outAbs = resolve(args.outDir);
  try {
    mkdirSync(outAbs, { recursive: true });
  } catch (err) {
    if (err?.code !== "EEXIST") {
      stdout.write(`FATAL: out dir creation: ${err?.message || err}\n`);
      exit(2);
    }
  }

  const jsonlPath = join(outAbs, "cam-templates.jsonl");
  const statsPath = join(outAbs, "cam-templates.stats.json");
  const loraPath  = join(outAbs, "cam-templates.lora.jsonl");

  try {
    const jsonl = templates.map((t) => JSON.stringify(t)).join("\n") + "\n";
    writeFileSync(jsonlPath, jsonl, "utf8");
    writeFileSync(statsPath, JSON.stringify(stats, null, 2), "utf8");
    const lora = templates.map((t) => JSON.stringify(buildLoraExample(t))).join("\n") + "\n";
    writeFileSync(loraPath, lora, "utf8");
  } catch (err) {
    stdout.write(`FATAL: write failure: ${err?.message || err}\n`);
    exit(2);
  }

  stdout.write(`[done] ${templates.length} templates → ${relative(cwd(), jsonlPath)}\n`);
  stdout.write(`[done] stats → ${relative(cwd(), statsPath)}\n`);
  stdout.write(`[done] lora tuples → ${relative(cwd(), loraPath)}\n`);
  stdout.write(`[done] systems=${stats.uniqueSystems} ops=${stats.uniqueOps} features=${stats.uniqueFeatures}\n`);
}

void main().catch((err) => { stdout.write(`UNCAUGHT: ${err?.stack || err}\n`); exit(2); });
