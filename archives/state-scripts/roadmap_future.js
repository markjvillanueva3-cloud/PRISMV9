const fs = require("fs");

// R1 remaining - MS8 and MS9
const r1 = fs.readFileSync("C:/PRISM/mcp-server/data/docs/roadmap/PHASE_R1_REGISTRY.md", "utf-8");
const lines = r1.split("\n");
// Find MS8 and MS9 headers
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^###?\s*R1-MS[89]/)) {
    // Print header + next 30 lines for context
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
    }
    console.log("...\n");
  }
}

// Quick peek at R2-R11 phase descriptions
const roadmapDir = "C:/PRISM/mcp-server/data/docs/roadmap";
const phases = ["PHASE_R2_SAFETY.md", "PHASE_R3_CAMPAIGNS.md", "PHASE_R4_ENTERPRISE.md", 
  "PHASE_R5_VISUAL.md", "PHASE_R6_PRODUCTION.md", "PHASE_R7_INTELLIGENCE.md",
  "PHASE_R8_EXPERIENCE.md", "PHASE_R9_INTEGRATION.md", "PHASE_R10_REVOLUTION.md", "PHASE_R11_PRODUCT.md"];

console.log("=== FUTURE PHASES ===");
for (const p of phases) {
  const fp = roadmapDir + "/" + p;
  if (fs.existsSync(fp)) {
    const content = fs.readFileSync(fp, "utf-8");
    const firstLines = content.split("\n").slice(0, 5).join(" ").slice(0, 200);
    console.log(p.replace("PHASE_","").replace(".md","") + ": " + firstLines);
  }
}