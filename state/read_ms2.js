const fs = require("fs");
const content = fs.readFileSync("C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PHASE_R1_REGISTRY.md", "utf-8");
const lines = content.split("\n");
const headers = lines.filter(l => l.match(/^#{1,3}\s+MS/) || l.match(/^#{1,3}\s+R1/));
fs.writeFileSync("C:\\PRISM\\state\\ms_headers.txt", headers.join("\n") || "NO HEADERS FOUND");