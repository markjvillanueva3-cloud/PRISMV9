const fs = require("fs");
const filePath = "C:/PRISM/mcp-server/src/registries/FormulaRegistry.ts";
let content = fs.readFileSync(filePath, "utf-8");

// Find the default case and replace with calculator cases + formula_js fallback
const oldDefault = '      default:\n        throw new Error(No implementation for formula );';
const newCode =       // === CALCULATOR FORMULAS (R1-MS8) ===
      case "F-CALC-001": // RPM Calculator
        result = (inputs.Vc * 1000) / (Math.PI * inputs.D);
        break;
      case "F-CALC-002": // Feed Rate
        result = inputs.n_rpm * inputs.fz * inputs.z;
        break;
      case "F-CALC-003": // Cutting Speed from RPM
        result = (Math.PI * inputs.D * inputs.n_rpm) / 1000;
        break;
      case "F-CALC-004": // Chip Thinning Compensation
        result = inputs.fz * inputs.D / (2 * Math.sqrt(inputs.D * inputs.ae - inputs.ae * inputs.ae));
        break;
      case "F-CALC-005": // Torque from Power
        result = (inputs.P_kw * 30000) / (Math.PI * inputs.n_rpm);
        break;
      case "F-CALC-006": // Thread Pitch to TPI
        result = 25.4 / inputs.pitch_mm;
        break;
      case "F-CALC-007": // Tap Drill Size (75%)
        result = inputs.D_major - inputs.pitch_mm;
        break;
      case "F-CALC-008": // Machining Time
        result = inputs.L_mm / inputs.Vf;
        break;
      case "F-CALC-009": // Surface Speed (Turning)
        result = (Math.PI * inputs.D_mm * inputs.n_rpm) / 1000;
        break;

      default: {
        // R1-MS8: Try formula_js evaluation for registry formulas
        const formulaJs = (formula as any).formula_js;
        if (formulaJs && typeof formulaJs === "string") {
          try {
            const fn = new Function("return " + formulaJs)();
            const evalResult = fn(inputs);
            // Extract first numeric output
            if (typeof evalResult === "number") {
              result = evalResult;
            } else if (typeof evalResult === "object") {
              const vals = Object.values(evalResult).filter(v => typeof v === "number");
              result = vals.length > 0 ? vals[0] as number : NaN;
            } else {
              result = NaN;
            }
          } catch (evalErr) {
            throw new Error(\Formula \ evaluation failed: \\);
          }
        } else {
          throw new Error(\No implementation for formula \\);
        }
        break;
      };

// Try both \r\n and \n line endings
let replaced = false;
for (const le of ["\r\n", "\n"]) {
  const target = oldDefault.replace(/\n/g, le);
  if (content.includes(target)) {
    content = content.replace(target, newCode.replace(/\n/g, le));
    replaced = true;
    break;
  }
}

if (!replaced) {
  // Try searching for just the throw line
  const throwLine = "throw new Error(\No implementation for formula \\);";
  if (content.includes(throwLine)) {
    // Find the default case line before it
    const idx = content.indexOf(throwLine);
    const before = content.substring(0, idx);
    const defaultIdx = before.lastIndexOf("default:");
    if (defaultIdx >= 0) {
      content = content.substring(0, defaultIdx) + newCode + content.substring(idx + throwLine.length);
      replaced = true;
    }
  }
}

if (replaced) {
  fs.writeFileSync(filePath, content);
  console.log("SUCCESS: 9 calculator cases + formula_js fallback added");
  console.log("Lines: " + content.split("\\n").length);
} else {
  console.log("FAILED: Could not find default throw pattern");
  // Show what's around line 698
  const lines = content.split("\\n");
  for (let i = 690; i < Math.min(710, lines.length); i++) {
    console.log("L" + (i+1) + ": " + lines[i]);
  }
}
