/**
 * rba-live-validate.mts -- LIVE (non-hermetic) validation of ReasonBeforeActionEngine.
 *
 * The 65 committed tests inject a FAKE consensus panel, so they prove the engine's
 * LOGIC but not that it actually reaches the live local octopus / Ollama. This script
 * is the R15 VALIDATE leg: it runs `reasonBeforeActionEngine.plan()` against the REAL
 * MultiModelConsensusEngine + local Ollama and asserts the live safety invariants.
 *
 * It is a STANDALONE script (NOT a vitest test) because it spawns real models -- it is
 * intentionally non-hermetic and multi-second. Re-run before any operator activation
 * (U-RBA-WIRE-05) to confirm the substrate is healthy:
 *
 *   cd mcp-server && node_modules/.bin/tsx scripts/rba-live-validate.mts
 *
 * $0: the engine hard-disables every cloud voice, so this calls ONLY local Ollama.
 * Exit code 0 = all live invariants held; 1 = a real invariant violation.
 */

import http from "node:http";
import {
  reasonBeforeActionEngine,
  rbaPinnedModels,
  type RBAPlanInput,
  type RBAPlanResult,
} from "../src/engines/ReasonBeforeActionEngine.js";

/**
 * Pre-warm the engine's pinned local models (one tiny generate each, keep_alive).
 * Activation REQUIRES this -- a cold model blows any latency cap -> fail-open. This
 * step makes the validation run WARM so it measures the realistic in-production path.
 */
async function prewarm(models: string[]): Promise<void> {
  for (const model of models) {
    await new Promise<void>((resolve) => {
      const body = JSON.stringify({ model, prompt: "PROCEED", stream: false, keep_alive: "10m", options: { num_predict: 1, temperature: 0 } });
      const r = http.request(
        { host: "127.0.0.1", port: 11434, path: "/api/generate", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } },
        (res) => { res.on("data", () => {}); res.on("end", () => resolve()); },
      );
      r.on("error", () => resolve()); // best-effort; the engine fail-opens if a model is absent
      r.setTimeout(90_000, () => { r.destroy(); resolve(); });
      r.write(body);
      r.end();
    });
  }
}

interface Scenario {
  label: string;
  input: RBAPlanInput;
  /** Paths that are ACCEPTABLE for this scenario (fail-open is always acceptable -- infra hiccup). */
  expectPaths: RBAPlanResult["path"][];
  expectTier: RBAPlanResult["riskTier"];
}

const CLOUD_VENDORS = /claude|gpt|codex|grok|gemini|deepseek-api|glm|anthropic|openai/i;

const scenarios: Scenario[] = [
  {
    label: "LOW  read-only (Read tool)",
    input: { intent: "read a source file to understand it", tool_name: "Read", tool_input: { file_path: "src/engines/Foo.ts" } },
    expectPaths: ["deterministic"],
    expectTier: "low",
  },
  {
    label: "LOW  grep search",
    input: { intent: "search for a symbol", tool_name: "Grep", tool_input: { pattern: "classifyActionRisk" } },
    expectPaths: ["deterministic"],
    expectTier: "low",
  },
  {
    label: "MED  benign file write (Write tool)",
    input: { intent: "write a new doc note", tool_name: "Write", tool_input: { file_path: "notes/hello.md", content: "# hello\nsome notes" } },
    expectPaths: ["fast-path", "fail-open"],
    expectTier: "medium",
  },
  {
    label: "MED  git commit (history mutation)",
    input: { intent: "commit the finished unit", tool_name: "Bash", tool_input: { command: "git add -A && git commit -m 'wip'" } },
    expectPaths: ["fast-path", "fail-open"],
    expectTier: "medium",
  },
  {
    label: "HIGH rm -rf (recursive force delete)",
    input: { intent: "clean the build dir", tool_name: "Bash", tool_input: { command: "rm -rf ./dist" } },
    expectPaths: ["full-octopus", "fail-open"],
    expectTier: "high",
  },
  {
    label: "HIGH git push --force",
    input: { intent: "force-push my branch", tool_name: "Bash", tool_input: { command: "git push --force origin slot/india" } },
    expectPaths: ["full-octopus", "fail-open"],
    expectTier: "high",
  },
];

function checkInvariants(s: Scenario, r: RBAPlanResult): string[] {
  const errs: string[] = [];
  // INV-1: never throws (we got a result -- implicit). INV-2: tier correct (post-ratchet).
  if (r.riskTier !== s.expectTier) errs.push(`tier ${r.riskTier} != expected ${s.expectTier}`);
  // INV-3: path is one of the acceptable paths.
  if (!s.expectPaths.includes(r.path)) errs.push(`path '${r.path}' not in [${s.expectPaths.join(",")}]`);
  // INV-4: a fail-open MUST be PROCEED (never blocks on its own fault).
  if (r.path === "fail-open" && r.verdict !== "PROCEED") errs.push(`fail-open verdict was '${r.verdict}', must be PROCEED`);
  if (r.path === "fail-open" && r.ok !== false) errs.push(`fail-open ok was ${r.ok}, must be false`);
  // INV-5: deterministic low-risk = PROCEED, ok:true, zero voices.
  if (r.path === "deterministic" && (r.verdict !== "PROCEED" || r.ok !== true || r.voices.length !== 0)) {
    errs.push(`deterministic path malformed: verdict=${r.verdict} ok=${r.ok} voices=${r.voices.length}`);
  }
  // INV-6 ($0/LOCAL-ONLY): no cloud vendor may appear among the voters.
  const leaked = r.voices.filter((v) => CLOUD_VENDORS.test(v));
  if (leaked.length) errs.push(`CLOUD VOICE LEAK in voters: ${leaked.join(",")}`);
  // INV-7: a real model path that succeeded should carry >=1 voice.
  if ((r.path === "fast-path" || r.path === "full-octopus") && r.voices.length < 1) {
    errs.push(`model path '${r.path}' returned 0 voices`);
  }
  // INV-8: agreement is a probability.
  if (!(r.agreementScore >= 0 && r.agreementScore <= 1)) errs.push(`agreementScore ${r.agreementScore} out of [0,1]`);
  return errs;
}

async function main(): Promise<void> {
  console.log("=== ReasonBeforeActionEngine LIVE validation (real octopus + local Ollama) ===\n");
  const pinned = rbaPinnedModels();
  const warmSet = Array.from(new Set([pinned.primary, pinned.secondary]));
  console.log(`pinned models: primary=${pinned.primary} secondary=${pinned.secondary}`);
  console.log(`prewarming ${warmSet.length} model(s) (keep_alive 10m) ...`);
  await prewarm(warmSet);
  console.log("prewarm done.\n");
  let anyFailure = false;
  let reachedOllama = 0;
  const rows: string[] = [];

  for (const s of scenarios) {
    const r = await reasonBeforeActionEngine.plan(s.input);
    const errs = checkInvariants(s, r);
    if (errs.length) anyFailure = true;
    if (r.path === "fast-path" || r.path === "full-octopus") reachedOllama++;
    const status = errs.length ? "FAIL" : "ok  ";
    rows.push(
      `[${status}] ${s.label}\n` +
        `        verdict=${r.verdict} path=${r.path} tier=${r.riskTier} ok=${r.ok} ` +
        `agree=${r.agreementScore.toFixed(2)} voices=[${r.voices.join(", ") || "-"}] ${r.totalLatencyMs}ms` +
        (errs.length ? `\n        !! ${errs.join(" | ")}` : "") +
        `\n        rationale: ${r.rationale}`,
    );
  }

  console.log(rows.join("\n\n"));
  console.log("\n=== summary ===");
  console.log(`scenarios: ${scenarios.length}  reached-live-Ollama: ${reachedOllama}/${scenarios.filter((s) => s.expectTier !== "low").length} non-low`);

  // The WHOLE POINT of live validation: the model path must actually fire at least once.
  // If every medium/high scenario fail-opened, the live Ollama integration is NOT proven (R12).
  if (reachedOllama === 0) {
    console.error("\nLIVE-INTEGRATION NOT PROVEN: every model-path scenario fail-opened (Ollama unreachable from the engine).");
    process.exit(1);
  }
  if (anyFailure) {
    console.error("\nRESULT: FAIL -- a live invariant was violated above.");
    process.exit(1);
  }
  console.log("\nRESULT: PASS -- all live safety invariants held; engine reached the local octopus end-to-end.");
  process.exit(0);
}

main().catch((e) => {
  console.error("HARNESS ERROR (engine should never throw -- this is a harness/import fault):", e);
  process.exit(2);
});
