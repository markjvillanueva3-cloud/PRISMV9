const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("slimCadence")) {
    for (let j = Math.max(0, i-2); j < Math.min(i + 50, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
    }
    break;
  }
}

// Also find the _context builder end (from line 1650)
console.log("\n--- _context end ---");
for (let i = 1649; i < Math.min(1700, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}
