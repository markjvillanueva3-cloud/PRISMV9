import fs from "fs";

const data = JSON.parse(fs.readFileSync("H:/prism/mcp-server/data/milestones/comprehensive-roadmap-2026-05-04-v2.json", "utf8"));

const milestones = new Map();
const allIds = new Set();
const asymmetries = [];
const orphanRefs = [];

// Index milestones
for (const ms of data.milestones) {
  milestones.set(ms.id, ms);
  allIds.add(ms.id);
}

console.log(`\n=== V3.2 DAG VERIFICATION ===\n`);
console.log(`Total milestones: ${milestones.size}`);
console.log(`CP length (claimed): ${data.criticalPathDays}d`);
console.log(`CP nodes (claimed): ${data.criticalPath.length}`);

// 1. ASYMMETRY CHECK
console.log(`\n--- ASYMMETRY CHECK ---`);
for (const [id, ms] of milestones) {
  const blocks = ms.blocks || [];
  const blockedBy = ms.blocked_by || [];
  
  for (const blockId of blocks) {
    const target = milestones.get(blockId);
    if (!target) {
      orphanRefs.push(`blocks: ${id} -> ${blockId} (target missing)`);
      continue;
    }
    if (!(target.blocked_by || []).includes(id)) {
      asymmetries.push(`${id} blocks ${blockId}, but ${blockId}.blocked_by does NOT include ${id}`);
    }
  }
  
  for (const blockerId of blockedBy) {
    const blocker = milestones.get(blockerId);
    if (!blocker) {
      orphanRefs.push(`blocked_by: ${id} <- ${blockerId} (source missing)`);
      continue;
    }
    if (!(blocker.blocks || []).includes(id)) {
      asymmetries.push(`${id}.blocked_by ${blockerId}, but ${blockerId}.blocks does NOT include ${id}`);
    }
  }
}

console.log(`Asymmetric edges found: ${asymmetries.length}`);
if (asymmetries.length > 0 && asymmetries.length <= 10) {
  asymmetries.forEach(a => console.log(`  - ${a}`));
}

// 2. CYCLE CHECK (DFS)
console.log(`\n--- CYCLE CHECK (DFS) ---`);
const visited = new Set();
const recStack = new Set();
let cycleFound = null;

function dfs(nodeId, path) {
  visited.add(nodeId);
  recStack.add(nodeId);
  path.push(nodeId);
  
  const ms = milestones.get(nodeId);
  const blocks = ms ? (ms.blocks || []) : [];
  
  for (const nextId of blocks) {
    if (!visited.has(nextId)) {
      const result = dfs(nextId, [...path]);
      if (result) return result;
    } else if (recStack.has(nextId)) {
      const cycleStart = path.indexOf(nextId);
      return path.slice(cycleStart).concat([nextId]);
    }
  }
  
  recStack.delete(nodeId);
  return null;
}

for (const id of allIds) {
  if (!visited.has(id)) {
    cycleFound = dfs(id, []);
    if (cycleFound) break;
  }
}

if (cycleFound) {
  console.log(`CYCLE DETECTED: ${cycleFound.join(" -> ")}`);
} else {
  console.log(`Cycles: NONE (DAG verified)`);
}

// 3. CP VERIFICATION (topological longest-path)
console.log(`\n--- CRITICAL PATH VERIFICATION ---`);
const memo = new Map();

function longestPathTo(nodeId) {
  if (memo.has(nodeId)) return memo.get(nodeId);
  
  const ms = milestones.get(nodeId);
  const blockedBy = ms ? (ms.blocked_by || []) : [];
  
  if (blockedBy.length === 0) {
    const result = { distance: ms?.effort_days || 0, path: [nodeId] };
    memo.set(nodeId, result);
    return result;
  }
  
  let maxDist = 0;
  let maxPath = [nodeId];
  
  for (const predId of blockedBy) {
    const pred = longestPathTo(predId);
    if (pred.distance + (ms?.effort_days || 0) > maxDist) {
      maxDist = pred.distance + (ms?.effort_days || 0);
      maxPath = [...pred.path, nodeId];
    }
  }
  
  const result = { distance: maxDist, path: maxPath };
  memo.set(nodeId, result);
  return result;
}

const cpResult = longestPathTo("SHIP-RELEASE-MS19");
console.log(`Computed CP to MS19: ${cpResult.distance}d (claimed: ${data.criticalPathDays}d)`);
console.log(`CP node count: ${cpResult.path.length} (claimed: ${data.criticalPath.length})`);
console.log(`CP path:`);
cpResult.path.forEach((id, i) => {
  const ms = milestones.get(id);
  console.log(`  ${i + 1}. ${id} (${ms?.effort_days || 0}d)`);
});

const cpDelta = cpResult.distance - data.criticalPathDays;
const cpMatch = cpDelta === 0 ? "PASS" : `FAIL (delta: ${cpDelta > 0 ? "+" : ""}${cpDelta}d)`;
console.log(`\nCP arithmetic: ${cpMatch}`);

// 4. ORPHAN REFS
console.log(`\n--- ORPHAN REFERENCES ---`);
console.log(`Orphan refs found: ${orphanRefs.length}`);
if (orphanRefs.length > 0) {
  orphanRefs.forEach(r => console.log(`  - ${r}`));
}

// 5. MS18 STATUS
console.log(`\n--- MS18 STATUS (POST-PILOT MOVE) ---`);
const ms18 = milestones.get("LEARN-XPROC-TRANSFER-MS18");
console.log(`MS18.phase: ${ms18?.phase || "undefined"}`);
console.log(`MS18.blocks: ${JSON.stringify(ms18?.blocks || [])}`);
console.log(`MS18.blocked_by: ${JSON.stringify(ms18?.blocked_by || [])}`);

const ms18Status = (ms18?.phase === "post-pilot" && (ms18?.blocks || []).length === 0) ? "PASS" : "FAIL";
console.log(`MS18 post-pilot status: ${ms18Status}`);

// 6. MS35 GATE WORKING
console.log(`\n--- MS35 ADOPTION-GATE ---`);
const ms35 = milestones.get("ADOPTION-GATE-MS35");
console.log(`MS35.blocks: ${JSON.stringify(ms35?.blocks || [])}`);
const blocksMS19 = (ms35?.blocks || []).includes("SHIP-RELEASE-MS19");
console.log(`MS35 blocks MS19: ${blocksMS19 ? "YES (WORKING)" : "NO (NOT WORKING)"}`);

// 7. MS34 ON CP
console.log(`\n--- MS34 REG-HARDENING ON CP ---`);
const ms34OnCP = cpResult.path.includes("REG-HARDENING-MS34");
console.log(`MS34 on computed CP: ${ms34OnCP ? "YES (PASS)" : "NO (FAIL)"}`);
console.log(`MS34 on claimed CP: ${data.criticalPath.includes("REG-HARDENING-MS34") ? "YES" : "NO"}`);

// FINAL VERDICT
console.log(`\n=== VERDICT ===`);
const issues = [];
if (asymmetries.length > 0) issues.push(`Asymmetry: ${asymmetries.length}`);
if (cycleFound) issues.push(`Cycle detected`);
if (cpDelta !== 0) issues.push(`CP mismatch: ${cpDelta > 0 ? "+" : ""}${cpDelta}d`);
if (orphanRefs.length > 0) issues.push(`Orphan refs: ${orphanRefs.length}`);
if (ms18Status === "FAIL") issues.push(`MS18 not post-pilot`);
if (!blocksMS19) issues.push(`MS35 doesn't block MS19`);
if (!ms34OnCP) issues.push(`MS34 not on CP`);

if (issues.length === 0) {
  console.log(`V3.2-CLEAN: All checks passed`);
} else {
  console.log(`V3.2-NEEDS-V3.3: ${issues.join("; ")}`);
}

