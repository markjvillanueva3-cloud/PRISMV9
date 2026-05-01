const fs = require("fs");
const CE = "C:/PRISM/mcp-server/src/tools/cadenceExecutor.ts";
let src = fs.readFileSync(CE, "utf-8");
let changes = 0;

// FIX: action_contains should also check current tool:action, not just history
const oldCheck = 'return ctx.recent_actions.some(a => a.toLowerCase().includes(target));';
const newCheck = 'return ctx.recent_actions.some(a => a.toLowerCase().includes(target)) || (ctx.tool_name + ":" + ctx.action).toLowerCase().includes(target);';
if (src.includes(oldCheck)) {
  src = src.replace(oldCheck, newCheck);
  changes++;
  console.log("FIX: action_contains now checks current call + history");
}

// Also add a "tool_action_is" condition type for exact current-call matching
const alwaysCase = "case \"always\": {\n            return true;\n          }";
if (src.includes(alwaysCase)) {
  src = src.replace(alwaysCase,
    alwaysCase + '\n          case "tool_action_is": {\n            return (ctx.tool_name + ":" + ctx.action).toLowerCase() === parts.slice(1).join(":").toLowerCase();\n          }'
  );
  changes++;
  console.log("ADDED: tool_action_is condition type");
}

// FIX: Update recovery manifest write to also save current phase from CURRENT_POSITION.md
// Find getCurrentPhase function and make it read from CURRENT_POSITION.md
const gpFunc = 'function getCurrentPhase()';
const gpIdx = src.indexOf(gpFunc);
if (gpIdx >= 0) {
  console.log("getCurrentPhase found at offset " + gpIdx);
  // Read a few lines to see current implementation
  const after = src.substring(gpIdx, gpIdx + 500);
  const firstReturn = after.indexOf("return ");
  console.log("First 200 chars: " + after.substring(0, 200));
}

fs.writeFileSync(CE, src, "utf-8");
console.log("\nTotal changes: " + changes);
