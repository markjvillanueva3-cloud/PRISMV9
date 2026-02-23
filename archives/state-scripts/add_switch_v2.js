const fs = require("fs");
const filePath = "C:/PRISM/mcp-server/src/registries/FormulaRegistry.ts";
let content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\r\n");

// Find the "default:" case line near the throw
let defaultLine = -1;
let throwLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === "default:" && i > 600) defaultLine = i;
  if (lines[i].includes("No implementation for formula") && defaultLine >= 0) { throwLine = i; break; }
}

if (defaultLine < 0 || throwLine < 0) {
  console.log("FAIL: default=" + defaultLine + " throw=" + throwLine);
  // Show context
  for (let i = 690; i < Math.min(710, lines.length); i++) {
    console.log("L" + (i+1) + ": " + lines[i]);
  }
  process.exit(1);
}

console.log("Found default at L" + (defaultLine+1) + ", throw at L" + (throwLine+1));

// Replace lines from defaultLine to throwLine (inclusive) with new code
const newLines = [
  '      // === CALCULATOR FORMULAS (R1-MS8) ===',
  '      case "F-CALC-001": result = (inputs.Vc * 1000) / (Math.PI * inputs.D); break;',
  '      case "F-CALC-002": result = inputs.n_rpm * inputs.fz * inputs.z; break;',
  '      case "F-CALC-003": result = (Math.PI * inputs.D * inputs.n_rpm) / 1000; break;',
  '      case "F-CALC-004": result = inputs.fz * inputs.D / (2 * Math.sqrt(inputs.D * inputs.ae - inputs.ae * inputs.ae)); break;',
  '      case "F-CALC-005": result = (inputs.P_kw * 30000) / (Math.PI * inputs.n_rpm); break;',
  '      case "F-CALC-006": result = 25.4 / inputs.pitch_mm; break;',
  '      case "F-CALC-007": result = inputs.D_major - inputs.pitch_mm; break;',
  '      case "F-CALC-008": result = inputs.L_mm / inputs.Vf; break;',
  '      case "F-CALC-009": result = (Math.PI * inputs.D_mm * inputs.n_rpm) / 1000; break;',
  '',
  '      default: {',
  '        // R1-MS8: formula_js fallback for registry formulas',
  '        const formulaJs = (formula as any).formula_js;',
  '        if (formulaJs && typeof formulaJs === "string") {',
  '          try {',
  '            const fn = new Function("return " + formulaJs)();',
  '            const evalResult = fn(inputs);',
  '            if (typeof evalResult === "number") { result = evalResult; }',
  '            else if (typeof evalResult === "object") {',
  '              const vals = Object.values(evalResult).filter(v => typeof v === "number");',
  '              result = vals.length > 0 ? vals[0] as number : NaN;',
  '            } else { result = NaN; }',
  '          } catch (evalErr: any) {',
  '            throw new Error("Formula " + formulaId + " evaluation failed: " + evalErr.message);',
  '          }',
  '        } else {',
  '          throw new Error("No implementation for formula " + formulaId);',
  '        }',
  '        break;',
  '      }'
];

const before = lines.slice(0, defaultLine);
const after = lines.slice(throwLine + 1);
const result = [...before, ...newLines, ...after];
fs.writeFileSync(filePath, result.join("\r\n"));
console.log("SUCCESS: " + newLines.length + " lines replacing " + (throwLine - defaultLine + 1));
console.log("File now: " + result.length + " lines");