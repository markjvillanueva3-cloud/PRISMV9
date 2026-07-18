#!/usr/bin/env node
// scripts/ai-systems-fleet-state.mjs
// AI-systems state -> Obsidian vault synergy (2026-06-11, slot:zulu).
//
// GOAL (operator /goal): "improve ai systems ... synergized with obsidian vault, psn, prism
// awareness ... memories and wikis across all galaxies." The live AI-systems STATE (GNN
// selective-deploy, octopus multi-model consensus reach, Ollama offload, AI-synergy) lives in
// scattered JSON state files -- so NO galaxy's awareness / CAG / RAG actually carries it. This
// generator reads those live surfaces and writes ONE recall-discoverable vault note into the
// `patterns/` namespace (already in DEFAULT_NAMESPACES -> re-indexed on the next sidecar build,
// so the galaxy-reasoning-bridge + memory recall surface it for EVERY galaxy). One general
// asset serves all 34 galaxies (R15 general-asset path) -- not 34 copies.
//
// DETERMINISTIC core (R5): the note is assembled from real numbers, no LLM. Re-runnable; atomic
// write. Fail-soft per reader (a missing surface degrades that section, never crashes the run).
//
// CLI:  node scripts/ai-systems-fleet-state.mjs [--json] [--print]
//   (default) writes the vault note + prints a one-line summary
//   --json    machine-readable state to stdout
//   --print   print the note body to stdout instead of writing

import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "H:/prism";
const NN_EVAL = join(ROOT, "state/shared/nn-graph/NN-EVAL.json");
const OCTOPUS_DIR = join(ROOT, "state/shared/octopus-outcomes");
const OFFLOAD = join(ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const SYNERGY = join(ROOT, "state/shared/specs/AI-SYNERGY-AUDIT.md");
const PATTERNS_DIR = join(ROOT, "knowledge/memories/patterns");
const NOTE = join(PATTERNS_DIR, "ai-systems-fleet-state.md");
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
const GNN_GATE_TAU = 0.7; // GNN_DEFAULTS.minConf production gate

function readJson(p) {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

// ---- readers (pure, exported, fail-soft) -----------------------------------

/** GNN selective-deploy state: AUROC + the selective curve point at the production gate. */
export function readGnnState(path = NN_EVAL) {
  const nn = readJson(path);
  if (!nn) return { ok: false, error: "nn-eval-missing" };
  const auroc = nn.metrics?.auroc ?? nn.auroc ?? nn.checkpointMeta?.auroc ?? null;
  const curve = Array.isArray(nn.selective?.curve) ? nn.selective.curve : [];
  // The production point = the curve entry whose tau is closest to the deploy gate.
  let gatePoint = null;
  for (const pt of curve) {
    if (gatePoint === null || Math.abs(pt.tau - GNN_GATE_TAU) < Math.abs(gatePoint.tau - GNN_GATE_TAU)) {
      gatePoint = pt;
    }
  }
  const grade = typeof nn.grade === "string" ? nn.grade : (nn.grade?.selective ?? nn.grade?.deploy ?? (nn.grade ? "graded" : null));
  return {
    ok: true,
    auroc: typeof auroc === "number" ? Number(auroc.toFixed(3)) : null,
    deferred: Boolean(nn.deferred),
    holdoutN: nn.holdoutN ?? null,
    embeddingMode: nn.embeddingMode ?? null,
    grade,
    gate: gatePoint
      ? {
          tau: gatePoint.tau,
          coverage: Number((gatePoint.coverage ?? 0).toFixed(3)),
          brier: Number((gatePoint.brier ?? 0).toFixed(3)),
          macroF1: Number((gatePoint.macroF1 ?? 0).toFixed(3)),
          classesEmitted: gatePoint.classesEmitted ?? null,
        }
      : null,
  };
}

/** Octopus multi-model consensus reach: how many DOMAINS have consensus outcome records. */
export function readOctopusReach(dir = OCTOPUS_DIR) {
  if (!existsSync(dir)) return { ok: false, error: "octopus-dir-missing", domainCount: 0, domains: [] };
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  let total = 0;
  const domains = [];
  for (const f of files) {
    const domain = f.replace(/\.jsonl$/, "");
    let n = 0;
    try {
      n = readFileSync(join(dir, f), "utf8").trim().split("\n").filter(Boolean).length;
    } catch {
      n = 0;
    }
    domains.push({ domain, records: n });
    total += n;
  }
  return { ok: true, domainCount: domains.length, totalRecords: total, domains };
}

/** Ollama offload state: offload rate (target >=30%) + tokens saved. */
export function readOffload(path = OFFLOAD) {
  const o = readJson(path);
  if (!o) return { ok: false, error: "offload-missing" };
  const offloaded = Number(o.offloaded ?? 0);
  const kept = Number(o.keptOnClaude ?? 0);
  const denom = offloaded + kept;
  return {
    ok: true,
    offloaded,
    keptOnClaude: kept,
    rate: denom > 0 ? Number((offloaded / denom).toFixed(3)) : null,
    tokensSaved: Number(o.estimatedTokensSaved ?? 0),
  };
}

/** AI-synergy audit: fleet mean + band counts. */
export function readSynergy(path = SYNERGY) {
  if (!existsSync(path)) return { ok: false, error: "synergy-missing" };
  const text = readFileSync(path, "utf8");
  const mean = Number((text.match(/Mean synergy score:\*\*\s*([\d.]+)/) || [])[1] ?? NaN);
  const bands = text.match(/strong\s+(\d+)\s*\|\s*partial\s+(\d+)\s*\|\s*weak\s+(\d+)/);
  const galaxies = Number((text.match(/Galaxies audited:\*\*\s*(\d+)/) || [])[1] ?? NaN);
  return {
    ok: Number.isFinite(mean),
    mean: Number.isFinite(mean) ? mean : null,
    strong: bands ? Number(bands[1]) : null,
    partial: bands ? Number(bands[2]) : null,
    weak: bands ? Number(bands[3]) : null,
    galaxies: Number.isFinite(galaxies) ? galaxies : null,
  };
}

/** Resident Ollama models (the local-inference substrate for CAG/RAG/offload). Fail-soft. */
export async function readOllamaModels(url = OLLAMA_URL, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, models: [] };
    const j = await res.json();
    return { ok: true, models: (j.models || []).map((m) => m.name) };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), models: [] };
  } finally {
    clearTimeout(t);
  }
}

// ---- gather + render -------------------------------------------------------

export async function gatherState() {
  const [gnn, octopus, offload, synergy, ollama] = [
    readGnnState(),
    readOctopusReach(),
    readOffload(),
    readSynergy(),
    await readOllamaModels(),
  ];
  return { generatedAt: new Date().toISOString(), gnn, octopus, offload, synergy, ollama };
}

export function buildNote(state) {
  const { gnn, octopus, offload, synergy, ollama } = state;
  const lines = [];
  lines.push("---");
  lines.push("title: AI-systems fleet state");
  lines.push("aliases: [ai-systems-fleet-state, ai-state-synthesis, nn-gnn-lora-rag-state]");
  lines.push("tags: [patterns, ai-systems, nn, gnn, lora, rag, cag, octopus, synergy, awareness]");
  lines.push("kind: ai-systems-state");
  lines.push(`generatedAt: ${state.generatedAt}`);
  lines.push("source: scripts/ai-systems-fleet-state.mjs (deterministic from live state)");
  lines.push("---");
  lines.push("");
  lines.push("# AI-systems fleet state");
  lines.push("");
  lines.push("> Live snapshot of PRISM's AI systems, persisted into the vault so every galaxy's");
  lines.push("> awareness / CAG / RAG recall carries it. Regenerate: `node scripts/ai-systems-fleet-state.mjs`.");
  lines.push("");
  lines.push("## GNN (GraphSAGE tier-5, wiring-inference)");
  if (gnn.ok) {
    lines.push(`- AUROC: **${gnn.auroc ?? "n/a"}** | embeddingMode: ${gnn.embeddingMode ?? "n/a"} | holdoutN: ${gnn.holdoutN ?? "n/a"} | deploy: ${gnn.deferred ? "DEFERRED (full-coverage)" : "active"}`);
    if (gnn.gate) {
      lines.push(`- Selective-deploy @ tau=${gnn.gate.tau}: coverage **${(gnn.gate.coverage * 100).toFixed(1)}%**, Brier ${gnn.gate.brier}, macroF1 ${gnn.gate.macroF1}, classes ${gnn.gate.classesEmitted}`);
    }
    lines.push(`- Next lift = structural (H2GCN heterophily + ref-pool growth + GPU retrain) -- **india GPU lane**, NOT calibration.`);
  } else {
    lines.push(`- (NN-EVAL unreadable: ${gnn.error})`);
  }
  lines.push("");
  lines.push("## Octopus (multi-model consensus, deep-reasoning)");
  if (octopus.ok) {
    lines.push(`- Domains with consensus outcomes: **${octopus.domainCount}** (${octopus.totalRecords} records). Domains: ${octopus.domains.map((d) => `${d.domain}(${d.records})`).join(", ") || "none"}`);
    if (octopus.domainCount <= 1) {
      lines.push(`- SYNERGY GAP: consensus-of cross-substrate edges only materialize for domains with outcomes -> only ${octopus.domainCount} domain links today. Running octopus per galaxy grows the edge set fleet-wide.`);
    }
  } else {
    lines.push(`- (octopus-outcomes unreadable: ${octopus.error})`);
  }
  lines.push("");
  lines.push("## RAG / CAG / Ollama offload (local-inference substrate)");
  if (ollama.ok) {
    lines.push(`- Resident models (${ollama.models.length}): ${ollama.models.join(", ")}`);
  } else {
    lines.push(`- Ollama /api/tags unreachable: ${ollama.error} (offload silently falls back to Claude -- LOUD per doctrine)`);
  }
  if (offload.ok) {
    const ratePct = offload.rate === null ? "n/a" : `${(offload.rate * 100).toFixed(1)}%`;
    lines.push(`- Offload rate: **${ratePct}** (target >=30%) | offloaded ${offload.offloaded} / kept-on-Claude ${offload.keptOnClaude} | ~${offload.tokensSaved.toLocaleString()} tokens saved`);
  } else {
    lines.push(`- (offload stats unreadable: ${offload.error})`);
  }
  lines.push("");
  lines.push("## AI-synergy (cross-galaxy)");
  if (synergy.ok) {
    lines.push(`- ${synergy.galaxies ?? "?"} galaxies audited: **strong ${synergy.strong}** / partial ${synergy.partial} / weak ${synergy.weak}; mean synergy ${synergy.mean}`);
    lines.push(`- Binary metric is saturated; real headroom is DEPTH (octopus reach above, GNN full-coverage), not the score.`);
  } else {
    lines.push(`- (AI-SYNERGY-AUDIT unreadable: ${synergy.error})`);
  }
  lines.push("");
  lines.push("Related: [[zulu-ledger-reconciler]] [[psn-octopus-fleet-synergy-ms0]] [[cross-substrate-synergy-ms0]] [[gnn-selective-deploy]]");
  lines.push("");
  return lines.join("\n");
}

function isMain() {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}

if (isMain()) {
  const json = process.argv.includes("--json");
  const printOnly = process.argv.includes("--print");
  const state = await gatherState();
  const note = buildNote(state);
  if (json) {
    console.log(JSON.stringify(state, null, 2));
  } else if (printOnly) {
    console.log(note);
  } else {
    try {
      mkdirSync(PATTERNS_DIR, { recursive: true });
      const tmp = `${NOTE}.tmp`;
      writeFileSync(tmp, note);
      renameSync(tmp, NOTE);
    } catch (e) {
      console.error(`[ai-systems-fleet-state] note write failed: ${e?.message || e}`);
      process.exit(1);
    }
    const g = state.gnn.ok ? `GNN auroc ${state.gnn.auroc}` : "GNN n/a";
    const o = state.octopus.ok ? `octopus ${state.octopus.domainCount} domain(s)` : "octopus n/a";
    const off = state.offload.ok && state.offload.rate !== null ? `offload ${(state.offload.rate * 100).toFixed(0)}%` : "offload n/a";
    console.log(`ai-systems-fleet-state -> ${NOTE}`);
    console.log(`  ${g} | ${o} | ${off} | synergy ${state.synergy.ok ? state.synergy.mean : "n/a"}`);
  }
  process.exit(0);
}
