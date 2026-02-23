const fs = require("fs");
const regPath = "C:/PRISM/registries/FORMULA_REGISTRY.json";
const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));

// Check existing IDs
const existingIds = new Set(reg.formulas.map(f => f.id || f.formula_id));

const calcFormulas = [
  { id: "F-CALC-001", name: "RPM Calculator", domain: "MANUFACTURING", category: "BASIC",
    equation: "n = (Vc * 1000) / (PI * D)", description: "Spindle RPM from cutting speed and tool diameter",
    formula_js: "({Vc, D}) => ({ n_rpm: (Vc * 1000) / (Math.PI * D) })",
    inputs: [{name:"Vc",unit:"m/min",desc:"Cutting speed"},{name:"D",unit:"mm",desc:"Tool diameter"}],
    outputs: [{name:"n_rpm",unit:"rpm",desc:"Spindle speed"}] },
  { id: "F-CALC-002", name: "Feed Rate Calculator", domain: "MANUFACTURING", category: "BASIC",
    equation: "Vf = n * fz * z", description: "Table feed rate from RPM, feed per tooth, and flutes",
    formula_js: "({n_rpm, fz, z}) => ({ Vf: n_rpm * fz * z })",
    inputs: [{name:"n_rpm",unit:"rpm",desc:"Spindle speed"},{name:"fz",unit:"mm/tooth",desc:"Feed per tooth"},{name:"z",unit:"",desc:"Number of flutes"}],
    outputs: [{name:"Vf",unit:"mm/min",desc:"Table feed rate"}] },
  { id: "F-CALC-003", name: "Cutting Speed from RPM", domain: "MANUFACTURING", category: "BASIC",
    equation: "Vc = (PI * D * n) / 1000", description: "Cutting speed from tool diameter and RPM",
    formula_js: "({D, n_rpm}) => ({ Vc: (Math.PI * D * n_rpm) / 1000 })",
    inputs: [{name:"D",unit:"mm",desc:"Tool diameter"},{name:"n_rpm",unit:"rpm",desc:"Spindle speed"}],
    outputs: [{name:"Vc",unit:"m/min",desc:"Cutting speed"}] },
  { id: "F-CALC-004", name: "Chip Thinning Compensation", domain: "MANUFACTURING", category: "BASIC",
    equation: "fz_eff = fz * D / (2 * sqrt(D*ae - ae^2))", description: "Adjusted feed for radial chip thinning",
    formula_js: "({fz, D, ae}) => ({ fz_eff: fz * D / (2 * Math.sqrt(D * ae - ae * ae)) })",
    inputs: [{name:"fz",unit:"mm/tooth",desc:"Nominal feed per tooth"},{name:"D",unit:"mm",desc:"Tool diameter"},{name:"ae",unit:"mm",desc:"Radial depth"}],
    outputs: [{name:"fz_eff",unit:"mm/tooth",desc:"Effective feed per tooth"}] },
  { id: "F-CALC-005", name: "Torque from Power", domain: "MANUFACTURING", category: "BASIC",
    equation: "T = (P * 30000) / (PI * n)", description: "Spindle torque from power and RPM",
    formula_js: "({P_kw, n_rpm}) => ({ T_Nm: (P_kw * 30000) / (Math.PI * n_rpm) })",
    inputs: [{name:"P_kw",unit:"kW",desc:"Spindle power"},{name:"n_rpm",unit:"rpm",desc:"Spindle speed"}],
    outputs: [{name:"T_Nm",unit:"Nm",desc:"Torque"}] },
  { id: "F-CALC-006", name: "Thread Pitch to TPI", domain: "MANUFACTURING", category: "THREADING",
    equation: "TPI = 25.4 / pitch", description: "Convert metric pitch to threads per inch",
    formula_js: "({pitch_mm}) => ({ TPI: 25.4 / pitch_mm })",
    inputs: [{name:"pitch_mm",unit:"mm",desc:"Thread pitch"}],
    outputs: [{name:"TPI",unit:"threads/in",desc:"Threads per inch"}] },
  { id: "F-CALC-007", name: "Tap Drill Size (75%)", domain: "MANUFACTURING", category: "THREADING",
    equation: "drill = D_major - pitch", description: "Approximate tap drill for 75% thread engagement",
    formula_js: "({D_major, pitch_mm}) => ({ drill_mm: D_major - pitch_mm })",
    inputs: [{name:"D_major",unit:"mm",desc:"Major diameter"},{name:"pitch_mm",unit:"mm",desc:"Thread pitch"}],
    outputs: [{name:"drill_mm",unit:"mm",desc:"Tap drill diameter"}] },
  { id: "F-CALC-008", name: "Machining Time", domain: "MANUFACTURING", category: "PRODUCTIVITY",
    equation: "t = L / Vf", description: "Cutting time from length and feed rate",
    formula_js: "({L_mm, Vf}) => ({ t_min: L_mm / Vf })",
    inputs: [{name:"L_mm",unit:"mm",desc:"Total cut length"},{name:"Vf",unit:"mm/min",desc:"Table feed rate"}],
    outputs: [{name:"t_min",unit:"min",desc:"Machining time"}] },
  { id: "F-CALC-009", name: "Surface Speed (Turning)", domain: "MANUFACTURING", category: "BASIC",
    equation: "Vc = PI * D * n / 1000", description: "Surface speed at given diameter for turning",
    formula_js: "({D_mm, n_rpm}) => ({ Vc: (Math.PI * D_mm * n_rpm) / 1000 })",
    inputs: [{name:"D_mm",unit:"mm",desc:"Workpiece diameter"},{name:"n_rpm",unit:"rpm",desc:"Spindle speed"}],
    outputs: [{name:"Vc",unit:"m/min",desc:"Surface cutting speed"}] }
];

let added = 0;
for (const f of calcFormulas) {
  if (!existingIds.has(f.id)) { reg.formulas.push(f); added++; }
}
reg.totalFormulas = reg.formulas.length;
fs.writeFileSync(regPath, JSON.stringify(reg, null, 2));
console.log("Added: " + added + " | Total: " + reg.totalFormulas);
