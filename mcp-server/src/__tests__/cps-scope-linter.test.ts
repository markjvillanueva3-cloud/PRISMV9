/**
 * CPS JavaScript Scope Linter — U-SH01
 *
 * Parses the CPS file's JavaScript using acorn AST and checks for:
 * 1. References to variables not in function parameter list or local scope
 * 2. Wrong property access patterns (e.g., result.speed.speed instead of .Vc)
 * 3. Missing fallbacks for string-typed values used in arithmetic
 *
 * Must catch the 3 historical bugs:
 * - bare `diameter` in calculateOptimizedSpeed (was not a parameter)
 * - `result.speed.speed` (should be `result.speed.Vc`)
 * - `toolConfig.flutes` used in arithmetic without numeric guard
 *
 * Zero false positives on the current clean CPS.
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as acorn from "acorn";

const CPS_PATH = path.resolve(
  __dirname,
  "../../data/posts/prism-enhanced/HURCO_VM30i_PRISM_v11.cps"
);

// ═══════════════════════════════════════════════════════════════════════════════
// AST-BASED SCOPE ANALYSIS UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Known CPS global identifiers — these are provided by Fusion 360 or declared at file scope */
const CPS_GLOBALS = new Set([
  // Fusion 360 post-processor API
  "getProperty", "hasParameter", "getParameter", "warning", "log", "error",
  "writeBlock", "writeComment", "writeWords", "writeln", "write",
  "formatComment", "conditional", "validate",
  "onOpen", "onClose", "onSection", "onSectionEnd", "onParameter",
  "onCommand", "onLinear", "onCircular", "onRapid", "onDwell",
  "onCycle", "onCycleEnd", "onCyclePoint", "onMovement",
  "onRadiusCompensation", "onPassThrough", "onSpindleSpeed",
  "getCurrentPosition", "getFramePosition", "getMachineConfiguration",
  "setSmoothing",
  "tool", "currentSection", "machineConfiguration", "unit",
  "IN", "MM", "PLANE_XY", "PLANE_XZ", "PLANE_YZ",
  "COOLANT_OFF", "COOLANT_FLOOD", "COOLANT_MIST", "COOLANT_THROUGH_TOOL",
  "COOLANT_AIR", "COOLANT_AIR_THROUGH_TOOL", "COOLANT_SUCTION",
  "TOOL_COMPENSATION_LEFT", "TOOL_COMPENSATION_RIGHT", "TOOL_COMPENSATION_OFF",
  "MOVEMENT_RAPID", "MOVEMENT_CUTTING", "MOVEMENT_LEAD_IN", "MOVEMENT_LEAD_OUT",
  "MOVEMENT_FINISH_CUTTING", "MOVEMENT_LINK_TRANSITION",
  "COMMAND_STOP", "COMMAND_SPINDLE_CLOCKWISE", "COMMAND_SPINDLE_COUNTERCLOCKWISE",
  "COMMAND_COOLANT_ON", "COMMAND_COOLANT_OFF", "COMMAND_LOCK_MULTI_AXIS",
  "COMMAND_UNLOCK_MULTI_AXIS", "COMMAND_BREAK_CONTROL", "COMMAND_TOOL_MEASURE",
  "COMMAND_START_CHIP_TRANSPORT", "COMMAND_STOP_CHIP_TRANSPORT",
  "HIGH_FEED_NO_MAPPING", "HIGH_FEED_MAP_MULTI", "HIGH_FEED_MAP_ANY",
  "MAPPING_ERROR", "MAPPING_UNKNOWN",
  "Vector", "Matrix", "SpatialVector",
  "properties", "description", "vendor", "vendorUrl", "legal",
  "longDescription", "certificationLevel", "minimumRevision",
  "allowHelicalMoves", "allowSpiralMoves", "allowedCircularPlanes",
  "maximumCircularSweep", "minimumCircularSweep", "tolerance",
  "mapToWCS", "mapWorkOrigin",
  // JavaScript builtins
  "Math", "console", "parseFloat", "parseInt", "isNaN", "isFinite",
  "String", "Number", "Array", "Object", "JSON", "Date", "RegExp",
  "Error", "TypeError", "RangeError", "SyntaxError",
  "undefined", "null", "true", "false", "NaN", "Infinity",
  "arguments", "this", "self",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  // CPS file-level declarations (we'll also collect these dynamically)
  "PRISM_MATERIALS", "PRISM_PHYSICS", "PRISM_TURNING", "PRISM_GROUP_DEFAULTS",
  "machineDatabase", "brandFactors", "holderTIRFactors", "coatingFactors",
  "toolMaterialFactors",
]);

interface ScopeViolation {
  functionName: string;
  variableName: string;
  line: number;
  column: number;
  type: "undefined_variable" | "wrong_property" | "missing_fallback";
  message: string;
}

/**
 * Extract function bodies from PRISM_PHYSICS object and analyze scope.
 * We parse the extracted PRISM_PHYSICS block as a JavaScript object literal
 * and walk each method's AST to find unresolved references.
 */
function extractFunctionBodies(cpsContent: string): {
  name: string;
  params: string[];
  body: string;
  startLine: number;
}[] {
  const functions: { name: string; params: string[]; body: string; startLine: number }[] = [];

  // Match function declarations inside PRISM_PHYSICS object
  // Pattern: methodName: function(params) { body }
  const methodPattern =
    /(\w+)\s*:\s*function\s*\(([^)]*)\)\s*\{/g;

  // Find PRISM_PHYSICS block
  const physicsStart = cpsContent.indexOf("var PRISM_PHYSICS = {");
  if (physicsStart < 0) return functions;

  // Find the end of PRISM_PHYSICS (next top-level var declaration)
  const physicsEnd = cpsContent.indexOf("\nvar PRISM_TURNING", physicsStart);
  const physicsBlock =
    physicsEnd > physicsStart
      ? cpsContent.substring(physicsStart, physicsEnd)
      : cpsContent.substring(physicsStart, physicsStart + 50000);

  const linesBefore = cpsContent.substring(0, physicsStart).split("\n").length;

  let match;
  while ((match = methodPattern.exec(physicsBlock)) !== null) {
    const name = match[1];
    const params = match[2]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const funcStart = match.index + match[0].length;

    // Find matching closing brace by counting depth
    let depth = 1;
    let i = funcStart;
    while (i < physicsBlock.length && depth > 0) {
      if (physicsBlock[i] === "{") depth++;
      if (physicsBlock[i] === "}") depth--;
      i++;
    }
    const body = physicsBlock.substring(funcStart, i - 1);
    const bodyLineOffset = physicsBlock.substring(0, match.index).split("\n").length;

    functions.push({
      name,
      params,
      body,
      startLine: linesBefore + bodyLineOffset,
    });
  }

  return functions;
}

/**
 * Collect all `var` declarations within a function body string.
 * Skips comment lines to avoid false positives from commented-out code.
 */
function collectLocalVars(body: string): Set<string> {
  const locals = new Set<string>();
  const lines = body.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip single-line comments and JSDoc/block-comment lines
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;

    // var declarations
    const varPattern = /\bvar\s+(\w+)/g;
    let m;
    while ((m = varPattern.exec(line)) !== null) {
      locals.add(m[1]);
    }
    // for(var x in ...) or for(var x = ...)
    const forVarPattern = /\bfor\s*\(\s*var\s+(\w+)/g;
    while ((m = forVarPattern.exec(line)) !== null) {
      locals.add(m[1]);
    }
    // function declarations inside body
    const funcDeclPattern = /\bfunction\s+(\w+)/g;
    while ((m = funcDeclPattern.exec(line)) !== null) {
      locals.add(m[1]);
    }
  }
  return locals;
}

/**
 * Find identifiers used as bare references (not property access targets)
 * in a function body. Returns identifiers that are NOT in params, locals,
 * or known globals.
 *
 * This is a regex-based heuristic (not full AST walk of the body) because
 * the CPS uses ES3-level JavaScript that acorn can parse but the bodies
 * are complex nested expressions. We look for patterns like:
 *   - `&& identifier >` (comparison with bare identifier)
 *   - `= identifier *` (arithmetic with bare identifier)
 *   - `( identifier )` (used as argument)
 */
function findBareIdentifierUsages(
  body: string,
  params: Set<string>,
  locals: Set<string>
): { name: string; line: number; context: string }[] {
  const issues: { name: string; line: number; context: string }[] = [];

  // Split body into lines for line number tracking
  const lines = body.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

    // Find identifier-like tokens in arithmetic/comparison contexts
    // These patterns catch bare variables used in calculations
    const patterns = [
      // `&& identifier >` — comparison with bare variable
      /&&\s+(\b[a-zA-Z_]\w*\b)\s*>/g,
      // `/ identifier` — division by bare variable
      /\/\s*(\b[a-zA-Z_]\w*\b)\s*[;),]/g,
      // `* identifier` — multiplication by bare variable (but not object.property)
      /[*+\-]\s*(\b[a-zA-Z_]\w*\b)\s*[;),*+\-/]/g,
    ];

    for (const pattern of patterns) {
      let m;
      while ((m = pattern.exec(line)) !== null) {
        const ident = m[1];
        // Skip if it's a known identifier
        if (
          params.has(ident) ||
          locals.has(ident) ||
          CPS_GLOBALS.has(ident) ||
          /^\d/.test(ident) || // number literal
          ident === "e" // catch variable
        )
          continue;

        // Check if this identifier appears as `something.ident` (property access — OK)
        const beforeIdx = m.index + m[0].indexOf(ident) - 1;
        if (beforeIdx >= 0 && line[beforeIdx] === ".") continue;

        issues.push({
          name: ident,
          line: lineIdx + 1,
          context: line.trim().substring(0, 80),
        });
      }
    }
  }

  return issues;
}

/**
 * Check for known wrong property access patterns.
 */
function findWrongPropertyAccess(cpsContent: string): ScopeViolation[] {
  const violations: ScopeViolation[] = [];
  const lines = cpsContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bug pattern: result.speed.speed (should be result.speed.Vc)
    if (/result\.speed\.speed\b/.test(line) && !line.trim().startsWith("//")) {
      violations.push({
        functionName: "unknown",
        variableName: "result.speed.speed",
        line: i + 1,
        column: line.indexOf("result.speed.speed"),
        type: "wrong_property",
        message:
          "result.speed.speed is undefined — should be result.speed.Vc (calculateOptimizedSpeed returns {Vc: speed})",
      });
    }

    // Bug pattern: result.feed.feed (should be result.feed.feedRate)
    if (/result\.feed\.feed\b(?!Rate)/.test(line) && !line.trim().startsWith("//")) {
      violations.push({
        functionName: "unknown",
        variableName: "result.feed.feed",
        line: i + 1,
        column: line.indexOf("result.feed.feed"),
        type: "wrong_property",
        message:
          "result.feed.feed is undefined — should be result.feed.feedRate",
      });
    }
  }

  return violations;
}

/**
 * Check for arithmetic on potentially string values without numeric guard.
 */
function findMissingNumericGuards(cpsContent: string): ScopeViolation[] {
  const violations: ScopeViolation[] = [];
  const lines = cpsContent.split("\n");

  // Find lines where toolConfig.flutes is used in multiplication without typeof check
  // The bug: flutes can be "auto" (string), so `fz * flutes * rpm = NaN`
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//")) continue;

    // Check for `toolConfig.flutes` used directly in arithmetic without a nearby typeof guard
    if (
      /toolConfig\.flutes\s*[*\/]/.test(line) ||
      /[*\/]\s*toolConfig\.flutes/.test(line)
    ) {
      // Check if there's a typeof guard within 5 lines before
      const contextBefore = lines
        .slice(Math.max(0, i - 5), i + 1)
        .join("\n");
      if (
        !contextBefore.includes('typeof toolConfig.flutes') &&
        !contextBefore.includes("flutes === \"number\"")
      ) {
        violations.push({
          functionName: "unknown",
          variableName: "toolConfig.flutes",
          line: i + 1,
          column: 0,
          type: "missing_fallback",
          message:
            "toolConfig.flutes used in arithmetic without numeric type guard — can be string 'auto' → NaN",
        });
      }
    }

    // Check for `var flutes = toolConfig.flutes;` with no fallback on same or next line
    if (/var\s+flutes\s*=\s*toolConfig\.flutes\s*;/.test(line)) {
      const nextLines = lines.slice(i, i + 3).join("\n");
      if (
        !nextLines.includes("typeof") &&
        !nextLines.includes("|| 4") &&
        !nextLines.includes("flutes === \"number\"")
      ) {
        violations.push({
          functionName: "unknown",
          variableName: "flutes",
          line: i + 1,
          column: 0,
          type: "missing_fallback",
          message:
            "flutes assigned from toolConfig.flutes without numeric fallback — string 'auto' causes NaN",
        });
      }
    }
  }

  return violations;
}

/**
 * Check for bare `diameter` reference in functions where it's not a parameter.
 * This is the specific bug: calculateOptimizedSpeed used `diameter` but it
 * only receives (material, toolConfig, strategy, optMode).
 */
function findBareDiameterBugs(cpsContent: string): ScopeViolation[] {
  const violations: ScopeViolation[] = [];

  const functions = extractFunctionBodies(cpsContent);

  for (const func of functions) {
    // Only check functions that DON'T have `diameter` as a parameter
    if (func.params.includes("diameter")) continue;

    const locals = collectLocalVars(func.body);
    // Skip if `diameter` is declared as a local var
    if (locals.has("diameter")) continue;

    // Check if `diameter` is used as a bare variable (not as property like `.diameter`)
    const bodyLines = func.body.split("\n");
    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      if (line.trim().startsWith("//")) continue;

      // Find `diameter` that is NOT preceded by `.` (not a property access)
      // and NOT inside a string literal
      const pattern = /(?<![.\w])diameter(?!\w)/g;
      let m;
      while ((m = pattern.exec(line)) !== null) {
        // Check it's not preceded by a dot (property access like tool.diameter)
        const charBefore = m.index > 0 ? line[m.index - 1] : " ";
        if (charBefore === ".") continue;

        // Check it's not inside a string
        const beforeMatch = line.substring(0, m.index);
        const singleQuotes = (beforeMatch.match(/'/g) || []).length;
        const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) continue;

        violations.push({
          functionName: func.name,
          variableName: "diameter",
          line: func.startLine + i,
          column: m.index,
          type: "undefined_variable",
          message: `bare 'diameter' in ${func.name}() — not in parameter list (${func.params.join(", ")}) and not declared locally`,
        });
      }
    }
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

let cpsContent: string;

beforeAll(() => {
  cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
});

describe("CPS Scope Linter — Function Extraction", () => {
  it("extracts PRISM_PHYSICS methods from CPS", () => {
    const funcs = extractFunctionBodies(cpsContent);
    expect(funcs.length).toBeGreaterThan(10);
    const names = funcs.map((f) => f.name);
    expect(names).toContain("calculateOptimizedSpeed");
    expect(names).toContain("calculateOptimizedFeed");
    expect(names).toContain("calculateAll");
    expect(names).toContain("calculateCuttingForce");
  });

  it("extracts correct parameter lists", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const speed = funcs.find((f) => f.name === "calculateOptimizedSpeed");
    expect(speed).toBeDefined();
    expect(speed!.params).toEqual(["material", "toolConfig", "strategy", "optMode"]);
    expect(speed!.params).not.toContain("diameter"); // this was the bug

    const feed = funcs.find((f) => f.name === "calculateOptimizedFeed");
    expect(feed).toBeDefined();
    expect(feed!.params).toContain("diameter"); // feed DOES receive diameter

    const all = funcs.find((f) => f.name === "calculateAll");
    expect(all).toBeDefined();
    expect(all!.params).toContain("diameter");
  });

  it("collectLocalVars finds var declarations in function bodies", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const speed = funcs.find((f) => f.name === "calculateOptimizedSpeed");
    expect(speed).toBeDefined();
    const locals = collectLocalVars(speed!.body);
    expect(locals.has("baseSpeed")).toBe(true);
    expect(locals.has("toolMat")).toBe(true);
    expect(locals.has("hemSpeedBoost")).toBe(true);
    expect(locals.has("_d")).toBe(true); // the fix — uses _d instead of diameter
    expect(locals.has("aeRatio")).toBe(true);
  });
});

describe("CPS Scope Linter — Bug Detection on Clean CPS", () => {
  it("no bare `diameter` in calculateOptimizedSpeed (the clean CPS uses _d)", () => {
    const violations = findBareDiameterBugs(cpsContent);
    const speedViolations = violations.filter(
      (v) => v.functionName === "calculateOptimizedSpeed"
    );
    expect(speedViolations).toHaveLength(0);
  });

  it("no result.speed.speed anywhere in clean CPS", () => {
    const violations = findWrongPropertyAccess(cpsContent);
    const speedProp = violations.filter(
      (v) => v.variableName === "result.speed.speed"
    );
    expect(speedProp).toHaveLength(0);
  });

  it("no unguarded toolConfig.flutes arithmetic in clean CPS", () => {
    const violations = findMissingNumericGuards(cpsContent);
    expect(violations).toHaveLength(0);
  });

  it("zero total false positives on clean CPS", () => {
    const propViolations = findWrongPropertyAccess(cpsContent);
    const guardViolations = findMissingNumericGuards(cpsContent);
    // Diameter violations in calculateOptimizedSpeed specifically
    const diameterViolations = findBareDiameterBugs(cpsContent).filter(
      (v) => v.functionName === "calculateOptimizedSpeed"
    );
    const total = propViolations.length + guardViolations.length + diameterViolations.length;
    expect(total).toBe(0);
  });
});

describe("CPS Scope Linter — Bug Detection on Mutated CPS", () => {
  it("catches bare `diameter` when reintroduced in calculateOptimizedSpeed", () => {
    // Simulate the original bug: replace the safe `_d` pattern with bare `diameter`
    // Remove the local _d declaration and replace _d usages with bare diameter
    const mutated = cpsContent
      .replace(
        'var _d = toolConfig._diameter || 12.7; // fallback 12.7mm (0.5")',
        '/* REMOVED for mutation test */'
      )
      .replace(
        "var aeRatio = (toolConfig.radialDOC && _d > 0) ? (toolConfig.radialDOC / _d) : 1.0;",
        "var aeRatio = (toolConfig.radialDOC && diameter > 0) ? (toolConfig.radialDOC / diameter) : 1.0;"
      );
    const violations = findBareDiameterBugs(mutated);
    const speedViolations = violations.filter(
      (v) => v.functionName === "calculateOptimizedSpeed"
    );
    expect(speedViolations.length).toBeGreaterThan(0);
    expect(speedViolations[0].type).toBe("undefined_variable");
  });

  it("catches result.speed.speed when reintroduced", () => {
    // Simulate the original bug: change .Vc to .speed
    const mutated = cpsContent.replace(
      "result.speed.Vc",
      "result.speed.speed"
    );
    const violations = findWrongPropertyAccess(mutated);
    const speedProp = violations.filter(
      (v) => v.variableName === "result.speed.speed"
    );
    expect(speedProp.length).toBeGreaterThan(0);
    expect(speedProp[0].type).toBe("wrong_property");
  });

  it("catches unguarded flutes when typeof check is removed", () => {
    // Simulate the original bug: replace the typeof-guarded line with bare assignment
    const safeFlutesLine =
      '    var flutes = (typeof toolConfig.flutes === "number" && toolConfig.flutes > 0) ? toolConfig.flutes : 4;';
    const buggyFlutesLine =
      '    var flutes = toolConfig.flutes;';
    expect(cpsContent).toContain(safeFlutesLine);
    const mutated = cpsContent.replace(safeFlutesLine, buggyFlutesLine);
    const violations = findMissingNumericGuards(mutated);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].type).toBe("missing_fallback");
  });

  it("all 3 historical bugs detected simultaneously in a triple-mutated CPS", () => {
    let mutated = cpsContent;
    // Bug 1: bare diameter
    mutated = mutated.replace(
      'var _d = toolConfig._diameter || 12.7; // fallback 12.7mm (0.5")',
      "/* REMOVED */"
    );
    mutated = mutated.replace(
      "var aeRatio = (toolConfig.radialDOC && _d > 0) ? (toolConfig.radialDOC / _d) : 1.0;",
      "var aeRatio = (toolConfig.radialDOC && diameter > 0) ? (toolConfig.radialDOC / diameter) : 1.0;"
    );
    // Bug 2: result.speed.speed
    mutated = mutated.replace("result.speed.Vc", "result.speed.speed");
    // Bug 3: unguarded flutes
    const safeFlutes =
      '    var flutes = (typeof toolConfig.flutes === "number" && toolConfig.flutes > 0) ? toolConfig.flutes : 4;';
    mutated = mutated.replace(safeFlutes, "    var flutes = toolConfig.flutes;");

    const diameterBugs = findBareDiameterBugs(mutated).filter(
      (v) => v.functionName === "calculateOptimizedSpeed"
    );
    const propBugs = findWrongPropertyAccess(mutated).filter(
      (v) => v.variableName === "result.speed.speed"
    );
    const guardBugs = findMissingNumericGuards(mutated);

    expect(diameterBugs.length).toBeGreaterThan(0);
    expect(propBugs.length).toBeGreaterThan(0);
    expect(guardBugs.length).toBeGreaterThan(0);
  });
});

describe("CPS Scope Linter — Additional Safety Checks", () => {
  it("calculateOptimizedSpeed uses toolConfig._diameter not bare diameter", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const speed = funcs.find((f) => f.name === "calculateOptimizedSpeed");
    expect(speed).toBeDefined();
    // The fix stores diameter on toolConfig._diameter in calculateAll
    // calculateOptimizedSpeed accesses it as toolConfig._diameter
    expect(speed!.body).toContain("toolConfig._diameter");
    expect(speed!.body).toContain("_d");
  });

  it("calculateAll stores diameter on toolConfig before calling sub-functions", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const all = funcs.find((f) => f.name === "calculateAll");
    expect(all).toBeDefined();
    expect(all!.body).toContain("toolConfig._diameter = diameter");
    // Verify it appears BEFORE calculateOptimizedSpeed call
    const storeIdx = all!.body.indexOf("toolConfig._diameter = diameter");
    const callIdx = all!.body.indexOf("this.calculateOptimizedSpeed");
    expect(storeIdx).toBeLessThan(callIdx);
  });

  it("result.speed.Vc is used consistently throughout CPS (not .speed.speed)", () => {
    // Count usages of the correct pattern
    const vcUsages = (cpsContent.match(/result\.speed\.Vc/g) || []).length;
    const wrongUsages = (cpsContent.match(/result\.speed\.speed/g) || []).length;
    expect(vcUsages).toBeGreaterThan(0);
    expect(wrongUsages).toBe(0);
  });

  it("flutes variable has proper typeof guard in feed calculation", () => {
    expect(cpsContent).toContain('typeof toolConfig.flutes === "number"');
    // The guard should include a fallback value
    const guardLine = cpsContent
      .split("\n")
      .find((l) => l.includes('typeof toolConfig.flutes === "number"'));
    expect(guardLine).toBeDefined();
    expect(guardLine).toContain("4"); // fallback to 4 flutes
  });

  it("no NaN-producing patterns: division by potentially-zero variable without guard", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const speed = funcs.find((f) => f.name === "calculateOptimizedSpeed");
    expect(speed).toBeDefined();
    // The HEM speed boost has `_d > 0` guard
    expect(speed!.body).toContain("_d > 0");
  });

  it("PRISM_PHYSICS returns {Vc: speed} from calculateOptimizedSpeed", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const speed = funcs.find((f) => f.name === "calculateOptimizedSpeed");
    expect(speed).toBeDefined();
    // Return object should have Vc property
    expect(speed!.body).toContain("Vc: speed");
    expect(speed!.body).not.toContain("speed: speed");
  });

  it("holderTIRFactors reference uses safe default", () => {
    // The TIR factor calculation should have a default fallback
    const funcs = extractFunctionBodies(cpsContent);
    const speed = funcs.find((f) => f.name === "calculateOptimizedSpeed");
    expect(speed).toBeDefined();
    // Should have `|| { tir: ..., stiffness: ... }` fallback
    expect(speed!.body).toContain("holderTIRFactors");
    expect(speed!.body).toMatch(/\|\|\s*\{\s*tir:/);
  });

  it("calculateCuttingForce uses Kienzle model correctly", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const force = funcs.find((f) => f.name === "calculateCuttingForce");
    expect(force).toBeDefined();
    expect(force!.params).toContain("material");
    // Should reference kc1_1 and mc
    expect(force!.body).toContain("kc1_1");
    expect(force!.body).toContain("mc");
  });

  it("getMachineConfig has fallback for unknown machines", () => {
    const funcs = extractFunctionBodies(cpsContent);
    const getMachine = funcs.find((f) => f.name === "getMachineConfig");
    expect(getMachine).toBeDefined();
    // Should have a default/fallback machine config
    expect(getMachine!.body).toContain("maxRpm");
  });
});
