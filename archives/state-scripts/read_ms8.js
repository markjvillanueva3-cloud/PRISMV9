const fs = require("fs");
const path = require("path");
// Find the phase file
const roadmapDir = "C:/PRISM/mcp-server/data/docs/roadmap";
const files = fs.readdirSync(roadmapDir).filter(f => f.includes("R1") || f.includes("REGISTRY"));
console.log("Roadmap files:", files.join(", "));

// Read the registry phase file
for (const f of files) {
  if (f.includes("R1")) {
    const content = fs.readFileSync(path.join(roadmapDir, f), "utf-8");
    // Extract MS8 section
    const lines = content.split("\n");
    let inMS8 = false;
    let ms8Lines = [];
    for (const line of lines) {
      if (line.includes("MS8") || line.includes("MS-8") || line.includes("Alarm")) inMS8 = true;
      if (inMS8) ms8Lines.push(line);
      if (inMS8 && ms8Lines.length > 1 && (line.includes("MS9") || line.includes("MS-9"))) break;
    }
    if (ms8Lines.length > 0) console.log("\n" + ms8Lines.join("\n"));
  }
}
