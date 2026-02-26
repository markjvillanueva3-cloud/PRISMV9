const fs = require("fs");
const content = fs.readFileSync("C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PHASE_R1_REGISTRY.md", "utf-8");
const lines = content.split("\n");
const headers = lines.filter(l => l.startsWith("## MS") || l.startsWith("## R1-MS"));
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", headers.join("\n"));