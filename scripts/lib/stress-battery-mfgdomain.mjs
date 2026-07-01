/**
 * stress-battery-mfgdomain.mjs -- Manufacturing-domain knowledge battery for Ollama stress-testing.
 * Consumed by scripts/ollama-stress-test.mjs runTierSweep (pass as tasks: BATTERY).
 *
 * All questions have ONE canonical, verifiable answer drawn from Machinery's Handbook,
 * ISO 513, ASME Y14.5, EIA-RS-274-D (G-code standard), and standard threading tables.
 * verify() returns false on wrong/empty answers (R9 -- no stubs).
 *
 * Self-test (run-as-main):
 *   node H:/prism/scripts/lib/stress-battery-mfgdomain.mjs
 * Expected output: SELFTEST OK n/n
 */

import { norm, firstNumber } from "./ollama-capability-battery.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the first token (word) from normalized output. */
function firstWord(s) {
  return norm(s).toLowerCase().replace(/[^a-z0-9]/g, " ").trim().split(/\s+/)[0] || "";
}

/** Numeric match within an absolute tolerance. */
function nearAbs(out, expected, tol) {
  const n = firstNumber(out);
  // Add a small epsilon guard (1e-9) so IEEE-754 boundary values
  // (e.g. 1.620 - 1.600 = 0.020000000000000018) are not falsely rejected.
  return n != null && Math.abs(n - expected) <= tol + 1e-9;
}

// ---------------------------------------------------------------------------
// Battery
// ---------------------------------------------------------------------------

export const BATTERY = [
  // ------------------------------------------------------------------
  // 1. G-code mnemonics -- single letter/number answers; unambiguous.
  // ------------------------------------------------------------------
  {
    id: "gcode-mnemonics",
    category: "manufacturing-knowledge",
    cases: [
      // G43 = tool length compensation (offset positive)
      { code: "G43", expect: "tool length compensation" },
      // G54 = work coordinate system offset 1
      { code: "G54", expect: "work coordinate system" },
      // G96 = constant surface speed (CSS) -- lathe
      { code: "G96", expect: "constant surface speed" },
      // G28 = return to machine home / reference point
      { code: "G28", expect: "home" },
      // M08 = coolant on
      { code: "M08", expect: "coolant" },
      // G41 = cutter radius compensation left
      { code: "G41", expect: "cutter radius compensation" },
    ],
    prompt: (c) =>
      `What does the CNC G-code (or M-code) "${c.code}" do? Reply with ONLY a short terse phrase (3-5 words max), nothing else.`,
    verify: (out, c) => {
      const t = norm(out).toLowerCase();
      // Each case has one or two key discriminating words that must appear
      const keys = {
        "tool length compensation": ["tool length", "length comp"],
        "work coordinate system":   ["work coord", "coordinate system", "wcs", "fixture offset"],
        "constant surface speed":   ["constant surface", "css", "surface speed"],
        "home":                     ["home", "reference", "zero return"],
        "coolant":                  ["coolant", "flood"],
        "cutter radius compensation": ["cutter radius", "radius comp", "crc", "tool radius"],
      };
      const needles = keys[c.expect] || [c.expect];
      return needles.some((n) => t.includes(n));
    },
  },

  // ------------------------------------------------------------------
  // 2. ISO 513 insert material grade letters -- one letter per material.
  // ------------------------------------------------------------------
  {
    id: "iso-insert-grade",
    category: "manufacturing-knowledge",
    cases: [
      // Steel (long chip) = P
      { material: "carbon steel",            expect: "p" },
      // Stainless / austenitic = M
      { material: "austenitic stainless steel", expect: "m" },
      // Cast iron = K
      { material: "gray cast iron",          expect: "k" },
      // Non-ferrous (aluminum, copper) = N
      { material: "aluminum alloy",          expect: "n" },
      // Heat-resistant super-alloys = S
      { material: "Inconel 718",             expect: "s" },
      // Hardened steel / hard materials = H
      { material: "hardened tool steel 60 HRC", expect: "h" },
    ],
    prompt: (c) =>
      `According to ISO 513 insert material classification, what is the single letter code for machining ${c.material}? Reply with ONLY the single uppercase letter, nothing else.`,
    verify: (out, c) =>
      norm(out).toLowerCase().replace(/[^a-z]/g, "").startsWith(c.expect),
  },

  // ------------------------------------------------------------------
  // 3. Tolerance limit math (ASME Y14.5 / basic GD&T arithmetic).
  //    Nominal +/- bilateral tolerance -> compute max or min limit.
  // ------------------------------------------------------------------
  {
    id: "tolerance-limit-math",
    category: "deterministic-transform",
    cases: [
      // 1.000 +/- 0.005 -> max = 1.005
      { nominal: 1.000, tol: 0.005, which: "maximum",  expect: 1.005 },
      // 1.000 +/- 0.005 -> min = 0.995
      { nominal: 1.000, tol: 0.005, which: "minimum",  expect: 0.995 },
      // 2.500 +/- 0.010 -> max = 2.510
      { nominal: 2.500, tol: 0.010, which: "maximum",  expect: 2.510 },
      // 0.750 +/- 0.003 -> min = 0.747
      { nominal: 0.750, tol: 0.003, which: "minimum",  expect: 0.747 },
      // 3.000 +/- 0.020 -> max = 3.020
      { nominal: 3.000, tol: 0.020, which: "maximum",  expect: 3.020 },
      // 0.500 +/- 0.001 -> min = 0.499
      { nominal: 0.500, tol: 0.001, which: "minimum",  expect: 0.499 },
    ],
    prompt: (c) =>
      `A feature has a nominal dimension of ${c.nominal.toFixed(3)} inches with a bilateral tolerance of +/- ${c.tol.toFixed(3)} inches. What is the ${c.which} limit in inches? Reply with ONLY the numeric value to 3 decimal places, nothing else.`,
    verify: (out, c) => nearAbs(out, c.expect, 0.0005),
  },

  // ------------------------------------------------------------------
  // 4. Standard UNC/UNF thread pitch (threads per inch).
  //    Machinery's Handbook, thread tables.
  // ------------------------------------------------------------------
  {
    id: "thread-tpi",
    category: "manufacturing-knowledge",
    cases: [
      // 1/4-20 UNC = 20 TPI
      { size: "1/4-20 UNC", expect: 20 },
      // 3/8-16 UNC = 16 TPI
      { size: "3/8-16 UNC", expect: 16 },
      // 1/2-13 UNC = 13 TPI
      { size: "1/2-13 UNC", expect: 13 },
      // 5/16-18 UNC = 18 TPI
      { size: "5/16-18 UNC", expect: 18 },
      // #10-32 UNF = 32 TPI
      { size: "#10-32 UNF", expect: 32 },
      // 1/4-28 UNF = 28 TPI
      { size: "1/4-28 UNF", expect: 28 },
    ],
    prompt: (c) =>
      `How many threads per inch (TPI) does a ${c.size} thread have? Reply with ONLY the integer number, nothing else.`,
    verify: (out, c) => {
      const n = firstNumber(out);
      return n != null && Math.round(n) === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // 5. Spindle RPM formula: RPM = (SFM * 12) / (pi * D_in)
  //    Canonical Machinery's Handbook formula, exact integer expected.
  // ------------------------------------------------------------------
  {
    id: "spindle-rpm-formula",
    category: "deterministic-transform",
    cases: [
      // SFM=300, D=0.500in -> RPM = (300*12)/(pi*0.5) = 3600/1.5708 ~= 2292
      { sfm: 300, diameter_in: 0.500, expect: 2292, tol: 5 },
      // SFM=200, D=0.250in -> RPM = 2400/0.7854 ~= 3056
      { sfm: 200, diameter_in: 0.250, expect: 3056, tol: 5 },
      // SFM=400, D=1.000in -> RPM = 4800/3.1416 ~= 1528
      { sfm: 400, diameter_in: 1.000, expect: 1528, tol: 5 },
      // SFM=150, D=0.750in -> RPM = 1800/2.3562 ~= 764
      { sfm: 150, diameter_in: 0.750, expect: 764,  tol: 5 },
      // SFM=500, D=2.000in -> RPM = 6000/6.2832 ~= 955
      { sfm: 500, diameter_in: 2.000, expect: 955,  tol: 5 },
      // SFM=100, D=0.125in -> RPM = 1200/0.3927 ~= 3056
      { sfm: 100, diameter_in: 0.125, expect: 3056, tol: 5 },
    ],
    prompt: (c) =>
      `Using the formula RPM = (SFM x 12) / (pi x diameter), calculate the spindle RPM for a cutting speed of ${c.sfm} SFM and a tool diameter of ${c.diameter_in.toFixed(3)} inches. Reply with ONLY the integer RPM value, rounded to the nearest whole number, nothing else.`,
    verify: (out, c) => {
      const n = firstNumber(out);
      return n != null && Math.abs(Math.round(n) - c.expect) <= c.tol;
    },
  },

  // ------------------------------------------------------------------
  // 6. Drill tap pilot hole -- standard fractional drill for UNC taps.
  //    Machinery's Handbook recommended tap drill sizes (75% thread).
  // ------------------------------------------------------------------
  {
    id: "tap-drill-size",
    category: "manufacturing-knowledge",
    cases: [
      // 1/4-20 UNC -> #7 drill (0.201in)
      { tap: "1/4-20 UNC", expect_drill: "7",   expect_in: 0.201 },
      // 5/16-18 UNC -> F drill (0.257in)
      { tap: "5/16-18 UNC", expect_drill: "F",  expect_in: 0.257 },
      // 3/8-16 UNC -> 5/16 drill (0.3125in)
      { tap: "3/8-16 UNC", expect_drill: "5/16", expect_in: 0.3125 },
      // 1/2-13 UNC -> 27/64 drill (0.4219in)
      { tap: "1/2-13 UNC", expect_drill: "27/64", expect_in: 0.4219 },
      // 10-32 UNF -> #21 drill (0.159in)
      { tap: "#10-32 UNF", expect_drill: "21",  expect_in: 0.159 },
      // 1/4-28 UNF -> #3 drill (0.213in)
      { tap: "1/4-28 UNF", expect_drill: "3",   expect_in: 0.213 },
    ],
    prompt: (c) =>
      `What is the standard tap drill size (Machinery's Handbook, 75% thread) for a ${c.tap} tap? Reply with ONLY the drill size designation (e.g. "#7", "F", "5/16"), nothing else.`,
    verify: (out, c) => {
      // Accept either the drill letter/number designation OR a close decimal equivalent
      const t = norm(out).toLowerCase().replace(/[#"\s]/g, "");
      const expected = c.expect_drill.toLowerCase().replace(/[#"\s]/g, "");
      // Exact match only -- startsWith was a P0 false-pass (#32 accepted for "3", "7a" for "7").
      if (t === expected) return true;
      // Also accept a numeric decimal that is within 0.005in of the drill size
      const n = firstNumber(out);
      return n != null && Math.abs(n - c.expect_in) <= 0.005;
    },
  },

  // ------------------------------------------------------------------
  // 7. Surface roughness Ra unit conversion (microinch <-> micrometer).
  //    1 microinch = 0.0254 micrometer (exactly).
  // ------------------------------------------------------------------
  {
    id: "surface-roughness-convert",
    category: "deterministic-transform",
    cases: [
      // 63 microinch -> 1.6002 um (rounds to 1.6)
      { uin: 63,  expect_um: 1.600, tol: 0.02 },
      // 125 microinch -> 3.175 um
      { uin: 125, expect_um: 3.175, tol: 0.02 },
      // 32 microinch -> 0.8128 um
      { uin: 32,  expect_um: 0.813, tol: 0.02 },
      // 16 microinch -> 0.4064 um
      { uin: 16,  expect_um: 0.406, tol: 0.02 },
      // 250 microinch -> 6.35 um
      { uin: 250, expect_um: 6.350, tol: 0.02 },
      // 8 microinch -> 0.2032 um
      { uin: 8,   expect_um: 0.203, tol: 0.02 },
    ],
    prompt: (c) =>
      `Convert a surface roughness of ${c.uin} microinches (Ra) to micrometers. Use 1 microinch = 0.0254 micrometers. Reply with ONLY the numeric result rounded to 3 decimal places, nothing else.`,
    verify: (out, c) => nearAbs(out, c.expect_um, c.tol),
  },

  // ------------------------------------------------------------------
  // 8. Material hardness facts (canonical Rockwell/Brinell values).
  //    Single numeric answer or single word; Machinery's Handbook / ASM.
  // ------------------------------------------------------------------
  {
    id: "material-hardness-facts",
    category: "manufacturing-knowledge",
    cases: [
      // Pure annealed aluminum ~15-20 HRB; cutting tools can cut it if harder. Boolean: can carbide cut it? yes
      { question: "Is Rockwell C hardness (HRC) used to measure softened annealed aluminum (approx 20-30 HB)?",
        expect_yn: false },
      // 4140 steel quenched-and-tempered to ~30 HRC is roughly what BHN?
      // 30 HRC ~ 286 BHN (Machinery's Handbook conversion table)
      { question: "Approximately what Brinell hardness (BHN) corresponds to 30 HRC on the Rockwell-to-Brinell conversion table?",
        expect_num: 286, tol: 15 },
      // 6061-T6 aluminum tensile strength ~ 310 MPa (45 ksi) -- yes/no: is it above 300 MPa?
      { question: "Is the ultimate tensile strength of 6061-T6 aluminum alloy above 300 MPa?",
        expect_yn: true },
      // Carbide (WC-Co) is harder than HSS -- yes
      { question: "Is tungsten carbide (WC-Co) harder than high-speed steel (HSS)?",
        expect_yn: true },
      // 1018 steel (low carbon) Brinell ~126 BHN -- below 200 HB? yes
      { question: "Is the typical Brinell hardness of 1018 cold-drawn steel below 200 HB?",
        expect_yn: true },
      // 17-4 PH stainless H900 condition -- is it above 40 HRC? yes (~44 HRC)
      { question: "Is 17-4 PH stainless steel in the H900 condition above 40 HRC hardness?",
        expect_yn: true },
    ],
    prompt: (c) => {
      if (c.expect_yn !== undefined) {
        return `Answer with ONLY 'yes' or 'no'. ${c.question}`;
      }
      return `${c.question} Reply with ONLY the numeric value, nothing else.`;
    },
    verify: (out, c) => {
      if (c.expect_yn !== undefined) {
        const t = norm(out).toLowerCase();
        // Word-boundary required: /^y(es)?/ matched "yesterday", "yarns", etc. (P0 false-pass).
        if (c.expect_yn) return /^y(es)?\b/.test(t);
        return /^no?\b/.test(t);
      }
      return nearAbs(out, c.expect_num, c.tol);
    },
  },
];

// ---------------------------------------------------------------------------
// Self-test (run-as-main guard)
// ---------------------------------------------------------------------------

if (
  process.argv[1] &&
  (process.argv[1].endsWith("stress-battery-mfgdomain.mjs") ||
    process.argv[1].replace(/\\/g, "/").endsWith("stress-battery-mfgdomain.mjs"))
) {
  let pass = 0;
  let fail = 0;

  // Known-good and known-bad pairs for every task, exercising EVERY case.
  const SELFTESTS = [
    // gcode-mnemonics
    { taskId: "gcode-mnemonics", c: { code: "G43", expect: "tool length compensation" }, good: "Tool Length Compensation", bad: "rapid traverse" },
    { taskId: "gcode-mnemonics", c: { code: "G54", expect: "work coordinate system" }, good: "Work Coordinate System offset 1", bad: "tool change" },
    { taskId: "gcode-mnemonics", c: { code: "G96", expect: "constant surface speed" }, good: "Constant Surface Speed (CSS)", bad: "canned cycle" },
    { taskId: "gcode-mnemonics", c: { code: "G28", expect: "home" }, good: "Return to Home reference", bad: "feed rate override" },
    { taskId: "gcode-mnemonics", c: { code: "M08", expect: "coolant" }, good: "Coolant ON (flood)", bad: "spindle stop" },
    { taskId: "gcode-mnemonics", c: { code: "G41", expect: "cutter radius compensation" }, good: "Cutter Radius Compensation left", bad: "dwell" },

    // iso-insert-grade
    { taskId: "iso-insert-grade", c: { material: "carbon steel", expect: "p" }, good: "P", bad: "K" },
    { taskId: "iso-insert-grade", c: { material: "austenitic stainless steel", expect: "m" }, good: "M", bad: "N" },
    { taskId: "iso-insert-grade", c: { material: "gray cast iron", expect: "k" }, good: "K", bad: "P" },
    { taskId: "iso-insert-grade", c: { material: "aluminum alloy", expect: "n" }, good: "N", bad: "S" },
    { taskId: "iso-insert-grade", c: { material: "Inconel 718", expect: "s" }, good: "S", bad: "H" },
    { taskId: "iso-insert-grade", c: { material: "hardened tool steel 60 HRC", expect: "h" }, good: "H", bad: "P" },

    // tolerance-limit-math
    { taskId: "tolerance-limit-math", c: { nominal: 1.000, tol: 0.005, which: "maximum", expect: 1.005 }, good: "1.005", bad: "0.995" },
    { taskId: "tolerance-limit-math", c: { nominal: 1.000, tol: 0.005, which: "minimum", expect: 0.995 }, good: "0.995", bad: "1.005" },
    { taskId: "tolerance-limit-math", c: { nominal: 2.500, tol: 0.010, which: "maximum", expect: 2.510 }, good: "2.510", bad: "2.490" },
    { taskId: "tolerance-limit-math", c: { nominal: 0.750, tol: 0.003, which: "minimum", expect: 0.747 }, good: "0.747", bad: "0.753" },
    { taskId: "tolerance-limit-math", c: { nominal: 3.000, tol: 0.020, which: "maximum", expect: 3.020 }, good: "3.020", bad: "2.980" },
    { taskId: "tolerance-limit-math", c: { nominal: 0.500, tol: 0.001, which: "minimum", expect: 0.499 }, good: "0.499", bad: "0.501" },

    // thread-tpi
    { taskId: "thread-tpi", c: { size: "1/4-20 UNC", expect: 20 }, good: "20", bad: "28" },
    { taskId: "thread-tpi", c: { size: "3/8-16 UNC", expect: 16 }, good: "16", bad: "20" },
    { taskId: "thread-tpi", c: { size: "1/2-13 UNC", expect: 13 }, good: "13", bad: "16" },
    { taskId: "thread-tpi", c: { size: "5/16-18 UNC", expect: 18 }, good: "18", bad: "20" },
    { taskId: "thread-tpi", c: { size: "#10-32 UNF", expect: 32 }, good: "32", bad: "20" },
    { taskId: "thread-tpi", c: { size: "1/4-28 UNF", expect: 28 }, good: "28", bad: "20" },

    // spindle-rpm-formula
    { taskId: "spindle-rpm-formula", c: { sfm: 300, diameter_in: 0.500, expect: 2292, tol: 5 }, good: "2292", bad: "1000" },
    { taskId: "spindle-rpm-formula", c: { sfm: 200, diameter_in: 0.250, expect: 3056, tol: 5 }, good: "3056", bad: "500" },
    { taskId: "spindle-rpm-formula", c: { sfm: 400, diameter_in: 1.000, expect: 1528, tol: 5 }, good: "1528", bad: "3000" },
    { taskId: "spindle-rpm-formula", c: { sfm: 150, diameter_in: 0.750, expect: 764,  tol: 5 }, good: "764",  bad: "1200" },
    { taskId: "spindle-rpm-formula", c: { sfm: 500, diameter_in: 2.000, expect: 955,  tol: 5 }, good: "955",  bad: "300" },
    { taskId: "spindle-rpm-formula", c: { sfm: 100, diameter_in: 0.125, expect: 3056, tol: 5 }, good: "3056", bad: "100" },

    // tap-drill-size
    { taskId: "tap-drill-size", c: { tap: "1/4-20 UNC",  expect_drill: "7",     expect_in: 0.201  }, good: "#7",    bad: "#10" },
    { taskId: "tap-drill-size", c: { tap: "5/16-18 UNC", expect_drill: "F",     expect_in: 0.257  }, good: "F",     bad: "G" },
    { taskId: "tap-drill-size", c: { tap: "3/8-16 UNC",  expect_drill: "5/16",  expect_in: 0.3125 }, good: "5/16",  bad: "1/4" },
    { taskId: "tap-drill-size", c: { tap: "1/2-13 UNC",  expect_drill: "27/64", expect_in: 0.4219 }, good: "27/64", bad: "1/2" },
    { taskId: "tap-drill-size", c: { tap: "#10-32 UNF",  expect_drill: "21",    expect_in: 0.159  }, good: "#21",   bad: "#10" },
    { taskId: "tap-drill-size", c: { tap: "1/4-28 UNF",  expect_drill: "3",     expect_in: 0.213  }, good: "#3",    bad: "#7" },

    // surface-roughness-convert
    { taskId: "surface-roughness-convert", c: { uin: 63,  expect_um: 1.600, tol: 0.02 }, good: "1.600", bad: "3.175" },
    { taskId: "surface-roughness-convert", c: { uin: 125, expect_um: 3.175, tol: 0.02 }, good: "3.175", bad: "1.600" },
    { taskId: "surface-roughness-convert", c: { uin: 32,  expect_um: 0.813, tol: 0.02 }, good: "0.813", bad: "3.000" },
    { taskId: "surface-roughness-convert", c: { uin: 16,  expect_um: 0.406, tol: 0.02 }, good: "0.406", bad: "1.600" },
    { taskId: "surface-roughness-convert", c: { uin: 250, expect_um: 6.350, tol: 0.02 }, good: "6.350", bad: "3.175" },
    { taskId: "surface-roughness-convert", c: { uin: 8,   expect_um: 0.203, tol: 0.02 }, good: "0.203", bad: "0.813" },

    // material-hardness-facts
    { taskId: "material-hardness-facts", c: { question: "...", expect_yn: false }, good: "No",  bad: "Yes" },
    { taskId: "material-hardness-facts", c: { question: "...", expect_num: 286, tol: 15 }, good: "286", bad: "500" },
    { taskId: "material-hardness-facts", c: { question: "...", expect_yn: true  }, good: "Yes", bad: "No" },
    { taskId: "material-hardness-facts", c: { question: "...", expect_yn: true  }, good: "yes", bad: "no" },
    { taskId: "material-hardness-facts", c: { question: "...", expect_yn: true  }, good: "Yes", bad: "No" },
    { taskId: "material-hardness-facts", c: { question: "...", expect_yn: true  }, good: "yes", bad: "no" },
  ];

  // Build a taskId -> verify map for quick lookup
  const verifyMap = {};
  for (const t of BATTERY) verifyMap[t.id] = t.verify;

  for (const st of SELFTESTS) {
    const verify = verifyMap[st.taskId];
    if (!verify) {
      process.stderr.write(`MISSING task ${st.taskId}\n`);
      fail++;
      continue;
    }
    const goodResult = verify(st.good, st.c);
    const badResult  = verify(st.bad,  st.c);
    if (!goodResult) {
      process.stderr.write(`FAIL good-answer rejected: task=${st.taskId} good="${st.good}" case=${JSON.stringify(st.c)}\n`);
      fail++;
    } else if (badResult) {
      process.stderr.write(`FAIL bad-answer accepted:  task=${st.taskId} bad="${st.bad}"  case=${JSON.stringify(st.c)}\n`);
      fail++;
    } else {
      pass++;
    }
  }

  const total = pass + fail;
  if (fail === 0) {
    process.stdout.write(`SELFTEST OK ${pass}/${total}\n`);
    process.exit(0);
  } else {
    process.stdout.write(`SELFTEST FAILED ${fail}/${total} cases failed\n`);
    process.exit(1);
  }
}
