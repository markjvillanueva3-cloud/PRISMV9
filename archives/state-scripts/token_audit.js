const fs = require("fs");
const d = fs.readFileSync("C:/PRISM/mcp-server/dist/index.js", "utf-8");

// Find _cadence and _context injection patterns to estimate size
// Count how many recovery/compaction blocks exist
const compactionBlocks = (d.match(/_COMPACTION_DETECTED/g) || []).length;
const recoveryBlocks = (d.match(/_MANDATORY_RECOVERY/g) || []).length;
const contextBlocks = (d.match(/_context/g) || []).length;

console.log("_COMPACTION_DETECTED references: " + compactionBlocks);
console.log("_MANDATORY_RECOVERY references: " + recoveryBlocks);
console.log("_context references: " + contextBlocks);

// Check the actual survival/recovery file sizes
const stateFiles = {
  "CURRENT_STATE.json": "C:/PRISM/state/CURRENT_STATE.json",
  "RECENT_ACTIONS.json": "C:/PRISM/state/RECENT_ACTIONS.json",
  "RECOVERY_MANIFEST.json": "C:/PRISM/state/RECOVERY_MANIFEST.json",
  "SESSION_JOURNAL.jsonl": "C:/PRISM/state/SESSION_JOURNAL.jsonl",
  "context_pressure.json": "C:/PRISM/state/context_pressure.json"
};
for (const [name, p] of Object.entries(stateFiles)) {
  if (fs.existsSync(p)) {
    const sz = fs.statSync(p).size;
    console.log(name + ": " + sz + " bytes (" + Math.round(sz/1024) + "KB)");
  } else {
    console.log(name + ": NOT FOUND");
  }
}
