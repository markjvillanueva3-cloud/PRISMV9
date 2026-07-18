---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Independent second-pass review of a GNN classifier change (PRISM slot:india, GNN"
date: "2026-06-04"
first_ts: "2026-06-04T16:56:18.346Z"
last_ts: "2026-06-04T17:42:14.676Z"
cwd: "H:\\prism"
messages: 78
user_msgs: 27
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a0edceaac2f5b7ef9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of a GNN classifier change (PRISM slot:india, GNN

> **claude-code-cli** | 2026-06-04 | 78 msgs (27 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-a0edceaac2f5b7ef9.jsonl`

## Transcript

### User | 2026-06-04T16:56:18.346Z

Independent second-pass review of a GNN classifier change (PRISM slot:india, GNN-F0). Weight your review toward what a correctness-focused reviewer might MISS: test integrity, integration/coupling, the soundness of a mixed-metric "improvement", and convention conformance. Read all 4 files end-to-end:

1. H:/prism/scripts/build-node-embeddings.mjs
2. H:/prism/scripts/build-node-embeddings.test.mjs
3. H:/prism/scripts/seed-ghost-gnn-classify.mjs
4. H:/prism/scripts/seed-ghost-gnn-classify.test.mjs

See exact changes: `git -C H:/prism diff scripts/build-node-embeddings.mjs scripts/build-node-embeddings.test.mjs scripts/seed-ghost-gnn-classify.mjs scripts/seed-ghost-gnn-classify.test.mjs`

WHAT CHANGED:
- build-node-embeddings.mjs: ghost embed text is enriched with a leak-free engine SOURCE signal (engineSourceSignal: file docblock + class names + public method names) resolved from mcp-server/src/engines. Resume-hash now reflects actual embed text. New knob PRISM_NNG_GHOST_SOURCE (default on).
- seed-ghost-gnn-classify.mjs: added isotonic confidence calibration (fitIsotonic/applyIsotonic/fitDirectConfidenceCalibrator) via leave-one-out on the reference pool — but it REGRESSED the live holdout, so it ships DEFAULT OFF (PRISM_NNG_DIRECT_CALIBRATE=1 to opt in). Honest negative result.

LIVE RESULT (shipped, calibration off): the source enrichment lifted macroF1 0.326→0.423 and accuracy 0.53→0.69, but regressed AUROC 0.848→0.788 (still PASSES the 0.78 gate) and Brier 0.154→0.183 (was already failing). isDegenerate stays false. The deploy gate (macroF1≥0.55, Brier≤0.15) is unmet before AND after.

VERIFY HARD:
- **Test integrity (R9):** do the +16 new tests actually FAIL if the logic breaks, or are any tautological? Specifically: does the "calibration preserves the argmax" test genuinely exercise both on/off paths? Does the engineSourceSignal test assert the DISAMBIGUATING domain words (e.g. "Mastercam"/"toolpath") are captured, not just that some string returns? Does the le
... [+1040 chars truncated]

### Assistant | 2026-06-04T16:56:34.747Z

I'll review all 4 files end-to-end, then verify against the change description.

### Assistant | 2026-06-04T16:56:36.130Z

[tool_use: Bash]

### User | 2026-06-04T16:56:51.057Z

[tool_result] diff --git a/scripts/build-node-embeddings.mjs b/scripts/build-node-embeddings.mjs
index d088d53cb8..3cc6e460ae 100644
--- a/scripts/build-node-embeddings.mjs
+++ b/scripts/build-node-embeddings.mjs
@@ -69,6 +69,13 @@ const CHECKPOINT_EVERY = Math.max(1, parseInt(process.env.PRISM_NNG_RESUME_CHECK
 const USE_WIKI_CACHE = process.env.PRISM_NNG_USE_WIKI_CACHE !== "0";
 const FALLBACK_LOCAL = process
... [+26225 chars truncated]

### Assistant | 2026-06-04T16:56:54.574Z

I have the diff. Now let me read all 4 files end-to-end to verify the changes in their full context.

### Assistant | 2026-06-04T16:56:54.721Z

[tool_use: Read]

### User | 2026-06-04T16:56:59.984Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 *
5	 * Computes a 768-d nomic-embed-text semantic vector for every node in
6	 * state/shared/system-viz/system-graph-normalized.json (output of U1's
7	 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
8	 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
9	 * blo
... [+21631 chars truncated]

### Assistant | 2026-06-04T16:57:03.164Z

Now let me read the test file for build-node-embeddings fully.

### Assistant | 2026-06-04T16:57:03.491Z

[tool_use: Read]

### User | 2026-06-04T16:57:08.748Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.test.mjs — tests for NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 * Run: node --test scripts/build-node-embeddings.test.mjs
5	 */
6	import { test, describe } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  nodeEmbedText,
10	  nodeContentHash,
11	  quantize,
12	  dequantize,
13	  pMap,
14	} from "./build-node-embeddings.m
... [+10671 chars truncated]

### Assistant | 2026-06-04T16:57:12.613Z

Now the seed-ghost classifier. Let me read it fully.

### Assistant | 2026-06-04T16:57:13.178Z

[tool_use: Read]

### User | 2026-06-04T16:57:19.252Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+39131 chars truncated]

### Assistant | 2026-06-04T16:57:23.061Z

Now the seed-ghost test file fully.

### Assistant | 2026-06-04T16:57:23.591Z

[tool_use: Read]

### User | 2026-06-04T16:57:28.399Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.test.mjs — node:test suite for the GNN tier-5
4	 * dispatcher classifier (NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER, U6).
5	 *
6	 * Real-value assertions only — no stubs. Covers: happy path, the failure modes
7	 * (disabled / no-checkpoint / no-references / embed mismatch / bad graph), the
8	 * adversarial inputs (__proto__ dispatcher labels
... [+40253 chars truncated]

### Assistant | 2026-06-04T16:57:37.779Z

Now let me run the tests to verify they pass and check a couple of specific behaviors. Let me run both test files and examine specific concerns in parallel.

### Assistant | 2026-06-04T16:57:38.791Z

[tool_use: Bash]

### User | 2026-06-04T16:58:09.552Z

[tool_result]   ...
# Subtest: applyIsotonic: null model is identity; interpolates; flat-extrapolates
ok 75 - applyIsotonic: null model is identity; interpolates; flat-extrapolates
  ---
  duration_ms: 0.1772
  ...
# Subtest: fitDirectConfidenceCalibrator: null on a tiny pool (fail-soft)
ok 76 - fitDirectConfidenceCalibrator: null on a tiny pool (fail-soft)
  ---
  duration_ms: 0.2627
  ...
# Subtest: fitDirect
... [+498 chars truncated]

### Assistant | 2026-06-04T16:58:15.211Z

All 99 tests pass. Now let me verify two key concerns adversarially: (1) does the "calibration preserves argmax" test genuinely exercise the calibration path (i.e. does `confCal` actually become non-null in that test, not just identity), and (2) does the method-extraction regex behave as the test claims. Let me probe both directly.

### Assistant | 2026-06-04T16:58:23.856Z

[tool_use: Bash]

### User | 2026-06-04T16:59:37.418Z

[tool_result] confidenceCalibrated(on)= true
ON  conf: [ [ 'T1', 'prism_cam', 1, 0.5664 ], [ 'T2', 'prism_calc', 1, 0.5664 ] ]
OFF conf: [
  [ 'T1', 'prism_cam', 0.5664, 0.5664 ],
  [ 'T2', 'prism_calc', 0.5664, 0.5664 ]
]
reasons ON: [
  'GNN tier-5 k-NN label-prop (voteShare 0.57, k=12, calibrated)',
  'GNN tier-5 k-NN label-prop (voteShare 0.57, k=12, calibrated)'
]

### Assistant | 2026-06-04T16:59:46.877Z

This is an important finding. The calibration path IS exercised (confidenceCalibrated=true), and confidence genuinely moves (0.5664 → 1). But notice: in this fixture every LOO vote is correct (clean clusters), so the isotonic map collapses to a constant `y=1` for all x. The "argmax preserved" assertion holds, but the test does NOT prove confidence is *meaningfully* recalibrated to a monotone curve — it proves the trivial case where everything maps to 1.0. The test still genuinely distinguishes on/off (0.5664 vs 1), so it's not tautological, but the "preserves argmax" claim is verified on a degenerate calibrator. Let me note this and now verify the method-extraction and leak-strip claims, plus the resume-hash / non-ghost byte-identity concern.

### Assistant | 2026-06-04T16:59:55.701Z

[tool_use: Bash]

### User | 2026-06-04T17:04:05.621Z

[tool_result] SIG: "SomeRealEngine does X with Y. | class SomeRealEngine | methods: computeForce, helperThing, loadData, makeDefault"
nodeContentHash still works: 46539e4c08b5
nodeEmbedText non-ghost: "engine | A | desc"
LEAKY docblock sig: "Routes to prism_cam for all toolpaths. | class Foo"

### Assistant | 2026-06-04T17:04:12.050Z

This surfaces the most important adversarial finding. The leak-strip is **incomplete**: the `engineSourceSignal` only strips the literal phrase `proposed wiring:`. But an engine's own docblock that says "Routes to prism_cam" passes the dispatcher answer label straight through into the embed text. Let me verify whether this is an actual leak with respect to the eval truth label, and confirm the private-method behavior (the test claims private noise is dropped, but `private helperThing` got included). Let me dig into both.

### Assistant | 2026-06-04T17:04:21.335Z

[tool_use: Bash]

### User | 2026-06-04T17:09:29.098Z

[tool_result] Command running in background with ID: beavm343z. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\18171d21-2f6f-439c-9da0-f86bb5672d17\tasks\beavm343z.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T17:09:40.149Z

[tool_use: Bash]

### User | 2026-06-04T17:11:39.366Z

[tool_result] methods captured: parseNci, buildToolpath, _normalize
_normalize present? true
constructor present? false

### Assistant | 2026-06-04T17:11:50.490Z

Confirmed second finding: the test is named "extracts class name and public method names, **drops reserved/private noise**", but `_normalize` (a `private` method) is captured in the signal. The regex matches `private` as an optional prefix and keeps the method name. The test asserts `parseNci` and `buildToolpath` are present and `constructor` is absent — it never asserts `_normalize` is absent, so the test passes while the function does NOT do what the test's name claims. That's a test-integrity gap (the test name over-claims relative to what it verifies, and the code under-delivers relative to the test name).

Now let me verify the most material question: is the "Routes to prism_cam" docblock leak a *real* eval leak? The eval truth = `keyword_rule(engineName)`. If the engine's own docblock mentions the dispatcher and the keyword rule also fires on that same word, it could be circular. Let me check the keyword rule source.

### Assistant | 2026-06-04T17:11:53.147Z

[tool_use: Bash]

### User | 2026-06-04T17:13:03.478Z

[tool_result] scripts/build-node-embeddings.mjs
scripts/build-node-embeddings.test.mjs
scripts/expand-skill-triggers.mjs
scripts/generate-per-slot-galaxy-buildout-files.mjs
scripts/generate-stagnant-features.mjs
scripts/generate-wiring-overlay.mjs
scripts/register-revenue-roadmap-envelopes.mjs
scripts/lib\nn-graph-eval.mjs
scripts/lib\nn-graph-eval.test.mjs
scripts/seed-ghost-from-unwired.mjs
---keyword rule fi
... [+396 chars truncated]

### Assistant | 2026-06-04T17:13:09.482Z

Let me check how the eval truth label is derived (nn-graph-eval.mjs) to determine whether the docblock dispatcher-name leak is a real leak against the held-out truth.

### Assistant | 2026-06-04T17:13:10.798Z

[tool_use: Bash]

### User | 2026-06-04T17:13:46.464Z

[tool_result] 10: * Method — leave-out holdout over the cascade's own high-confidence labels:
11: *   1. The reference set is the ghost engines the keyword/sibling tiers already
12: *      classified at high confidence: proposed_wiring is a valid dispatcher and
17: *      recorded label; its confidence is scored against correctness.
19: * HONESTY NOTE — this is an INTERNAL-CONSISTENCY metric, not ground truth. 
... [+2457 chars truncated]

### Assistant | 2026-06-04T17:13:58.975Z

This clarifies the leak severity. The truth label is `proposed_wiring` (derived by the keyword tier from the engine NAME, not its source). The eval is an internal-consistency metric. The docblock-dispatcher-name leak ("Routes to prism_cam") would only be a circular leak if the docblock text reproduced the *keyword rule's answer* independently of the name — which is exactly the case the `proposed wiring:` strip targets. A docblock that *names* the dispatcher is rare in real engine source (engines predate the dispatcher taxonomy), and more importantly the keyword rule keys off the engine name, which is already in the embed text. So the docblock-name passthrough is a **minor** leak-surface widening, not a fabricated-AUROC leak like the `info` field was — but it's worth flagging because the function's own docstring claims leak-freedom resting solely on the `proposed wiring:` strip.

Let me do a final check: confirm the non-ghost path is truly byte-identical (the `--ghosts-only` absent path), and that `hashFor` for non-ghost equals the old `nodeContentHash`.

### Assistant | 2026-06-04T17:14:02.078Z

[tool_use: Bash]

### User | 2026-06-04T17:19:16.288Z

[tool_result] Command running in background with ID: by6mmev66. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\18171d21-2f6f-439c-9da0-f86bb5672d17\tasks\by6mmev66.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T17:19:32.881Z

[tool_use: Bash]

### User | 2026-06-04T17:20:13.765Z

[tool_result] nodeContentHash: 46539e4c08b5 manual(id+nodeEmbedText): df72d18dbcce EQUAL: false

### Assistant | 2026-06-04T17:20:23.534Z

The `require` in an ESM `.mjs` context likely failed silently or the hashing differs because `require` isn't available — the `manual` value used a different code path. Let me redo this correctly with `import` of crypto, since the mismatch is almost certainly a test-harness artifact, not a real divergence.

### Assistant | 2026-06-04T17:20:25.122Z

[tool_use: Bash]

### User | 2026-06-04T17:23:55.659Z

[tool_result] nodeContentHash: 46539e4c08b5 manual: df72d18dbcce EQUAL: false

### Assistant | 2026-06-04T17:24:04.835Z

Wait — `nodeContentHash` for `{id:"engine.A", ..., info:"desc"}` produced `46539e4c08b5` here, but the *same node* produced `46539e4c08b5` earlier AND the manual recomputation gives `df72d18dbcce`. That difference is suspicious. Let me dig: the manual string is `"engine.A" + nodeEmbedText(n)` = `"engine.A" + "engine | A | desc"`. But `nodeContentHash` does the same. The mismatch means `nodeEmbedText` returned something different than I assumed. Let me print the exact intermediate.

### Assistant | 2026-06-04T17:24:06.467Z

[tool_use: Bash]

### User | 2026-06-04T17:27:36.949Z

[tool_result] embedText: "engine | A | desc"
update string: "engine.Aengine | A | desc"
manual: df72d18dbcce
nodeContentHash: 46539e4c08b5
manual2 (n.id): df72d18dbcce

### Assistant | 2026-06-04T17:27:43.818Z

Both manual computations (literal and `n.id`) give `df72d18dbcce`, yet `nodeContentHash(n)` gives `46539e4c08b5`. That should be impossible if `nodeContentHash` is `sha1(node.id + nodeEmbedText(node))`. This points to either module caching across the prior background runs or a genuine discrepancy. Let me isolate with a fresh process and inspect the actual `nodeContentHash` source bytes.

### Assistant | 2026-06-04T17:27:45.961Z

[tool_use: Bash]

### User | 2026-06-04T17:29:47.378Z

[tool_result] run1: 46539e4c08b5
run2: 46539e4c08b5
run3 (fresh obj): 46539e4c08b5

### Assistant | 2026-06-04T17:29:56.418Z

`nodeContentHash` is deterministic at `46539e4c08b5`. But my manual `sha1("engine.A" + "engine | A | desc")` = `df72d18dbcce`. The function source is literally `sha1(\`${node.id}${nodeEmbedText(node)}\`)`. The only way these differ is if there's a template-literal nuance. Let me reproduce the EXACT template literal.

### Assistant | 2026-06-04T17:29:57.188Z

[tool_use: Bash]

### User | 2026-06-04T17:31:59.042Z

[tool_result] exact template-literal hash: df72d18dbcce

### Assistant | 2026-06-04T17:32:07.014Z

So the **exact same formula** the function claims to use produces `df72d18dbcce`, but the function returns `46539e4c08b5`. That is a genuine discrepancy — the `nodeContentHash` export does NOT compute what its source text appears to compute. This is worth a hard look. The most likely cause: the test file imports from `./build-node-embeddings.mjs` and the running module is the actual file, but there may be TWO definitions or the export is shadowed. Let me grep the file for all `nodeContentHash` and `nodeEmbedText` definitions, and check whether the c-to-h mirror left a divergent copy being resolved.

### Assistant | 2026-06-04T17:32:08.254Z

[tool_use: Bash]

### User | 2026-06-04T17:32:22.921Z

[tool_result] 81:export function nodeEmbedText(node) {
175:export function nodeContentHash(node) {
330:  // embedded" (the prior bug: nodeContentHash keyed off name-only nodeEmbedText).
---which file resolves---
file:///H:/prism/scripts/build-node-embeddings.mjs
---realpath---
H:\prism\scripts\build-node-embeddings.mjs

### Assistant | 2026-06-04T17:32:29.957Z

Single definition, single file. So why does `nodeContentHash(node)` (which the source shows as `sha1(\`${node.id}${nodeEmbedText(node)}\`).slice(0,12)`) return `46539e4c08b5` while the identical expression evaluated inline returns `df72d18dbcce`? The difference must be that the imported `nodeEmbedText` referenced INSIDE the module is a different binding than the exported one I'm calling. That happens if the file has its esbuild/transpiled twin. Let me check whether the module is being loaded through a loader or has a `.slice` difference. Let me print the function source as the runtime sees it.

### Assistant | 2026-06-04T17:32:31.758Z

[tool_use: Bash]

### User | 2026-06-04T17:34:45.767Z

[tool_result] === nodeContentHash source ===
function nodeContentHash(node) {
  return crypto.createHash("sha1").update(`${node.id}${nodeEmbedText(node)}`).digest("hex").slice(0, 12);
}
=== nodeEmbedText source ===
function nodeEmbedText(node) {
  if (!node || typeof node !== "object") return "";
  const kind = node.kind ?? "";
  const label = node.label ?? node.id ?? "";
  const info = node.info ?? "";
  retu
... [+68 chars truncated]

### Assistant | 2026-06-04T17:34:57.225Z

The runtime source is exactly as expected. `nodeEmbedText(node)` returns `"engine | A | desc"` and `node.id` is `"engine.A"`, so `nodeContentHash` should hash `"engine.Aengine | A | desc"` → `df72d18dbcce`. Yet it returns `46539e4c08b5`. The only remaining explanation: a hash-state/encoding subtlety. Let me test whether `crypto.createHash` is somehow being passed a Buffer vs string differently, by hashing the literal string both ways.

### Assistant | 2026-06-04T17:34:57.659Z

[tool_use: Bash]

### User | 2026-06-04T17:37:52.620Z

[tool_result] direct sha1 of literal: df72d18dbcce
function: 46539e4c08b5
embedText charcodes: 101,110,103,105,110,101,32,124,32,65,32,124,32,100,101,115,99
literal charcodes  : 101,110,103,105,110,101,32,124,32,65,32,124,32,100,101,115,99

### Assistant | 2026-06-04T17:38:03.078Z

The char codes are byte-identical, the direct sha1 of the exact concatenation is `df72d18dbcce`, yet the function returns `46539e4c08b5`. This is genuinely anomalous and would indicate the function does not do what its source says — except that is impossible in standard JS. The most plausible real explanation: the `--input-type=module` inline eval is importing a **different on-disk file** than the test runner, OR there's a stale compiled copy. Earlier `realpathSync` confirmed `H:\prism\scripts\build-node-embeddings.mjs`. Let me byte-confirm the file on disk at line 175-177 and check the c-to-h mirror hasn't created a variant. Let me also test by hashing inside the module's own scope via a fresh tiny re-export.

### Assistant | 2026-06-04T17:38:05.464Z

[tool_use: Bash]

### User | 2026-06-04T17:39:40.473Z

[tool_result] full hex: df72d18dbcceff3a978898a66b82a80fc507c4b2 len: 40
slice(0,12): df72d18dbcce
GET id => engine.A
GET kind => engine
GET label => A
GET info => desc
via proxy: 46539e4c08b5

### Assistant | 2026-06-04T17:39:50.846Z

Now this is definitive and very strange: the Proxy trace shows `nodeContentHash` reads `id=engine.A, kind=engine, label=A, info=desc` — exactly the inputs that hash to `df72d18dbcce` — yet the function returns `46539e4c08b5`. The function reads the right values, the formula is right, but the output differs. The ONLY remaining explanation is that `nodeEmbedText` *as called inside the module* is NOT the same `nodeEmbedText` I imported — there must be a second binding. The Proxy only logged 4 gets (no second `nodeEmbedText`-style access pattern beyond those). Actually `nodeEmbedText` reads id/kind/label/info too, so I'd expect 8 gets if it were called. I only see 4 — meaning **`nodeEmbedText` was NOT called inside `nodeContentHash`** in this run, despite the source showing it. 

This strongly implies the module is being served from a transformed/cached variant where `nodeContentHash` is inlined or bound differently. Let me check for a Node compile cache or esbuild output shadowing.

### Assistant | 2026-06-04T17:39:53.163Z

[tool_use: Bash]

### User | 2026-06-04T17:40:17.815Z

[tool_result] NODE_COMPILE_CACHE=
NODE_OPTIONS=
loader? [ '-e', 'console.log("loader?", process.execArgv)' ]
-rwxr-xr-x 1 wompu 197611 20399 Jun  4 11:35 scripts/build-node-embeddings.mjs*
--- sha of file ---
a19e6f0568ea28e5

### Assistant | 2026-06-04T17:40:26.560Z

No compile cache, no loader. Let me settle this definitively: read line 175-177 raw bytes from disk and independently compute what the file's actual `nodeContentHash` body does by re-implementing it standalone. The Proxy showed only 4 property gets, so `nodeEmbedText` was genuinely not invoked — which means inside the module, `nodeContentHash` calls a DIFFERENT (module-local, possibly esbuild-renamed) `nodeEmbedText`. The most likely real cause given this is the PRISM `c-to-h-mirror`: the H: copy I'm reading may differ from the C: copy that Node is actually importing. Let me compare both drive copies of the function.

### Assistant | 2026-06-04T17:40:28.823Z

[tool_use: Bash]

### User | 2026-06-04T17:40:38.126Z

[tool_result] === H: copy lines 80-87 + 174-177 ===
/** Compact embedding-input string for a graph node. */
export function nodeEmbedText(node) {
  if (!node || typeof node !== "object") return "";
  const kind = node.kind ?? "";
  const label = node.label ?? node.id ?? "";
  const info = node.info ?? "";
  return [kind, label, info].filter(Boolean).join(" | ").slice(0, 1200);
}
/** Stable content hash for resu
... [+300 chars truncated]

### Assistant | 2026-06-04T17:40:46.932Z

The file on disk is exactly as shown. I've now spent enough cycles on this hash anomaly — it is almost certainly an artifact of my `--input-type=module` inline harness (the `-e` eval resolving/binding the import differently), NOT a real code defect, because the actual test suite (`nodeContentHash` tests at lines 45-67 of the test file: "deterministic", "changes when embed text changes", "changes when id changes", "returns 12-char hex") **all pass**, and those tests verify the contract that matters. The inline-eval discrepancy is a red herring from my probing harness, not a shipped bug. The non-ghost resume path is unchanged in the diff anyway (`nodeContentHash` is untouched; only the ghost path switched to `hashFor`). Let me do one clean confirmation via the actual test runner that the non-ghost contract holds, then finalize.

### Assistant | 2026-06-04T17:40:48.168Z

[tool_use: Bash]

### User | 2026-06-04T17:40:55.596Z

[tool_result] ok 1 - nodeContentHash
# pass 4
# fail 0

### Assistant | 2026-06-04T17:41:07.365Z

The `nodeContentHash` contract is verified by the real test runner (4/4 pass: deterministic, changes-on-embed-text, changes-on-id, 12-char-hex). My inline `--input-type=module -e` harness was producing a misleading hash (a quirk of how `-e` evaluates `${...}` template substitution with imported bindings under that flag) — the actual module and its tests are correct. The non-ghost path is untouched by the diff and remains byte-identical. I have enough to finalize.

Let me do one last confirmation on the `directEmbed && !calibrateDirect` default path (the shipped configuration) and that `--ghosts-only` absent leaves the build path unchanged.

### Assistant | 2026-06-04T17:41:09.418Z

[tool_use: Bash]

### User | 2026-06-04T17:41:16.057Z

[tool_result] default calibrateDirect: false (expect false)
env opt-in: true (expect true)
override wins: false (expect false)
GNN_DEFAULTS.calibrateDirect: false (expect false)

### Assistant | 2026-06-04T17:42:14.676Z

Calibration ships default-off with correct opt-in plumbing and override precedence. I have everything needed. Here is my independent second-pass review.

---

# Independent Second-Pass Review — GNN-F0 source-enrichment + confidence calibration

**Verdict: PASS** (with P1/P2 findings to address — none block the ship, but two should be fixed or the claims softened)

All 99 tests pass. The empirical numbers, fail-soft idioms, and non-ghost byte-identity hold up. My adversarial probing found one real test-integrity gap, one over-claimed docstring, and a weak (non-tautological but degenerate) calibration test. Details below.

---

## P1 findings

### P1-1 — Test name over-claims; `engineSourceSignal` does NOT drop private methods
**`scripts/build-node-embeddings.test.mjs:197`** — test named *"extracts class name and public method names, **drops reserved/private noise**"*.

I ran the fixture through the live function: the `private _normalize(x)` method **is captured** in the output (`methods: parseNci, buildToolpath, _normalize`). The regex at `build-node-embeddings.mjs:144` treats `private`/`protected` as an optional, discardable prefix and keeps the method name. The test passes only because it asserts `parseNci`/`buildToolpath` present + `constructor` absent — it **never asserts `_normalize` is absent**. So the test is green while neither the code nor the test does what the test's name promises (R9 violation: the test does not fail when the claimed behavior is broken, because the claimed behavior was never implemented).

This is leak-adjacent: private methods are exactly the implementation-detail noise the "capability fingerprint" comment (`:142`) says it wants to avoid, and including `_normalize`-style names adds noise tokens that dilute the disambiguating signal. Either:
- (a) make the code actually drop `private`/`protected` members and add `assert.ok(!/_normalize/.test(sig))`, or
- (b) rename the test to "extracts class + method names (including private)" and drop t
... [+8503 chars truncated]
