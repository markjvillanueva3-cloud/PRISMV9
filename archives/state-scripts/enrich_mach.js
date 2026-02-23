const fs = require("fs");
const path = require("path");

// Rigidity estimation from weight and type
function estimateRigidity(weight_kg, type) {
  if (!weight_kg) return { factor: 0.5, class: "unknown" };
  if (type?.includes("5_axis") || type?.includes("5axis")) {
    if (weight_kg > 15000) return { factor: 0.9, class: "very_high" };
    if (weight_kg > 8000) return { factor: 0.75, class: "high" };
    return { factor: 0.6, class: "medium" };
  }
  if (type?.includes("turn")) {
    if (weight_kg > 10000) return { factor: 0.85, class: "high" };
    if (weight_kg > 5000) return { factor: 0.7, class: "medium_high" };
    return { factor: 0.55, class: "medium" };
  }
  // VMC/HMC
  if (weight_kg > 20000) return { factor: 0.95, class: "very_high" };
  if (weight_kg > 10000) return { factor: 0.8, class: "high" };
  if (weight_kg > 5000) return { factor: 0.65, class: "medium" };
  return { factor: 0.5, class: "light" };
}

// Controller family mapping
const CONTROLLER_FAMILIES = {
  "FANUC": ["fanuc", "0i", "31i", "30i", "16i", "0i-model"],
  "SIEMENS": ["siemens", "sinumerik", "840d", "828d"],
  "MAZATROL": ["mazatrol", "smooth", "smoothg", "smoothai"],
  "OSP": ["osp", "osp-p"],
  "MITSUBISHI": ["mitsubishi", "m80", "m800"],
  "HAAS": ["haas", "ngc"],
  "HEIDENHAIN": ["heidenhain", "tnc", "itnc"],
  "BROTHER": ["brother", "cnc-c00"],
};

function identifyControllerFamily(brand, model) {
  const combined = ((brand || "") + " " + (model || "")).toLowerCase();
  for (const [family, keywords] of Object.entries(CONTROLLER_FAMILIES)) {
    if (keywords.some(k => combined.includes(k))) return family;
  }
  return null;
}

// Rapid traverse defaults by type (mm/min)
const RAPID_DEFAULTS = {
  vmc: { x: 36000, y: 36000, z: 30000 },
  hmc: { x: 50000, y: 50000, z: 50000 },
  turning_center: { x: 30000, z: 30000 },
  lathe: { x: 24000, z: 30000 },
  "5_axis": { x: 40000, y: 40000, z: 36000 },
  mill_turn: { x: 30000, y: 30000, z: 30000 },
};

// Process ALL sources
const sources = [
  { dir: "C:/PRISM/data/machines/ENHANCED/json", pattern: ".json" },
  { dir: "C:/PRISM/extracted/machines/ENHANCED", pattern: ".json" },
];

let allMachines = new Map(); // id -> machine
let stats = { loaded: 0, enriched: 0, fields: {} };

for (const src of sources) {
  if (!fs.existsSync(src.dir)) continue;
  const files = fs.readdirSync(src.dir).filter(f => f.endsWith(src.pattern));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(src.dir, file), "utf-8"));
      const mats = Array.isArray(data) ? data : (data.machines || [data]);
      for (const m of mats) {
        const id = m.id || m.machine_id || m.model;
        if (!id || typeof id !== "string") continue;
        // Merge: newer/more complete wins
        const existing = allMachines.get(id);
        if (existing) {
          // Merge fields from m into existing (don't overwrite with empty)
          for (const [k, v] of Object.entries(m)) {
            if (v !== undefined && v !== null && v !== 0 && v !== "") {
              if (!existing[k] || existing[k] === 0 || existing[k] === null) {
                existing[k] = v;
              }
            }
          }
        } else {
          allMachines.set(id, { ...m });
        }
        stats.loaded++;
      }
    } catch(e) {}
  }
}

// Enrich each machine
for (const [id, m] of allMachines) {
  let changed = false;
  
  // Normalize spindle fields
  if (m.spindle) {
    if (!m.spindle_max_rpm && m.spindle.rpm) { m.spindle_max_rpm = m.spindle.rpm; }
    if (!m.spindle_max_rpm && m.spindle.max_rpm) { m.spindle_max_rpm = m.spindle.max_rpm; }
    if (!m.spindle_power_kw && m.spindle.power_kW) { m.spindle_power_kw = m.spindle.power_kW; }
    if (!m.spindle_power_kw && m.spindle.power_kw) { m.spindle_power_kw = m.spindle.power_kw; }
    if (!m.spindle_torque_nm && m.spindle.torque_Nm) { m.spindle_torque_nm = m.spindle.torque_Nm; }
    if (!m.spindle_torque_nm && m.spindle.torque_nm) { m.spindle_torque_nm = m.spindle.torque_nm; }
    if (!m.spindle_taper && m.spindle.taper) { m.spindle_taper = m.spindle.taper; }
  }
  
  // Calculate torque from power/rpm: T = P*9549/n
  if (!m.spindle_torque_nm && m.spindle_power_kw && m.spindle_max_rpm) {
    m.spindle_torque_nm = Math.round(m.spindle_power_kw * 9549 / m.spindle_max_rpm * 10) / 10;
    stats.fields["torque_calculated"] = (stats.fields["torque_calculated"] || 0) + 1;
    changed = true;
  }
  
  // Controller family
  if (!m.controller_family) {
    const brand = m.controller?.brand || m.controller_brand;
    const model = m.controller?.model || m.controller_model;
    const family = identifyControllerFamily(brand, model);
    if (family) {
      m.controller_family = family;
      stats.fields["controller_family"] = (stats.fields["controller_family"] || 0) + 1;
      changed = true;
    }
  }
  
  // Rigidity factor
  if (!m.rigidity_factor) {
    const weight = m.weight_kg || m.weight?.kg;
    const rig = estimateRigidity(weight, m.type);
    m.rigidity_factor = rig.factor;
    m.rigidity_class = rig.class;
    stats.fields["rigidity"] = (stats.fields["rigidity"] || 0) + 1;
    changed = true;
  }
  
  // Rapid traverse
  if (!m.rapid_traverse && !m.rapidTraverse) {
    const type = (m.type || "").toLowerCase().replace(/[- ]/g, "_");
    const defaults = RAPID_DEFAULTS[type] || RAPID_DEFAULTS["vmc"];
    m.rapid_traverse = defaults;
    stats.fields["rapid_traverse"] = (stats.fields["rapid_traverse"] || 0) + 1;
    changed = true;
  } else if (m.rapidTraverse && !m.rapid_traverse) {
    m.rapid_traverse = m.rapidTraverse;
  }
  
  // Positioning accuracy estimate
  if (!m.positioning_accuracy_mm && !m.accuracy) {
    const weight = m.weight_kg || m.weight?.kg || 5000;
    // Heavier = more rigid = better accuracy typically
    const acc = weight > 15000 ? 0.003 : weight > 8000 ? 0.005 : weight > 4000 ? 0.008 : 0.010;
    m.positioning_accuracy_mm = acc;
    m.repeatability_mm = acc / 2;
    stats.fields["accuracy"] = (stats.fields["accuracy"] || 0) + 1;
    changed = true;
  }
  
  // Tool changer capacity normalization
  if (!m.tool_changer_capacity && m.tool_changer?.capacity) {
    m.tool_changer_capacity = m.tool_changer.capacity;
  }
  
  // Weight normalization
  if (!m.weight_kg && m.weight?.kg) {
    m.weight_kg = m.weight.kg;
  }
  
  // Work envelope normalization
  if (!m.work_envelope && m.envelope) {
    m.work_envelope = m.envelope;
  }
  if (!m.work_envelope && m.travels) {
    m.work_envelope = m.travels;
  }
  
  if (changed) {
    m._enriched = "R1-MS7";
    m._enriched_date = new Date().toISOString().split("T")[0];
    stats.enriched++;
  }
}

// Write consolidated output
const output = Array.from(allMachines.values());
fs.writeFileSync("C:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json", JSON.stringify(output, null, 2));

// Also write to extracted for registry loading
fs.mkdirSync("C:/PRISM/extracted/machines/CONSOLIDATED", { recursive: true });
fs.writeFileSync("C:/PRISM/extracted/machines/CONSOLIDATED/ALL_MACHINES.json", JSON.stringify(output, null, 2));

console.log(JSON.stringify({ unique: allMachines.size, ...stats }, null, 2));
