const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md", "utf-8");
const lines = c.split("\n");
let ms8Start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/MS8[:\s]|R1-MS8/i) && (lines[i].includes("Formula") || lines[i].includes("##"))) {
    ms8Start = i;
    break;
  }
}
if (ms8Start >= 0) {
  // Find end (next MS heading)
  let ms8End = Math.min(ms8Start + 120, lines.length);
  for (let i = ms8Start + 5; i < lines.length; i++) {
    if (lines[i].match(/##.*MS[- ]?9/) || lines[i].match(/##.*MS[- ]?10/)) {
      ms8End = i;
      break;
    }
  }
  console.log("MS8: lines " + (ms8Start+1) + " to " + (ms8End+1));
  console.log(lines.slice(ms8Start, ms8End).join("\n"));
} else {
  console.log("MS8 not found by heading. Searching for Formula Registry...");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Formula Registry") || lines[i].includes("formula_registry")) {
      console.log("L" + (i+1) + ": " + lines[i].trim());
    }
  }
}
