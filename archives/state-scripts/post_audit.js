const fs = require("fs");
const path = require("path");
const baseDir = "C:/PRISM/data/materials";
const groups = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());

let total = 0;
let zeros = { density: 0, melting_point: 0, elastic_modulus: 0, tensile: 0, yield: 0, elongation: 0, taylor_C: 0 };
let enriched = 0;

for (const grp of groups) {
  const grpPath = path.join(baseDir, grp);
  const files = fs.readdirSync(grpPath).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(grpPath, file), "utf-8"));
      const mats = Array.isArray(data) ? data : (data.materials || [data]);
      for (const m of mats) {
        total++;
        if (m._enrichment) enriched++;
        const p = m.physical || {};
        if (!p.density || p.density === 0) zeros.density++;
        if (!p.melting_point || p.melting_point === 0) zeros.melting_point++;
        if (!p.elastic_modulus || p.elastic_modulus === 0) zeros.elastic_modulus++;
        if (!m.mechanical?.tensile_strength?.typical) zeros.tensile++;
        if (!m.mechanical?.yield_strength?.typical) zeros.yield++;
        if (!m.mechanical?.elongation) zeros.elongation++;
        if (!m.taylor?.C) zeros.taylor_C++;
      }
    } catch(e) {}
  }
}
console.log("POST-ENRICHMENT AUDIT:");
console.log("Total: " + total + ", Enriched: " + enriched);
console.log("Remaining zeros:");
Object.entries(zeros).forEach(([k,v]) => console.log("  " + k + ": " + v + "/" + total + " (" + (v/total*100).toFixed(1) + "%)"));
