/**
 * stress-battery-reasoning.mjs -- VERIFIED multi-step reasoning battery for Ollama stress testing
 * (U-ALPHA-REASONING-BATTERY, slot:alpha 2026-06-24).
 *
 * Target models: deepseek-r1 / gpt-oss (UNTESTED tier -- multi-step reasoning).
 * Task types: ordering puzzles, algebra word problems, unit-rate, logical deduction.
 * All tasks are DETERMINISTIC with ONE unambiguous answer.
 *
 * Consumed by: scripts/ollama-stress-test.mjs runTierSweep({ tasks: BATTERY })
 * Self-test: node H:/prism/scripts/lib/stress-battery-reasoning.mjs
 *   -> prints "SELFTEST OK n/n" or lists failures + exits 1
 *
 * Pure: no fetch/fs imports -- the live runner injects the model caller.
 */

import { norm, firstNumber } from "./ollama-capability-battery.mjs";

// ---------------------------------------------------------------------------
// Helpers (reasoning-specific; pure; ASCII-only)
// ---------------------------------------------------------------------------

/** Extract the first non-negative integer from text. */
function firstInt(s) {
  const m = String(s == null ? "" : s).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Extract ALL integers from text in order. */
function allInts(s) {
  return [...String(s == null ? "" : s).matchAll(/-?\d+/g)].map((m) => parseInt(m[0], 10));
}

/** Normalise and strip punctuation; return lowercase trimmed word. */
function word(s) {
  return norm(s).toLowerCase().replace(/[^a-z]/g, "").trim();
}

/** Numeric tolerance check. */
function near(a, b, tol = 0.01) {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// BATTERY
// Each task: { id, category, cases:[{...}], prompt(c)->string, verify(out,c)->bool }
// verify MUST return false on wrong/empty (R9).
// ---------------------------------------------------------------------------

export const BATTERY = [
  // ------------------------------------------------------------------
  // 1. ORDERING PUZZLE -- rank by a single stated criterion
  // ------------------------------------------------------------------
  {
    id: "ordering-puzzle",
    category: "multi-step-reasoning",
    cases: [
      {
        // Alice > Bob > Carol by height. Who is shortest?
        setup: "Alice is taller than Bob. Bob is taller than Carol.",
        question: "Who is the shortest?",
        expect: "carol",
      },
      {
        // Dog > Cat > Bird by weight
        setup: "A dog weighs more than a cat. A cat weighs more than a bird.",
        question: "Which animal is the lightest?",
        expect: "bird",
      },
      {
        // P > Q > R > S by speed
        setup: "P is faster than Q. Q is faster than R. R is faster than S.",
        question: "Who is the slowest?",
        expect: "s",
      },
      {
        // Red > Blue > Green > Yellow by brightness
        setup: "Red is brighter than Blue. Blue is brighter than Green. Green is brighter than Yellow.",
        question: "Which color is the dimmest?",
        expect: "yellow",
      },
      {
        // Monday > Tuesday > Wednesday by arrival order (earliest first -> latest is Wednesday)
        setup: "Package A arrived before Package B. Package B arrived before Package C.",
        question: "Which package arrived last?",
        expect: "c",
      },
      {
        // 5 items: Alpha > Beta > Gamma > Delta > Epsilon cost
        setup: "Alpha costs more than Beta. Beta costs more than Gamma. Gamma costs more than Delta. Delta costs more than Epsilon.",
        question: "Which item is the cheapest?",
        expect: "epsilon",
      },
    ],
    prompt: (c) =>
      `${c.setup} ${c.question} Reply with ONLY the name (single word), nothing else.`,
    verify: (out, c) => {
      const w = word(out);
      return w.length > 0 && w === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // 2. SIMPLE ALGEBRA WORD PROBLEMS -- single-variable, one answer
  // ------------------------------------------------------------------
  {
    id: "algebra-word-problem",
    category: "multi-step-reasoning",
    cases: [
      {
        // x + 5 = 12 -> x = 7
        text: "A number plus 5 equals 12. What is the number?",
        expect: 7,
      },
      {
        // 3x = 24 -> x = 8
        text: "Three times a number equals 24. What is the number?",
        expect: 8,
      },
      {
        // 2x - 3 = 11 -> x = 7
        text: "Twice a number minus 3 equals 11. What is the number?",
        expect: 7,
      },
      {
        // x / 4 = 9 -> x = 36
        text: "A number divided by 4 equals 9. What is the number?",
        expect: 36,
      },
      {
        // 5x + 2 = 37 -> x = 7
        text: "Five times a number plus 2 equals 37. What is the number?",
        expect: 7,
      },
      {
        // x^2 = 49 -> x = 7 (positive root implied)
        text: "The square of a positive number is 49. What is the number?",
        expect: 7,
      },
    ],
    prompt: (c) =>
      `${c.text} Reply with ONLY the final numeric answer (integer), nothing else.`,
    verify: (out, c) => {
      const n = firstInt(out);
      return n !== null && n === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // 3. UNIT-RATE PROBLEMS -- find rate or total from given rate
  // ------------------------------------------------------------------
  {
    id: "unit-rate",
    category: "multi-step-reasoning",
    cases: [
      {
        // 60 miles / 2 hours = 30 mph
        text: "A car travels 60 miles in 2 hours. What is its speed in miles per hour?",
        expect: 30,
        tol: 0.1,
      },
      {
        // 5 items for $20 -> $4 each
        text: "5 identical items cost $20 in total. How many dollars does each item cost?",
        expect: 4,
        tol: 0.01,
      },
      {
        // Worker packs 120 boxes in 8 hours -> 15 per hour
        text: "A worker packs 120 boxes in 8 hours. How many boxes per hour does the worker pack?",
        expect: 15,
        tol: 0.1,
      },
      {
        // 3 litres cover 18 sq m -> 6 sq m per litre
        text: "3 litres of paint cover 18 square metres. How many square metres does 1 litre cover?",
        expect: 6,
        tol: 0.1,
      },
      {
        // 7 days -> 168 hours
        text: "How many hours are in 7 days?",
        expect: 168,
        tol: 0.1,
      },
      {
        // 4 widgets/min for 12 min -> 48
        text: "A machine produces 4 widgets per minute. How many widgets does it produce in 12 minutes?",
        expect: 48,
        tol: 0.1,
      },
    ],
    prompt: (c) =>
      `${c.text} Reply with ONLY the numeric answer (integer or decimal), nothing else.`,
    verify: (out, c) => {
      const n = firstNumber(out);
      return n !== null && near(n, c.expect, c.tol ?? 0.1);
    },
  },

  // ------------------------------------------------------------------
  // 4. LOGICAL DEDUCTION -- syllogism / elimination
  // ------------------------------------------------------------------
  {
    id: "logical-deduction",
    category: "multi-step-reasoning",
    cases: [
      {
        // All A are B; C is A -> C is B
        premises: "All mammals are warm-blooded. A dolphin is a mammal.",
        question: "Is a dolphin warm-blooded? Reply with ONLY yes or no.",
        expect: "yes",
      },
      {
        // No X is Y; Z is X -> Z is not Y
        premises: "No reptile is a mammal. A lizard is a reptile.",
        question: "Is a lizard a mammal? Reply with ONLY yes or no.",
        expect: "no",
      },
      {
        // Modus tollens: if P then Q; not Q -> not P
        premises: "If it is raining, the ground is wet. The ground is not wet.",
        question: "Is it raining? Reply with ONLY yes or no.",
        expect: "no",
      },
      {
        // Disjunctive syllogism: A or B; not A -> B
        premises: "Either Alice or Bob broke the window. Alice did not break the window.",
        question: "Did Bob break the window? Reply with ONLY yes or no.",
        expect: "yes",
      },
      {
        // Chained: A->B, B->C, A true -> C true
        premises: "Whenever it snows, schools close. Whenever schools close, children stay home. It is snowing.",
        question: "Are children staying home? Reply with ONLY yes or no.",
        expect: "yes",
      },
      {
        // Negation: All S are P; some Q is not P -> some Q is not S
        premises: "Every prime number greater than 2 is odd. The number 4 is not odd.",
        question: "Is 4 a prime number greater than 2? Reply with ONLY yes or no.",
        expect: "no",
      },
    ],
    prompt: (c) => `${c.premises} ${c.question}`,
    verify: (out, c) => {
      const w = word(out);
      // word() already strips all non-alpha (punctuation, periods, spaces) and lowercases,
      // so an exact match is both sufficient and necessary -- startsWith("yes"/"no") was a
      // P1 leak: "yesterday"->true for expect="yes", "nobody"/"notion"->true for expect="no".
      return w === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // 5. COUNTDOWN / SEQUENCE REASONING -- find next or missing term
  // ------------------------------------------------------------------
  {
    id: "sequence-reasoning",
    category: "multi-step-reasoning",
    cases: [
      {
        // Arithmetic +3: 2, 5, 8, 11, ?
        seq: "2, 5, 8, 11",
        question: "What is the next number in the sequence?",
        expect: 14,
      },
      {
        // Geometric x2: 3, 6, 12, 24, ?
        seq: "3, 6, 12, 24",
        question: "What is the next number in the sequence?",
        expect: 48,
      },
      {
        // Arithmetic -4: 20, 16, 12, 8, ?
        seq: "20, 16, 12, 8",
        question: "What is the next number in the sequence?",
        expect: 4,
      },
      {
        // Squares: 1, 4, 9, 16, ?
        seq: "1, 4, 9, 16",
        question: "What is the next number in the sequence?",
        expect: 25,
      },
      {
        // Fibonacci: 1, 1, 2, 3, 5, 8, ?
        seq: "1, 1, 2, 3, 5, 8",
        question: "What is the next number in the sequence?",
        expect: 13,
      },
      {
        // Arithmetic +7: 7, 14, 21, 28, ?
        seq: "7, 14, 21, 28",
        question: "What is the next number in the sequence?",
        expect: 35,
      },
    ],
    prompt: (c) =>
      `Sequence: ${c.seq}. ${c.question} Reply with ONLY the number, nothing else.`,
    verify: (out, c) => {
      const n = firstInt(out);
      return n !== null && n === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // 6. COMPARATIVE COUNTING -- how many satisfy a condition
  // ------------------------------------------------------------------
  {
    id: "comparative-counting",
    category: "multi-step-reasoning",
    cases: [
      {
        // Numbers 1-10 divisible by 3: 3,6,9 -> 3
        question: "How many whole numbers from 1 to 10 are divisible by 3?",
        expect: 3,
      },
      {
        // Prime numbers less than 20: 2,3,5,7,11,13,17,19 -> 8
        question: "How many prime numbers are less than 20?",
        expect: 8,
      },
      {
        // Vowels in 'REASONING': R-E-A-S-O-N-I-N-G -> E,A,O,I -> 4
        question: "How many vowels are in the word REASONING?",
        expect: 4,
      },
      {
        // Days in a week starting with S: Saturday, Sunday -> 2
        question: "How many days of the week start with the letter S?",
        expect: 2,
      },
      {
        // Odd numbers between 10 and 20 (exclusive): 11,13,15,17,19 -> 5
        question: "How many odd numbers are there strictly between 10 and 20?",
        expect: 5,
      },
      {
        // Faces on a cube: 6
        question: "How many faces does a cube have?",
        expect: 6,
      },
    ],
    prompt: (c) =>
      `${c.question} Reply with ONLY the numeric answer (integer), nothing else.`,
    verify: (out, c) => {
      const n = firstInt(out);
      return n !== null && n === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // 7. MULTI-STEP ARITHMETIC WORD PROBLEM -- requires 2+ operations
  // ------------------------------------------------------------------
  {
    id: "multistep-arithmetic",
    category: "multi-step-reasoning",
    cases: [
      {
        // 3 apples at $2 + 2 oranges at $3 = $6 + $6 = $12
        text: "Alice buys 3 apples at $2 each and 2 oranges at $3 each. How many dollars does she spend in total?",
        expect: 12,
        tol: 0.01,
      },
      {
        // Start 50, sell 8, buy 5 -> 47
        text: "A store starts with 50 items. It sells 8 items and then receives a shipment of 5 new items. How many items does the store have now?",
        expect: 47,
        tol: 0.01,
      },
      {
        // 4 workers * 6 hours * $15/hr = $360
        text: "4 workers each work 6 hours and each earns $15 per hour. What is the total wages paid in dollars?",
        expect: 360,
        tol: 0.01,
      },
      {
        // 100m in 10s -> 10 m/s; in 25s -> 250m
        text: "A sprinter runs 100 metres in 10 seconds at constant speed. How many metres does the sprinter cover in 25 seconds?",
        expect: 250,
        tol: 0.5,
      },
      {
        // Tank 200L, drain 15L/min for 8 min = drain 120L, left = 80L
        text: "A tank holds 200 litres. Water drains at 15 litres per minute. After 8 minutes, how many litres remain?",
        expect: 80,
        tol: 0.1,
      },
      {
        // 12 eggs/dozen; 3.5 dozen = 42
        text: "A carton holds 12 eggs. If you have 3.5 cartons, how many eggs do you have in total?",
        expect: 42,
        tol: 0.1,
      },
    ],
    prompt: (c) =>
      `${c.text} Reply with ONLY the numeric answer, nothing else.`,
    verify: (out, c) => {
      const n = firstNumber(out);
      return n !== null && near(n, c.expect, c.tol ?? 0.1);
    },
  },
];

// ---------------------------------------------------------------------------
// Self-test (run-as-main guard: only executes when this file is the entry point)
// ---------------------------------------------------------------------------

if (
  (typeof process !== "undefined") &&
  process.argv[1] &&
  (process.argv[1].replace(/\\/g, "/").endsWith("stress-battery-reasoning.mjs"))
) {
  let passed = 0;
  let failed = 0;

  // Known-good / known-bad pairs per task, hand-verified against the cases above
  const SELF_TESTS = [
    // ordering-puzzle
    { taskId: "ordering-puzzle", caseIdx: 0, good: "carol", bad: "alice" },
    { taskId: "ordering-puzzle", caseIdx: 1, good: "bird", bad: "dog" },
    { taskId: "ordering-puzzle", caseIdx: 5, good: "epsilon", bad: "alpha" },

    // algebra-word-problem
    { taskId: "algebra-word-problem", caseIdx: 0, good: "7", bad: "12" },
    { taskId: "algebra-word-problem", caseIdx: 1, good: "8", bad: "3" },
    { taskId: "algebra-word-problem", caseIdx: 3, good: "36", bad: "9" },
    { taskId: "algebra-word-problem", caseIdx: 5, good: "7", bad: "49" },

    // unit-rate
    { taskId: "unit-rate", caseIdx: 0, good: "30", bad: "120" },
    { taskId: "unit-rate", caseIdx: 1, good: "4", bad: "20" },
    { taskId: "unit-rate", caseIdx: 4, good: "168", bad: "7" },

    // logical-deduction
    { taskId: "logical-deduction", caseIdx: 0, good: "yes", bad: "no" },
    { taskId: "logical-deduction", caseIdx: 1, good: "no", bad: "yes" },
    { taskId: "logical-deduction", caseIdx: 2, good: "no", bad: "yes" },
    { taskId: "logical-deduction", caseIdx: 3, good: "yes", bad: "no" },

    // sequence-reasoning
    { taskId: "sequence-reasoning", caseIdx: 0, good: "14", bad: "11" },
    { taskId: "sequence-reasoning", caseIdx: 1, good: "48", bad: "24" },
    { taskId: "sequence-reasoning", caseIdx: 3, good: "25", bad: "16" },
    { taskId: "sequence-reasoning", caseIdx: 4, good: "13", bad: "8" },

    // comparative-counting
    { taskId: "comparative-counting", caseIdx: 0, good: "3", bad: "4" },
    { taskId: "comparative-counting", caseIdx: 1, good: "8", bad: "7" },
    { taskId: "comparative-counting", caseIdx: 2, good: "4", bad: "3" },
    { taskId: "comparative-counting", caseIdx: 4, good: "5", bad: "10" },

    // multistep-arithmetic
    { taskId: "multistep-arithmetic", caseIdx: 0, good: "12", bad: "5" },
    { taskId: "multistep-arithmetic", caseIdx: 1, good: "47", bad: "58" },
    { taskId: "multistep-arithmetic", caseIdx: 2, good: "360", bad: "90" },
    { taskId: "multistep-arithmetic", caseIdx: 4, good: "80", bad: "120" },
    { taskId: "multistep-arithmetic", caseIdx: 5, good: "42", bad: "36" },
  ];

  const taskMap = Object.fromEntries(BATTERY.map((t) => [t.id, t]));

  for (const st of SELF_TESTS) {
    const task = taskMap[st.taskId];
    if (!task) {
      console.error(`SELFTEST FAIL: unknown taskId "${st.taskId}"`);
      failed++;
      continue;
    }
    const c = task.cases[st.caseIdx];
    if (!c) {
      console.error(`SELFTEST FAIL: ${st.taskId} has no case[${st.caseIdx}]`);
      failed++;
      continue;
    }

    const goodResult = task.verify(st.good, c);
    const badResult  = task.verify(st.bad,  c);

    if (goodResult !== true) {
      console.error(`SELFTEST FAIL [${st.taskId}][${st.caseIdx}] verify("${st.good}") expected true, got ${goodResult}`);
      failed++;
    } else if (badResult !== false) {
      console.error(`SELFTEST FAIL [${st.taskId}][${st.caseIdx}] verify("${st.bad}") expected false, got ${badResult}`);
      failed++;
    } else {
      passed++;
    }
  }

  const total = passed + failed;
  if (failed === 0) {
    console.log(`SELFTEST OK ${passed}/${total}`);
    process.exit(0);
  } else {
    console.error(`SELFTEST FAILED ${failed}/${total} checks failed`);
    process.exit(1);
  }
}
