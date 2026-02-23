/**
 * Convert PRISM machine database .js files to .json for MachineRegistry loading
 * Reads each .js file, evaluates the const, extracts machines array, writes .json
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC_DIR = 'C:\\PRISM\\data\\machines\\ENHANCED';
const OUT_DIR = 'C:\\PRISM\\data\\machines\\ENHANCED\\json';

// Create output dir
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.js') && f.startsWith('PRISM_') && f.includes('MACHINE_DATABASE'));
console.log(`Found ${files.length} machine database files`);

let totalMachines = 0;
let allMachines = [];

for (const file of files) {
  try {
    const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    
    // Extract the variable name from "const PRISM_XXX = {"
    const match = content.match(/const\s+(PRISM_\w+)\s*=\s*\{/);
    if (!match) {
      console.log(`  SKIP ${file} - no const found`);
      continue;
    }
    
    const varName = match[1];
    
    // Create a sandbox to evaluate the JS
    const sandbox = {};
    const script = new vm.Script(content + `\n;__result = ${varName};`);
    const context = vm.createContext(sandbox);
    script.runInContext(context);
    
    const data = sandbox.__result;
    if (!data || !data.machines) {
      console.log(`  SKIP ${file} - no machines property`);
      continue;
    }
    
    // Handle both array and object formats
    let machines;
    if (Array.isArray(data.machines)) {
      machines = data.machines;
    } else if (typeof data.machines === 'object') {
      // Object format: { "machine_id": { ... }, ... }
      machines = Object.values(data.machines);
    } else {
      console.log(`  SKIP ${file} - machines is not array or object`);
      continue;
    }
    
    const manufacturer = data.metadata?.manufacturer || data.manufacturer || 'Unknown';
    
    // Normalize machine data for MachineRegistry format
    const normalized = machines.map(m => ({
      id: m.id,
      manufacturer: m.manufacturer || manufacturer,
      model: m.model || m.id,
      name: m.name || `${m.manufacturer || manufacturer} ${m.model || m.id}`,
      type: normalizeType(m.type),
      envelope: {
        x_travel: m.axes?.x?.travel || m.travels?.x?.max || m.travels?.x || 0,
        y_travel: m.axes?.y?.travel || m.travels?.y?.max || m.travels?.y || 0,
        z_travel: m.axes?.z?.travel || m.travels?.z?.max || m.travels?.z || 0,
        spindle_to_table_min: m.spindle_to_table_min || 0,
        spindle_to_table_max: m.spindle_to_table_max || 0
      },
      spindle: normalizeSpindle(m.spindle || m.spindle_specs || {}),
      axes: normalizeAxes(m.axes || {}),
      tool_changer: normalizeToolChanger(m.tool_changer || m.atc || {}),
      table: normalizeTable(m.table || m.worktable || {}),
      controller: normalizeController(m.controller || m.cnc || {}),
      weight: m.weight || m.machine_weight || 0,
      footprint: m.footprint || m.dimensions || { length: 0, width: 0, height: 0 },
      power_requirement: m.power_requirement || m.power || 0,
      simultaneous_axes: m.simultaneous_axes || m.axes_simultaneous || 3,
      high_speed_machining: m.high_speed_machining || m.hsm || false,
      rigid_tapping: m.rigid_tapping !== undefined ? m.rigid_tapping : true,
      probing_ready: m.probing_ready || m.probe_ready || false,
      automation_ready: m.automation_ready || false,
      layer: "ENHANCED",
      typical_applications: m.typical_applications || m.applications || []
    }));
    
    // Write individual manufacturer JSON
    const outFile = file.replace('.js', '.json');
    fs.writeFileSync(path.join(OUT_DIR, outFile), JSON.stringify(normalized, null, 2));
    
    allMachines.push(...normalized);
    totalMachines += machines.length;
    console.log(`  ✅ ${file}: ${machines.length} machines → ${outFile}`);
  } catch (err) {
    console.log(`  ❌ ${file}: ${err.message}`);
  }
}

// Write combined file
fs.writeFileSync(path.join(OUT_DIR, 'ALL_MACHINES.json'), JSON.stringify(allMachines, null, 2));
console.log(`\nTotal: ${totalMachines} machines from ${files.length} files`);
console.log(`Combined file: ${OUT_DIR}\\ALL_MACHINES.json`);

// Helper functions
function normalizeType(type) {
  if (!type) return 'vertical_mill';
  const t = type.toLowerCase();
  if (t.includes('vertical') && t.includes('machine')) return 'vertical_mill';
  if (t.includes('horizontal') && t.includes('machine')) return 'horizontal_mill';
  if (t.includes('5_axis') || t.includes('5-axis') || t.includes('five_axis')) return '5_axis';
  if (t.includes('lathe') || t.includes('turning')) return 'lathe';
  if (t.includes('mill_turn') || t.includes('turn_mill') || t.includes('multi')) return 'turn_mill';
  if (t.includes('swiss')) return 'swiss';
  if (t.includes('edm') && t.includes('wire')) return 'edm_wire';
  if (t.includes('edm') && t.includes('sink')) return 'edm_sinker';
  if (t.includes('grind')) return 'grinder';
  return type;
}

function normalizeSpindle(s) {
  return {
    max_rpm: s.max_rpm || s.rpm_max || s.speed_max || s.maxRpm || 0,
    min_rpm: s.min_rpm || s.rpm_min || s.minRpm || 0,
    power_continuous: s.power_continuous || s.power || s.motor_power || s.continuousHp || 0,
    power_30min: s.power_30min || s.power_rated || s.power_continuous || s.power || s.peakHp || 0,
    torque_max: s.torque_max || s.torque || s.maxTorque_Nm || 0,
    torque_continuous: s.torque_continuous || s.torque_rated || 0,
    bearing_type: s.bearing_type || s.bearings || "unknown",
    spindle_nose: s.spindle_nose || s.taper || s.tool_interface || "unknown",
    coolant_through: s.coolant_through || s.tsc || false,
    coolant_pressure: s.coolant_pressure || s.tsc_pressure || 0
  };
}

function normalizeAxes(axes) {
  const result = [];
  for (const [name, spec] of Object.entries(axes)) {
    if (typeof spec !== 'object' || !spec) continue;
    result.push({
      name: name.toUpperCase(),
      travel: spec.travel || 0,
      rapid_rate: spec.rapid_rate || spec.rapid || 0,
      max_feed_rate: spec.max_feed_rate || spec.feed_max || 0,
      acceleration: spec.acceleration || 0,
      resolution: spec.resolution || 0.001,
      repeatability: spec.repeatability || 0.005,
      accuracy: spec.accuracy || 0.008
    });
  }
  return result;
}

function normalizeToolChanger(tc) {
  return {
    type: tc.type || "arm",
    capacity: tc.capacity || tc.tools || tc.positions || 0,
    max_tool_diameter: tc.max_tool_diameter || tc.max_diameter || 0,
    max_tool_length: tc.max_tool_length || tc.max_length || 0,
    max_tool_weight: tc.max_tool_weight || tc.max_weight || 0,
    change_time: tc.change_time || tc.chip_to_chip || tc.tool_to_tool || 0
  };
}

function normalizeTable(t) {
  return {
    type: t.type || "fixed",
    length: t.length || t.size_x || 0,
    width: t.width || t.size_y || 0,
    t_slots: t.t_slots || 0,
    max_load: t.max_load || t.load_capacity || 0
  };
}

function normalizeController(c) {
  return {
    manufacturer: c.manufacturer || c.brand || "unknown",
    model: c.model || c.type || "unknown",
    cnc_type: c.cnc_type || `${c.manufacturer || ''} ${c.model || ''}`.trim() || "unknown",
    max_block_rate: c.max_block_rate || c.block_rate || 0,
    look_ahead: c.look_ahead || c.lookahead || 0,
    memory_capacity: c.memory_capacity || c.memory || "unknown",
    ethernet: c.ethernet !== undefined ? c.ethernet : true,
    usb: c.usb !== undefined ? c.usb : true
  };
}
