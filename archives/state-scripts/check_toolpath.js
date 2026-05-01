const fs = require("fs");
const path = require("path");

// Check ToolpathStrategyRegistry for data paths
const regFile = "C:/PRISM/mcp-server/src/registries/ToolpathStrategyRegistry.ts";
const content = fs.readFileSync(regFile, "utf-8");
const lines = content.split("\n");
console.log("Total lines: " + lines.length);

// Find data loading paths
let dataRefs = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("PATHS.") || lines[i].includes("data/") || lines[i].includes("strategies") || lines[i].includes("loadFrom")) {
    dataRefs.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
console.log("\nData refs:");
dataRefs.slice(0, 15).forEach(l => console.log(l));

// Check for strategy data files
const dataDirs = [
  "C:/PRISM/data/strategies",
  "C:/PRISM/mcp-server/data/strategies",
  "C:/PRISM/registries"
];
for (const d of dataDirs) {
  try {
    const files = fs.readdirSync(d).filter(f => f.includes("strateg") || f.includes("toolpath"));
    if (files.length > 0) console.log("\n" + d + ": " + files.join(", "));
  } catch(e) {}
}

// Check inline strategy count (BUILT_IN or similar)
let stratCount = 0;
for (const line of lines) {
  if (line.match(/strategy_id|"id":\s*"S-/)) stratCount++;
}
console.log("\nInline strategy definitions: " + stratCount);

// Count total methods
let methods = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/);
  if (m && !lines[i].includes("//") && lines[i].includes("(")) {
    if (m[1] !== "if" && m[1] !== "for" && m[1] !== "catch") methods.push(m[1]);
  }
}
console.log("\nMethods: " + [...new Set(methods)].join(", "));