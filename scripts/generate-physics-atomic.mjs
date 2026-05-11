#!/usr/bin/env node
/**
 * generate-physics-atomic.mjs — atomize mcp-server/src/physics/constants.ts
 * into hierarchical L6 nodes:
 *
 *   L6  core.physics                 (existing rollup)
 *     L6  core.physics.<EXPORT>           (constant rollup)
 *       L6  core.physics.<EXPORT>.<KEY>     (atomic constant entry)
 *
 * Each exported `export const NAME = { ... }` becomes a rollup. Each top-level
 * key inside the object becomes an atomic L6 node. For Kienzle/Taylor/
 * material constants this surfaces the actual scientific data (kc1.1 per ISO
 * group, Taylor C/n exponents, AISI material aliases) as queryable nodes.
 *
 * Output: state/shared/system-viz/physics-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const CONST_FILE = path.join(ROOT, "mcp-server", "src", "physics", "constants.ts");
const PARENT_ROLLUP = "core.physics";

const EXPORT_RE = /^export\s+const\s+([A-Za-z0-9_]+)\s*[:=]/gm;
const KEY_RE = /^\s*['"`]?([A-Za-z0-9_.\- ]+)['"`]?\s*:/;
const SLUG_NONALNUM = /[^a-z0-9._-]/g;

function slugify(s) {
  return String(s).toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

// Extract { ... } block starting at a given character index. Returns
// { startLine, endLine, body } or null.
function extractBlock(content, startIdx) {
  let depth = 0;
  let started = false;
  let i = startIdx;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "{") { depth++; started = true; }
    else if (ch === "}") { depth--; if (started && depth === 0) { return { start: startIdx, end: i + 1 }; } }
    i++;
  }
  return null;
}

function parseTopLevelKeys(blockBody) {
  // Walk character by character, only counting keys at exactly depth 1 of
  // the outer object literal (we received the block including its outer { }).
  const lines = blockBody.split(/\r?\n/);
  const keys = [];
  let depth = 0;
  let inObject = false;
  for (const ln of lines) {
    // Pre-scan brackets BEFORE matching to determine depth-at-this-line
    let preDepth = depth;
    for (const ch of ln) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    // For depth-1 key detection: we want lines that start at depth==1 BEFORE
    // any brackets on this line are processed (i.e. preDepth === 1)
    if (preDepth !== 1) {
      if (!inObject && preDepth === 0 && ln.includes("{")) inObject = true;
      continue;
    }
    const km = ln.match(KEY_RE);
    if (!km) continue;
    const key = km[1].trim();
    if (!key || /^(true|false|null|undefined|return|new|typeof|instanceof|else|case|default|if|in|of|as)$/.test(key)) continue;
    keys.push(key);
  }
  return keys;
}

function generate() {
  if (!fs.existsSync(CONST_FILE)) return { error: "constants-file-missing", stats: {} };
  const content = fs.readFileSync(CONST_FILE, "utf8");

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function pushEdge(from, to) {
    const k = `${from}|${to}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type: "contains", status: "active", intensity: 0.20 });
    return true;
  }

  const stats = { exports: 0, atomicEntries: 0, perExport: {} };

  let m;
  while ((m = EXPORT_RE.exec(content)) !== null) {
    const name = m[1];
    stats.exports++;
    const before = content.slice(0, m.index);
    const lineNum = before.split("\n").length;

    // Locate the opening `{` after the export
    let openIdx = content.indexOf("{", m.index);
    if (openIdx === -1) continue;
    const block = extractBlock(content, openIdx);
    if (!block) continue;
    const body = content.slice(block.start, block.end);
    const keys = parseTopLevelKeys(body);

    // Rollup node for this export
    const rollupId = `${PARENT_ROLLUP}.${name.toLowerCase()}`;
    if (!seenId.has(rollupId)) {
      seenId.add(rollupId);
      newNodes.push({
        id: rollupId, layer: "L6",
        subgroup: "physics_constant",
        parent: PARENT_ROLLUP,
        label: name, status: "built",
        color: "#a78bfa",
        size: 0.45 + Math.sqrt(keys.length) * 0.05,
        tier: 1,
        ext: "ts",
        file: "mcp-server/src/physics/constants.ts",
        sourceLine: lineNum,
        keyCount: keys.length,
      });
      pushEdge(PARENT_ROLLUP, rollupId);
    }

    for (const k of keys) {
      const slug = slugify(k);
      if (!slug) continue;
      const childId = `${rollupId}.${slug}`;
      if (seenId.has(childId)) continue;
      seenId.add(childId);
      newNodes.push({
        id: childId, layer: "L6",
        subgroup: "physics_value",
        parent: rollupId,
        label: k, status: "built",
        color: "#c4b5fd", size: 0.18, tier: 2,
        ext: "ts",
        file: "mcp-server/src/physics/constants.ts",
        sourceLine: lineNum,
        constantName: name,
        keyName: k,
      });
      pushEdge(rollupId, childId);
      stats.atomicEntries++;
      stats.perExport[name] = (stats.perExport[name] || 0) + 1;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "physics-atomic-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  exports parsed:    ${result.stats.exports}`);
  console.log(`  atomic entries:    ${result.stats.atomicEntries}`);
  console.log(`  ── per export ──`);
  for (const [n, c] of Object.entries(result.stats.perExport).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${n.padEnd(32)} ${c}`);
  }
}
