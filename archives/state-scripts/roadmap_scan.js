const fs = require("fs");
const p = "C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md";
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, "utf-8");
  const lines = content.split("\n");
  // Find all MS headers and their status
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^##\s*(MS\d+|Milestone)/i) || lines[i].match(/COMPLETE|PENDING|IN PROGRESS|NEXT/)) {
      console.log("L" + (i+1) + ": " + lines[i].trim());
    }
  }
}

// Check what other phase files exist
const roadmapDir = "C:/PRISM/mcp-server/data/docs/roadmap";
const files = fs.readdirSync(roadmapDir).filter(f => f.startsWith("PHASE_"));
console.log("\nPhase files: " + files.join(", "));