const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/utils/responseSlimmer.ts", "utf-8");
const lines = src.split("\n");
console.log("Total lines: " + lines.length);
// Print first 100 lines to understand the API
for (let i = 0; i < Math.min(120, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}
