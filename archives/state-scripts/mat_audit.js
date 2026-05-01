const fs = require("fs");
const path = require("path");
const dataDir = "C:/PRISM/mcp-server/data/materials";
const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));

let totalMaterials = 0;
let zeroFields = { density: 0, melting_point: 0, elastic_modulus: 0, tensile_strength: 0, yield_strength: 0, elongation: 0, thermal_conductivity: 0, specific_heat: 0, hardness_brinell: 0 };
let verified = 0;
let estimated = 0;
let genV5 = 0;
let byGroup = {};

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
    const mats = Array.isArray(data) ? data : (data.materials || [data]);
    for (const m of mats) {
      totalMaterials++;
      const dq = m.data_quality || "unknown";
      if (dq === "verified") verified++;
      else if (dq === "estimated") estimated++;
      if (m._converted?.from === "gen_v5") genV5++;
      
      const grp = m.iso_group || "?";
      byGroup[grp] = (byGroup[grp] || 0) + 1;
      
      if (m.physical) {
        if (!m.physical.density || m.physical.density === 0) zeroFields.density++;
        if (!m.physical.melting_point || m.physical.melting_point === 0) zeroFields.melting_point++;
        if (!m.physical.elastic_modulus || m.physical.elastic_modulus === 0) zeroFields.elastic_modulus++;
        if (!m.physical.thermal_conductivity || m.physical.thermal_conductivity === 0) zeroFields.thermal_conductivity++;
        if (!m.physical.specific_heat || m.physical.specific_heat === 0) zeroFields.specific_heat++;
      }
      if (m.mechanical) {
        if (!m.mechanical.tensile_strength?.typical) zeroFields.tensile_strength++;
        if (!m.mechanical.yield_strength?.typical) zeroFields.yield_strength++;
        if (!m.mechanical.elongation) zeroFields.elongation++;
        if (!m.mechanical.hardness?.brinell) zeroFields.hardness_brinell++;
      }
    }
  } catch(e) {}
}

const report = {
  totalMaterials, verified, estimated, genV5,
  zeroFields,
  byGroup,
  files: files.length,
  enrichmentNeeded: Object.entries(zeroFields).map(([k,v]) => `${k}: ${v}/${totalMaterials} (${(v/totalMaterials*100).toFixed(0)}%)`),
};
fs.writeFileSync("C:/PRISM/state/material_audit.json", JSON.stringify(report, null, 2));