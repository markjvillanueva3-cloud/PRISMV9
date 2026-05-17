#!/usr/bin/env node
// U-P2-COT-REASON-BLAST-RADIUS (SYSTEM-VIZ-BRAIN-MS0, slot=echo, 2026-05-17)
//
// Pure resolver + CLI that takes a system-viz node-id and a system-graph and
// emits a fully-formed `prism_ai:cot_reason` invocation payload PLUS the
// extracted upstream/downstream blast-radius (BFS over edges, bounded by hops
// and per-hop neighbor cap). The frontend right-clicks a node, calls this
// resolver, and dispatches the returned payload.
//
// Contract verified against live source on 2026-05-17:
//   • Action lives at `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:1444`
//     dispatcher: `prism_ai`, action: `cot_reason`.
//   • Input type: `ReasoningProblem` from `mcp-server/src/engines/ChainOfThoughtEngine.ts:129-138`:
//       { problem: string;             // required
//         goal: string;                // required
//         context?: Record<string, unknown>;
//         constraints?: string[];
//         known_facts?: string[];
//         strategy?: ReasoningStrategy;
//         max_steps?: number;
//         confidence_threshold?: number;
//       }
//   • Output result includes {chain_id, step_count, current_confidence,
//     dead_end_count, final_answer, meta, steps} — frontend consumes this.
//
// Backend slice of U-P2-COT-REASON-BLAST-RADIUS. Frontend right-click handler
// deferred. ZERO dispatcher action surface ADDED here — we BUILD payloads for
// an EXISTING action (read-only contract consumer; analogous to
// U-P2-NODE-CLICK-DISPATCH).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_SYSTEM_GRAPH_PATH = path.join(
  REPO_ROOT,
  "state/shared/system-viz/system-graph.json",
);

// ─── BFS limits ─────────────────────────────────────────────────────────────
// Defaults chosen for /system-viz right-click responsiveness: 2-hop is enough
// context for reasoning without flooding the cot_reason `context` object with
// the full transitive closure. The cap protects against fan-out blow-up.
export const DEFAULT_HOPS = 2;
export const DEFAULT_MAX_NEIGHBORS = 50;
export const ABSOLUTE_HOP_CAP = 5; // hard cap; resolver clamps user input
export const ABSOLUTE_NEIGHBOR_CAP = 500;
export const MIN_HOPS = 1;
export const MIN_NEIGHBORS = 1;

// Dispatcher contract — frozen against aiReasoningDispatcher.ts:1444.
export const COT_DISPATCHER = "prism_ai";
export const COT_ACTION = "cot_reason";

// Reasoning strategy default — `ReasoningStrategy` is an enum on the engine;
// "linear" is the dispatcher's documented default at line 230 of the engine.
export const DEFAULT_STRATEGY = "linear";
export const DEFAULT_MAX_STEPS = 8;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

// ─── BFS over system-graph edges ────────────────────────────────────────────
//
// Input graph shape (matches state/shared/system-viz/system-graph.json):
//   { nodes: [{id, label, kind, ...}], edges: [{source, target, kind, ...}] }
//
// Direction:
//   • upstream = edges where THIS node is `target` (things that point AT us)
//   • downstream = edges where THIS node is `source` (things WE point at)
//
// BFS is per-direction; the same neighbor can appear in both upstream and
// downstream sets if the graph has cycles. We dedupe within each set; we DON'T
// dedupe across sets (so frontend can color separately).
//
// Returns: { upstream: {nodes: [], edges: []}, downstream: {nodes: [], edges: []}, truncated: bool }
export function extractBlastRadius({
  nodeId,
  systemGraph,
  hops = DEFAULT_HOPS,
  maxNeighbors = DEFAULT_MAX_NEIGHBORS,
} = {}) {
  // Clamp inputs. Per-file scrutiny arm A P1: Math.min/Math.max propagate NaN,
  // bypassing the floor. Coerce non-finite inputs to the default BEFORE clamping
  // so `--hops abc` (Number→NaN) or `null`/`undefined` lands on the default.
  const safeHops = Number.isFinite(hops) ? hops : DEFAULT_HOPS;
  const safeMax = Number.isFinite(maxNeighbors) ? maxNeighbors : DEFAULT_MAX_NEIGHBORS;
  const clampedHops = Math.max(MIN_HOPS, Math.min(ABSOLUTE_HOP_CAP, safeHops));
  const clampedMax = Math.max(
    MIN_NEIGHBORS,
    Math.min(ABSOLUTE_NEIGHBOR_CAP, safeMax),
  );

  const nodes = Array.isArray(systemGraph?.nodes) ? systemGraph.nodes : [];
  const edges = Array.isArray(systemGraph?.edges) ? systemGraph.edges : [];

  // Index nodes by id for fast lookup. Object.create(null) for proto-pollution
  // safety (lesson from U-P2-SLOT-OWNERSHIP-OVERLAY scrutiny).
  const nodeById = Object.create(null);
  for (const n of nodes) {
    if (n && typeof n === "object" && typeof n.id === "string") {
      nodeById[n.id] = n;
    }
  }

  // Build forward + reverse adjacency lists once.
  const outAdj = Object.create(null); // source → [targets]
  const inAdj = Object.create(null); // target → [sources]
  const outEdges = Object.create(null); // source → [edges]
  const inEdges = Object.create(null); // target → [edges]
  for (const e of edges) {
    if (!e || typeof e !== "object") continue;
    const s = e.source;
    const t = e.target;
    if (typeof s !== "string" || typeof t !== "string") continue;
    if (!outAdj[s]) {
      outAdj[s] = [];
      outEdges[s] = [];
    }
    outAdj[s].push(t);
    outEdges[s].push(e);
    if (!inAdj[t]) {
      inAdj[t] = [];
      inEdges[t] = [];
    }
    inAdj[t].push(s);
    inEdges[t].push(e);
  }

  let truncated = false;

  // BFS one direction; returns {nodes: [{id, hop, ...}], edges: [...]}.
  function bfs(direction) {
    const adj = direction === "upstream" ? inAdj : outAdj;
    const edgeIdx = direction === "upstream" ? inEdges : outEdges;
    const visitedNodes = new Set([nodeId]);
    const visitedEdges = new Set();
    const collectedNodes = [];
    const collectedEdges = [];
    let frontier = [nodeId];

    for (let hop = 1; hop <= clampedHops; hop++) {
      const nextFrontier = [];
      for (const curId of frontier) {
        const neighbors = adj[curId] || [];
        const neighborEdges = edgeIdx[curId] || [];
        for (let i = 0; i < neighbors.length; i++) {
          const nid = neighbors[i];
          const edge = neighborEdges[i];
          // Stable edge key: source|target|kind (kind optional)
          const edgeKey = `${edge.source}|${edge.target}|${edge.kind || ""}`;
          if (!visitedEdges.has(edgeKey)) {
            visitedEdges.add(edgeKey);
            collectedEdges.push({
              source: edge.source,
              target: edge.target,
              kind: edge.kind || null,
            });
          }
          if (!visitedNodes.has(nid)) {
            visitedNodes.add(nid);
            const neighborNode = nodeById[nid];
            collectedNodes.push({
              id: nid,
              hop,
              label: neighborNode?.label || null,
              kind: neighborNode?.kind || null,
            });
            if (collectedNodes.length >= clampedMax) {
              truncated = true;
              return { nodes: collectedNodes, edges: collectedEdges };
            }
            nextFrontier.push(nid);
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }
    return { nodes: collectedNodes, edges: collectedEdges };
  }

  const upstream = bfs("upstream");
  const downstream = bfs("downstream");

  return {
    upstream,
    downstream,
    truncated,
    clampedHops,
    clampedMaxNeighbors: clampedMax,
  };
}

// ─── Build cot_reason payload ───────────────────────────────────────────────
//
// `problem` and `goal` are REQUIRED per ReasoningProblem; if caller doesn't
// provide them, we synthesize sane defaults from the node's label/kind.
export function buildCotReasonPayload({
  nodeId,
  systemGraph,
  hops = DEFAULT_HOPS,
  maxNeighbors = DEFAULT_MAX_NEIGHBORS,
  problem = null,
  goal = null,
  constraints = null,
  knownFacts = null,
  strategy = DEFAULT_STRATEGY,
  maxSteps = DEFAULT_MAX_STEPS,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  now = null,
} = {}) {
  const nowMs = typeof now === "number" ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Validate nodeId presence
  if (!nodeId || typeof nodeId !== "string") {
    return {
      schemaVersion: 1,
      generatedAt: nowIso,
      ok: false,
      error: "MISSING_NODE_ID",
      message: "nodeId is required (string)",
    };
  }

  const nodes = Array.isArray(systemGraph?.nodes) ? systemGraph.nodes : [];
  const targetNode = nodes.find((n) => n && n.id === nodeId) || null;

  // Synthesize defaults if missing (frontend may pass through user's
  // free-text question, but the right-click default needs to work too).
  const synthesizedProblem =
    problem ||
    (targetNode
      ? `Explain the role of "${targetNode.label || nodeId}" (kind=${targetNode.kind || "unknown"}) in the PRISM system.`
      : `Explain the role of node "${nodeId}" in the PRISM system.`);
  const synthesizedGoal =
    goal ||
    `Produce a chain-of-thought analysis covering upstream dependencies, downstream consumers, and likely blast-radius if this node breaks.`;

  const blast = extractBlastRadius({
    nodeId,
    systemGraph,
    hops,
    maxNeighbors,
  });

  // Build the params block — frozen contract against ReasoningProblem at
  // ChainOfThoughtEngine.ts:129-138.
  const params = {
    problem: synthesizedProblem,
    goal: synthesizedGoal,
    context: {
      node_id: nodeId,
      node: targetNode
        ? {
            id: targetNode.id,
            label: targetNode.label || null,
            kind: targetNode.kind || null,
          }
        : null,
      upstream: blast.upstream,
      downstream: blast.downstream,
      blast_radius_truncated: blast.truncated,
      hops: blast.clampedHops,
      max_neighbors: blast.clampedMaxNeighbors,
    },
    strategy,
    max_steps: maxSteps,
    confidence_threshold: confidenceThreshold,
  };
  if (Array.isArray(constraints) && constraints.length > 0) {
    params.constraints = constraints.slice();
  }
  if (Array.isArray(knownFacts) && knownFacts.length > 0) {
    params.known_facts = knownFacts.slice();
  }

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    ok: true,
    dispatcher: COT_DISPATCHER,
    action: COT_ACTION,
    sourceContract: "aiReasoningDispatcher.ts:1444 → ChainOfThoughtEngine.ts:129-138",
    params,
    blastRadius: {
      upstream: {
        nodeCount: blast.upstream.nodes.length,
        edgeCount: blast.upstream.edges.length,
      },
      downstream: {
        nodeCount: blast.downstream.nodes.length,
        edgeCount: blast.downstream.edges.length,
      },
      truncated: blast.truncated,
      hops: blast.clampedHops,
      maxNeighborsCap: blast.clampedMaxNeighbors,
    },
    targetNodePresent: targetNode !== null,
    advisory: {
      mustHumanVerify: true,
      caveat:
        "Synthesized problem/goal are generic defaults when caller omits them; frontend should override with user free-text for higher-quality cot_reason output. blast_radius_truncated:true means the BFS hit the per-direction neighbor cap — increase --max-neighbors (≤ABSOLUTE_NEIGHBOR_CAP=500) for full context. Reverse-direction (upstream) BFS uses inverse adjacency; cycles in the graph mean a node may appear in BOTH upstream AND downstream sets (intentional — frontend can color separately).",
    },
  };
}

// ─── I/O wrappers ───────────────────────────────────────────────────────────
export function readSystemGraph(filePath = DEFAULT_SYSTEM_GRAPH_PATH) {
  try {
    if (!fs.existsSync(filePath)) return { nodes: [], edges: [] };
    const txt = fs.readFileSync(filePath, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    process.stderr.write(
      `[system-viz-cot-reason-blast-radius] readSystemGraph failed: ${e && e.message}\n`,
    );
    return { nodes: [], edges: [], _readError: String(e && e.message) };
  }
}

export function writePayload(outPath, payload) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Atomic write — tmp + rename.
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  return outPath;
}

// ─── Arg parsing ────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    nodeId: null,
    outPath: null,
    json: true, // CLI default: write to stdout, this is a payload generator
    frozenTime: null,
    graphPath: null,
    hops: DEFAULT_HOPS,
    maxNeighbors: DEFAULT_MAX_NEIGHBORS,
    problem: null,
    goal: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--node-id") out.nodeId = argv[++i];
    else if (a === "--out") {
      out.outPath = argv[++i];
      out.json = false;
    } else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--graph") out.graphPath = argv[++i];
    else if (a === "--hops") out.hops = Number(argv[++i]);
    else if (a === "--max-neighbors") out.maxNeighbors = Number(argv[++i]);
    else if (a === "--problem") out.problem = argv[++i];
    else if (a === "--goal") out.goal = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const HELP = `system-viz-cot-reason-blast-radius — build prism_ai:cot_reason payload
  --node-id <id>         REQUIRED — system-viz node id
  --graph <path>         system-graph path (default: state/shared/system-viz/system-graph.json)
  --hops <n>             BFS depth per direction (default ${DEFAULT_HOPS}, max ${ABSOLUTE_HOP_CAP})
  --max-neighbors <n>    cap per direction (default ${DEFAULT_MAX_NEIGHBORS}, max ${ABSOLUTE_NEIGHBOR_CAP})
  --problem <text>       override synthesized problem statement
  --goal <text>          override synthesized goal
  --out <path>           write payload to file (else stdout JSON)
  --frozen-time <ISO>    deterministic timestamp
  --help                 show this
`;

// ─── CLI ────────────────────────────────────────────────────────────────────
export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (!args.nodeId) {
    process.stderr.write("ERROR: --node-id is required\n");
    process.stdout.write(HELP);
    return 2;
  }

  const systemGraph = readSystemGraph(args.graphPath || DEFAULT_SYSTEM_GRAPH_PATH);
  const nowMs = args.frozenTime ? Date.parse(args.frozenTime) : Date.now();
  const payload = buildCotReasonPayload({
    nodeId: args.nodeId,
    systemGraph,
    hops: args.hops,
    maxNeighbors: args.maxNeighbors,
    problem: args.problem,
    goal: args.goal,
    now: Number.isFinite(nowMs) ? nowMs : Date.now(),
  });

  if (args.outPath) {
    writePayload(args.outPath, payload);
    process.stdout.write(
      `cot-reason-payload written → ${path.relative(REPO_ROOT, args.outPath)}\n` +
        `  node=${args.nodeId} ${payload.ok ? `up=${payload.blastRadius.upstream.nodeCount} down=${payload.blastRadius.downstream.nodeCount} truncated=${payload.blastRadius.truncated}` : `error=${payload.error}`}\n`,
    );
  } else {
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  }
  return payload.ok ? 0 : 1;
}

const _invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();
if (_invokedAsCli) {
  void main().then((code) => process.exit(code || 0));
}
