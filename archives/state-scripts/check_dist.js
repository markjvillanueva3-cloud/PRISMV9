const fs = require("fs");
const d = fs.readFileSync("C:/PRISM/mcp-server/dist/index.js", "utf-8");
const has = d.includes("CALLSITE: call=");
const hasAction2 = d.includes("autoNLHookEvaluator(callNum, toolName, action2)");
console.log("CALLSITE debug in dist: " + has);
console.log("action2 in dist: " + hasAction2);
