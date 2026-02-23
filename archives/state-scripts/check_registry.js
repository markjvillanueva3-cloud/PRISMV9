const fs = require("fs");
const paths = [
  "C:/PRISM/registries/FORMULA_REGISTRY.json",
  "C:/PRISM/mcp-server/data/FORMULA_REGISTRY.json"
];
for (const p of paths) {
  try {
    const stat = fs.statSync(p);
    console.log(p + ": " + stat.size + " bytes");
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    const raw = data?.formulaRegistry?.formulas || data?.formulas;
    if (raw) {
      const entries = Array.isArray(raw) ? raw : Object.values(raw);
      console.log("  Formulas: " + entries.length);
      // Check for calculator type
      const calcIds = entries.filter(f => (f.id || f.formula_id || "").includes("CALC")).map(f => f.id || f.formula_id);
      console.log("  F-CALC: " + calcIds.length);
      // Show domains
      const doms = new Set(entries.map(f => f.domain).filter(Boolean));
      console.log("  Domains: " + [...doms].join(", "));
      // Show categories
      const cats = new Set(entries.map(f => f.category).filter(Boolean));
      console.log("  Categories: " + [...cats].slice(0, 15).join(", "));
      // Show first 5 IDs
      console.log("  Sample IDs: " + entries.slice(0, 5).map(f => f.id || f.formula_id).join(", "));
    }
  } catch (e) { console.log(p + ": " + e.message.split("\n")[0]); }
}
