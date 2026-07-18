#!/usr/bin/env node
/**
 * audit-coverage-stream.mjs — streaming variant of audit-token-savings-coverage.mjs
 *
 * Stream-parses the full 519MB system-graph.json (exceeds Node string limit)
 * and classifies EVERY node via the same classifyNode rules as the curated audit.
 *
 * Strategy: chunk-read the file, find object boundaries within the nodes array
 * by tracking brace depth + string-state. Each top-level object inside `nodes`
 * is JSON.parsed individually and run through classifyNode.
 *
 * Output: state/shared/dashboards/coverage-audit-system-graph-full.json
 */
import { createReadStream, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { classifyNode, loadCoverageSources } from "./audit-token-savings-coverage.mjs";

const PRISM = "H:/prism";
const FULL_GRAPH = `${PRISM}/state/shared/system-viz/system-graph.json`;
const OUTPUT = `${PRISM}/state/shared/dashboards/coverage-audit-system-graph-full.json`;

const CHUNK = 16 * 1024 * 1024; // 16 MB

async function streamClassify(graphPath, sources) {
  return new Promise((resolve, reject) => {
    const counts = { COVERED: 0, CANDIDATE: 0, NA: 0 };
    const candidatesByPrefix = Object.create(null);
    const candidatesSample = [];
    const SAMPLE_CAP = 50;
    let total = 0;
    let parseErrors = 0;

    // State machine
    let inNodesArray = false;
    let depth = 0; // brace depth inside nodes[]
    let buf = "";
    let inString = false;
    let escaped = false;
    let objStart = -1;
    let foundNodesKey = false;

    const stream = createReadStream(graphPath, { highWaterMark: CHUNK, encoding: "utf8" });

    stream.on("data", (chunk) => {
      buf += chunk;

      // First time: locate the start of nodes[ array. Match "nodes":[ (with
      // optional whitespace) so we skip scalar fields like meta.totals.nodes.
      if (!inNodesArray) {
        const m = buf.match(/"nodes"\s*:\s*\[/);
        if (!m) {
          // keep last 256 bytes for boundary safety
          if (buf.length > 1024) buf = buf.slice(-1024);
          return;
        }
        inNodesArray = true;
        foundNodesKey = true;
        buf = buf.slice(m.index + m[0].length); // start after [
      }

      // Walk buf, identify each top-level object inside nodes[]
      let i = 0;
      const n = buf.length;
      while (i < n) {
        const c = buf[i];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (c === "\\") {
            escaped = true;
          } else if (c === '"') {
            inString = false;
          }
          i++;
          continue;
        }
        if (c === '"') {
          inString = true;
          i++;
          continue;
        }
        if (c === "{") {
          if (depth === 0) objStart = i;
          depth++;
          i++;
          continue;
        }
        if (c === "}") {
          depth--;
          if (depth === 0 && objStart >= 0) {
            const objText = buf.slice(objStart, i + 1);
            try {
              const node = JSON.parse(objText);
              total++;
              const cls = classifyNode(node, sources);
              counts[cls] = (counts[cls] || 0) + 1;
              if (cls === "CANDIDATE") {
                const id = String(node.id || node.label || "");
                const prefix = id.split(".")[0] || "(no-prefix)";
                candidatesByPrefix[prefix] = (candidatesByPrefix[prefix] || 0) + 1;
                if (candidatesSample.length < SAMPLE_CAP) candidatesSample.push(id);
              }
            } catch (e) {
              parseErrors++;
            }
            objStart = -1;
          }
          i++;
          continue;
        }
        if (c === "]" && depth === 0) {
          // End of nodes array
          stream.destroy();
          break;
        }
        i++;
      }

      // Trim consumed prefix (keep from objStart if mid-object, else drop everything)
      if (objStart >= 0) {
        buf = buf.slice(objStart);
        objStart = 0;
      } else {
        buf = "";
      }
    });

    stream.on("close", () => {
      resolve({ counts, candidatesByPrefix, candidatesSample, total, parseErrors, foundNodesKey });
    });
    stream.on("error", reject);
  });
}

async function main() {
  const ts = new Date().toISOString();
  const sources = loadCoverageSources();

  const t0 = Date.now();
  const result = await streamClassify(FULL_GRAPH, sources);
  const elapsedMs = Date.now() - t0;

  const out = {
    source: "system-graph.json",
    sourcePath: FULL_GRAPH,
    generatedAt: ts,
    elapsedMs,
    totalNodes: result.total,
    parseErrors: result.parseErrors,
    buckets: result.counts,
    candidatesByPrefix: result.candidatesByPrefix,
    candidatesSample: result.candidatesSample,
  };

  if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(out, null, 2));

  console.log(
    `total=${result.total} COVERED=${result.counts.COVERED} CANDIDATE=${result.counts.CANDIDATE} NA=${result.counts.NA} parseErrors=${result.parseErrors} elapsedMs=${elapsedMs}`
  );
  console.log(`→ ${OUTPUT}`);
}

main().catch((e) => { console.error("ERROR:", e.message, e.stack); process.exit(1); });
