/**
 * stress-battery-instruction.mjs -- INSTRUCTION-FOLLOWING battery for PRISM Ollama stress tests.
 * U-ALPHA-STRESS-INSTRUCTION (slot:alpha, 2026-06-24).
 *
 * Every task tests a PRECISE MECHANICAL CONSTRAINT (word count, case, line count, letter
 * exclusion, etc.) verified by a PURE code verifier. A verifier that cannot return false on a
 * wrong answer is worthless (R9). All verifiers are strict on the constraint, tolerant only on
 * irrelevant whitespace/punctuation surrounding the answer.
 *
 * Shape: compatible with runTierSweep({ tasks: BATTERY }) in ollama-stress-test.mjs.
 *   { id, category, cases:[...], prompt:(c)=>string, verify:(out,c)=>bool }
 *
 * ASCII-only source.  node --check must pass.  Self-test at bottom (guarded by isMain).
 */

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Strip surrounding whitespace + collapse runs of internal whitespace. */
function trimCollapse(s) {
  return String(s == null ? "" : s).trim().replace(/\s+/g, " ");
}

/** Split into words (whitespace-delimited tokens). */
function words(s) {
  return trimCollapse(s).split(/\s+/).filter(function(w) { return w.length > 0; });
}

/** True if the string contains at least one ASCII letter. */
function hasLetter(s) {
  return /[a-zA-Z]/.test(s);
}

/** True if ALL letters in the string are uppercase (non-letter chars ignored). */
function allUppercase(s) {
  var letters = s.replace(/[^a-zA-Z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

/** True if the string contains NO occurrence of the letter e (upper or lower). */
function hasNoE(s) {
  return !/[eE]/.test(s);
}

/**
 * Parse the output into a list of numbered lines.
 * Accepts:  "1. foo\n2. bar"  or  "1) foo\n2) bar"
 * Returns the text portion of each numbered line as a trimmed string array.
 */
function parseNumberedLines(s) {
  var raw = String(s == null ? "" : s);
  var lineBreaks = raw.split(/\n|\r\n/).map(function(l) { return l.trim(); }).filter(Boolean);
  var numbered = lineBreaks.filter(function(l) {
    return /^\d+[.)]\s*\S/.test(l) || /^\d+\s+\S/.test(l);
  });
  if (numbered.length > 0) {
    return numbered.map(function(l) {
      return l.replace(/^\d+[.)]\s*/, "").replace(/^\d+\s+/, "").trim();
    });
  }
  // No numbered lines found -- return empty so the verifier correctly rejects unnumbered output.
  return [];
}

// ---------------------------------------------------------------------------
// BATTERY
// ---------------------------------------------------------------------------

export const BATTERY = [

  // ------------------------------------------------------------------
  // TASK 1: EXACTLY THREE WORDS
  // Constraint: response must contain exactly 3 whitespace-delimited tokens.
  // ------------------------------------------------------------------
  {
    id: "exactly-three-words",
    category: "instruction-following",
    cases: [
      { topic: "steel", num: 3 },
      { topic: "coolant", num: 3 },
      { topic: "spindle speed", num: 3 },
      { topic: "carbide inserts", num: 3 },
      { topic: "tool wear", num: 3 },
    ],
    prompt: function(c) {
      return "Describe \"" + c.topic + "\" in machining using EXACTLY THREE WORDS. Reply with ONLY those three words, nothing else.";
    },
    verify: function(out, _c) {
      var w = words(trimCollapse(out));
      // Exactly 3 tokens; each must contain at least one letter
      return w.length === 3 && w.every(function(tok) { return /[a-zA-Z]/.test(tok); });
    },
  },

  // ------------------------------------------------------------------
  // TASK 2: ALL UPPERCASE
  // Constraint: every letter in the response must be uppercase.
  // ------------------------------------------------------------------
  {
    id: "all-uppercase",
    category: "instruction-following",
    cases: [
      { question: "What metal is aluminum?" },
      { question: "Name one CNC controller brand." },
      { question: "What does G00 mean in G-code?" },
      { question: "Name one cutting fluid type." },
      { question: "What is a boring bar used for?" },
    ],
    prompt: function(c) {
      return "Answer the question in ALL UPPERCASE letters. Reply with ONLY the uppercase answer, no lowercase letters anywhere.\n\nQuestion: " + c.question;
    },
    verify: function(out, _c) {
      var s = trimCollapse(out);
      return s.length > 0 && hasLetter(s) && allUppercase(s);
    },
  },

  // ------------------------------------------------------------------
  // TASK 3: EXACTLY 5 NUMBERED LINES
  // Constraint: response must contain exactly 5 numbered lines.
  // ------------------------------------------------------------------
  {
    id: "exactly-5-numbered-lines",
    category: "instruction-following",
    cases: [
      { subject: "steps to change an end mill" },
      { subject: "reasons carbide is used over HSS" },
      { subject: "types of CNC machine operations" },
      { subject: "factors affecting surface finish" },
      { subject: "common G-code motion commands" },
    ],
    prompt: function(c) {
      return "List exactly 5 items about \"" + c.subject + "\". Reply with ONLY a numbered list: \"1. ...\\n2. ...\\n3. ...\\n4. ...\\n5. ...\" -- exactly 5 lines, no extra text.";
    },
    verify: function(out, _c) {
      var lines = parseNumberedLines(out);
      // Must have exactly 5 non-empty items; each must have at least 2 chars of real content
      return lines.length === 5 && lines.every(function(l) { return l.length >= 2; });
    },
  },

  // ------------------------------------------------------------------
  // TASK 4: SINGLE WORD STARTING WITH "M"
  // Constraint: exactly one word, first letter must be M (case-insensitive).
  // ------------------------------------------------------------------
  {
    id: "single-word-starts-m",
    category: "instruction-following",
    cases: [
      { prompt_extra: "a metal commonly machined in shops (single word, starts with M)" },
      { prompt_extra: "a machining process that starts with the letter M" },
      { prompt_extra: "a machine tool type starting with M" },
      { prompt_extra: "a material property relevant to cutting, starting with M" },
      { prompt_extra: "a measurement unit used in machining, starting with M" },
    ],
    prompt: function(c) {
      return "Reply with ONLY a single word that is: " + c.prompt_extra + ". One word only, starting with the letter M.";
    },
    verify: function(out, _c) {
      var w = words(trimCollapse(out));
      // Exactly one word; must start with M or m followed by at least one more letter
      return w.length === 1 && /^[mM][a-zA-Z]/.test(w[0]);
    },
  },

  // ------------------------------------------------------------------
  // TASK 5: NO LETTER E
  // Constraint: the response must not contain ANY occurrence of 'e' or 'E'.
  // ------------------------------------------------------------------
  {
    id: "no-letter-e",
    category: "instruction-following",
    cases: [
      { question: "What is a lathe?" },
      { question: "What does RPM stand for?" },
      { question: "Name a type of drill bit." },
      { question: "What is chip formation?" },
      { question: "What is a CNC program?" },
    ],
    prompt: function(c) {
      return "Answer this question without using the letter E (uppercase or lowercase) anywhere in your answer. Reply with ONLY the answer -- no letter E at all.\n\nQuestion: " + c.question;
    },
    verify: function(out, _c) {
      var s = trimCollapse(out);
      // Must have real content and zero instances of e/E
      return s.length > 0 && hasLetter(s) && hasNoE(s);
    },
  },

  // ------------------------------------------------------------------
  // TASK 6: EXACTLY ONE SENTENCE
  // Constraint: output must be a single sentence ending with a period,
  // containing no other sentence-ending punctuation (no ? or !).
  // ------------------------------------------------------------------
  {
    id: "exactly-one-sentence",
    category: "instruction-following",
    cases: [
      { topic: "what a milling cutter does" },
      { topic: "why coolant is used in machining" },
      { topic: "what G-code is" },
      { topic: "what a chuck does on a lathe" },
      { topic: "what depth of cut means" },
    ],
    prompt: function(c) {
      return "Explain \"" + c.topic + "\" in EXACTLY ONE SENTENCE. Reply with ONLY that single sentence -- it must end with a period and contain no other sentence-ending punctuation.";
    },
    verify: function(out, _c) {
      var s = trimCollapse(out);
      if (s.length < 5) { return false; }
      // Must end with a period
      if (!s.endsWith(".")) { return false; }
      // Must not contain ? or ! anywhere
      if (/[?!]/.test(s)) { return false; }
      // Must not have an interior sentence boundary: period + space + any letter (upper or lower).
      // Using [a-zA-Z] (not [A-Z]) catches "Sentence one. sentence two." with lowercase continuation.
      // Digit after period (e.g. "approx. 3000") is not flagged, preserving abbreviation tolerance.
      var withoutEnd = s.slice(0, -1);
      if (/\.\s+[a-zA-Z]/.test(withoutEnd)) { return false; }
      return true;
    },
  },

  // ------------------------------------------------------------------
  // TASK 7: COUNT WORDS AND REPLY WITH JUST THE NUMBER
  // Constraint: response must be the correct integer word count.
  // ------------------------------------------------------------------
  {
    id: "word-count-echo",
    category: "instruction-following",
    cases: [
      { input: "The spindle rotates at high speed.", expect: 6 },
      { input: "Coolant prevents heat buildup during cutting operations.", expect: 7 },
      { input: "End mills come in two four and six flute variants.", expect: 11 },
      { input: "A boring bar enlarges existing holes.", expect: 6 },
      { input: "Feed rate and spindle speed must be balanced for optimal results.", expect: 12 },
    ],
    prompt: function(c) {
      return "Count the number of words in this sentence. Reply with ONLY the integer word count, nothing else.\n\nSentence: \"" + c.input + "\"";
    },
    verify: function(out, c) {
      var s = trimCollapse(out).replace(/\s/g, "");
      if (!/^\d+$/.test(s)) { return false; }
      var n = parseInt(s, 10);
      return n === c.expect;
    },
  },

  // ------------------------------------------------------------------
  // TASK 8: YES OR NO ONLY
  // Constraint: response must be EXACTLY "yes" or "no" (case-insensitive, no extra text).
  // ------------------------------------------------------------------
  {
    id: "yes-or-no-only",
    category: "instruction-following",
    cases: [
      { question: "Is aluminum softer than steel?", expect: "yes" },
      { question: "Is G-code the same as M-code?", expect: "no" },
      { question: "Is RPM a measure of rotational speed?", expect: "yes" },
      { question: "Does a lathe spin the cutting tool?", expect: "no" },
      { question: "Is carbide harder than high-speed steel?", expect: "yes" },
    ],
    prompt: function(c) {
      return "Answer with ONLY the word \"yes\" or \"no\" -- nothing else, not even punctuation.\n\nQuestion: " + c.question;
    },
    verify: function(out, c) {
      var s = trimCollapse(out).toLowerCase().replace(/[^a-z]/g, "");
      // Must be exactly the word "yes" or "no" and match the expected answer
      return (s === "yes" || s === "no") && s === c.expect;
    },
  },

];

// ---------------------------------------------------------------------------
// SELF-TEST (run-as-main guard -- importing this module does NOT run the test)
// ---------------------------------------------------------------------------

var isMain =
  typeof process !== "undefined" &&
  typeof process.argv !== "undefined" &&
  process.argv[1] != null &&
  (process.argv[1].endsWith("stress-battery-instruction.mjs") ||
   process.argv[1].endsWith("stress-battery-instruction"));

if (isMain) {
  // Each entry: { id, extra(optional), good:{out,c}, bad:{out,c} }
  // verify(KNOWN-GOOD) must === true; verify(KNOWN-BAD) must === false
  var selfTests = [
    // Task: exactly-three-words -- basic good/bad
    {
      id: "exactly-three-words",
      good: { out: "cuts metal fast", c: { topic: "steel", num: 3 } },
      bad:  { out: "cuts metal",       c: { topic: "steel", num: 3 } },
    },
    // Task: exactly-three-words -- five words should fail
    {
      id: "exactly-three-words",
      extra: "five words fails",
      good: { out: "tough strong material",               c: { topic: "carbide inserts", num: 3 } },
      bad:  { out: "tough strong extremely durable stuff", c: { topic: "carbide inserts", num: 3 } },
    },
    // Task: all-uppercase -- basic
    {
      id: "all-uppercase",
      good: { out: "ALUMINUM", c: { question: "What metal is aluminum?" } },
      bad:  { out: "aluminum", c: { question: "What metal is aluminum?" } },
    },
    // Task: all-uppercase -- mixed case fails
    {
      id: "all-uppercase",
      extra: "mixed case fails",
      good: { out: "FANUC", c: { question: "Name one CNC controller brand." } },
      bad:  { out: "Fanuc", c: { question: "Name one CNC controller brand." } },
    },
    // Task: exactly-5-numbered-lines -- basic
    {
      id: "exactly-5-numbered-lines",
      good: {
        out: "1. Loosen set screw.\n2. Remove old tool.\n3. Clean holder.\n4. Insert new mill.\n5. Tighten screw.",
        c: { subject: "steps to change an end mill" },
      },
      bad: {
        out: "1. Loosen set screw.\n2. Remove old tool.\n3. Clean holder.",
        c: { subject: "steps to change an end mill" },
      },
    },
    // Task: exactly-5-numbered-lines -- six lines fails
    {
      id: "exactly-5-numbered-lines",
      extra: "6 lines fails",
      good: {
        out: "1. Step one.\n2. Step two.\n3. Step three.\n4. Step four.\n5. Step five.",
        c: { subject: "types of CNC machine operations" },
      },
      bad: {
        out: "1. Step one.\n2. Step two.\n3. Step three.\n4. Step four.\n5. Step five.\n6. Step six.",
        c: { subject: "types of CNC machine operations" },
      },
    },
    // Task: single-word-starts-m -- basic
    {
      id: "single-word-starts-m",
      good: { out: "Milling", c: { prompt_extra: "a machining process that starts with the letter M" } },
      bad:  { out: "Turning", c: { prompt_extra: "a machining process that starts with the letter M" } },
    },
    // Task: single-word-starts-m -- two words fails even if first starts with M
    {
      id: "single-word-starts-m",
      extra: "two words fails",
      good: { out: "Metal",      c: { prompt_extra: "a metal commonly machined in shops" } },
      bad:  { out: "Metal alloy", c: { prompt_extra: "a metal commonly machined in shops" } },
    },
    // Task: no-letter-e -- good answer has no e (verified: no e/E in "A tool spins raw stock.")
    {
      id: "no-letter-e",
      good: { out: "A tool spins raw stock.", c: { question: "What is a lathe?" } },
      bad:  { out: "A lathe is a machine that rotates workpieces.", c: { question: "What is a lathe?" } },
    },
    // Task: no-letter-e -- uppercase E also fails (verified: "CARBID TOOL" has no e/E)
    {
      id: "no-letter-e",
      extra: "uppercase E fails",
      good: { out: "CARBID TOOL",  c: { question: "Name a type of drill bit." } },
      bad:  { out: "CARBIDE TOOL", c: { question: "Name a type of drill bit." } },
    },
    // Task: exactly-one-sentence -- basic good
    {
      id: "exactly-one-sentence",
      good: { out: "A milling cutter rotates to remove material from a workpiece.", c: { topic: "what a milling cutter does" } },
      bad:  { out: "A milling cutter rotates. It removes material.",               c: { topic: "what a milling cutter does" } },
    },
    // Task: exactly-one-sentence -- question mark fails
    {
      id: "exactly-one-sentence",
      extra: "question mark fails",
      good: { out: "G-code is a programming language for CNC machines.", c: { topic: "what G-code is" } },
      bad:  { out: "What is G-code? It is a CNC language.",              c: { topic: "what G-code is" } },
    },
    // Task: exactly-one-sentence -- two sentences where second starts lowercase must fail
    {
      id: "exactly-one-sentence",
      extra: "lowercase second sentence fails",
      good: { out: "G-code is a CNC programming language used to control machine tools.", c: { topic: "what G-code is" } },
      bad:  { out: "G-code is a CNC language. it controls machine tools.",                c: { topic: "what G-code is" } },
    },
    // Task: exactly-5-numbered-lines -- 5 unnumbered lines must fail (no numbered list = wrong format)
    {
      id: "exactly-5-numbered-lines",
      extra: "unnumbered lines fail",
      good: { out: "1. Step one.\n2. Step two.\n3. Step three.\n4. Step four.\n5. Step five.", c: { subject: "common G-code motion commands" } },
      bad:  { out: "Step one.\nStep two.\nStep three.\nStep four.\nStep five.",               c: { subject: "common G-code motion commands" } },
    },
    // Task: word-count-echo -- correct count passes
    {
      id: "word-count-echo",
      good: { out: "6", c: { input: "The spindle rotates at high speed.", expect: 6 } },
      bad:  { out: "5", c: { input: "The spindle rotates at high speed.", expect: 6 } },
    },
    // Task: word-count-echo -- wrong number fails
    {
      id: "word-count-echo",
      extra: "wrong count fails",
      good: { out: "7", c: { input: "Coolant prevents heat buildup during cutting operations.", expect: 7 } },
      bad:  { out: "8", c: { input: "Coolant prevents heat buildup during cutting operations.", expect: 7 } },
    },
    // Task: yes-or-no-only -- yes matches yes
    {
      id: "yes-or-no-only",
      good: { out: "yes", c: { question: "Is aluminum softer than steel?", expect: "yes" } },
      bad:  { out: "no",  c: { question: "Is aluminum softer than steel?", expect: "yes" } },
    },
    // Task: yes-or-no-only -- extra text fails
    {
      id: "yes-or-no-only",
      extra: "extra text fails",
      good: { out: "no",                                     c: { question: "Does a lathe spin the cutting tool?", expect: "no" } },
      bad:  { out: "no, the lathe spins the workpiece",      c: { question: "Does a lathe spin the cutting tool?", expect: "no" } },
    },
  ];

  var passed = 0;
  var failed = 0;

  for (var i = 0; i < selfTests.length; i++) {
    var st = selfTests[i];
    var task = null;
    for (var j = 0; j < BATTERY.length; j++) {
      if (BATTERY[j].id === st.id) { task = BATTERY[j]; break; }
    }
    if (!task) {
      console.error("SELFTEST FAIL: task \"" + st.id + "\" not found in BATTERY");
      failed++;
      continue;
    }
    var label = st.extra ? (st.id + " (" + st.extra + ")") : st.id;

    var goodResult = task.verify(st.good.out, st.good.c);
    if (goodResult !== true) {
      console.error("SELFTEST FAIL [" + label + "]: verify(KNOWN-GOOD) returned " + goodResult + ", expected true");
      console.error("  out: " + JSON.stringify(st.good.out));
      failed++;
    } else {
      passed++;
    }

    var badResult = task.verify(st.bad.out, st.bad.c);
    if (badResult !== false) {
      console.error("SELFTEST FAIL [" + label + "]: verify(KNOWN-BAD) returned " + badResult + ", expected false");
      console.error("  out: " + JSON.stringify(st.bad.out));
      failed++;
    } else {
      passed++;
    }
  }

  var total = passed + failed;
  if (failed > 0) {
    console.error("SELFTEST FAILED " + failed + "/" + total);
    process.exit(1);
  } else {
    console.log("SELFTEST OK " + passed + "/" + total);
  }
}
