const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");
// Find compactionDetectedThisCall block
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("compactionDetectedThisCall") && lines[i].includes("if")) {
    for (let j = i; j < Math.min(i + 120, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
      if (j > i + 5 && lines[j].trim() === "}" && lines[j+1] && lines[j+1].includes("else")) {
        // Print a few more for the else branch
        for (let k = j; k < Math.min(j + 5, lines.length); k++) {
          if (k !== j) console.log("L" + (k+1) + ": " + lines[k]);
        }
        break;
      }
    }
    break;
  }
}