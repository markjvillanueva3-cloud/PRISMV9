// tier: T4
/**
 * hook_circular_dep_check — USSH Phase 0.25
 * ==========================================
 *
 * Detects circular dependencies using Tarjan's SCC algorithm.
 * Runs on SessionStart to catch dependency cycles early.
 *
 * Fires: SessionStart
 * Theory: Graph theory, Strongly Connected Components
 */

import fs from 'fs';

const CACHE_FILE = 'H:/prism/mcp-server/data/state/circular-dep-cache.json';
const CACHE_TTL = 3600000; // 1 hour

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return cache;
      }
    }
  } catch {}
  return null;
}

function saveCache(result) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      ...result,
      timestamp: Date.now()
    }, null, 2));
  } catch {}
}

function buildDependencyGraph() {
  // Build a simplified dependency graph from hook registry
  const graph = new Map();

  try {
    // Read hook registry
    const hookDir = 'H:/prism/.claude/hooks';
    const files = fs.readdirSync(hookDir).filter(f => f.endsWith('.mjs'));

    for (const file of files) {
      const hookId = file.replace('.mjs', '');
      graph.set(hookId, []);

      // Parse file for imports (simplified)
      try {
        const content = fs.readFileSync(`${hookDir}/${file}`, 'utf-8');
        const importMatches = content.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g);
        for (const match of importMatches) {
          const dep = match[1].replace('.mjs', '').replace('.js', '');
          if (graph.has(hookId)) {
            graph.get(hookId).push(dep);
          }
        }
      } catch {}
    }
  } catch {}

  return graph;
}

function tarjanSCC(graph) {
  const index = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const sccs = [];
  let idx = 0;

  function strongconnect(v) {
    index.set(v, idx);
    lowlink.set(v, idx);
    idx++;
    stack.push(v);
    onStack.add(v);

    const successors = graph.get(v) || [];
    for (const w of successors) {
      if (!index.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), index.get(w)));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      if (scc.length > 1) {
        sccs.push(scc);
      }
    }
  }

  for (const v of graph.keys()) {
    if (!index.has(v)) {
      strongconnect(v);
    }
  }

  return sccs;
}

export default async function hookCircularDepCheck({ session_id }) {
  // Check cache first
  const cached = loadCache();
  if (cached && cached.cycles.length === 0) {
    return { proceed: true };
  }

  // Build and analyze dependency graph
  const graph = buildDependencyGraph();
  const cycles = tarjanSCC(graph);

  const result = {
    nodeCount: graph.size,
    cycles,
    hasCycles: cycles.length > 0
  };

  saveCache(result);

  if (cycles.length > 0) {
    const cycleList = cycles.map(c => c.join(' → ')).join('\n  ');
    return {
      proceed: true,
      message: `[CIRCULAR-DEP] Found ${cycles.length} circular dependencies in hooks:\n  ${cycleList}\nThese may cause deadlocks or infinite loops.`
    };
  }

  return { proceed: true };
}
