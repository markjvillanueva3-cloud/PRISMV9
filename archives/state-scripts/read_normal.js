const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
// Read around line 720 (_cadence) and the slimCadence function, and the _context builder
for (let i = 714; i < 740; i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}
console.log("\n--- slimCadence function ---");
// Find slimCadence
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("function slimCadence") || lines[i].includes("slimCadence =")) {
    for (let j = i; j < Math.min(i + 40, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
      if (j > i + 2 && lines[j].trim() === "}") break;
    }
    break;
  }
}

console.log("\n--- _context builder (line 1590+) ---");
for (let i = 1589; i < Math.min(1650, lines.length); i++) {
  console.log("L" + (i+1) + ": " + lines[i]);
}
