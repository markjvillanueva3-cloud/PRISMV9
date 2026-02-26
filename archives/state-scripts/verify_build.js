const fs = require("fs");
const d = fs.readFileSync("C:/PRISM/mcp-server/dist/index.js", "utf-8");
console.log("F-CALC-001: " + d.includes("F-CALC-001"));
console.log("F-CALC-009: " + d.includes("F-CALC-009"));
console.log("formula_js fallback: " + d.includes("formula_js"));
console.log("No implementation: " + d.includes("No implementation for formula"));

// Syntax check
try { new (require("vm").Script)(d); console.log("Syntax: VALID"); }
catch(e) { console.log("Syntax: INVALID - " + e.message); }
