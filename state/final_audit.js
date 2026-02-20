const fs = require("fs");
const path = require("path");
const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());

const REQUIRED_127 = [
  "physical.density", "physical.melting_point", "physical.elastic_modulus", "physical.thermal_conductivity",
  "physical.specific_heat", "physical.thermal_expansion", "physical.poisson_ratio",
  "mechanical.hardness.brinell", "mechanical.tensile_strength.typical", "mechanical.yield_strength.typical", "mechanical.elongation",
  "kienzle.kc1_1", "kienzle.mc", "kienzle.kc1_1_milling", "kienzle.kc1_1_drilling",
  "taylor.C", "taylor.n",
  "johnson_cook.A", "johnson_cook.B", "johnson_cook.n",
  "cutting_recommendations.turning", "cutting_recommendations.milling",
  "tribology.sliding_friction", "surface_integrity.achievable_roughness",
  "thermal_machining.cutting_temperature_coefficient",
  "chip_formation.chip_type",
];

let total = 0, fullCoverage = 0, byGroup = {};
let fieldCoverage = {};
REQUIRED_127.forEach(f => fieldCoverage[f] = { present: 0, missing: 0 });

function getNestedVal(obj, path) {
  return path.split(".").reduce((o, k) => o && o[k], obj);
}

for (const grp of groups) {
  byGroup[grp] = { total: 0, full: 0 };
  const grpPath = path.join(baseDir, grp);
  const files = fs.readdirSync(grpPath).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(grpPath, file), "utf-8"));
      const mats = Array.isArray(data) ? data : (data.materials || [data]);
      for (const m of mats) {
        total++;
        byGroup[grp].total++;
        let allPresent = true;
        for (const field of REQUIRED_127) {
          const val = getNestedVal(m, field);
          if (val !== undefined && val !== null && val !== 0 && val !== "") {
            fieldCoverage[field].present++;
          } else {
            fieldCoverage[field].missing++;
            allPresent = false;
          }
        }
        if (allPresent) { fullCoverage++; byGroup[grp].full++; }
      }
    } catch(e) {}
  }
}

let out = "R1-MS6 FINAL AUDIT\\n";
out += "Total: " + total + ", Full 26-field coverage: " + fullCoverage + " (" + (fullCoverage/total*100).toFixed(1) + "%)\\n\\n";
out += "BY GROUP:\\n";
for (const [g, v] of Object.entries(byGroup)) {
  out += "  " + g + ": " + v.full + "/" + v.total + " (" + (v.full/v.total*100).toFixed(0) + "%)\\n";
}
out += "\\nFIELD COVERAGE:\\n";
for (const [f, v] of Object.entries(fieldCoverage)) {
  const pct = (v.present / total * 100).toFixed(1);
  out += "  " + f + ": " + v.present + "/" + total + " (" + pct + "%)" + (v.missing > 0 ? " [" + v.missing + " missing]" : "") + "\\n";
}
console.log(out);
