const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
// Find ctx construction (before L1680)
for (let i = 1630; i < 1670; i++) {
  if (i < lines.length) console.log("L" + (i+1) + ": " + lines[i]);
}
