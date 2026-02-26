/**
 * R5-MS1: Manufacturing Calculator Formula Definitions
 *
 * 9 formula cards matching FormulaRegistry F-CALC and core physics formulas.
 * Each formula has: id, name, equation (plain text), input schema, compute fn.
 *
 * Client-side calculation — mirrors server FormulaRegistry exactly.
 */

export interface FormulaInput {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface FormulaDefinition {
  id: string;
  name: string;
  description: string;
  equation: string;           // Plain-text equation
  equationSymbols: string;    // With Unicode symbols
  inputs: FormulaInput[];
  outputName: string;
  outputUnit: string;
  compute: (inputs: Record<string, number>) => number;
}

// ============================================================================
// 9 CALCULATOR FORMULAS
// ============================================================================

export const FORMULAS: FormulaDefinition[] = [
  // 1. RPM — Spindle speed from cutting speed and diameter
  {
    id: 'F-CALC-001',
    name: 'Spindle RPM',
    description: 'Calculate spindle speed from cutting speed and tool diameter.',
    equation: 'n = (Vc x 1000) / (pi x D)',
    equationSymbols: 'n = (V\u1D04 \u00D7 1000) / (\u03C0 \u00D7 D)',
    inputs: [
      { name: 'Vc', label: 'Cutting Speed', unit: 'm/min', min: 1, max: 1000, step: 1, defaultValue: 200 },
      { name: 'D', label: 'Tool Diameter', unit: 'mm', min: 0.1, max: 500, step: 0.1, defaultValue: 25 },
    ],
    outputName: 'Spindle Speed',
    outputUnit: 'RPM',
    compute: (v) => (v.Vc * 1000) / (Math.PI * v.D),
  },

  // 2. Feed Rate — Table feed from RPM, feed per tooth, number of teeth
  {
    id: 'F-CALC-002',
    name: 'Table Feed Rate',
    description: 'Calculate table feed rate from RPM, feed per tooth, and number of flutes.',
    equation: 'Vf = n x fz x z',
    equationSymbols: 'V\u1DA0 = n \u00D7 f\u1DBB \u00D7 z',
    inputs: [
      { name: 'n_rpm', label: 'Spindle Speed', unit: 'RPM', min: 1, max: 50000, step: 1, defaultValue: 2500 },
      { name: 'fz', label: 'Feed per Tooth', unit: 'mm/tooth', min: 0.001, max: 2, step: 0.001, defaultValue: 0.1 },
      { name: 'z', label: 'Number of Flutes', unit: '', min: 1, max: 20, step: 1, defaultValue: 4 },
    ],
    outputName: 'Table Feed',
    outputUnit: 'mm/min',
    compute: (v) => v.n_rpm * v.fz * v.z,
  },

  // 3. MRR — Material Removal Rate
  {
    id: 'F-MRR-001',
    name: 'Material Removal Rate',
    description: 'Volume of material removed per minute. Key productivity metric.',
    equation: 'Q = ap x ae x Vf',
    equationSymbols: 'Q = a\u209A \u00D7 a\u2091 \u00D7 V\u1DA0',
    inputs: [
      { name: 'ap', label: 'Axial Depth of Cut', unit: 'mm', min: 0.01, max: 50, step: 0.01, defaultValue: 3 },
      { name: 'ae', label: 'Radial Width of Cut', unit: 'mm', min: 0.01, max: 200, step: 0.01, defaultValue: 12.5 },
      { name: 'vf', label: 'Table Feed Rate', unit: 'mm/min', min: 1, max: 50000, step: 1, defaultValue: 1000 },
    ],
    outputName: 'MRR',
    outputUnit: 'cm\u00B3/min',
    compute: (v) => (v.ap * v.ae * v.vf) / 1000, // mm³/min → cm³/min
  },

  // 4. Cutting Power
  {
    id: 'F-POWER-001',
    name: 'Cutting Power',
    description: 'Power consumed at the spindle for metal cutting.',
    equation: 'Pc = (Fc x Vc) / (60000 x eta)',
    equationSymbols: 'P\u1D04 = (F\u1D04 \u00D7 V\u1D04) / (60000 \u00D7 \u03B7)',
    inputs: [
      { name: 'Fc', label: 'Cutting Force', unit: 'N', min: 1, max: 50000, step: 1, defaultValue: 850 },
      { name: 'Vc', label: 'Cutting Speed', unit: 'm/min', min: 1, max: 1000, step: 1, defaultValue: 200 },
      { name: 'eta', label: 'Machine Efficiency', unit: '', min: 0.1, max: 1, step: 0.01, defaultValue: 0.85 },
    ],
    outputName: 'Power',
    outputUnit: 'kW',
    compute: (v) => (v.Fc * v.Vc) / (60000 * v.eta),
  },

  // 5. Spindle Torque
  {
    id: 'F-CALC-005',
    name: 'Spindle Torque',
    description: 'Torque at the spindle from power and RPM.',
    equation: 'T = (P x 30000) / (pi x n)',
    equationSymbols: 'T = (P \u00D7 30000) / (\u03C0 \u00D7 n)',
    inputs: [
      { name: 'P_kw', label: 'Spindle Power', unit: 'kW', min: 0.01, max: 200, step: 0.01, defaultValue: 3.5 },
      { name: 'n_rpm', label: 'Spindle Speed', unit: 'RPM', min: 1, max: 50000, step: 1, defaultValue: 2500 },
    ],
    outputName: 'Torque',
    outputUnit: 'N\u00B7m',
    compute: (v) => (v.P_kw * 30000) / (Math.PI * v.n_rpm),
  },

  // 6. Surface Finish Ra (theoretical)
  {
    id: 'F-SURFACE-001',
    name: 'Surface Roughness Ra',
    description: 'Theoretical arithmetic average surface roughness from feed and nose radius.',
    equation: 'Ra = f^2 / (32 x r)',
    equationSymbols: 'Ra = f\u00B2 / (32 \u00D7 r)',
    inputs: [
      { name: 'f', label: 'Feed per Revolution', unit: 'mm/rev', min: 0.01, max: 2, step: 0.01, defaultValue: 0.2 },
      { name: 'r', label: 'Tool Nose Radius', unit: 'mm', min: 0.1, max: 10, step: 0.1, defaultValue: 0.8 },
    ],
    outputName: 'Ra',
    outputUnit: '\u03BCm',
    compute: (v) => (v.f * v.f * 1000) / (32 * v.r), // mm → µm
  },

  // 7. Surface Finish Rz (theoretical peak-to-valley)
  {
    id: 'F-SURFACE-RZ',
    name: 'Surface Roughness Rz',
    description: 'Theoretical peak-to-valley roughness. Rz is approx. 4\u00D7Ra for turning operations.',
    equation: 'Rz = f^2 / (8 x r)',
    equationSymbols: 'Rz = f\u00B2 / (8 \u00D7 r)',
    inputs: [
      { name: 'f', label: 'Feed per Revolution', unit: 'mm/rev', min: 0.01, max: 2, step: 0.01, defaultValue: 0.2 },
      { name: 'r', label: 'Tool Nose Radius', unit: 'mm', min: 0.1, max: 10, step: 0.1, defaultValue: 0.8 },
    ],
    outputName: 'Rz',
    outputUnit: '\u03BCm',
    compute: (v) => (v.f * v.f * 1000) / (8 * v.r), // mm → µm
  },

  // 8. Machining Cost per Part
  {
    id: 'F-COST-001',
    name: 'Machining Cost',
    description: 'Estimated cost per part from cycle time, machine rate, and tool cost.',
    equation: 'Cost = (Tc x Rm) + (Tc / Tl x Ct)',
    equationSymbols: 'Cost = (T\u1D04 \u00D7 R\u2098) + (T\u1D04/T\u2097 \u00D7 C\u209C)',
    inputs: [
      { name: 'Tc', label: 'Cycle Time', unit: 'min', min: 0.1, max: 999, step: 0.1, defaultValue: 10 },
      { name: 'Rm', label: 'Machine Rate', unit: '$/min', min: 0.01, max: 50, step: 0.01, defaultValue: 1.5 },
      { name: 'Tl', label: 'Tool Life', unit: 'min', min: 1, max: 9999, step: 1, defaultValue: 45 },
      { name: 'Ct', label: 'Tool Change Cost', unit: '$', min: 0, max: 500, step: 0.5, defaultValue: 25 },
    ],
    outputName: 'Cost/Part',
    outputUnit: '$',
    compute: (v) => (v.Tc * v.Rm) + (v.Tc / v.Tl * v.Ct),
  },

  // 9. Taylor Tool Life
  {
    id: 'F-TAYLOR-001',
    name: 'Taylor Tool Life',
    description: 'Predict tool life using the Taylor equation. Higher speed = shorter life.',
    equation: 'T = (C / V)^(1/n)',
    equationSymbols: 'T = (C / V)^(1/n)',
    inputs: [
      { name: 'C', label: 'Taylor Constant C', unit: '', min: 10, max: 2000, step: 1, defaultValue: 300 },
      { name: 'V', label: 'Cutting Speed', unit: 'm/min', min: 1, max: 1000, step: 1, defaultValue: 200 },
      { name: 'n', label: 'Taylor Exponent n', unit: '', min: 0.05, max: 0.99, step: 0.01, defaultValue: 0.25 },
    ],
    outputName: 'Tool Life',
    outputUnit: 'min',
    compute: (v) => Math.pow(v.C / v.V, 1 / v.n),
  },
];
