const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Find where _context is built (should be around L1680-1710)
for (let i = 1670; i < 1730; i++) {
  if (i < lines.length) console.log("L" + (i+1) + ": " + lines[i]);
}
