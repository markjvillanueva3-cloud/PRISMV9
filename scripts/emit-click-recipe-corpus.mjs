#!/usr/bin/env node
/**
 * emit-click-recipe-corpus.mjs — CAM-AI-TRAINING-MS0/U-CAMT-CLICK-EMIT
 *
 * Runs the full Phase-B+CLICK stack end-to-end against the real
 * data/cam-functions/ catalogs (25 CAM systems) and emits the resulting
 * click recipes as JSONL for Phase-C (RAG / LoRA training) consumption.
 *
 * Outputs:
 *   state/shared/corpus/click-recipes.jsonl       — one ClickSequence per line
 *   state/shared/corpus/click-recipes.stats.json  — per-system / per-op coverage
 *
 * Usage:
 *   node scripts/emit-click-recipe-corpus.mjs [--out <dir>]
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { argv, exit, stdout, cwd } from "node:process";
import { pathToFileURL } from "node:url";

function parseArgs(av) {
  const out = { outDir: "state/shared/corpus" };
  for (let i = 2; i < av.length; i++) {
    if (av[i] === "--out") out.outDir = av[++i];
  }
  return out;
}

async function loadEngines() {
  const distPath = resolve("mcp-server/dist/index.js");
  if (existsSync(distPath)) return import(pathToFileURL(distPath).href);
  stdout.write(`FATAL: mcp-server/dist/index.js missing. Build first:\n  cd mcp-server && npm run build:fast\n`);
  exit(1);
}

async function main() {
  const args = parseArgs(argv);
  const started = new Date().toISOString();
  stdout.write(`[emit-click-recipe-corpus] started=${started}\n`);

  const mod = await loadEngines();
  const taxonomy = mod.camOperationTaxonomyEngine ?? (mod.CAMOperationTaxonomyEngine ? new mod.CAMOperationTaxonomyEngine() : null);
  const tg = mod.camTemplateGeneratorEngine ?? (mod.CAMTemplateGeneratorEngine ? new mod.CAMTemplateGeneratorEngine() : null);
  const click = mod.CAMClickSequenceEngine ? new mod.CAMClickSequenceEngine(mod.loadCAMCatalog) : null;
  if (!taxonomy || !tg || !click) {
    stdout.write(`FATAL: engines not exported from dist (taxonomy/template/click missing)\n`);
    exit(2);
  }

  const recipes = [];
  const perSystem = {};
  const perOp = {};
  let missingCatalog = 0;
  let emitted = 0;

  for (const sys of taxonomy.listSystems()) {
    for (const op of taxonomy.listOperations()) {
      const spec = taxonomy.getSpec(op);
      const defaultFeature = spec?.featureClasses?.[0];
      if (!defaultFeature) continue;
      const tpl = tg.generate(op, sys, defaultFeature);
      if (!tpl) continue;
      const seq = click.buildSequence(tpl);
      if (seq.steps.length === 0) {
        missingCatalog++;
        continue;
      }
      recipes.push(seq);
      perSystem[sys] = (perSystem[sys] ?? 0) + 1;
      perOp[op] = (perOp[op] ?? 0) + 1;
      emitted++;
    }
  }

  const stats = {
    schemaVersion: "1.0.0",
    generatedAt: started,
    totalRecipes: emitted,
    systemsWithRecipes: Object.keys(perSystem).length,
    opsWithRecipes: Object.keys(perOp).length,
    missingCatalogPairs: missingCatalog,
    perSystem,
    perOp,
  };

  const outAbs = resolve(args.outDir);
  try {
    mkdirSync(outAbs, { recursive: true });
  } catch (err) {
    if (err?.code !== "EEXIST") {
      stdout.write(`FATAL: out dir creation: ${err?.message || err}\n`);
      exit(2);
    }
  }

  const jsonlPath = join(outAbs, "click-recipes.jsonl");
  const statsPath = join(outAbs, "click-recipes.stats.json");
  try {
    const jsonl = recipes.map((r) => JSON.stringify(r)).join("\n") + "\n";
    writeFileSync(jsonlPath, jsonl, "utf8");
    writeFileSync(statsPath, JSON.stringify(stats, null, 2), "utf8");
  } catch (err) {
    stdout.write(`FATAL: write failure: ${err?.message || err}\n`);
    exit(2);
  }

  stdout.write(`[done] ${emitted} click recipes → ${relative(cwd(), jsonlPath)}\n`);
  stdout.write(`[done] missing-catalog pairs: ${missingCatalog}\n`);
  stdout.write(`[done] stats → ${relative(cwd(), statsPath)}\n`);
}

void main().catch((err) => { stdout.write(`UNCAUGHT: ${err?.stack || err}\n`); exit(2); });
