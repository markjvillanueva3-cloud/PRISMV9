const fs = require("fs");
const d = fs.readFileSync("C:/PRISM/mcp-server/dist/index.js", "utf-8");

// Find key injection patterns
const patterns = [
  { name: "_cadence injection", pat: /_cadence\s*[:=]/ },
  { name: "_context injection", pat: /_context\s*[:=]/ },
  { name: "_COMPACTION_DETECTED", pat: /_COMPACTION_DETECTED/ },
  { name: "_MANDATORY_RECOVERY", pat: /_MANDATORY_RECOVERY/ },
  { name: "recovery_manifest", pat: /recovery_manifest\s*[:=]/ },
  { name: "reasoning_trail", pat: /reasoning_trail\s*[:=]/ },
  { name: "action_tracker_next", pat: /action_tracker_next/ },
  { name: "original_response", pat: /original_response\s*[:=]/ },
  { name: "recent_tool_calls", pat: /recent_tool_calls/ },
  { name: "recovery_context", pat: /recovery_context\s*[:=]/ }
];

for (const p of patterns) {
  const matches = d.match(new RegExp(p.pat.source, "g")) || [];
  console.log(p.name + ": " + matches.length + " occurrences");
}

// Find the main response wrapper function
const wrapperIdx = d.indexOf("function wrapResponse");
const injectIdx = d.indexOf("function injectCadence");
const buildCtx = d.indexOf("function buildContext");
console.log("\nwrapResponse at offset: " + wrapperIdx);
console.log("injectCadence at offset: " + injectIdx);
console.log("buildContext at offset: " + buildCtx);
