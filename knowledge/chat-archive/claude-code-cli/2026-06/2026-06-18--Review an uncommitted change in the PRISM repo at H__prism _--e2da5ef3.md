---
type: "chat-session"
source: "claude-code-cli"
session_id: "e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63"
title: "Review an uncommitted change in the PRISM repo at H:/prism (branch cad-fusion-li"
date: "2026-06-18"
first_ts: "2026-06-18T03:29:20.106Z"
last_ts: "2026-06-18T03:31:04.582Z"
cwd: "H:\\prism-slot-xray"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-xray/e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63/subagents/agent-adf7de35f88c11eb9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review an uncommitted change in the PRISM repo at H:/prism (branch cad-fusion-li

> **claude-code-cli** | 2026-06-18 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63/subagents/agent-adf7de35f88c11eb9.jsonl`

## Transcript

### User | 2026-06-18T03:29:20.106Z

Review an uncommitted change in the PRISM repo at H:/prism (branch cad-fusion-live-ms0). Run `git -C H:/prism diff -- scripts/lib/ollama-vision-extract-lib.mjs scripts/lib/vision-ensemble-fuse.mjs scripts/blueprint-ocr-training-loop.mjs scripts/run-ocr-training-loop-overnight.ps1 scripts/lib/vision-ensemble-fuse.test.mjs` to see the exact change, and read the surrounding code as needed.

CONTRACT being implemented: thread an optional `format` param (value "json") through the OCR ensemble so the closed-loop training run can enable Ollama server-side grammar-constrained JSON decoding, which structurally prevents the documented qwen2.5vl runaway-JSON dropout (~30-37% of outputs lost to malformed JSON). The chain is: training loop opts (`--format-json` -> opts.format="json") -> runEnsembleOverImage({format}) -> ocrImageWithModelAsync({format}) -> buildOllamaRequestBody({format}) which adds a top-level `format` key via `...(opts.format ? { format: opts.format } : {})`.

CRITICAL INVARIANT to verify: DEFAULT-OFF must be byte-identical-legacy. When `--format-json` is NOT passed, opts.format is undefined, and the produced Ollama request body must have NO `format` key (JSON.stringify identical to before the change). Confirm the conditional spread guarantees this and that no call site accidentally forces format on.

Weighted toward: silent breakage, regression risk, the byte-identical-when-unset contract, whether `format: a.format` (undefined) anywhere changes serialized output, integration coupling with the running production training (the wrapper run-ocr-training-loop-overnight.ps1 now passes --format-json), and whether the 3 new tests actually fail if the threading is reverted (real coverage, not stubs). Note: only ONE curl call site exists; buildOllamaRequestBody is the single body builder.

Report P0/P1/P2 findings with file:line citations and grade PASS or FAIL. Do NOT assume the other reviewer caught anything.

### Assistant | 2026-06-18T03:29:23.648Z

I'll analyze this change carefully, focusing on the byte-identical-when-unset contract and silent breakage risks.

### Assistant | 2026-06-18T03:29:25.109Z

[tool_use: Bash]

### User | 2026-06-18T03:29:29.685Z

[tool_result] diff --git a/scripts/blueprint-ocr-training-loop.mjs b/scripts/blueprint-ocr-training-loop.mjs
index 8f25593a0a..0431321665 100644
--- a/scripts/blueprint-ocr-training-loop.mjs
+++ b/scripts/blueprint-ocr-training-loop.mjs
@@ -83,6 +83,11 @@ function parseArgs(args) {
     // When OFF, the weak-label path is byte-identical to before.
     pageClassify: has("--page-classify"),
     pageClassifyMinC
... [+10351 chars truncated]

### Assistant | 2026-06-18T03:29:33.593Z

The hook is a false-positive triage (no test was run, this was a git diff). Let me read the surrounding code to verify the contract.

### Assistant | 2026-06-18T03:29:35.006Z

[tool_use: Read]

### Assistant | 2026-06-18T03:29:35.500Z

[tool_use: Read]

### User | 2026-06-18T03:29:37.561Z

[tool_result] 425	        dimensions_total: dimensions.length,
426	        dimensions_unit_resolved: resolvedCount,
427	      },
428	      source: "ollama-vision",
429	    },
430	  };
431	}
432	
433	export function buildOllamaRequestBody(prompt, imageBase64, opts = {}) {
434	  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
435	  return {
436	    model,
437	    pr
... [+3548 chars truncated]

### User | 2026-06-18T03:29:37.839Z

[tool_result] 375	 * }} a
376	 * @returns {Promise<object>}  extraction shape, or { error:string }
377	 */
378	export async function ocrImageWithModelAsync(a) {
379	  const deps = a.deps || {};
380	  const writeFile = typeof deps.writeFile === "function" ? deps.writeFile : writeFileSync;
381	  const unlink = typeof deps.unlink === "function" ? deps.unlink : unlinkSync;
382	  if (typeof a.imageBase64 !== "string
... [+4810 chars truncated]

### Assistant | 2026-06-18T03:29:40.601Z

The threading is clean. Now let me verify the key conditional spread behavior and the `format: a.format` (undefined) concern, plus the test helpers exist and actually exercise the path.

### Assistant | 2026-06-18T03:29:42.017Z

[tool_use: Grep]

### User | 2026-06-18T03:29:43.091Z

[tool_result] H:\prism\scripts\blueprint-ocr-training-loop.mjs:37:import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
H:\prism\scripts\blueprint-ocr-training-loop.mjs:197:      const res = await runEnsembleOverImage({ png: g.png, models, assumeUnits: "in", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, format: opts.format, workDir });
H:\prism\scripts\blueprint-ocr-training-loop.mjs:296:
... [+8500 chars truncated]

### Assistant | 2026-06-18T03:29:43.190Z

[tool_use: Grep]

### User | 2026-06-18T03:29:44.273Z

[tool_result] 259:function fakeSpawnSeq(responses) {
275:function okReply(diaIn, conf) {
286:    spawn: fakeSpawnSeq([okReply(0.5, 0.9), okReply(0.5, 0.9), { code: 7, out: "" }]), // m3 = curl fail
322:function capturingSpawn() {
331:      child.stdout.emit("data", Buffer.from(okReply(0.5, 0.9).out));
345:  const spawn = capturingSpawn();
355:  const spawn = capturingSpawn();
364:  const spawn = capturingSpawn(
... [+375 chars truncated]

### Assistant | 2026-06-18T03:29:50.077Z

The blast radius is fully traced: the other 4 call sites of `runEnsembleOverImage`/`buildOllamaRequestBody` (`validate-perfect-parts.mjs:144`, `vision-ensemble-extract.mjs:126`, `ocr-closed-loop.mjs:46`, `run-ollama-vision-extract.mjs:185`, `vision-ab-compare.mjs:414`) do NOT pass `format`, so they remain undefined and unchanged. Let me verify the test helpers `fakeSpawnSeq` and `okReply` produce parseable responses (so the new tests actually run to completion, not the false-positive timeout the hook flagged), and check the critical `format: a.format` undefined-serialization concern.

### Assistant | 2026-06-18T03:29:51.320Z

[tool_use: Read]

### User | 2026-06-18T03:29:52.182Z

[tool_result] 255	// ── runEnsembleOverImage (impure shell, fully dependency-injected — no GPU/Ollama) ──
256	
257	// Fake curl spawn returning a canned {status,out} per call, in invocation order. Emits on a
258	// microtask so the Promise-based curlAsync settles asynchronously, exercising the real path.
259	function fakeSpawnSeq(responses) {
260	  let i = 0;
261	  return () => {
262	    const r = responses[i++
... [+3450 chars truncated]

### Assistant | 2026-06-18T03:29:55.439Z

Now I have everything needed to verify the test infrastructure. Let me confirm the new tests actually run and fail on revert by checking the test mechanics and running the suite.

### Assistant | 2026-06-18T03:29:56.889Z

[tool_use: Read]

### Assistant | 2026-06-18T03:29:57.469Z

[tool_use: Bash]

### User | 2026-06-18T03:29:57.772Z

[tool_result] 329	    child.kill = () => {};
330	    queueMicrotask(() => {
331	      child.stdout.emit("data", Buffer.from(okReply(0.5, 0.9).out));
332	      child.emit("close", 0);
333	    });
334	    return child;
335	  };
336	  fn.maxTimeOf = (i = 0) => {
337	    const args = calls[i] || [];
338	    const k = args.indexOf("--max-time");
339	    return k >= 0 ? Number(args[k + 1]) : null;
340	  };
341	  retu
... [+382 chars truncated]

### User | 2026-06-18T03:30:02.996Z

[tool_result]   ...
# Subtest: ocrImageWithModelAsync: caps the per-call --max-time at 600s even when the 5h window is passed
ok 27 - ocrImageWithModelAsync: caps the per-call --max-time at 600s even when the 5h window is passed
  ---
  duration_ms: 0.2791
  ...
# Subtest: ocrImageWithModelAsync: unset maxTimeSec -> DEFAULT 300s per call
ok 28 - ocrImageWithModelAsync: unset maxTimeSec -> DEFAULT 300s per call

... [+1055 chars truncated]

### Assistant | 2026-06-18T03:30:05.648Z

All 32 tests pass (no timeout — the hook triage was a false positive). Now let me prove the 3 new tests actually FAIL on revert (real coverage, not stubs) by temporarily reverting the threading in the lib and re-running, then restoring.

### Assistant | 2026-06-18T03:30:08.673Z

[tool_use: Bash]

### User | 2026-06-18T03:30:13.624Z

[tool_result] === reverted ocrImageWithModelAsync threading; running format tests ===
not ok 1 - format threading: --format-json -> EVERY ensemble request body carries format:'json'
ok 2 - format threading: unset -> NO `format` key in the request body (byte-identical legacy)
not ok 3 - ocrImageWithModelAsync: format passes straight through to the request body
# tests 3
# pass 1
# fail 2
=== restoring ===

### Assistant | 2026-06-18T03:30:20.827Z

The revert proof confirms real coverage. The two threading tests (`--format-json -> EVERY...` and `ocrImageWithModelAsync: format passes straight through`) FAIL when threading is reverted, while the byte-identical-when-unset test correctly stays green (it should — it asserts the default-off path which is unaffected by reverting the threading).

Let me verify one remaining concern: the byte-identical test only checks `!("format" in body)` — but I want to confirm the unset test would actually CATCH a regression where `format: undefined` is serialized. Let me also confirm the `format: a.format` (undefined) serialization concern at line 388 of the lib, since that's the one place `format` is passed unconditionally.

### Assistant | 2026-06-18T03:30:26.556Z

[tool_use: Bash]

### User | 2026-06-18T03:30:31.533Z

[tool_result] format-undef has key: false
legacy        has key: false
undef === legacy (byte): true
json has format: json
empty-string omitted (falsy): true

### Assistant | 2026-06-18T03:30:35.103Z

The critical invariant is proven empirically: `buildOllamaRequestBody` with `format: undefined` produces a body that is `JSON.stringify`-identical to the legacy body (no `format` key). The conditional spread `...(opts.format ? { format: opts.format } : {})` correctly omits the key, never emitting `format: undefined`.

Let me do a final check on `parseArgs` in the training loop to confirm `--format-json` is the only way `opts.format` gets set, and verify no other call site in the two consuming scripts forces format on.

### Assistant | 2026-06-18T03:30:36.611Z

[tool_use: Bash]

### User | 2026-06-18T03:30:46.001Z

[tool_result] scripts/blueprint-ocr-training-loop.mjs:45:  formatCursorLine,
scripts/blueprint-ocr-training-loop.mjs:86:    // OPT-IN (default OFF): pass Ollama format:"json" grammar-constrained decode to every ensemble VLM
scripts/blueprint-ocr-training-loop.mjs:89:    // exclusions). When OFF, opts.format is undefined -> the request body is byte-identical to before.
scripts/blueprint-ocr-training-loop.mjs:90:
... [+1872 chars truncated]

### Assistant | 2026-06-18T03:31:04.582Z

All confirmed. `opts.format` is set ONLY by `--format-json` (line 90: `has("--format-json") ? "json" : undefined`). The two `runEnsembleOverImage` call sites in the training loop both pass `format: opts.format` (lines 197, 296). The other consumers (`validate-perfect-parts.mjs`, `vision-ensemble-extract.mjs`) have zero `format` references, so they remain undefined and byte-identical. The PowerShell wrapper passes `--format-json` as a literal array element (line 55), correctly enabling the production opt-in.

I have completed a full verification. Here is my verdict.

---

VERDICT: PASS

summary: The optional `format` param is threaded cleanly through all 4 layers (parseArgs -> runEnsembleOverImage -> ocrImageWithModelAsync -> buildOllamaRequestBody) with no silent breakage. The byte-identical-when-unset invariant is empirically proven: `buildOllamaRequestBody` with `format: undefined` produces a `JSON.stringify`-identical body to legacy (no `format` key), because the conditional spread `...(opts.format ? { format: opts.format } : {})` omits the key entirely rather than emitting `format: undefined`. The 3 new tests provide real coverage — 2 of the 3 demonstrably FAIL when threading is reverted, the third (unset path) correctly stays green.

findings:
  - none

Consumers / edge-paths traced (audit trail for the PASS):
- **The `format: a.format` (undefined) serialization concern** — `scripts/lib/vision-ensemble-fuse.mjs:388` passes `format: a.format` unconditionally to `buildOllamaRequestBody`. Verified empirically that when `a.format` is undefined the conditional spread at `scripts/lib/ollama-vision-extract-lib.mjs:448` omits the key; `JSON.stringify(withUndef) === JSON.stringify(legacy)` returns `true`. No `format: undefined` ever reaches the serialized request body.
- **Single body builder / single curl site** — confirmed `buildOllamaRequestBody` is the only body builder and `ocrImageWithModelAsync` (`vision-ensemble-fuse.mjs:391-393`) is the only curl call site in t
... [+1413 chars truncated]
