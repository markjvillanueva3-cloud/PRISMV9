/**
 * stress-judge.mjs -- LLM-as-judge quality metric for the GENERATIVE stress battery.
 *
 * WHY: the keyword-overlap metric (coversFacts in stress-battery-generative.mjs) is a good cheap
 * gate for EASY/MEDIUM generative tasks but is BRITTLE on the HARD tier -- a strong model gives a
 * correct CONCISE/PARAPHRASED answer that does not contain the exact required synonyms, so it scores
 * a false 0% (empirically: clean idle-GPU run, summarize-hard 32b=0% with noSignal=0, i.e. it ANSWERED
 * but the substring metric missed it -- reference_ollama_generative_stratified_harness_2026_06_25).
 * The LLM-judge fixes that: a strong local model (qwen2.5-coder:32b) reads the OUTPUT + the required
 * facts and decides PASS/FAIL on SEMANTIC fact-capture (paraphrase counts), $0 on the local Blackwell.
 *
 * Integration: the generative-judged battery's `verify` is ASYNC and calls judgeFactCapture; the
 * runner (ollama-stress-test.mjs runTaskOnModel) now `await`s verify so a sync (keyword) OR async
 * (judge) verify both work.
 *
 * Env: PRISM_STRESS_JUDGE_MODEL (default qwen2.5-coder:32b) ; OLLAMA_URL (default 127.0.0.1:11434).
 */

const JUDGE_MODEL = process.env.PRISM_STRESS_JUDGE_MODEL || "qwen2.5-coder:32b";
const OLLAMA = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");

/**
 * Render the battery's `must` fact-groups (each group = accepted synonyms for ONE required fact)
 * into a numbered checklist the judge can read. Pure.
 * @param {string[][]} mustGroups
 * @returns {string}
 */
export function renderFacts(mustGroups) {
  if (!Array.isArray(mustGroups) || mustGroups.length === 0) return "(no required facts)";
  return mustGroups
    .map((g, i) => `${i + 1}. ${(Array.isArray(g) ? g : [g]).filter((s) => typeof s === "string" && s).join(" / ")}`)
    .join("\n");
}

/**
 * Parse a judge model's free-text reply into a boolean verdict. The judge is instructed to END with
 * a line containing ONLY PASS or FAIL; models often reason first, so the LAST standalone PASS/FAIL
 * token wins (the model's final conclusion). No token at all -> false (fail-safe -- never a vacuous
 * pass). Pure -> unit-testable without a model.
 * @param {string} response
 * @returns {boolean}
 */
export function parseJudgeVerdict(response) {
  if (typeof response !== "string") return false;
  const tokens = response.toUpperCase().match(/\b(PASS|FAIL)\b/g);
  if (!tokens || tokens.length === 0) return false;
  return tokens[tokens.length - 1] === "PASS";
}

/**
 * Build the judge prompt: required facts (paraphrase-accepting) + the output, asking for a final
 * PASS/FAIL. Pure.
 */
export function buildJudgePrompt(output, mustGroups) {
  return (
    `You are grading whether a model OUTPUT conveys the required key facts. The output PASSES only if ` +
    `it conveys EVERY required fact, in ANY wording -- a paraphrase or synonym counts; the exact ` +
    `keywords are NOT required. The output FAILS if it omits or contradicts any required fact.\n\n` +
    `Required facts (each line is ONE fact; the slashes list acceptable phrasings):\n${renderFacts(mustGroups)}\n\n` +
    `OUTPUT TO GRADE:\n${typeof output === "string" ? output : ""}\n\n` +
    `Reason in one short sentence if needed, then end your reply with a single line containing ONLY ` +
    `the word PASS or FAIL.`
  );
}

/**
 * Async LLM-judge: does `output` semantically capture every required fact in `mustGroups`?
 * Calls the judge model (default qwen2.5-coder:32b) via Ollama.
 *
 * TRI-STATE return (this is deliberate -- scrutiny P2, the false-0-one-layer-up fix): a judge that
 * COULD NOT grade (call error / timeout / non-ok HTTP / a response with no clear PASS|FAIL verdict)
 * returns `null` = ABSTAIN, NOT `false`. The runner maps an abstain to noSignal (a missing QUALITY
 * datapoint), so a JUDGE failure is never silently charged to the SUBJECT as a measured FAIL -- the
 * same false-0 class the subject-side guard fixed (reference_ollama_generative_stratified_harness).
 * Only a real PASS verdict -> true, a real FAIL verdict -> false.
 * @param {string} output
 * @param {string[][]} mustGroups
 * @param {object} [opts]  { model, timeoutMs, callFn }  -- callFn(model, prompt)->string|{text} injectable for tests
 * @returns {Promise<boolean|null>}  true=PASS, false=FAIL, null=ABSTAIN (could not grade)
 */
export async function judgeFactCapture(output, mustGroups, opts = {}) {
  const model = opts.model || JUDGE_MODEL;
  const prompt = buildJudgePrompt(output, mustGroups);
  let resp = null;
  if (typeof opts.callFn === "function") {
    try {
      const r = await opts.callFn(model, prompt);
      resp = typeof r === "string" ? r : (r && typeof r.text === "string" ? r.text : "");
    } catch {
      return null; // judge call threw -> ABSTAIN (could not grade), NOT a subject FAIL
    }
  } else {
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false, keep_alive: "10m", options: { temperature: 0, num_predict: 200 } }),
        signal: AbortSignal.timeout(Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 60000),
      });
      if (!res.ok) return null; // non-ok HTTP -> ABSTAIN
      const j = await res.json();
      resp = typeof j?.response === "string" ? j.response : "";
    } catch {
      return null; // timeout / fetch error -> ABSTAIN
    }
  }
  // We have a response. A clear PASS|FAIL token -> true/false; no parseable verdict -> ABSTAIN (null).
  if (typeof resp !== "string" || !/\b(PASS|FAIL)\b/i.test(resp)) return null;
  return parseJudgeVerdict(resp);
}
