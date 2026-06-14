/**
 * ollama-capability-battery.mjs -- pure: a battery of VERIFIABLE task-types + code verifiers that
 * measure an Ollama model's TRUE success rate per task (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11).
 *
 * THE GOAL (operator 2026-06-11, "fable 5 demolished session limits"): only AUTO-OFFLOAD a task to
 * a local model when we KNOW it succeeds ~100% -- and we know that only by MEASURING with a code
 * verifier (R9/verifiedOffload doctrine: model trust is worthless; code verification is everything).
 * This battery is the measuring stick: each task has cases with KNOWN answers and a verify() that
 * checks CORRECTNESS (not just format), so a model's pass-rate is real, not vibes. The resulting
 * matrix drives which tasks expand the auto-offload set (command-ollama-routes / local-llm-task-router).
 *
 * Pure -> no fetch/fs; the live runner (ollama-capability-probe.mjs) injects the model caller.
 * Each task: { id, category, cases:[{input,expect,...}], prompt(case)->string, verify(output,case)->bool }.
 */

/** Normalize a model's free-text answer: strip code fences, trim, collapse, lowercase. */
export function norm(s) {
  return String(s == null ? "" : s)
    .replace(/```[a-z]*\n?/gi, "").replace(/```/g, "")
    .replace(/^\s*(answer|label|result)\s*[:=]\s*/i, "")
    .trim();
}

/** Extract the first number (int/float, optional sign) from text, or null. */
export function firstNumber(s) {
  const m = String(s == null ? "" : s).match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Parse a yes/no answer -> true/false/null. */
export function yesNo(s) {
  const t = norm(s).toLowerCase();
  if (/^(yes|true|y)\b/.test(t)) return true;
  if (/^(no|false|n)\b/.test(t)) return false;
  return null;
}

const INCH_TO_MM = 25.4;

export const TASK_BATTERY = [
  {
    id: "classify-enum",
    category: "classification",
    cases: [
      { input: "a 0.5mm carbide end mill plunging into 4140 steel", enum: ["milling", "turning", "grinding"], expect: "milling" },
      { input: "facing a shaft on a CNC lathe with CSS engaged", enum: ["milling", "turning", "grinding"], expect: "turning" },
      { input: "a vitrified wheel removing 0.001in per pass on hardened tool steel", enum: ["milling", "turning", "grinding"], expect: "grinding" },
    ],
    prompt: (c) => `Classify this machining operation into exactly one of [${c.enum.join(", ")}]. Reply with ONLY the single lowercase label, nothing else.\n\nOperation: ${c.input}`,
    verify: (out, c) => norm(out).toLowerCase().replace(/[.]/g, "") === c.expect,
  },
  {
    id: "unit-convert",
    category: "deterministic-transform",
    cases: [
      { input: 1, expect: 25.4 }, { input: 0.5, expect: 12.7 }, { input: 2.5, expect: 63.5 },
    ],
    prompt: (c) => `Convert ${c.input} inches to millimetres (1 inch = 25.4 mm). Reply with ONLY the number, no units, no words.`,
    verify: (out, c) => { const n = firstNumber(out); return n != null && Math.abs(n - c.input * INCH_TO_MM) < 0.01; },
  },
  {
    id: "extract-number",
    category: "extraction",
    cases: [
      { input: "The bore diameter is 12.7 mm with a depth of 30 mm.", ask: "bore diameter in mm", expect: 12.7 },
      { input: "Tap an M6 thread, pilot hole 5.0 mm, 18 mm deep.", ask: "pilot hole diameter in mm", expect: 5.0 },
    ],
    prompt: (c) => `From the text, extract the ${c.ask}. Reply with ONLY the number.\n\nText: ${c.input}`,
    verify: (out, c) => { const n = firstNumber(out); return n != null && Math.abs(n - c.expect) < 0.01; },
  },
  {
    id: "boolean-judgment",
    category: "classification",
    cases: [
      { input: "Is 17-4 PH a stainless steel?", expect: true },
      { input: "Is tungsten carbide a thermoplastic?", expect: false },
      { input: "Does climb milling generally leave a better surface finish than conventional milling?", expect: true },
    ],
    prompt: (c) => `Answer with ONLY 'yes' or 'no'.\n\n${c.input}`,
    verify: (out, c) => yesNo(out) === c.expect,
  },
  {
    id: "json-extract",
    category: "extraction",
    cases: [
      { input: "Material: 6061-T6 aluminum. Hardness: 95 HB.", expect: { material: "6061-T6 aluminum" } },
    ],
    prompt: (c) => `Extract the material into JSON. Reply with ONLY a JSON object: {"material": "<value>"}.\n\nText: ${c.input}`,
    verify: (out, c) => {
      try {
        const j = JSON.parse(norm(out).replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
        return typeof j.material === "string" && /6061/.test(j.material) && /alum/i.test(j.material);
      } catch { return false; }
    },
  },
  {
    id: "keyword-extract",
    category: "extraction",
    cases: [
      { input: "The fixture uses a Kurt DX6 vise with soft jaws to hold the part during the roughing pass.", mustInclude: ["vise"], minCount: 3 },
    ],
    prompt: (c) => `List exactly 3 key technical nouns from the text, comma-separated, lowercase. Reply with ONLY the comma-separated list.`,
    verify: (out, c) => {
      const parts = norm(out).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
      return parts.length >= c.minCount && c.mustInclude.every((k) => parts.some((p) => p.includes(k)));
    },
  },
  {
    // Deterministic arithmetic (a calc capability signal; PRISM routes real physics to prism_calc).
    id: "arithmetic",
    category: "deterministic-transform",
    cases: [
      { expr: "12.5 * 3.2", expect: 40 }, { expr: "144 / 16", expect: 9 }, { expr: "7 * 8 - 6", expect: 50 },
    ],
    prompt: (c) => `Compute ${c.expr}. Reply with ONLY the numeric result.`,
    verify: (out, c) => { const n = firstNumber(out); return n != null && Math.abs(n - c.expect) < 0.001; },
  },
  {
    // List transform: sort a small numeric list ascending. Verified by exact equality.
    // (regex-generate was considered + DROPPED: running a model-generated regex is a ReDoS surface
    //  not worth an re2 dependency for a $0 probe. Code-lite generation stays a Claude task.)
    id: "list-sort",
    category: "format",
    cases: [
      { input: [3, 1, 2], expect: [1, 2, 3] }, { input: [10, -4, 0, 7], expect: [-4, 0, 7, 10] },
    ],
    prompt: (c) => `Sort this list of numbers in ascending order: [${c.input.join(", ")}]. Reply with ONLY the sorted list as comma-separated numbers.`,
    verify: (out, c) => {
      const nums = norm(out).replace(/[[\]]/g, "").split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x));
      return nums.length === c.expect.length && nums.every((n, i) => n === c.expect[i]);
    },
  },
];

/**
 * Aggregate raw results -> a {taskId: {category, models: {model: {pass,total,rate}}}} matrix.
 * `results` = [{taskId, category, model, pass:boolean}]. Pure.
 */
export function scoreMatrix(results) {
  const out = {};
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || !r.taskId || !r.model) continue;
    const t = (out[r.taskId] ||= { category: r.category || "", models: {} });
    const m = (t.models[r.model] ||= { pass: 0, total: 0, rate: 0 });
    m.total += 1;
    if (r.pass) m.pass += 1;
    m.rate = m.total ? Math.round((m.pass / m.total) * 100) / 100 : 0;
  }
  return out;
}

/** Given a scored matrix + a rate threshold, list the (taskId, model) pairs that are auto-offload-safe. */
export function autoOffloadCandidates(matrix, threshold = 1.0) {
  const out = [];
  for (const [taskId, t] of Object.entries(matrix || {})) {
    for (const [model, s] of Object.entries(t.models)) {
      if (s.total > 0 && s.rate >= threshold) out.push({ taskId, model, category: t.category, rate: s.rate, total: s.total });
    }
  }
  return out.sort((a, b) => b.rate - a.rate || a.taskId.localeCompare(b.taskId));
}
