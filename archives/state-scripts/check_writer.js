const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Find the HOT_RESUME writer block
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("TOKEN OPT v2: Write HOT_RESUME")) {
    for (let j = i - 2; j < Math.min(i + 25, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
    }
    break;
  }
}

// Also verify NL hook evaluator is still intact
console.log("\n--- NL Hook Evaluator ---");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("autoNLHookEvaluator")) {
    console.log("L" + (i+1) + ": " + lines[i].trim());
  }
}