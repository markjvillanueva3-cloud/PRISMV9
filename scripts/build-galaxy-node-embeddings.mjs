#!/usr/bin/env node
/**
 * build-galaxy-node-embeddings.mjs -- mint 768d GNN node-features for the 34 galaxy roost
 * nodes and MERGE them into the GraphSAGE trainer's embedding source
 * (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT, slot:charlie, operator-authorized cross-galaxy
 * build into india's NN/GNN substrate).
 *
 * The trainer's --embedding-source (state/shared/nn-graph/node-embeddings-768d.jsonl) covered
 * ~771 nodes and ZERO `ghost.galaxy.<g>` roosts -- so the GNN had no semantic feature for the
 * 34 galaxy nodes it must classify (the "full-coverage pending ref-pool growth" the PSN NN/GNN
 * leg flags). This embeds each galaxy's doctrine corpus (CLAUDE+MEMORY+AWARENESS+synthesis,
 * via gatherGalaxyDocs) with the SAME model (nomic-embed-text 768d) + convention
 * (aggregateEmbeddings -> quantizeInt8) india uses, and ADDITIVELY merges the rows in
 * (deduped by node id -- existing engine rows are never touched; re-runs replace galaxy rows).
 *
 * Fail-soft per galaxy (a missing embed -> skip + report); fail-loud (exit 2) on any error so a
 * partial run never silently under-covers. Atomic tmp+rename so the live source is never torn.
 *
 * Usage:
 *   node scripts/build-galaxy-node-embeddings.mjs            # embed + merge into the live source
 *   node scripts/build-galaxy-node-embeddings.mjs --dry      # report, write nothing
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gatherGalaxyDocs } from "./lib/galaxy-reasoning-bridge.mjs";
import { embedText } from "./lib/galaxy-dense-rerank.mjs";
import { buildGalaxyEmbeddingRow, mergeRows, galaxyNodeId } from "./lib/galaxy-node-embedding-row.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const SOURCE = path.join(ROOT, "state/shared/nn-graph/node-embeddings-768d.jsonl");
const EMBED_MODEL = process.env.PRISM_GALAXY_EMBED_MODEL || "nomic-embed-text";
const DOC_CAP_CHARS = 6000; // per-doc prefix fed to the embedder (nomic context budget)
const EXPECT_DIM = 768;

function enumerateGalaxies() {
  const out = [];
  try {
    for (const e of fs.readdirSync(ENGINES_DIR, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith(".") && fs.existsSync(path.join(ENGINES_DIR, e.name, "CLAUDE.md"))) {
        out.push(e.name);
      }
    }
  } catch {
    /* none */
  }
  return out.sort();
}

/** Read the existing source: {meta, rows} (meta = the __meta header line; rows = the rest). */
function readSource() {
  let meta = { __meta: true, model: `${EMBED_MODEL}:latest`, dim: EXPECT_DIM, schemaVersion: 1, source: "graph-node-bridge" };
  const rows = [];
  let txt = "";
  try {
    txt = fs.readFileSync(SOURCE, "utf8");
  } catch {
    return { meta, rows }; // absent -> fresh
  }
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let obj;
    try {
      obj = JSON.parse(t);
    } catch {
      continue; // skip a torn line defensively
    }
    if (obj && obj.__meta) meta = obj;
    else if (obj && typeof obj.n === "string" && Array.isArray(obj.q)) rows.push(obj);
  }
  return { meta, rows };
}

/**
 * Embed every galaxy's doctrine corpus and MERGE the node-feature rows into the GNN
 * embedding source. Reusable from the retrain lifecycle (R15 wire) -- returns a summary,
 * does NOT process.exit (the CLI wrapper handles exit codes). Fail-soft per galaxy.
 * @param {{dry?:boolean}} opts
 * @returns {Promise<{galaxyRows:number, merged:number, was:number, errors:string[], wrote:boolean}>}
 */
export async function mergeGalaxyNodeFeatures(opts = {}) {
  const dry = !!opts.dry;
  const galaxies = enumerateGalaxies();
  if (!galaxies.length) return { galaxyRows: 0, merged: 0, was: 0, errors: ["no galaxies found"], wrote: false };

  const galaxyRows = [];
  const errors = [];
  for (const g of galaxies) {
    const docs = gatherGalaxyDocs(g, ROOT);
    if (!docs.length) {
      errors.push(`${g}: no doctrine docs`);
      continue;
    }
    const vectors = [];
    for (const d of docs) {
      const v = await embedText(d.text.slice(0, DOC_CAP_CHARS), { model: EMBED_MODEL });
      if (Array.isArray(v) && v.length === EXPECT_DIM) vectors.push(v);
    }
    if (!vectors.length) {
      errors.push(`${g}: 0 usable embeddings (embed service down or dim mismatch)`);
      continue;
    }
    const row = buildGalaxyEmbeddingRow(g, vectors);
    if (!row) {
      errors.push(`${g}: row build failed (degenerate centroid)`);
      continue;
    }
    galaxyRows.push(row);
    process.stdout.write(`  ${g.padEnd(22)} ${galaxyNodeId(g)} q[${row.q.length}] (${vectors.length} docs)\n`);
  }

  const { meta, rows } = readSource();
  const merged = mergeRows(rows, galaxyRows);
  const newMeta = { ...meta, __meta: true, count: merged.length, dim: EXPECT_DIM, model: `${EMBED_MODEL}:latest`, generatedAt: new Date().toISOString(), galaxyNodesCovered: galaxyRows.length, lastGalaxyMergeBy: "build-galaxy-node-embeddings" };

  let wrote = false;
  if (!dry && galaxyRows.length) {
    const lines = [JSON.stringify(newMeta), ...merged.map((r) => JSON.stringify({ n: r.n, q: r.q }))];
    const tmp = `${SOURCE}.tmp-${process.pid}`;
    fs.mkdirSync(path.dirname(SOURCE), { recursive: true });
    fs.writeFileSync(tmp, lines.join("\n") + "\n");
    fs.renameSync(tmp, SOURCE); // atomic -- the live source is never torn
    wrote = true;
  }
  return { galaxyRows: galaxyRows.length, merged: merged.length, was: rows.length, errors, wrote };
}

/** CLI wrapper -- handles --dry, logging, and exit codes. */
async function main() {
  const dry = process.argv.slice(2).includes("--dry");
  const r = await mergeGalaxyNodeFeatures({ dry });
  process.stdout.write(
    `${dry ? "[dry] would merge" : "merged"} ${r.galaxyRows} galaxy node-feature rows -> ${path.relative(ROOT, SOURCE)} ` +
      `(${r.merged} total, was ${r.was})${r.errors.length ? `, ${r.errors.length} error(s)` : ""}\n`
  );
  for (const e of r.errors) process.stderr.write(`  ! ${e}\n`);
  // Fail loud (R12): a partial galaxy run must not silently under-cover the GNN.
  if (r.errors.length) process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    process.stderr.write(`build-galaxy-node-embeddings failed: ${e && e.message}\n`);
    process.exit(1);
  });
}
