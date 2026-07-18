/**
 * stress-battery-codegen.mjs -- Ollama stress-test battery: CODE GENERATION tier.
 *
 * U-ALPHA-CODEGEN-BATTERY (slot:alpha, 2026-06-24).
 * Primary offload use case: ask a local model to write a PURE JS function, then
 * SAFELY execute it with node vm.runInNewContext against known inputs/outputs.
 *
 * SAFETY CONTRACT (mandatory, non-negotiable):
 *   - Sandbox is a FROZEN EMPTY object: no require, no process, no fs, no globalThis.
 *   - vm.runInNewContext timeout = 1000 ms (hard kill on infinite loops).
 *   - Any throw inside the VM -> verify() returns false (never crashes the harness).
 *   - The model output is stripped of markdown fences before evaluation.
 *   - No external modules are passed into the sandbox.
 *
 * Shape: BATTERY = [{id, category, cases:[...], prompt(c)->string, verify(out,c)->bool}]
 * Consumed by: scripts/ollama-stress-test.mjs  runTierSweep({ tasks: BATTERY })
 *
 * Karpathy discipline:
 *   CLASSIFY: code-generation + structural extraction + VM sandboxed execution.
 *   TECHNIQUE: vm.runInNewContext with frozen sandbox; deep-equal via JSON round-trip.
 *   EDGE CASES: model returns empty/null, wrong fn name, extra prose, syntax error,
 *     infinite loop (timeout), wrong return type, off-by-one, sign error.
 *   FAILURE MODES: vm missing (stdlib, always available in node >=0.10), timeout
 *     kills the context (SIGTERM not raised in main proc), JSON.stringify on
 *     circular output (caught by try/catch).
 */

import vm from "node:vm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip markdown code fences and leading/trailing whitespace from a model response.
 * Handles ```js, ```javascript, ``` (bare), or no fences at all.
 */
function stripFences(s) {
  return String(s == null ? "" : s)
    .replace(/^```[a-z]*\n?/im, "")
    .replace(/```\s*$/im, "")
    .trim();
}

/** VM execution timeout in milliseconds. Hard-kills infinite loops. */
const VM_TIMEOUT_MS = 1000;

/**
 * SAFELY run `src` (a JS function definition) in an isolated VM context, then call
 * fnName with args. Returns { ok: true, value } or { ok: false, reason }.
 *
 * Security model: vm.createContext({}) creates a fresh V8 context with standard
 * built-in globals (Array, String, Math, etc.) but NO host globals: no require,
 * no process, no fs, no Buffer, no globalThis access to the host. The
 * VM_TIMEOUT_MS hard-kills any infinite loop. The context sandbox itself is an
 * empty plain object (no properties injected), so eval'd code cannot exfiltrate
 * anything from the host environment.
 *
 * Why not Object.create(null) frozen sandbox? Because that strips Array.prototype
 * and String.prototype from the new context entirely -- array methods like
 * .filter()/.reverse()/.join() silently vanish, making complex functions impossible
 * to verify correctly. vm.createContext gives a fresh standard lib with no host leak.
 */
function safeRun(src, fnName, args) {
  try {
    const sandbox = vm.createContext({}, {
      codeGeneration: { strings: false, wasm: false },
    });
    const argStr = args.map((a) => JSON.stringify(a)).join(", ");
    // "use strict" closes the regular-function-this constructor-chain escape path.
    // codeGeneration:false closes the arrow-function-this path.  Both are required.
    const code = `"use strict";\n${src}\n;${fnName}(${argStr})`;
    const result = vm.runInContext(code, sandbox, { timeout: VM_TIMEOUT_MS });
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, reason: String(err && err.message ? err.message : err) };
  }
}

/**
 * Deep-equal two values via JSON round-trip (handles arrays/objects/primitives).
 * Returns false if either side is not JSON-serialisable (circular, undefined, etc.).
 */
function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Build a verify function for a code-generation task.
 *
 * @param {string}   fnName    - the JS function name to call
 * @param {string[]} argKeys   - keys in the case object that map to positional args
 * @param {string}   expectKey - key in the case object for expected output
 * @param {function} [cmp]     - custom comparator(actual, expected) -> bool; defaults to deepEqual
 */
function makeCodeVerify(fnName, argKeys, expectKey, cmp) {
  const compare = typeof cmp === "function" ? cmp : deepEqual;
  return function verify(out, c) {
    const src = stripFences(out);
    if (!src) return false;
    const args = argKeys.map((k) => c[k]);
    const r = safeRun(src, fnName, args);
    if (!r.ok) return false;
    return compare(r.value, c[expectKey]);
  };
}

// ---------------------------------------------------------------------------
// BATTERY
// ---------------------------------------------------------------------------

export const BATTERY = [
  // -------------------------------------------------------------------
  // 1. isPrime
  // -------------------------------------------------------------------
  {
    id: "codegen-isPrime",
    category: "code-generation",
    cases: [
      { n: 2,   expected: true  },
      { n: 1,   expected: false },
      { n: 17,  expected: true  },
      { n: 18,  expected: false },
      { n: 97,  expected: true  },
    ],
    prompt: (c) =>
      `Reply with ONLY a JavaScript function named isPrime, no explanation, no markdown.\n` +
      `The function must take one integer argument n and return true if n is prime, false otherwise.\n` +
      `Example call: isPrime(${c.n})`,
    verify: makeCodeVerify("isPrime", ["n"], "expected"),
  },

  // -------------------------------------------------------------------
  // 2. fibonacci (0-indexed: fib(0)=0, fib(1)=1, fib(2)=1, ...)
  // -------------------------------------------------------------------
  {
    id: "codegen-fibonacci",
    category: "code-generation",
    cases: [
      { n: 0,  expected: 0  },
      { n: 1,  expected: 1  },
      { n: 6,  expected: 8  },
      { n: 10, expected: 55 },
      { n: 12, expected: 144 },
    ],
    prompt: (c) =>
      `Reply with ONLY a JavaScript function named fibonacci, no explanation, no markdown.\n` +
      `The function must take one non-negative integer n and return the nth Fibonacci number ` +
      `(0-indexed: fibonacci(0)=0, fibonacci(1)=1, fibonacci(2)=1, fibonacci(6)=8).\n` +
      `Example call: fibonacci(${c.n})`,
    verify: makeCodeVerify("fibonacci", ["n"], "expected"),
  },

  // -------------------------------------------------------------------
  // 3. reverseWords  ("hello world" -> "world hello")
  // -------------------------------------------------------------------
  {
    id: "codegen-reverseWords",
    category: "code-generation",
    cases: [
      { s: "hello world",          expected: "world hello"          },
      { s: "the quick brown fox",  expected: "fox brown quick the"  },
      { s: "one",                  expected: "one"                  },
      { s: "a b c",               expected: "c b a"                },
      { s: "foo  bar",             expected: "bar foo"              },
    ],
    prompt: (c) =>
      `Reply with ONLY a JavaScript function named reverseWords, no explanation, no markdown.\n` +
      `The function must take one string argument s and return a new string with the words in reversed order. ` +
      `Split on whitespace (handle multiple spaces by filtering empty tokens).\n` +
      `Example call: reverseWords(${JSON.stringify(c.s)}) => ${JSON.stringify(c.expected)}`,
    verify: makeCodeVerify("reverseWords", ["s"], "expected"),
  },

  // -------------------------------------------------------------------
  // 4. gcd (greatest common divisor, both positive integers)
  // -------------------------------------------------------------------
  {
    id: "codegen-gcd",
    category: "code-generation",
    cases: [
      { a: 12,  b: 8,   expected: 4  },
      { a: 100, b: 75,  expected: 25 },
      { a: 7,   b: 13,  expected: 1  },
      { a: 36,  b: 48,  expected: 12 },
      { a: 5,   b: 5,   expected: 5  },
    ],
    prompt: (c) =>
      `Reply with ONLY a JavaScript function named gcd, no explanation, no markdown.\n` +
      `The function must take two positive integer arguments a and b and return their greatest common divisor.\n` +
      `Example call: gcd(${c.a}, ${c.b}) => ${c.expected}`,
    verify: makeCodeVerify("gcd", ["a", "b"], "expected"),
  },

  // -------------------------------------------------------------------
  // 5. flattenArray (one level deep: [[1,2],[3]] -> [1,2,3])
  // -------------------------------------------------------------------
  {
    id: "codegen-flattenArray",
    category: "code-generation",
    cases: [
      { arr: [[1, 2], [3]],          expected: [1, 2, 3]          },
      { arr: [[1], [2], [3]],        expected: [1, 2, 3]          },
      { arr: [[]],                   expected: []                  },
      { arr: [[4, 5, 6], [7]],       expected: [4, 5, 6, 7]       },
      { arr: [[10, 20], [30, 40]],   expected: [10, 20, 30, 40]   },
      // Nested sub-array: one-level flatten keeps [2] as-is; deep flatten would unwrap it.
      // This case discriminates arr.flat(Infinity) from correct one-level flatten.
      { arr: [[1, [2]], [3]],        expected: [1, [2], 3]        },
    ],
    prompt: (c) =>
      `Reply with ONLY a JavaScript function named flattenArray, no explanation, no markdown.\n` +
      `The function must take one argument arr (an array of arrays of numbers) and return a new ` +
      `single flat array containing all the elements in order (one level deep only).\n` +
      `Example call: flattenArray(${JSON.stringify(c.arr)}) => ${JSON.stringify(c.expected)}`,
    verify: makeCodeVerify("flattenArray", ["arr"], "expected"),
  },

  // -------------------------------------------------------------------
  // 6. isPalindrome (case-insensitive, ignore non-alphanumeric)
  // -------------------------------------------------------------------
  {
    id: "codegen-isPalindrome",
    category: "code-generation",
    cases: [
      { s: "racecar",           expected: true  },
      { s: "hello",             expected: false },
      { s: "A man a plan a canal Panama", expected: true  },
      { s: "Was it a car or a cat I saw", expected: true  },
      { s: "not a palindrome",  expected: false },
    ],
    prompt: (c) =>
      `Reply with ONLY a JavaScript function named isPalindrome, no explanation, no markdown.\n` +
      `The function must take one string argument s. It should return true if s is a palindrome ` +
      `(case-insensitive, ignoring all non-alphanumeric characters), false otherwise.\n` +
      `Example call: isPalindrome(${JSON.stringify(c.s)}) => ${c.expected}`,
    verify: makeCodeVerify("isPalindrome", ["s"], "expected"),
  },
];

// ---------------------------------------------------------------------------
// Run-as-main self-test (guarded so import does not run it)
// ---------------------------------------------------------------------------

const KNOWN_GOOD_IMPLS = {
  "codegen-isPrime": `
    function isPrime(n) {
      if (n < 2) return false;
      for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
      return true;
    }
  `,
  "codegen-fibonacci": `
    function fibonacci(n) {
      if (n <= 0) return 0;
      if (n === 1) return 1;
      let a = 0, b = 1;
      for (let i = 2; i <= n; i++) { let t = a + b; a = b; b = t; }
      return b;
    }
  `,
  // String.raw preserves the backslash so /\s+/ reaches the VM correctly.
  // A plain template literal \\s yields /s+/ (backslash eaten by the template parser).
  "codegen-reverseWords": String.raw`
    function reverseWords(s) {
      return s.trim().split(/\s+/).filter(Boolean).reverse().join(" ");
    }
  `,
  "codegen-gcd": `
    function gcd(a, b) {
      while (b) { let t = b; b = a % b; a = t; }
      return a;
    }
  `,
  "codegen-flattenArray": `
    function flattenArray(arr) {
      return arr.reduce((acc, sub) => acc.concat(sub), []);
    }
  `,
  "codegen-isPalindrome": `
    function isPalindrome(s) {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      return clean === clean.split("").reverse().join("");
    }
  `,
};

const KNOWN_BAD_IMPLS = {
  // Wrong: always returns false
  "codegen-isPrime":     `function isPrime(n) { return false; }`,
  // Wrong: off by one (returns n+1 instead of fib(n))
  "codegen-fibonacci":  `function fibonacci(n) { return n + 1; }`,
  // Wrong: does not reverse, returns original
  "codegen-reverseWords": `function reverseWords(s) { return s; }`,
  // Wrong: always returns 1
  "codegen-gcd":         `function gcd(a, b) { return 1; }`,
  // Wrong: returns the nested array unchanged
  "codegen-flattenArray": `function flattenArray(arr) { return arr; }`,
  // Wrong: always returns false
  "codegen-isPalindrome": `function isPalindrome(s) { return false; }`,
};

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("stress-battery-codegen.mjs")) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const task of BATTERY) {
    const goodImpl = KNOWN_GOOD_IMPLS[task.id];
    const badImpl  = KNOWN_BAD_IMPLS[task.id];

    if (!goodImpl || !badImpl) {
      failures.push(`${task.id}: missing known-good or known-bad impl`);
      failed++;
      continue;
    }

    // 1. Every case must pass with the known-good implementation
    for (const c of task.cases) {
      const result = task.verify(goodImpl, c);
      if (!result) {
        failures.push(`${task.id} case ${JSON.stringify(c)}: known-good impl returned false (should be true)`);
        failed++;
      } else {
        passed++;
      }
    }

    // 2. At least one case must fail with the known-bad implementation (verifier is not a stub)
    const anyBadFails = task.cases.some((c) => !task.verify(badImpl, c));
    if (!anyBadFails) {
      failures.push(`${task.id}: known-bad impl passed ALL cases -- verifier is a stub (R9 violation)`);
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
    console.error(`SELFTEST FAILED ${failed}/${total}`);
    for (const f of failures) console.error("  FAIL:", f);
    process.exit(1);
  }
}
