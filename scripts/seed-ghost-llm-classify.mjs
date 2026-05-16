#!/usr/bin/env node
/**
 * seed-ghost-llm-classify.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-LLM-CLASSIFY
 *
 * Final-tier dispatcher inference for UNKNOWN ghost.unwired-engine nodes that
 * survived both keyword + sibling-prefix inference. Reads each engine file's
 * top-N-lines header (imports + class signature + JSDoc), batches them into
 * Ollama qwen2.5-coder:7b prompts (10 engines per call), parses the model's
 * dispatcher choice + confidence, and updates the graph.
 *
 * Cold-start mitigation: warms the model on first call (slow ~5s); subsequent
 * batches are ~2s each. 139 UNKNOWN / 10 per batch = ~14 calls → ~30s total.
 *
 * Confidence: capped at 0.55 (LLM-derived, lower than keyword 0.85 / sibling 0.65)
 * since the LLM is using pattern-recognition not deterministic evidence.
 *
 * Failure modes:
 *   - Ollama unreachable → skip silently, no graph change
 *   - Batch timeout → log + skip batch
 *   - Malformed JSON response → fall back to keep UNKNOWN
 *   - Model returns invalid dispatcher → reject + keep UNKNOWN
 *
 * Usage:
 *   node scripts/seed-ghost-llm-classify.mjs --dry-run
 *   node scripts/seed-ghost-llm-classify.mjs --apply
 *   node scripts/seed-ghost-llm-classify.mjs --apply --batch-size 5
 *   node scripts/seed-ghost-llm-classify.mjs --apply --model qwen2.5-coder:14b
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");

export const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
export const DEFAULT_MODEL = "qwen2.5-coder:7b";
export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_HEADER_LINES = 30;
export const LLM_CONFIDENCE = 0.55;
export const VALID_DISPATCHERS = Object.freeze([
  "prism_calc", "prism_cam", "prism_cad", "prism_turning", "prism_5axis",
  "prism_ai", "prism_intelligence", "prism_safety", "prism_session",
  "prism_memory", "prism_dev", "prism_orchestrate", "prism_guard",
  "prism_intake", "prism_omega", "prism_skill_script",
]);

/**
 * Read engine file's top-N lines as the classifier context.
 * Truncates at first class declaration or 30 lines.
 */
export function readEngineHeader(enginePath, maxLines = DEFAULT_HEADER_LINES) {
  try {
    const src = fs.readFileSync(enginePath, "utf8");
    const lines = src.split("\n").slice(0, maxLines);
    return lines.join("\n");
  } catch { return ""; }
}

/**
 * Build the prompt that asks Ollama to classify a batch of engines.
 * Engines is an array of { name, header }. Returns the formatted string.
 */
export function buildBatchPrompt(engines) {
  const dispList = VALID_DISPATCHERS.join(" | ");
  const body = engines.map((e, i) =>
    `### Engine ${i + 1}: ${e.name}\n\`\`\`typescript\n${e.header}\n\`\`\`\n`
  ).join("\n");
  return `You are classifying TypeScript engine modules for the PRISM manufacturing platform. For each engine, choose the SINGLE most appropriate dispatcher from this list:

${dispList}

Dispatcher purposes:
- prism_calc: physics formulas (Kienzle/Taylor/deflection/thermal/wear)
- prism_cam: toolpath generation, post-processors, CAM-side calculations
- prism_cad: geometry, mesh, NURBS, feature recognition
- prism_turning: lathe / turning / Swiss / live-tool operations
- prism_5axis: kinematics, TCPC, simultaneous-5
- prism_ai: neural networks, reasoning, ML predictions
- prism_intelligence: cross-domain synthesis, orchestration intelligence
- prism_safety: collision, envelope, safety validation
- prism_session: state/context/handoff/chat/identity
- prism_memory: recall, embed, episodic, vector store
- prism_dev: build/test/coverage/registry/schema/lifecycle
- prism_orchestrate: workflow, autopilot, agent, pipeline
- prism_guard: AGI containment, security gates
- prism_intake: ingestion (PDF, video, blueprint, OCR)
- prism_omega: quality scoring (Ω/sigma)
- prism_skill_script: skill or script orchestration

Respond ONLY with valid JSON in this EXACT format (no markdown, no commentary):
[{"engine":"<Name1>","dispatcher":"<choice>"},{"engine":"<Name2>","dispatcher":"<choice>"},...]

Engines to classify:

${body}`;
}

/**
 * Call Ollama /api/generate. Returns parsed JSON array or null.
 * Pure-export contract: fetchImpl injectable for tests.
 */
export async function callOllamaBatch(engines, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const url = opts.url ?? OLLAMA_URL;
  const model = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? 60000;

  const prompt = buildBatchPrompt(engines);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        keep_alive: "5m",
        options: { temperature: 0.1, num_predict: 1024 },
      }),
      signal: controller.signal,
    });
    if (!res?.ok) return { ok: false, error: `HTTP ${res?.status}` };
    const data = await res.json();
    const raw = data?.response || "";
    return { ok: true, raw, parsed: parseBatchResponse(raw, engines) };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse the model's JSON response. Defensive — handles markdown fences, partial
 * arrays, and invalid dispatcher names (rejected to UNKNOWN).
 */
export function parseBatchResponse(raw, engines) {
  if (typeof raw !== "string") return [];
  // Strip markdown code fences if present
  let clean = raw.trim();
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) clean = fenceMatch[1].trim();
  // Find first [ and last ] to grab the array body
  const startIdx = clean.indexOf("[");
  const endIdx = clean.lastIndexOf("]");
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return [];
  let arr;
  try { arr = JSON.parse(clean.slice(startIdx, endIdx + 1)); }
  catch { return []; }
  if (!Array.isArray(arr)) return [];

  const validNames = new Set(engines.map((e) => e.name));
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.engine || "").trim();
    const dispatcher = String(item.dispatcher || "").trim();
    if (!validNames.has(name)) continue;
    if (!VALID_DISPATCHERS.includes(dispatcher)) continue;
    out.push({ engine: name, dispatcher });
  }
  return out;
}

/** Read UNKNOWN ghost names from the graph. */
export function loadUnknownGhosts(graphPath) {
  const g = JSON.parse(fs.readFileSync(graphPath, "utf8"));
  return (g.nodes || [])
    .filter((n) => n?.kind === "ghost.unwired-engine" && n.proposed_wiring === "UNKNOWN")
    .map((n) => ({
      id: n.id,
      name: n.label,
      path: n.enginePath || path.join("mcp-server/src/engines", `${n.label}.ts`),
    }));
}

/** Chunk an array into batches of size n. */
export function chunkBatches(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function atomicWrite(filePath, content) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, content);
  const delays = [50, 100, 200, 400, 800, 1600];
  for (const d of delays) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      const code = err?.code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES" && code !== "EEXIST") throw err;
      const until = Date.now() + d;
      while (Date.now() < until) { /* spin */ }
    }
  }
  throw new Error(`rename retry exhausted: ${filePath}`);
}

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, batchSize: DEFAULT_BATCH_SIZE, model: DEFAULT_MODEL, limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--batch-size") out.batchSize = Number(argv[++i]) || DEFAULT_BATCH_SIZE;
    else if (a === "--model") out.model = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]) || Infinity;
    else if (a === "--help" || a === "-h") {
      console.error("usage: seed-ghost-llm-classify [--dry-run | --apply] [--batch-size N] [--model name] [--limit N]");
      process.exit(0);
    }
  }
  if (!out.dryRun && !out.apply) out.dryRun = true;
  return out;
}

export async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const unknowns = loadUnknownGhosts(GRAPH_PATH).slice(0, opts.limit);
  console.log(`Found ${unknowns.length} UNKNOWN ghost-unwired-engines`);

  if (unknowns.length === 0) {
    console.log("Nothing to classify — UNKNOWN tail empty.");
    return;
  }

  // Read headers for each (sync; small files)
  const engines = unknowns.map((u) => ({
    ...u,
    header: readEngineHeader(path.join(ROOT, u.path)),
  })).filter((e) => e.header.length > 0);

  console.log(`Read headers for ${engines.length} / ${unknowns.length} (rest missing on disk)`);

  const batches = chunkBatches(engines, opts.batchSize);
  console.log(`Batching ${engines.length} engines into ${batches.length} calls (batch-size=${opts.batchSize}, model=${opts.model})`);

  if (opts.dryRun) {
    console.log("DRY-RUN — would call Ollama " + batches.length + " times");
    console.log("Sample batch (first 2 engine names):", engines.slice(0, 2).map((e) => e.name));
    return;
  }

  const allClassifications = [];
  let batchIdx = 0;
  for (const batch of batches) {
    batchIdx++;
    process.stderr.write(`[batch ${batchIdx}/${batches.length}] classifying ${batch.length} engines...`);
    const t0 = Date.now();
    const r = await callOllamaBatch(batch, { model: opts.model });
    const dt = Date.now() - t0;
    if (!r.ok) {
      process.stderr.write(` FAIL (${r.error}) in ${dt}ms\n`);
      continue;
    }
    process.stderr.write(` ${r.parsed.length}/${batch.length} classified in ${dt}ms\n`);
    allClassifications.push(...r.parsed);
  }

  console.log(`\nClassified ${allClassifications.length}/${engines.length} via LLM`);

  // Merge into graph
  const g = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  const nameToNode = new Map();
  for (const n of g.nodes) {
    if (n?.kind === "ghost.unwired-engine") nameToNode.set(n.label, n);
  }
  const existingEdgeKeys = new Set(g.edges.map((e) => `${e.from}::${e.to}::${e.type || ""}`));

  let nodesUpdated = 0, edgesAdded = 0;
  for (const c of allClassifications) {
    const node = nameToNode.get(c.engine);
    if (!node) continue;
    node.proposed_wiring = c.dispatcher;
    node.confidence = LLM_CONFIDENCE;
    node.reason = `LLM-classified via ${opts.model}`;
    node.info = `Unwired engine — proposed wiring: ${c.dispatcher} (confidence ${LLM_CONFIDENCE.toFixed(2)}, reason: LLM-classified via ${opts.model})`;
    nodesUpdated++;
    const edge = {
      from: node.id,
      to: `dispatcher.${c.dispatcher}`,
      type: "ghost-wire",
      relation: "proposed-wire",
      status: "proposed",
      intensity: LLM_CONFIDENCE,
    };
    const key = `${edge.from}::${edge.to}::${edge.type}`;
    if (!existingEdgeKeys.has(key)) {
      g.edges.push(edge);
      existingEdgeKeys.add(key);
      edgesAdded++;
    }
  }

  console.log(`Writing graph (nodes updated=${nodesUpdated}, edges added=${edgesAdded})...`);
  atomicWrite(GRAPH_PATH, JSON.stringify(g, null, 2));
  console.log(`DONE — graph nodes=${g.nodes.length} edges=${g.edges.length}`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
