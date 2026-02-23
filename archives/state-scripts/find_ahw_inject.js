const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Find where _cadence, _context, _COMPACTION_DETECTED are built
const targets = ["_cadence", "_context", "_COMPACTION_DETECTED", "_MANDATORY_RECOVERY", 
  "recovery_manifest", "original_response", "action_tracker_next", "reasoning_trail",
  "recovery_context", "recent_tool_calls", "buildContext"];
  
let findings = {};
for (let i = 0; i < lines.length; i++) {
  for (const t of targets) {
    if (lines[i].includes(t) && !lines[i].trim().startsWith("//") && !lines[i].trim().startsWith("*")) {
      if (!findings[t]) findings[t] = [];
      if (findings[t].length < 3) findings[t].push("L" + (i+1) + ": " + lines[i].trim().substring(0, 120));
    }
  }
}
for (const [k, v] of Object.entries(findings)) {
  console.log("\n" + k + ":");
  v.forEach(l => console.log("  " + l));
}
