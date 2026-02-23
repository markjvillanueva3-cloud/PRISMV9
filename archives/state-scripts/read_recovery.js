const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
// Print lines 1770-1870 (the recovery injection)
for (let i = 1769; i < Math.min(1869, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}
