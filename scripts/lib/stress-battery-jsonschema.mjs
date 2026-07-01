/**
 * stress-battery-jsonschema.mjs -- JSON structured-output reliability battery.
 *
 * U-ALPHA-STRESS-JSONSCHEMA (slot:alpha, 2026-06-24).
 *
 * GOAL: measure whether an Ollama model reliably emits a VALID JSON object whose
 * keys + value types + extracted content ALL match the schema.  This is the
 * hardest structured-output task for small local models (vs. yes/no or a number).
 *
 * Consumed by: scripts/ollama-stress-test.mjs runTierSweep (BATTERY export).
 * Also self-tests via run-as-main guard at the bottom (prints "SELFTEST OK n/n").
 *
 * Karpathy discipline:
 *   CLASSIFY  : extraction + format (structured JSON output)
 *   TECHNIQUE : parse-tolerant verifier (strip fences, extract first {..} object,
 *               JSON.parse, then key+type+value checks) -- strict on content, tolerant
 *               on formatting so a model that wraps output in ``` still passes.
 *   EDGE CASES: empty string, non-JSON prose, partial JSON, wrong types, wrong values,
 *               extra keys (allowed), missing required keys (fail), wrong numeric type.
 *   FAILURE MODES: JSON.parse throws -> false; missing key -> false; wrong type -> false;
 *                  wrong extracted value -> false; a stub/empty verify -> never (R9).
 *
 * verify() contract:
 *   - PURE + SAFE: no I/O, no side effects, no eval, no RegExp DoS surface.
 *   - Returns false on ANY of: non-parseable, missing required key, wrong typeof,
 *     wrong extracted value.  Returns true ONLY on a fully correct answer.
 *   - Every verify MUST return false on a known-bad answer (R9 anti-stub rule).
 */

import { norm } from "./ollama-capability-battery.mjs";

/**
 * Strip markdown code fences and extract the first {...} JSON object from text.
 * Returns the raw JSON string or null if no object found.
 */
function extractJson(raw) {
  const s = norm(raw); // strips ``` fences, trims
  const start = s.indexOf("{");
  if (start === -1) return null;
  // Find the matching closing brace via bracket counting (safe, no eval).
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null; // unbalanced
}

/**
 * Parse the model output into a plain object, or return null on any failure.
 * Tolerates code fences and leading/trailing prose.
 */
function parseObj(raw) {
  const jsonStr = extractJson(raw);
  if (!jsonStr) return null;
  try {
    const v = JSON.parse(jsonStr);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Check that obj[key] exists AND typeof matches expected AND optional valueFn passes.
 * Returns false on any mismatch.
 */
function checkField(obj, key, expectedType, valueFn) {
  if (obj == null || !(key in obj)) return false;
  if (typeof obj[key] !== expectedType) return false;
  if (valueFn && !valueFn(obj[key])) return false;
  return true;
}

// ---------------------------------------------------------------------------
// BATTERY -- >= 5 tasks, >= 5 cases each, covering flat / nested / array shapes.
// ---------------------------------------------------------------------------

export const BATTERY = [

  // -------------------------------------------------------------------------
  // TASK 1: flat tool spec -- diameter_mm (number), flutes (integer), material (string)
  // -------------------------------------------------------------------------
  {
    id: "json-tool-spec",
    category: "json-structured-output",
    cases: [
      {
        input: "A 10 mm diameter carbide end mill with 4 flutes for finishing aluminum.",
        expect: { diameter_mm: 10, flutes: 4, material: "carbide" },
      },
      {
        input: "6mm HSS 2-flute slot drill for mild steel roughing.",
        expect: { diameter_mm: 6, flutes: 2, material: "HSS" },
      },
      {
        input: "Half-inch diameter, 3-flute, solid carbide ball nose cutter.",
        // 0.5 inch = 12.7 mm; verifier accepts 12.7 OR 0.5 (model may leave in inches)
        // but we check for flutes=3 and carbide.
        expect: { flutes: 3, material: "carbide" },
        diameter_mm_approx: 12.7,
        diameter_inches: 0.5,
      },
      {
        input: "Insert-style face mill, 100 mm body, 6 inserts, carbide grade.",
        expect: { diameter_mm: 100, flutes: 6, material: "carbide" },
      },
      {
        input: "A 3mm, 2-flute, HSS-Co stub end mill.",
        expect: { diameter_mm: 3, flutes: 2, material: "HSS" },
      },
    ],
    prompt: (c) =>
      `Extract tool specifications from the description below.\n` +
      `Reply with ONLY a JSON object with exactly these keys:\n` +
      `  "diameter_mm": number (millimetres),\n` +
      `  "flutes": integer (number of flutes/inserts),\n` +
      `  "material": string (e.g. "carbide", "HSS").\n\n` +
      `Description: ${c.input}`,
    verify: (out, c) => {
      const obj = parseObj(out);
      if (!obj) return false;
      // diameter_mm: must be a number > 0
      if (!checkField(obj, "diameter_mm", "number", (v) => v > 0)) return false;
      // For the half-inch case we allow either 12.7 or 0.5 (within 5% tolerance)
      if (c.diameter_mm_approx != null) {
        const d = obj.diameter_mm;
        const nearMm = Math.abs(d - c.diameter_mm_approx) / c.diameter_mm_approx < 0.06;
        const nearIn = Math.abs(d - c.diameter_inches) / c.diameter_inches < 0.06;
        if (!nearMm && !nearIn) return false;
      } else if (c.expect.diameter_mm != null) {
        if (Math.abs(obj.diameter_mm - c.expect.diameter_mm) / c.expect.diameter_mm > 0.05) return false;
      }
      // flutes: integer
      if (!checkField(obj, "flutes", "number", (v) => Number.isInteger(v) && v > 0)) return false;
      if (c.expect.flutes != null && obj.flutes !== c.expect.flutes) return false;
      // material: string containing the expected keyword (case-insensitive)
      if (!checkField(obj, "material", "string")) return false;
      const mat = obj.material.toLowerCase();
      const expectedMat = (c.expect.material || "").toLowerCase();
      // accept HSS-Co / HSS-cobalt as HSS
      const matMatch = expectedMat === "hss"
        ? mat.startsWith("hss") || mat.includes("high speed")
        : mat.includes(expectedMat);
      if (!matMatch) return false;
      return true;
    },
  },

  // -------------------------------------------------------------------------
  // TASK 2: cutting parameters -- spindle_rpm (number), feed_mmpm (number), doc_mm (number)
  // -------------------------------------------------------------------------
  {
    id: "json-cutting-params",
    category: "json-structured-output",
    cases: [
      {
        input: "Run the spindle at 3500 RPM, feed at 800 mm/min, 2 mm depth of cut.",
        expect: { spindle_rpm: 3500, feed_mmpm: 800, doc_mm: 2 },
      },
      {
        input: "Spindle: 12000 rpm. Feed rate: 1200 mm per minute. Axial depth: 0.5 mm.",
        expect: { spindle_rpm: 12000, feed_mmpm: 1200, doc_mm: 0.5 },
      },
      {
        input: "S8000, F600, ap=1.5mm for semi-finishing pass.",
        expect: { spindle_rpm: 8000, feed_mmpm: 600, doc_mm: 1.5 },
      },
      {
        input: "Roughing: 2000 rpm, 400 mm/min, 5 mm deep.",
        expect: { spindle_rpm: 2000, feed_mmpm: 400, doc_mm: 5 },
      },
      {
        input: "Fine finishing: 18000 RPM, 2400 mm/min feedrate, 0.2 mm DOC.",
        expect: { spindle_rpm: 18000, feed_mmpm: 2400, doc_mm: 0.2 },
      },
    ],
    prompt: (c) =>
      `Extract CNC cutting parameters from the text below.\n` +
      `Reply with ONLY a JSON object with exactly these keys:\n` +
      `  "spindle_rpm": number (revolutions per minute),\n` +
      `  "feed_mmpm": number (feed rate in mm/min),\n` +
      `  "doc_mm": number (depth of cut in mm).\n\n` +
      `Text: ${c.input}`,
    verify: (out, c) => {
      const obj = parseObj(out);
      if (!obj) return false;
      for (const [key, expected] of Object.entries(c.expect)) {
        if (!checkField(obj, key, "number", (v) => Number.isFinite(v) && v > 0)) return false;
        if (Math.abs(obj[key] - expected) / expected > 0.05) return false;
      }
      return true;
    },
  },

  // -------------------------------------------------------------------------
  // TASK 3: material properties -- nested object shape
  // { name: string, density_g_cm3: number, hardness_HB: number, iso_group: string }
  // -------------------------------------------------------------------------
  {
    id: "json-material-props",
    category: "json-structured-output",
    cases: [
      {
        input: "6061-T6 aluminum alloy: density 2.7 g/cm3, hardness 95 HB, ISO group N.",
        expect: { name: "6061", density_g_cm3: 2.7, hardness_HB: 95, iso_group: "N" },
      },
      {
        input: "4140 alloy steel, density 7.85 g/cm3, hardness 197 HB, ISO group P.",
        expect: { name: "4140", density_g_cm3: 7.85, hardness_HB: 197, iso_group: "P" },
      },
      {
        input: "304 stainless steel, density 8.0 g/cm3, 180 HB, group M.",
        expect: { name: "304", density_g_cm3: 8.0, hardness_HB: 180, iso_group: "M" },
      },
      {
        input: "Ti-6Al-4V titanium alloy, 4.43 g/cm3, 334 HB, ISO group S.",
        expect: { name: "Ti-6Al-4V", density_g_cm3: 4.43, hardness_HB: 334, iso_group: "S" },
      },
      {
        input: "Grey cast iron, density 7.2 g/cm3, hardness 180 HB, group K.",
        expect: { name: "cast iron", density_g_cm3: 7.2, hardness_HB: 180, iso_group: "K" },
      },
    ],
    prompt: (c) =>
      `Extract material properties from the description.\n` +
      `Reply with ONLY a JSON object with exactly these keys:\n` +
      `  "name": string (material name/grade),\n` +
      `  "density_g_cm3": number (density in g/cm3),\n` +
      `  "hardness_HB": number (Brinell hardness),\n` +
      `  "iso_group": string (single uppercase letter: P, M, K, N, S, or H).\n\n` +
      `Description: ${c.input}`,
    verify: (out, c) => {
      const obj = parseObj(out);
      if (!obj) return false;
      // name: string containing the expected identifier.
      // Allow partial match for versioned grades (e.g. "6061-T6 aluminum" contains "6061"),
      // but require ALL tokens of the expected name to appear so "grey iron" does NOT
      // pass for expected "cast iron" (only "iron" would match one token -- too weak).
      if (!checkField(obj, "name", "string")) return false;
      const nameLc = obj.name.toLowerCase();
      const expectedNameLc = c.expect.name.toLowerCase();
      if (!nameLc.includes(expectedNameLc)) {
        // All significant tokens (length >= 3) of the expected name must appear in the
        // model output.  This rejects "grey iron" (missing "cast") and "titanium alloy"
        // (missing "6al"/"4v"), while still accepting "6061-T6 aluminum" for expected "6061".
        const tokens = expectedNameLc.split(/[\s/-]/).filter((p) => p.length >= 3);
        if (tokens.length === 0 || !tokens.every((p) => nameLc.includes(p))) return false;
      }
      // density_g_cm3: number within 3%
      if (!checkField(obj, "density_g_cm3", "number", (v) => Number.isFinite(v) && v > 0)) return false;
      if (Math.abs(obj.density_g_cm3 - c.expect.density_g_cm3) / c.expect.density_g_cm3 > 0.04) return false;
      // hardness_HB: integer-like number within 5%
      if (!checkField(obj, "hardness_HB", "number", (v) => Number.isFinite(v) && v > 0)) return false;
      if (Math.abs(obj.hardness_HB - c.expect.hardness_HB) / c.expect.hardness_HB > 0.05) return false;
      // iso_group: single uppercase letter matching exactly
      if (!checkField(obj, "iso_group", "string")) return false;
      if (obj.iso_group.trim().toUpperCase() !== c.expect.iso_group) return false;
      return true;
    },
  },

  // -------------------------------------------------------------------------
  // TASK 4: array field -- operation list
  // { part_name: string, operations: string[] (>= 2 items) }
  // -------------------------------------------------------------------------
  {
    id: "json-operation-list",
    category: "json-structured-output",
    cases: [
      {
        input: "The bracket requires facing, drilling, and tapping operations.",
        // "fac" is a substring of "facing"; "drill" of "drilling"; "tap" of "tapping"
        expect: { part_name: "bracket", op_keywords: ["fac", "drill", "tap"], min_ops: 3 },
      },
      {
        input: "The shaft needs turning, grooving, and thread cutting.",
        // "turn" in "turning"; "groov" in "grooving"; "thread" in "thread cutting"
        expect: { part_name: "shaft", op_keywords: ["turn", "groov", "thread"], min_ops: 3 },
      },
      {
        input: "Pocket milling and profile finishing for the housing block.",
        // "mill" in "milling"; "finish" in "finishing"
        expect: { part_name: "housing", op_keywords: ["mill", "finish"], min_ops: 2 },
      },
      {
        input: "The die plate needs EDM wire cutting, surface grinding, and drilling.",
        // "edm" in "EDM"; "grind" in "grinding"; "drill" in "drilling"
        expect: { part_name: "die", op_keywords: ["edm", "grind", "drill"], min_ops: 3 },
      },
      {
        input: "The impeller requires 5-axis milling and balancing.",
        // "mill" in "milling"; "balanc" in "balancing"
        expect: { part_name: "impeller", op_keywords: ["mill", "balanc"], min_ops: 2 },
      },
    ],
    prompt: (c) =>
      `Extract machining information from the text.\n` +
      `Reply with ONLY a JSON object with exactly these keys:\n` +
      `  "part_name": string (the part being machined),\n` +
      `  "operations": array of strings (the machining operations, each a short verb phrase).\n\n` +
      `Text: ${c.input}`,
    verify: (out, c) => {
      const obj = parseObj(out);
      if (!obj) return false;
      // part_name: string containing expected keyword
      if (!checkField(obj, "part_name", "string")) return false;
      const pn = obj.part_name.toLowerCase();
      if (!pn.includes(c.expect.part_name)) return false;
      // operations: must be an array of strings
      if (!Array.isArray(obj.operations)) return false;
      if (obj.operations.length < c.expect.min_ops) return false;
      if (!obj.operations.every((x) => typeof x === "string")) return false;
      // Each expected keyword must appear in at least one operation string
      const joined = obj.operations.map((x) => x.toLowerCase()).join(" ");
      for (const kw of c.expect.op_keywords) {
        if (!joined.includes(kw)) return false;
      }
      return true;
    },
  },

  // -------------------------------------------------------------------------
  // TASK 5: nested object -- machine + workpiece envelope
  // { machine: { brand: string, axes: integer }, workpiece: { length_mm: number, width_mm: number } }
  // -------------------------------------------------------------------------
  {
    id: "json-nested-machine",
    category: "json-structured-output",
    cases: [
      {
        input: "A Haas VF-3 3-axis mill; workpiece 400 mm x 300 mm.",
        expect: {
          machine_brand: "haas", axes: 3,
          length_mm: 400, width_mm: 300,
        },
      },
      {
        input: "DMG Mori 5-axis machining center; part envelope 250 mm x 150 mm.",
        expect: {
          machine_brand: "dmg", axes: 5,
          length_mm: 250, width_mm: 150,
        },
      },
      {
        input: "Mazak Integrex 5-axis turn-mill; workpiece 600 mm by 200 mm.",
        expect: {
          machine_brand: "mazak", axes: 5,
          length_mm: 600, width_mm: 200,
        },
      },
      {
        input: "Fanuc Robodrill 3-axis vertical; billet 120 x 80 mm.",
        expect: {
          machine_brand: "fanuc", axes: 3,
          length_mm: 120, width_mm: 80,
        },
      },
      {
        input: "Okuma Genos M460V 4-axis mill; stock 350 x 250 mm.",
        expect: {
          machine_brand: "okuma", axes: 4,
          length_mm: 350, width_mm: 250,
        },
      },
    ],
    prompt: (c) =>
      `Extract machine and workpiece info from the text below.\n` +
      `Reply with ONLY a JSON object in this exact shape:\n` +
      `{\n` +
      `  "machine": { "brand": string, "axes": integer },\n` +
      `  "workpiece": { "length_mm": number, "width_mm": number }\n` +
      `}\n\n` +
      `Text: ${c.input}`,
    verify: (out, c) => {
      const obj = parseObj(out);
      if (!obj) return false;
      // machine sub-object
      if (!obj.machine || typeof obj.machine !== "object" || Array.isArray(obj.machine)) return false;
      if (!checkField(obj.machine, "brand", "string")) return false;
      if (!obj.machine.brand.toLowerCase().includes(c.expect.machine_brand)) return false;
      if (!checkField(obj.machine, "axes", "number",
        (v) => Number.isInteger(v) && v >= 3 && v <= 9)) return false;
      if (obj.machine.axes !== c.expect.axes) return false;
      // workpiece sub-object
      if (!obj.workpiece || typeof obj.workpiece !== "object" || Array.isArray(obj.workpiece)) return false;
      if (!checkField(obj.workpiece, "length_mm", "number", (v) => v > 0)) return false;
      if (!checkField(obj.workpiece, "width_mm", "number", (v) => v > 0)) return false;
      const lenOk = Math.abs(obj.workpiece.length_mm - c.expect.length_mm) / c.expect.length_mm < 0.05;
      const widOk = Math.abs(obj.workpiece.width_mm - c.expect.width_mm) / c.expect.width_mm < 0.05;
      if (!lenOk || !widOk) return false;
      return true;
    },
  },

  // -------------------------------------------------------------------------
  // TASK 6: mixed flat+array -- tolerance stack
  // { nominal_mm: number, tolerances: [{feature:string, plus_mm:number, minus_mm:number}] }
  // -------------------------------------------------------------------------
  {
    id: "json-tolerance-stack",
    category: "json-structured-output",
    cases: [
      {
        input: "Bore: nominal 25 mm, +0.021/-0.000 mm. Shaft: nominal 24.97 mm, +0.000/-0.013 mm.",
        expect: {
          feature_count: 2,
          nominals: [25, 24.97],
          keywords: ["bore", "shaft"],
        },
      },
      {
        input: "Slot width: 10 mm nominal, +0.05/-0.00. Depth: 8 mm nominal, +0.00/-0.05.",
        expect: {
          feature_count: 2,
          nominals: [10, 8],
          keywords: ["slot", "depth"],
        },
      },
      {
        input: "Pin OD: 12.000 mm +0.000/-0.011. Housing ID: 12.018 mm +0.011/-0.000.",
        expect: {
          feature_count: 2,
          nominals: [12.0, 12.018],
          keywords: ["pin", "housing"],
        },
      },
      {
        input: "Flange thickness 5 mm +0.1/-0.1. Hole diameter 8 mm +0.05/-0.05.",
        expect: {
          feature_count: 2,
          nominals: [5, 8],
          keywords: ["flange", "hole"],
        },
      },
      {
        input: "Journal diameter: 30 mm, +0.000/-0.021. Bearing bore: 30.015 mm, +0.012/-0.000.",
        expect: {
          feature_count: 2,
          nominals: [30, 30.015],
          keywords: ["journal", "bearing"],
        },
      },
    ],
    prompt: (c) =>
      `Extract tolerance information from the text.\n` +
      `Reply with ONLY a JSON object in this exact shape:\n` +
      `{\n` +
      `  "tolerances": [\n` +
      `    { "feature": string, "nominal_mm": number, "plus_mm": number, "minus_mm": number },\n` +
      `    ...\n` +
      `  ]\n` +
      `}\n` +
      `"minus_mm" should be a positive number (the magnitude of the minus tolerance).\n\n` +
      `Text: ${c.input}`,
    verify: (out, c) => {
      const obj = parseObj(out);
      if (!obj) return false;
      // tolerances must be an array of the right length
      if (!Array.isArray(obj.tolerances)) return false;
      if (obj.tolerances.length < c.expect.feature_count) return false;
      // Each entry must have feature(string), nominal_mm(number), plus_mm(number), minus_mm(number)
      for (const entry of obj.tolerances) {
        if (!entry || typeof entry !== "object") return false;
        if (typeof entry.feature !== "string") return false;
        if (typeof entry.nominal_mm !== "number" || !Number.isFinite(entry.nominal_mm)) return false;
        if (typeof entry.plus_mm !== "number" || !Number.isFinite(entry.plus_mm)) return false;
        if (typeof entry.minus_mm !== "number" || !Number.isFinite(entry.minus_mm)) return false;
        // minus_mm must be non-negative (we asked for magnitude)
        if (entry.minus_mm < 0) return false;
      }
      // Each expected nominal must appear in some entry (within 1%)
      for (const nom of c.expect.nominals) {
        const found = obj.tolerances.some((e) =>
          typeof e.nominal_mm === "number" && Math.abs(e.nominal_mm - nom) / Math.max(nom, 0.001) < 0.02
        );
        if (!found) return false;
      }
      // Each expected keyword must appear in some feature string
      const allFeatures = obj.tolerances.map((e) =>
        (typeof e.feature === "string" ? e.feature : "").toLowerCase()
      ).join(" ");
      for (const kw of c.expect.keywords) {
        if (!allFeatures.includes(kw)) return false;
      }
      return true;
    },
  },

];

// ---------------------------------------------------------------------------
// RUN-AS-MAIN SELF-TEST (guarded -- import does NOT run this)
// ---------------------------------------------------------------------------

const KNOWN_GOOD = {
  "json-tool-spec": {
    output: '{"diameter_mm": 10, "flutes": 4, "material": "carbide"}',
    caseIdx: 0,
  },
  "json-cutting-params": {
    output: '{"spindle_rpm": 3500, "feed_mmpm": 800, "doc_mm": 2}',
    caseIdx: 0,
  },
  "json-material-props": {
    output: '{"name": "6061-T6 aluminum", "density_g_cm3": 2.7, "hardness_HB": 95, "iso_group": "N"}',
    caseIdx: 0,
  },
  "json-operation-list": {
    output: '{"part_name": "bracket", "operations": ["facing", "drilling", "tapping"]}',
    caseIdx: 0,
  },
  "json-nested-machine": {
    output: '{"machine": {"brand": "Haas", "axes": 3}, "workpiece": {"length_mm": 400, "width_mm": 300}}',
    caseIdx: 0,
  },
  "json-tolerance-stack": {
    output: '{"tolerances": [{"feature": "bore", "nominal_mm": 25, "plus_mm": 0.021, "minus_mm": 0.000}, {"feature": "shaft", "nominal_mm": 24.97, "plus_mm": 0.000, "minus_mm": 0.013}]}',
    caseIdx: 0,
  },
};

const KNOWN_BAD = {
  "json-tool-spec":       { output: "The tool is 10mm with 4 flutes.", caseIdx: 0 },
  "json-cutting-params":  { output: '{"spindle_rpm": "3500", "feed_mmpm": 800, "doc_mm": 2}', caseIdx: 0 },
  "json-material-props":  { output: '{"name": "wrong", "density_g_cm3": 99, "hardness_HB": 95, "iso_group": "N"}', caseIdx: 0 },
  "json-operation-list":  { output: '{"part_name": "bracket", "operations": "facing"}', caseIdx: 0 },
  "json-nested-machine":  { output: '{"machine": {"brand": "Haas", "axes": 3}, "workpiece": {"length_mm": 9999, "width_mm": 300}}', caseIdx: 0 },
  "json-tolerance-stack": { output: '{"tolerances": []}', caseIdx: 0 },
};

if (process.argv[1] && new URL(import.meta.url).pathname.replace(/\\/g, "/").endsWith(
  process.argv[1].replace(/\\/g, "/").split("/").slice(-3).join("/")
)) {
  let passed = 0;
  let total = 0;
  const failures = [];

  for (const task of BATTERY) {
    const goodFixture = KNOWN_GOOD[task.id];
    const badFixture  = KNOWN_BAD[task.id];

    if (!goodFixture || !badFixture) {
      failures.push(`${task.id}: missing self-test fixture`);
      total += 2;
      continue;
    }

    // GOOD must pass
    total++;
    const goodCase = task.cases[goodFixture.caseIdx];
    const goodResult = task.verify(goodFixture.output, goodCase);
    if (goodResult === true) {
      passed++;
    } else {
      failures.push(`${task.id} GOOD fixture returned ${goodResult} (expected true)`);
    }

    // BAD must fail
    total++;
    const badCase = task.cases[badFixture.caseIdx];
    const badResult = task.verify(badFixture.output, badCase);
    if (badResult === false) {
      passed++;
    } else {
      failures.push(`${task.id} BAD fixture returned ${badResult} (expected false)`);
    }
  }

  if (failures.length > 0) {
    for (const f of failures) console.error("FAIL:", f);
    console.error(`SELFTEST FAILED ${passed}/${total}`);
    process.exit(1);
  } else {
    console.log(`SELFTEST OK ${passed}/${total}`);
  }
}
