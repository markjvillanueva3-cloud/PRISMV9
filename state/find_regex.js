const fs = require("fs");
const dist = fs.readFileSync("C:\\PRISM\\mcp-server\\dist\\index.js", "utf-8");
const lines = dist.split("\n");
const results = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("CURRENT$/i")) {
    results.push(`Line ${i+1}: ${lines[i].trim().substring(0, 200)}`);
  }
}
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", results.join("\n") || "NOT FOUND");