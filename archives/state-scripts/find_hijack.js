const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
// L1727 to L1845
for (let i = 1726; i < Math.min(1850, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}
