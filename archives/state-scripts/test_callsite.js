const fs = require("fs");
const dist = fs.readFileSync("C:\\PRISM\\mcp-server\\dist\\index.js", "utf-8");

// Find the exact call site for NL hook evaluator (around callNum % 8)
const idx = dist.indexOf("% 8 ===");
if (idx === -1) {
  fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", "NOT FOUND: % 8 ===");
  process.exit();
}

// Extract surrounding 500 chars
const start = Math.max(0, idx - 200);
const end = Math.min(dist.length, idx + 300);
const snippet = dist.substring(start, end);
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", snippet);