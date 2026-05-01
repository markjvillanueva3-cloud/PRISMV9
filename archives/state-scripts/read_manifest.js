const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Read lines 1090-1115 to see the condition
for (let i = 1089; i < Math.min(1115, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}

// Also read the autoRecoveryManifest function in cadenceExecutor
console.log("\n--- cadenceExecutor autoRecoveryManifest ---");
const cad = fs.readFileSync("C:/PRISM/mcp-server/src/tools/cadenceExecutor.ts", "utf-8");
const cadLines = cad.split("\n");
for (let i = 0; i < cadLines.length; i++) {
  if (cadLines[i].includes("function autoRecoveryManifest") || cadLines[i].includes("autoRecoveryManifest =")) {
    for (let j = i; j < Math.min(i + 30, cadLines.length); j++) {
      console.log("CE-L" + (j+1) + ": " + cadLines[j]);
      if (j > i + 2 && cadLines[j].trim() === "}") break;
    }
    break;
  }
}
