const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/registries/FormulaRegistry.ts", "utf-8");
const lines = c.split("\n");
// Find all formula_id entries
let formulas = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/formula_id:\s*"([^"]+)"/);
  if (m) formulas.push({ id: m[1], line: i + 1 });
}
console.log("Total formulas: " + formulas.length);
formulas.forEach(f => console.log("  " + f.id + " (L" + f.line + ")"));

// Check for F-CALC entries
const calcFormulas = formulas.filter(f => f.id.startsWith("F-CALC"));
console.log("\nF-CALC formulas: " + calcFormulas.length);

// Check what domains exist
const domains = new Set();
for (const line of lines) {
  const dm = line.match(/domain:\s*"([^"]+)"/);
  if (dm) domains.add(dm[1]);
}
console.log("\nDomains: " + [...domains].join(", "));

// Check for RPM, feed rate, MRR
const hasRPM = formulas.some(f => f.id.includes("RPM") || f.id.includes("SPEED"));
const hasFeed = formulas.some(f => f.id.includes("FEED"));
const hasMRR = formulas.some(f => f.id.includes("MRR"));
console.log("\nRPM formula: " + hasRPM);
console.log("Feed formula: " + hasFeed);
console.log("MRR formula: " + hasMRR);
