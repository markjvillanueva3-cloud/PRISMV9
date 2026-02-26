const fs = require("fs");

// Step 1: Add 9 calculator formulas to FORMULA_REGISTRY.json
const regPath = "C:/PRISM/registries/FORMULA_REGISTRY.json";
const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));
const formulas = reg.formulaRegistry.formulas;

const calcFormulas = {
  "F-CALC-001": {
    id: "F-CALC-001", name: "RPM Calculator", domain: "MANUFACTURING", category: "BASIC",
    equation: "n = (Vc ? 1000) / (? ? D)",
    description: "Spindle RPM from cutting speed and tool diameter",
    inputs: { Vc: { unit: "m/min", desc: "Cutting speed", min: 1, max: 2000 }, D: { unit: "mm", desc: "Tool diameter", min: 0.1, max: 500 } },
    outputs: { n_rpm: { unit: "rpm", desc: "Spindle speed" } },
    formula_js: "({Vc, D}) => ({ n_rpm: (Vc * 1000) / (Math.PI * D) })"
  },
  "F-CALC-002": {
    id: "F-CALC-002", name: "Feed Rate Calculator", domain: "MANUFACTURING", category: "BASIC",
    equation: "Vf = n ? fz ? z",
    description: "Table feed rate from RPM, feed per tooth, and flutes",
    inputs: { n_rpm: { unit: "rpm", desc: "Spindle speed", min: 1, max: 100000 }, fz: { unit: "mm/tooth", desc: "Feed per tooth", min: 0.001, max: 10 }, z: { unit: "", desc: "Number of flutes", min: 1, max: 20 } },
    outputs: { Vf: { unit: "mm/min", desc: "Table feed rate" } },
    formula_js: "({n_rpm, fz, z}) => ({ Vf: n_rpm * fz * z })"
  },
  "F-CALC-003": {
    id: "F-CALC-003", name: "Cutting Speed from RPM", domain: "MANUFACTURING", category: "BASIC",
    equation: "Vc = (? ? D ? n) / 1000",
    description: "Cutting speed from tool diameter and RPM",
    inputs: { D: { unit: "mm", desc: "Tool diameter", min: 0.1, max: 500 }, n_rpm: { unit: "rpm", desc: "Spindle speed", min: 1, max: 100000 } },
    outputs: { Vc: { unit: "m/min", desc: "Cutting speed" } },
    formula_js: "({D, n_rpm}) => ({ Vc: (Math.PI * D * n_rpm) / 1000 })"
  },
  "F-CALC-004": {
    id: "F-CALC-004", name: "Chip Thinning Compensation", domain: "MANUFACTURING", category: "BASIC",
    equation: "fz_actual = fz ? D / (2 ? ?(D ? ae - ae?))",
    description: "Adjusted feed per tooth for radial chip thinning",
    inputs: { fz: { unit: "mm/tooth", desc: "Nominal feed per tooth", min: 0.01, max: 2 }, D: { unit: "mm", desc: "Tool diameter", min: 1, max: 100 }, ae: { unit: "mm", desc: "Radial depth of cut", min: 0.1, max: 100 } },
    outputs: { fz_actual: { unit: "mm/tooth", desc: "Compensated feed per tooth" } },
    formula_js: "({fz, D, ae}) => ({ fz_actual: fz * D / (2 * Math.sqrt(D * ae - ae * ae)) })"
  },
  "F-CALC-005": {
    id: "F-CALC-005", name: "Torque from Power", domain: "MANUFACTURING", category: "BASIC",
    equation: "T = (P ? 30000) / (? ? n)",
    description: "Spindle torque from power and RPM",
    inputs: { P_kw: { unit: "kW", desc: "Spindle power", min: 0.1, max: 500 }, n_rpm: { unit: "rpm", desc: "Spindle speed", min: 1, max: 100000 } },
    outputs: { T_Nm: { unit: "Nm", desc: "Torque" } },
    formula_js: "({P_kw, n_rpm}) => ({ T_Nm: (P_kw * 30000) / (Math.PI * n_rpm) })"
  },
  "F-CALC-006": {
    id: "F-CALC-006", name: "Thread Pitch to TPI", domain: "MANUFACTURING", category: "THREADING",
    equation: "TPI = 25.4 / pitch",
    description: "Convert metric pitch to threads per inch",
    inputs: { pitch_mm: { unit: "mm", desc: "Thread pitch", min: 0.2, max: 8 } },
    outputs: { TPI: { unit: "threads/inch", desc: "Threads per inch" } },
    formula_js: "({pitch_mm}) => ({ TPI: 25.4 / pitch_mm })"
  },
  "F-CALC-007": {
    id: "F-CALC-007", name: "Tap Drill Size", domain: "MANUFACTURING", category: "THREADING",
    equation: "drill = D_major - pitch",
    description: "Approximate tap drill diameter (75% thread)",
    inputs: { D_major: { unit: "mm", desc: "Major diameter", min: 1, max: 100 }, pitch_mm: { unit: "mm", desc: "Thread pitch", min: 0.2, max: 8 } },
    outputs: { drill_mm: { unit: "mm", desc: "Tap drill diameter" } },
    formula_js: "({D_major, pitch_mm}) => ({ drill_mm: D_major - pitch_mm })"
  },
  "F-CALC-008": {
    id: "F-CALC-008", name: "Machining Time", domain: "MANUFACTURING", category: "PRODUCTIVITY",
    equation: "t = L / Vf",
    description: "Cutting time from length and feed rate",
    inputs: { L_mm: { unit: "mm", desc: "Total cut length", min: 1, max: 100000 }, Vf: { unit: "mm/min", desc: "Table feed rate", min: 1, max: 50000 } },
    outputs: { t_min: { unit: "min", desc: "Machining time" } },
    formula_js: "({L_mm, Vf}) => ({ t_min: L_mm / Vf })"
  },
  "F-CALC-009": {
    id: "F-CALC-009", name: "Surface Speed (Turning)", domain: "MANUFACTURING", category: "BASIC",
    equation: "Vc = ? ? D ? n / 1000 (varying D for facing)",
    description: "Surface speed at given diameter and RPM for turning/facing",
    inputs: { D_mm: { unit: "mm", desc: "Workpiece diameter", min: 1, max: 2000 }, n_rpm: { unit: "rpm", desc: "Spindle speed", min: 1, max: 20000 } },
    outputs: { Vc: { unit: "m/min", desc: "Surface cutting speed" } },
    formula_js: "({D_mm, n_rpm}) => ({ Vc: (Math.PI * D_mm * n_rpm) / 1000 })"
  }
};

// Add to registry
let added = 0;
for (const [id, f] of Object.entries(calcFormulas)) {
  if (!formulas[id]) {
    formulas[id] = f;
    added++;
  }
}
fs.writeFileSync(regPath, JSON.stringify(reg, null, 2));
console.log("Added " + added + " calculator formulas to FORMULA_REGISTRY.json");
console.log("Total formulas now: " + Object.keys(formulas).length);
