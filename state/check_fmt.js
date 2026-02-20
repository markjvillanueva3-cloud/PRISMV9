const fs = require("fs");
const d = JSON.parse(fs.readFileSync("C:/PRISM/registries/FORMULA_REGISTRY.json", "utf-8"));
const keys = Object.keys(d);
console.log("Top keys: " + keys.slice(0, 5).join(", "));
if (d.formulas) {
  console.log("d.formulas type: " + (Array.isArray(d.formulas) ? "array[" + d.formulas.length + "]" : typeof d.formulas));
  if (!Array.isArray(d.formulas)) console.log("d.formulas keys: " + Object.keys(d.formulas).slice(0, 3).join(", "));
} else {
  // Check nested
  for (const k of keys.slice(0, 3)) {
    console.log(k + " type: " + typeof d[k]);
    if (typeof d[k] === "object" && d[k]) {
      console.log("  sub-keys: " + Object.keys(d[k]).slice(0, 5).join(", "));
    }
  }
}
