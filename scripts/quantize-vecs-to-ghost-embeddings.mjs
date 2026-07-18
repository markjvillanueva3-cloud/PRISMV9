#!/usr/bin/env node
/**
 * quantize-vecs-to-ghost-embeddings.mjs -- join GPU float vectors (embed-nodes-gpu.py)
 * with ghost metadata into a deployed-format ghost-node-embeddings JSONL candidate
 * (slot:india, A2 / GNN re-embed). The candidate is consumed by
 *   nn-graph-holdout-variance.mjs --embed-path <candidate>
 * for a pure MODEL-SWAP A/B against the deployed nomic ghost pool (same ghost set,
 * same seeds, same eval) -- the metric-gated test of whether a stronger embedding
 * model lifts the tier-5 deploy gate.
 *
 * Parity: vectors are quantized via the SAME exported quantize() the deployed pipeline
 * uses (L2-norm + int8), and metadata (n/h/k) is carried from the --emit-texts tap, so
 * the ONLY difference from the deployed file is the embedding model. Restricting to the
 * deployed --ref id set guarantees the candidate ghost SET == the deployed ghost SET
 * (an apples-to-apples holdout pool), never a superset that would shift the holdout.
 *
 * Usage:
 *   node scripts/quantize-vecs-to-ghost-embeddings.mjs \
 *     --vecs  state/shared/nn-graph/.a2-scratch/ghost-vecs.jsonl \
 *     --texts state/shared/nn-graph/.a2-scratch/ghost-texts.jsonl \
 *     --ref   state/shared/nn-graph/ghost-node-embeddings.jsonl \
 *     --out   state/shared/nn-graph/.a2-scratch/ghost-node-embeddings.mxbai768.candidate.jsonl \
 *     --model mxbai-embed-large-v1@768
 *
 * ASCII only.
 */
import fs from "node:fs";
import path from "node:path";
import { quantize } from "./build-node-embeddings.mjs";

function parseArgs(argv) {
  const a = { vecs: null, texts: null, ref: null, out: null, model: "gpu-candidate", dim: 768 };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--vecs") a.vecs = argv[++i];
    else if (x === "--texts") a.texts = argv[++i];
    else if (x === "--ref") a.ref = argv[++i];
    else if (x === "--out") a.out = argv[++i];
    else if (x === "--model") a.model = argv[++i];
    else if (x === "--dim") a.dim = parseInt(argv[++i], 10) || 768;
    else if (x === "--help" || x === "-h") {
      process.stdout.write("usage: quantize-vecs-to-ghost-embeddings --vecs V --texts T [--ref R] --out O [--model M] [--dim N]\n");
      process.exit(0);
    }
  }
  return a;
}

/** Read a JSONL file into rows, dropping blanks + the __meta header. Pure. */
export function readJsonl(p) {
  const rows = [];
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let r;
    try { r = JSON.parse(t); } catch { continue; }
    if (r && r.__meta) continue;
    rows.push(r);
  }
  return rows;
}

/**
 * Pure join: produce deployed-format ghost-embedding records {id,n,h,k,src,s,q} from
 * GPU float vectors + emit-texts metadata, restricted to refIds when given (strict
 * apples-to-apples ghost set). Each vector is L2-norm + int8 quantized via the SAME
 * quantize() the deployed pipeline uses, so the ONLY difference vs deployed is the model.
 *
 * @param {Map<string,number[]>} vecById   id -> float vector (from embed-nodes-gpu.py)
 * @param {Map<string,{n,h,k}>}  metaById  id -> {n,h,k} (from build-node-embeddings --emit-texts)
 * @param {Set<string>|null}     refIds    restrict output to these ids (deployed ghost set); null = all
 * @param {{model:string,dim:number}} opts
 * @returns {{records: object[], stats: object}}
 */
export function buildCandidate(vecById, metaById, refIds, opts = {}) {
  const model = opts.model || "gpu-candidate";
  const dim = opts.dim || 768;
  const records = [];
  let written = 0, dimMismatch = 0, missingMeta = 0, refSkipped = 0;
  for (const [id, vec] of vecById) {
    if (refIds && !refIds.has(id)) { refSkipped++; continue; }
    if (!Array.isArray(vec) || vec.length !== dim) { dimMismatch++; continue; }
    const meta = metaById.get(id);
    if (!meta) missingMeta++;
    const qz = quantize(vec);
    records.push({
      id,
      n: meta ? meta.n : id,
      h: meta ? meta.h : null,
      k: meta ? meta.k : "ghost.unwired-engine",
      src: model,
      s: qz.s,
      q: qz.q,
    });
    written++;
  }
  const refTotal = refIds ? refIds.size : null;
  const refCovered = refIds ? [...refIds].filter((id) => vecById.has(id)).length : null;
  const stats = {
    vecsIn: vecById.size, written, dimMismatch, missingMeta, refSkipped,
    refTotal, refCovered, refUncovered: refIds ? refTotal - refCovered : null,
  };
  return { records, stats };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.vecs || !args.texts || !args.out) {
    process.stderr.write("quantize-vecs-to-ghost-embeddings: --vecs, --texts and --out are required\n");
    process.exit(2);
  }
  const vecById = new Map();
  for (const r of readJsonl(args.vecs)) if (r && typeof r.id === "string" && Array.isArray(r.vec)) vecById.set(r.id, r.vec);

  const metaById = new Map();
  for (const r of readJsonl(args.texts)) {
    if (r && typeof r.id === "string") metaById.set(r.id, { n: r.n ?? r.id, h: r.h ?? null, k: r.k ?? null });
  }

  let refIds = null;
  if (args.ref) {
    refIds = new Set();
    for (const r of readJsonl(args.ref)) if (r && typeof r.id === "string") refIds.add(r.id);
  }

  const { records, stats } = buildCandidate(vecById, metaById, refIds, { model: args.model, dim: args.dim });

  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const out = [JSON.stringify({
    __meta: true, model: args.model, dim: args.dim, schemaVersion: 1,
    source: "gpu-candidate", generatedAt: new Date().toISOString(),
  })];
  for (const rec of records) out.push(JSON.stringify(rec));
  fs.writeFileSync(outPath, out.join("\n") + "\n");

  const summary = { ok: true, out: outPath, model: args.model, dim: args.dim, ...stats };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  if (refIds && stats.refCovered < stats.refTotal) {
    process.stderr.write(`WARN: ${stats.refTotal - stats.refCovered}/${stats.refTotal} deployed ghost ids have NO mxbai vector (candidate is a subset -- holdout pool differs)\n`);
  }
}

if (import.meta.url.endsWith((process.argv[1] || "").replace(/\\/g, "/").replace(/^.*\//, "/"))) {
  main();
}
