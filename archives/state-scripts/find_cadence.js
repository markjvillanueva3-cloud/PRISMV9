const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Search for autoRecoveryManifest call and its modulo condition
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("autoRecoveryManifest") || lines[i].includes("RecoveryManifest")) {
    console.log("L" + (i+1) + ": " + lines[i].trim());
    // Check surrounding lines for % condition
    for (let j = Math.max(0, i-3); j <= Math.min(i+3, lines.length-1); j++) {
      if (lines[j].includes("%") && j !== i) {
        console.log("  NEAR L" + (j+1) + ": " + lines[j].trim());
      }
    }
  }
}

// Also find the NL hook evaluator condition
console.log("\n--- NL Hook Evaluator ---");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("autoNLHookEvaluator")) {
    console.log("L" + (i+1) + ": " + lines[i].trim());
  }
}

// Find cadence executor - the interval definitions
console.log("\n--- Cadence Intervals ---");
const cadSrc = fs.readFileSync("C:/PRISM/mcp-server/src/tools/cadenceExecutor.ts", "utf-8");
const cadLines = cadSrc.split("\n");
for (let i = 0; i < cadLines.length; i++) {
  if (cadLines[i].includes("RecoveryManifest") && cadLines[i].includes("interval")) {
    console.log("cadenceExecutor L" + (i+1) + ": " + cadLines[i].trim());
  }
}
