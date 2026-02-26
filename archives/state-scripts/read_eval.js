const fs = require("fs");
const cad = fs.readFileSync("C:/PRISM/mcp-server/src/tools/cadenceExecutor.ts", "utf-8");
const lines = cad.split("\n");

// Find evaluateNLHookCondition
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("evaluateNLHookCondition")) {
    for (let j = i; j < Math.min(i + 60, lines.length); j++) {
      console.log("CE-L" + (j+1) + ": " + lines[j]);
      if (j > i + 5 && lines[j].trim() === "}" && !lines[j+1]?.trim().startsWith("case")) break;
    }
    break;
  }
}
