const fs = require("fs");
const path = require("path");

// Also check extracted batches
const extractedDir = "C:/PRISM/extracted/machines/ENHANCED";
const batchFiles = fs.readdirSync(extractedDir).filter(f => f.endsWith(".json"));
let allMachines = [];

// Load ALL_MACHINES.json
const allData = JSON.parse(fs.readFileSync("C:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES.json", "utf-8"));
const mainMachines = Array.isArray(allData) ? allData : (allData.machines || Object.values(allData));
allMachines.push(...mainMachines);

// Load extracted batches
for (const bf of batchFiles) {
  try {
    const bd = JSON.parse(fs.readFileSync(path.join(extractedDir, bf), "utf-8"));
    const bm = Array.isArray(bd) ? bd : (bd.machines || []);
    allMachines.push(...bm);
  } catch(e) {}
}

// Deduplicate by id
const seen = new Set();
const unique = allMachines.filter(m => {
  const id = m.id || m.machine_id || m.model;
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
});

// Audit fields
const KEY_FIELDS = {
  "spindle.max_rpm": m => m.spindle?.max_rpm || m.spindle_max_rpm,
  "spindle.power_kw": m => m.spindle?.power_kw || m.spindle_power_kw,
  "spindle.torque_nm": m => m.spindle?.torque_nm || m.spindle_torque_nm,
  "spindle.taper": m => m.spindle?.taper,
  "controller.brand": m => m.controller?.brand || m.controller_family,
  "controller.model": m => m.controller?.model,
  "tool_changer.capacity": m => m.tool_changer?.capacity || m.tool_changer_capacity,
  "max_feed_rate": m => m.max_feed_rate || m.rapid_traverse?.x,
  "work_envelope": m => m.work_envelope || m.envelope,
  "rigidity_factor": m => m.rigidity_factor,
  "weight_kg": m => m.weight?.kg || m.weight_kg,
  "type": m => m.type,
  "manufacturer": m => m.manufacturer,
  "axes.count": m => m.axes?.count || m.simultaneous_axes,
  "rapid_traverse": m => m.rapid_traverse,
  "accuracy.positioning": m => m.accuracy?.positioning,
};

let coverage = {};
for (const [field] of Object.entries(KEY_FIELDS)) coverage[field] = { present: 0, missing: 0 };

let byMfr = {};
for (const m of unique) {
  const mfr = m.manufacturer || "unknown";
  byMfr[mfr] = (byMfr[mfr] || 0) + 1;
  
  for (const [field, getter] of Object.entries(KEY_FIELDS)) {
    const val = getter(m);
    if (val !== undefined && val !== null && val !== 0) coverage[field].present++;
    else coverage[field].missing++;
  }
}

let out = "MACHINE AUDIT\\n";
out += "Sources: ALL_MACHINES=" + mainMachines.length + " Batches=" + batchFiles.length + "\\n";
out += "Unique machines: " + unique.length + "\\n\\n";
out += "MANUFACTURERS (" + Object.keys(byMfr).length + "):\\n";
Object.entries(byMfr).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => out += "  " + k + ": " + v + "\\n");
out += "\\nFIELD COVERAGE:\\n";
for (const [f, v] of Object.entries(coverage)) {
  out += "  " + f + ": " + v.present + "/" + unique.length + " (" + (v.present/unique.length*100).toFixed(0) + "%)\\n";
}
console.log(out);
