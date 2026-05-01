const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md", "utf-8");
const lines = c.split("\n");
// Find the actual MS8 implementation section (should be after line 500)
let found = [];
for (let i = 500; i < lines.length; i++) {
  if ((lines[i].includes("MS8") || lines[i].includes("R1-MS8")) && lines[i].includes("#")) {
    // Print 60 lines from here
    for (let j = i; j < Math.min(i + 80, lines.length); j++) {
      found.push("L" + (j+1) + ": " + lines[j]);
      if (j > i + 5 && lines[j].match(/^##\s/) && !lines[j].includes("MS8")) break;
    }
    break;
  }
}
if (found.length === 0) {
  // Search for formula_registry or "162 zero-coverage"
  for (let i = 500; i < lines.length; i++) {
    if (lines[i].includes("formula") && lines[i].includes("162") || lines[i].includes("formula_registry")) {
      found.push("L" + (i+1) + ": " + lines[i].trim());
    }
  }
}
console.log(found.join("\n"));
