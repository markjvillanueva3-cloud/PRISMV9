/**
 * stress-battery-longcontext.mjs -- long-context needle-in-haystack battery for PRISM Ollama stress tests.
 *
 * GOAL: validate num_ctx scaling by embedding ONE distinctive needle sentence inside deterministically-
 * generated filler (no Math.random), at varied positions (start/middle/end), at several filler sizes
 * (2K/8K/16K chars). The verifier checks exact needle-value retrieval (case-insensitive, trim-tolerant).
 *
 * SHAPE: export const BATTERY = [{id, category, cases:[...], prompt:(c)->string, verify:(out,c)->bool}]
 * Compatible with runTierSweep({ tasks: BATTERY }) in scripts/ollama-stress-test.mjs.
 *
 * Pure: no fetch/fs at module level. Self-test guard: run-as-main only.
 * ASCII-only content throughout.
 */

// ---------------------------------------------------------------------------
// Filler generator -- deterministic, NO Math.random, pure ASCII
// ---------------------------------------------------------------------------

/** Repeating CNC-manufacturing sentences used as neutral filler (no needle words). */
const FILLER_SENTENCES = [
  "The spindle rotates at a constant speed to maintain surface footage.",
  "Coolant flow rate is monitored by the pump controller during operation.",
  "Tool path verification is performed before each production run begins.",
  "Fixture alignment is checked with a dial indicator before clamping.",
  "Feed rate adjustments are logged in the machine controller history.",
  "Chip evacuation is critical for deep-pocket milling on aluminum alloy.",
  "The work coordinate system is zeroed at the part datum each shift.",
  "Operator checks tool runout with a presetter before loading the magazine.",
  "Surface finish requirements are recorded on the traveler inspection sheet.",
  "Cutting parameters are selected based on material hardness and tool coating.",
  "The pallet changer cycles between fixtures to reduce non-cutting time.",
  "Dimensional verification occurs at the CMM station after each batch.",
  "Coolant concentration is tested with a refractometer every morning.",
  "Vibration dampers on the boring bar reduce chatter at long overhangs.",
  "The post-processor converts CAM toolpaths to machine-specific G-code.",
  "Torque monitoring protects taps from breakage in blind-hole threading.",
  "Part programs are stored on the DNC server and recalled by barcode scan.",
  "Probe cycles establish reference points for unmanned overnight runs.",
  "Carbide inserts are indexed when flank wear exceeds the allowable limit.",
  "The machine home position is verified at the start of every power-on cycle.",
];

/**
 * Build a filler string of at least `minChars` by repeating the sentence list.
 * Deterministic: same minChars -> same output every time.
 * @param {number} minChars
 * @returns {string}
 */
function buildFiller(minChars) {
  let out = "";
  let i = 0;
  while (out.length < minChars) {
    out += FILLER_SENTENCES[i % FILLER_SENTENCES.length] + " ";
    i++;
  }
  return out.slice(0, minChars + 80).trimEnd(); // overshoot a little, trim to even boundary
}

// ---------------------------------------------------------------------------
// Needle placement
// ---------------------------------------------------------------------------

/**
 * Insert a needle sentence into filler at a given position fraction (0=start, 0.5=middle, 1=end).
 * Returns the assembled prompt text.
 * @param {string} filler
 * @param {string} needle
 * @param {number} posFraction  0..1
 * @returns {string}
 */
function assembleLongText(filler, needle, posFraction) {
  const insertAt = Math.floor(filler.length * posFraction);
  // Find nearest sentence boundary (space) to avoid splitting a word
  const boundary = filler.lastIndexOf(" ", insertAt);
  const safeAt = boundary > 0 ? boundary + 1 : insertAt;
  return filler.slice(0, safeAt) + needle + " " + filler.slice(safeAt);
}

// ---------------------------------------------------------------------------
// Case definitions
// ---------------------------------------------------------------------------

/**
 * Each case:
 *   id         - unique string
 *   fillerSize - number of filler chars
 *   needle     - the full needle sentence
 *   needleValue- the exact value the model must return
 *   position   - "start"|"middle"|"end"
 *   posFrac    - 0..1 numeric position
 */
const CASE_SPECS = [
  // 2K filler
  {
    id: "lc-2k-start",
    fillerSize: 2000,
    needle: "The secret code for bay 7 is QX-4831.",
    needleValue: "QX-4831",
    position: "start",
    posFrac: 0.0,
  },
  {
    id: "lc-2k-middle",
    fillerSize: 2000,
    needle: "The emergency shutdown token is DELTA-9902.",
    needleValue: "DELTA-9902",
    position: "middle",
    posFrac: 0.5,
  },
  {
    id: "lc-2k-end",
    fillerSize: 2000,
    needle: "The calibration reference tag is ZETA-0077.",
    needleValue: "ZETA-0077",
    position: "end",
    posFrac: 0.9,
  },
  // 8K filler
  {
    id: "lc-8k-start",
    fillerSize: 8000,
    needle: "The maintenance unlock code is FOXTROT-3341.",
    needleValue: "FOXTROT-3341",
    position: "start",
    posFrac: 0.05,
  },
  {
    id: "lc-8k-middle",
    fillerSize: 8000,
    needle: "The QC override passphrase is SIERRA-7780.",
    needleValue: "SIERRA-7780",
    position: "middle",
    posFrac: 0.5,
  },
  {
    id: "lc-8k-end",
    fillerSize: 8000,
    needle: "The tool library export key is TANGO-2255.",
    needleValue: "TANGO-2255",
    position: "end",
    posFrac: 0.92,
  },
  // 16K filler
  {
    id: "lc-16k-start",
    fillerSize: 16000,
    needle: "The batch release code for lot 44 is KILO-8819.",
    needleValue: "KILO-8819",
    position: "start",
    posFrac: 0.02,
  },
  {
    id: "lc-16k-middle",
    fillerSize: 16000,
    needle: "The inspection sign-off key is WHISKEY-5563.",
    needleValue: "WHISKEY-5563",
    position: "middle",
    posFrac: 0.5,
  },
  {
    id: "lc-16k-end",
    fillerSize: 16000,
    needle: "The fixture revision control code is INDIA-6644.",
    needleValue: "INDIA-6644",
    position: "end",
    posFrac: 0.94,
  },
];

// Pre-build all cases (deterministic, done once at module load)
const CASES = CASE_SPECS.map((spec) => {
  const filler = buildFiller(spec.fillerSize);
  const longText = assembleLongText(filler, spec.needle, spec.posFrac);
  return {
    ...spec,
    longText,
    // Approximate token count for annotation (chars / 3.5 ~ tokens)
    approxTokens: Math.round(longText.length / 3.5),
  };
});

// ---------------------------------------------------------------------------
// Verifier helpers
// ---------------------------------------------------------------------------

/**
 * Extract the needle value from the model's output.
 * Tolerates: extra whitespace, trailing punctuation, surrounding prose.
 * Returns the extracted candidate string (lowercased, trimmed), or "" if nothing found.
 * @param {string} out
 * @param {string} needleValue
 * @returns {boolean}
 */
function verifyNeedleOutput(out, needleValue) {
  if (out == null || needleValue == null) return false;
  const rawOut = String(out).trim();
  if (!rawOut) return false;
  // Case-fold both sides
  const outLower = rawOut.toLowerCase().replace(/[`'"]/g, "").trim();
  const needleLower = needleValue.toLowerCase().trim();
  // Exact match after normalization
  if (outLower === needleLower) return true;
  // Contained in a short answer (model may say "The code is QX-4831." or just "QX-4831")
  // Must find the exact needle value as a token, not as a substring of another code
  // Use word-boundary-like check: allow surrounding non-alphanumeric chars
  const escaped = needleLower.replace(/[-]/g, "[-]");
  const re = new RegExp("(?:^|[^a-z0-9])" + escaped + "(?:[^a-z0-9]|$)", "i");
  return re.test(outLower);
}

// ---------------------------------------------------------------------------
// BATTERY export
// ---------------------------------------------------------------------------

export const BATTERY = [
  {
    id: "long-context-needle",
    category: "long-context",
    cases: CASES,
    /**
     * Build the retrieval prompt for a case.
     * Terse: instructs model to reply with ONLY the code/token value.
     */
    prompt: (c) =>
      `Below is a long document. It contains exactly one special code or token embedded inside it.\n\n` +
      `--- DOCUMENT START ---\n${c.longText}\n--- DOCUMENT END ---\n\n` +
      `The document contains a hidden code embedded in a sentence that starts with "The" and ends with a code like "WORD-DIGITS" or "LETTERS-DIGITS".\n` +
      `Reply with ONLY the code (e.g. QX-4831). No explanation, no sentence, just the code.`,
    /**
     * Verifier: output must contain the exact needle value (case-insensitive).
     * Returns false on empty/wrong answer (R9 compliant).
     */
    verify: (out, c) => verifyNeedleOutput(out, c.needleValue),
  },
];

// ---------------------------------------------------------------------------
// Run-as-main self-test (node stress-battery-longcontext.mjs)
// ---------------------------------------------------------------------------

// Guard: only run self-test when executed directly, not when imported
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("stress-battery-longcontext.mjs");

if (isMain) {
  let passed = 0;
  let total = 0;
  const errors = [];

  const task = BATTERY[0];

  for (const c of task.cases) {
    // --- KNOWN-GOOD: exact needle value should pass ---
    const goodTests = [
      c.needleValue,                                        // exact match
      c.needleValue.toLowerCase(),                          // lowercase
      c.needleValue.toUpperCase(),                          // uppercase
      `The code is ${c.needleValue}.`,                      // prose prefix
      `  ${c.needleValue}  `,                               // extra whitespace
      `Here it is: ${c.needleValue}`,                       // more prose
    ];
    for (const good of goodTests) {
      total++;
      if (task.verify(good, c)) {
        passed++;
      } else {
        errors.push(`FAIL good="${good}" needle="${c.needleValue}" case=${c.id}`);
      }
    }

    // --- KNOWN-BAD: wrong/empty/unrelated answers should fail ---
    const badTests = [
      "",                                                   // empty
      "I don't know.",                                      // non-answer
      "The document does not contain a code.",              // refusal
      "QX-9999",                                            // wrong code (similar pattern)
      "ALPHA-0000",                                         // different wrong code
      "The needle value is hidden.",                        // prose without value
    ];
    for (const bad of badTests) {
      total++;
      if (!task.verify(bad, c)) {
        passed++;
      } else {
        errors.push(`FAIL bad="${bad}" should NOT match needle="${c.needleValue}" case=${c.id}`);
      }
    }

    // --- Spot-check: needle value must NOT match a sibling needle (different code) ---
    const siblingCase = task.cases.find((other) => other.id !== c.id);
    if (siblingCase) {
      total++;
      if (!task.verify(siblingCase.needleValue, c)) {
        passed++;
      } else {
        errors.push(
          `FAIL sibling="${siblingCase.needleValue}" matched case=${c.id} needle="${c.needleValue}" -- cross-contamination`
        );
      }
    }
  }

  // Print any errors
  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(e + "\n");
    process.stderr.write(`SELFTEST FAILED ${passed}/${total}\n`);
    process.exit(1);
  }

  process.stdout.write(`SELFTEST OK ${passed}/${total}\n`);
}
