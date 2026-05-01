const fs = require("fs");
const data = JSON.parse(fs.readFileSync("C:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json", "utf-8"));

let fields = {
  spindle_max_rpm: 0, spindle_power_kw: 0, spindle_torque_nm: 0,
  controller_family: 0, rigidity_factor: 0, rapid_traverse: 0,
  positioning_accuracy_mm: 0, weight_kg: 0, work_envelope: 0,
  tool_changer_capacity: 0, spindle_taper: 0, type: 0, manufacturer: 0,
};

for (const m of data) {
  for (const f of Object.keys(fields)) {
    if (m[f] !== undefined && m[f] !== null && m[f] !== 0) fields[f]++;
  }
}

let out = "POST-ENRICHMENT MACHINE AUDIT (" + data.length + " machines):\\n";
for (const [f, v] of Object.entries(fields)) {
  out += "  " + f + ": " + v + "/" + data.length + " (" + (v/data.length*100).toFixed(0) + "%)\\n";
}

// Controller family distribution
let families = {};
for (const m of data) {
  if (m.controller_family) families[m.controller_family] = (families[m.controller_family] || 0) + 1;
}
out += "\\nCONTROLLER FAMILIES:\\n";
Object.entries(families).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => out += "  " + k + ": " + v + "\\n");

// File sizes
const f1 = fs.statSync("C:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json");
const f2 = fs.statSync("C:/PRISM/extracted/machines/CONSOLIDATED/ALL_MACHINES.json");
out += "\\nFILE SIZES: enriched=" + Math.round(f1.size/1024) + "KB, consolidated=" + Math.round(f2.size/1024) + "KB";
console.log(out);
