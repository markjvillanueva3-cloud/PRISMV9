const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Find compaction detection logic
let sections = {};
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("COMPACTION_DETECTED") || lines[i].includes("_MANDATORY_RECOVERY") || 
      lines[i].includes("_COMPACTION_RECOVERY") || lines[i].includes("compactionReminders") ||
      lines[i].includes("recoveryManifest") || lines[i].includes("reasoning_trail") ||
      lines[i].includes("recovery_context") || lines[i].includes("action_tracker_next")) {
    const context = lines.slice(Math.max(0,i-1), Math.min(lines.length, i+2)).map((l,j) => "L" + (i+j) + ": " + l.trimEnd()).join("\n");
    sections["L"+(i+1)] = context;
  }
}

// Also find _context injection
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"_context"') && lines[i].includes('{')) {
    sections["_context_L"+(i+1)] = lines.slice(i, Math.min(lines.length, i+15)).map((l,j) => "L" + (i+1+j) + ": " + l.trimEnd()).join("\n");
  }
}

const keys = Object.keys(sections);
console.log("Found " + keys.length + " relevant sections:");
for (const k of keys) {
  console.log("\n--- " + k + " ---");
  console.log(sections[k]);
}
