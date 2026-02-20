const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
// Show around line 1707
for (let i = 1698; i < Math.min(1720, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}