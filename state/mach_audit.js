const fs = require("fs");
const data = JSON.parse(fs.readFileSync("C:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES.json", "utf-8"));
const machines = Array.isArray(data) ? data : (data.machines || Object.values(data));
console.log("Total machines: " + machines.length);
// Sample first machine
if (machines.length > 0) {
  const m = machines[0];
  console.log("Sample: " + JSON.stringify(Object.keys(m)).substring(0, 300));
  console.log("ID: " + (m.machine_id || m.id || m.model));
  console.log("Manufacturer: " + (m.manufacturer || "?"));
  // Check key fields
  const fields = ["controller_family","spindle_max_rpm","spindle_power_kw","max_feed_rate","rigidity_factor","tool_changer_capacity","work_envelope"];
  for (const f of fields) {
    const val = m[f];
    console.log("  " + f + ": " + (val !== undefined ? JSON.stringify(val).substring(0, 80) : "MISSING"));
  }
}
