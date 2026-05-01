const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md", "utf-8");
const lines = c.split("\n");
// Find all ## headers to understand doc structure
let headers = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith("##") || lines[i].match(/MS[0-9]/)) {
    if (lines[i].trim().length > 3 && lines[i].trim().length < 120) {
      headers.push("L" + (i+1) + ": " + lines[i].trim());
    }
  }
}
console.log(headers.filter(h => h.includes("MS")).join("\n"));
