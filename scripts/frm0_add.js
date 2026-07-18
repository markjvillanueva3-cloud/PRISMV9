const fs = require('fs');

const fp = 'C:\\PRISM\\data\\FORMULA_REGISTRY.json';
const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
const json = JSON.parse(raw);

const formulas = json.formulaRegistry.formulas;

// Add 9 manufacturing calculator formulas
const newFormulas = {
  "F-CALC-001": {
    id: "F-CALC-001",
    name: "RPM Calculator",
    symbol: "n",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "SPEED_FEED",
    definition: {
      form: "n = (Vc × 1000) / (π × D)",
      description: "Calculates spindle RPM from cutting speed and tool/workpiece diameter"
    },
    variables: [
      { symbol: "Vc", name: "Cutting speed", unit: "m/min", type: "float" },
      { symbol: "D", name: "Tool or workpiece diameter", unit: "mm", type: "float" }
    ],
    output: { symbol: "n", name: "Spindle speed", unit: "RPM", range: "[0, 100000]" },
    dispatcher: "prism_calc",
    action: "speed_feed",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-002": {
    id: "F-CALC-002",
    name: "Feed Rate Calculator",
    symbol: "Vf",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "SPEED_FEED",
    definition: {
      form: "Vf = n × z × fz",
      description: "Calculates table feed rate from RPM, number of teeth, and feed per tooth"
    },
    variables: [
      { symbol: "n", name: "Spindle speed", unit: "RPM", type: "float" },
      { symbol: "z", name: "Number of teeth", unit: "count", type: "int" },
      { symbol: "fz", name: "Feed per tooth", unit: "mm/tooth", type: "float" }
    ],
    output: { symbol: "Vf", name: "Table feed rate", unit: "mm/min", range: "[0, 50000]" },
    dispatcher: "prism_calc",
    action: "speed_feed",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-003": {
    id: "F-CALC-003",
    name: "Material Removal Rate",
    symbol: "Q",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "PRODUCTIVITY",
    definition: {
      form: "Q = ae × ap × Vf",
      description: "Volume of material removed per unit time"
    },
    variables: [
      { symbol: "ae", name: "Radial depth of cut", unit: "mm", type: "float" },
      { symbol: "ap", name: "Axial depth of cut", unit: "mm", type: "float" },
      { symbol: "Vf", name: "Table feed rate", unit: "mm/min", type: "float" }
    ],
    output: { symbol: "Q", name: "Material removal rate", unit: "mm³/min", range: "[0, ∞)" },
    dispatcher: "prism_calc",
    action: "mrr",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-004": {
    id: "F-CALC-004",
    name: "Cutting Power",
    symbol: "Pc",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "POWER",
    definition: {
      form: "Pc = Fc × Vc / 60000; Ps = Pc / η",
      description: "Net cutting power and required spindle power accounting for efficiency"
    },
    variables: [
      { symbol: "Fc", name: "Tangential cutting force", unit: "N", type: "float" },
      { symbol: "Vc", name: "Cutting speed", unit: "m/min", type: "float" },
      { symbol: "η", name: "Spindle efficiency", unit: "dimensionless", type: "float" }
    ],
    output: { symbol: "Ps", name: "Spindle power required", unit: "kW", range: "[0, 200]" },
    dispatcher: "prism_calc",
    action: "power",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-005": {
    id: "F-CALC-005",
    name: "Spindle Torque",
    symbol: "M",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "POWER",
    definition: {
      form: "M = Fc × D / (2 × 1000)",
      description: "Torque at spindle or workpiece from cutting force and diameter"
    },
    variables: [
      { symbol: "Fc", name: "Tangential cutting force", unit: "N", type: "float" },
      { symbol: "D", name: "Tool/workpiece diameter", unit: "mm", type: "float" }
    ],
    output: { symbol: "M", name: "Torque", unit: "N·m", range: "[0, 5000]" },
    dispatcher: "prism_calc",
    action: "torque",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-006": {
    id: "F-CALC-006",
    name: "Surface Finish (Turning)",
    symbol: "Ra_turn",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "SURFACE",
    definition: {
      form: "Ra = f² / (32 × rε)",
      description: "Theoretical surface roughness in turning from feed and nose radius"
    },
    variables: [
      { symbol: "f", name: "Feed per revolution", unit: "mm/rev", type: "float" },
      { symbol: "rε", name: "Tool nose radius", unit: "mm", type: "float" }
    ],
    output: { symbol: "Ra", name: "Surface roughness", unit: "μm", range: "[0.1, 25]" },
    dispatcher: "prism_calc",
    action: "surface_finish",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-007": {
    id: "F-CALC-007",
    name: "Surface Finish (Milling)",
    symbol: "Ra_mill",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "SURFACE",
    definition: {
      form: "Ra = ae² / (32 × D)",
      description: "Theoretical surface roughness in face milling (scallop-based)"
    },
    variables: [
      { symbol: "ae", name: "Radial depth / stepover", unit: "mm", type: "float" },
      { symbol: "D", name: "Cutter diameter", unit: "mm", type: "float" }
    ],
    output: { symbol: "Ra", name: "Surface roughness", unit: "μm", range: "[0.1, 25]" },
    dispatcher: "prism_calc",
    action: "surface_finish",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-008": {
    id: "F-CALC-008",
    name: "Cost Per Part",
    symbol: "Cp",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "ECONOMICS",
    definition: {
      form: "Cp = tm × Cm + (tm/T) × (Ct + tch × Cm)",
      description: "Part cost including machining time, tool consumption, and tool change time"
    },
    variables: [
      { symbol: "tm", name: "Machining time per part", unit: "min", type: "float" },
      { symbol: "Cm", name: "Machine + operator rate", unit: "$/min", type: "float" },
      { symbol: "T", name: "Tool life", unit: "min", type: "float" },
      { symbol: "Ct", name: "Tool/insert cost", unit: "$", type: "float" },
      { symbol: "tch", name: "Tool change time", unit: "min", type: "float" }
    ],
    output: { symbol: "Cp", name: "Cost per part", unit: "$", range: "[0, ∞)" },
    dispatcher: "prism_calc",
    action: "cost_optimize",
    coefficients: [],
    performance: { usageCount: 0 }
  },
  "F-CALC-009": {
    id: "F-CALC-009",
    name: "Chip Load & Thinning",
    symbol: "fz",
    version: "1.0",
    status: "ACTIVE",
    domain: "PHYSICS",
    category: "SPEED_FEED",
    definition: {
      form: "fz = Vf / (n × z); hex = f(ae, D)",
      description: "Chip load per tooth with thin-chip compensation for light radial engagement"
    },
    variables: [
      { symbol: "Vf", name: "Table feed rate", unit: "mm/min", type: "float" },
      { symbol: "n", name: "Spindle speed", unit: "RPM", type: "float" },
      { symbol: "z", name: "Number of teeth", unit: "count", type: "int" },
      { symbol: "ae", name: "Radial depth of cut", unit: "mm", type: "float" },
      { symbol: "D", name: "Tool diameter", unit: "mm", type: "float" }
    ],
    output: { symbol: "fz", name: "Chip load per tooth", unit: "mm/tooth", range: "[0, 1]" },
    dispatcher: "prism_calc",
    action: "chip_load",
    coefficients: [],
    performance: { usageCount: 0 }
  }
};

// Add new formulas
Object.assign(formulas, newFormulas);

// Update metadata
json.formulaRegistry.metadata.totalFormulas = Object.keys(formulas).length;
json.formulaRegistry.metadata.activeFormulas = Object.keys(formulas).length;
json.formulaRegistry.metadata.categories.PHYSICS = (json.formulaRegistry.metadata.categories.PHYSICS || 3) + 9;
json.formulaRegistry.metadata.changelog.push({
  version: "4.0",
  date: "2026-02-15",
  changes: "Added 9 manufacturing calculator formulas: F-CALC-001 through F-CALC-009 (RPM, Feed Rate, MRR, Power, Torque, Surface Finish Turning/Milling, Cost Per Part, Chip Load)"
});

fs.writeFileSync(fp, JSON.stringify(json, null, 2), 'utf8');
console.log(`Updated FORMULA_REGISTRY.json: ${Object.keys(formulas).length} total formulas`);
console.log('New formulas added:', Object.keys(newFormulas).join(', '));
