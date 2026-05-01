const fs = require("fs");
const dist = fs.readFileSync("C:\\PRISM\\mcp-server\\dist\\index.js", "utf-8");

// Find ALL occurrences of % 8
const results = [];
let pos = 0;
while (true) {
  const idx = dist.indexOf("% 8", pos);
  if (idx === -1) break;
  const snippet = dist.substring(Math.max(0, idx - 80), Math.min(dist.length, idx + 80));
  results.push(`[offset ${idx}]: ...${snippet.replace(/\n/g, " ")}...`);
  pos = idx + 3;
}

// Also search for NL_HOOKS call
const nlIdx = dist.indexOf("NL_HOOKS:");
const nlSnippet = nlIdx >= 0 ? dist.substring(Math.max(0, nlIdx - 200), Math.min(dist.length, nlIdx + 100)) : "NL_HOOKS string NOT FOUND in dist";

fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", 
  `Found ${results.length} occurrences of % 8:\n${results.join("\n")}\n\n---NL_HOOKS call site---\n${nlSnippet}`);