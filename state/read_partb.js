const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md", "utf-8");
const lines = c.split("\n");
// Find Part B section
let partB = [];
let inB = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("PART B") || (lines[i].includes("TOOLPATH") && lines[i].includes("==="))) inB = true;
  if (inB) {
    partB.push(lines[i]);
    if (partB.length > 2 && (lines[i].includes("PART C") || lines[i].includes("=== PART"))) break;
  }
}
console.log(partB.join("\n"));