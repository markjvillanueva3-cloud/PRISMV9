---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c07f75f-24a7-47d8-a038-b4f2e5216e1d"
title: "Review PRISM commit `50dc4068dd` (repo H:/prism, branch cad-fusion-live-ms0). Th"
date: "2026-06-22"
first_ts: "2026-06-22T13:04:33.880Z"
last_ts: "2026-06-22T13:07:08.050Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-ae5ded085dd4632fb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Review PRISM commit `50dc4068dd` (repo H:/prism, branch cad-fusion-live-ms0). Th

> **claude-code-cli** | 2026-06-22 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-ae5ded085dd4632fb.jsonl`

## Transcript

### User | 2026-06-22T13:04:33.880Z

Review PRISM commit `50dc4068dd` (repo H:/prism, branch cad-fusion-live-ms0). This is arm C (analyst) of a 3-of-3 scrutiny gate, weighted toward SILENT BREAKAGE, regression risk, I/O safety, and integration coupling (do NOT assume arms A/B caught everything).

Run `git -C H:/prism show 50dc4068dd`. It adds a standalone measurement script `scripts/measure-ghost-holdout-headtohead.mjs` (the GNN edges-lever deploy decision) + test + result JSON + wiki + memory. The script imports from `scripts/lib/nn-graph-eval.mjs`, `scripts/lib/ghost-neighbor-index.mjs`, `scripts/measure-neighbor-vote-loo.mjs`, `scripts/measure-confidence-hybrid.mjs`, `scripts/seed-ghost-gnn-classify.mjs`, `scripts/lib/graph-io.mjs`, `scripts/lib/wired-engine-mapper.mjs`, `scripts/measure-edge-class-homophily.mjs`.

Audit specifically:
1. Does the script MUTATE any shared state? It claims NON-DESTRUCTIVE (reads graph + writes only to --out). Verify it does not write NN-EVAL.json / the embedding cache / the graph. Grep the diff for writeFileSync/writeFile.
2. Does adding this NEW script break any existing import or consumer? It is standalone (run via node CLI). Confirm no existing file imports it in a way that could break (`grep -rl "measure-ghost-holdout-headtohead" H:/prism/scripts H:/prism/mcp-server/src`).
3. Are the pure exports (neighborArmSamples/hybridArmSamples/scoreArm/decideHeadToHead) free of hidden global/Date.now/Math.random nondeterminism that would make the multi-seed result non-reproducible?
4. Any unhandled-rejection / partial-write / resource-exhaustion risk in main() (the 745MB graph load)?

Grade PASS or FAIL with P0/P1 findings + file:line. End with a one-line VERDICT: PASS or FAIL.

### Assistant | 2026-06-22T13:04:41.083Z

I'll review commit `50dc4068dd` as arm C (analyst), focused on silent breakage, regression risk, I/O safety, and integration coupling.

### Assistant | 2026-06-22T13:04:41.885Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:04:43.258Z

[tool_use: Bash]

### User | 2026-06-22T13:04:46.458Z

[tool_result] commit 50dc4068ddd72edc5d31a0d3e4bfe08e853908d0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 07:34:24 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GHOST-HOLDOUT-HEADTOHEAD (slot:india): the FINAL edges-lever deploy decision on the LIVE ghost holdout -> KEEP direct-embed (multi-seed caught a false-positive single-seed WIRE)
    
    Ran the in-flight FINAL a
... [+1807 chars truncated]

### User | 2026-06-22T13:04:47.360Z

[tool_result] 528:+    try { fs.writeFileSync(opts.out, JSON.stringify(report, null, 2)); console.log(`\n  wrote ${opts.out}`); }

### Assistant | 2026-06-22T13:04:50.821Z

Only one writeFileSync at line 528, writing to `opts.out`. Let me read the full script to verify safety, determinism, and the main() path.

### Assistant | 2026-06-22T13:04:51.420Z

[tool_use: Bash]

### User | 2026-06-22T13:04:55.746Z

[tool_result] #!/usr/bin/env node
/**
 * measure-ghost-holdout-headtohead.mjs -- the DEPLOY DECISION for the GNN tier-5 edges
 * lever (slot:india 2026-06-21). The FINAL step of the edges-lever arc
 * ([[gnn-edges-lever]]): run the three classifiers on the LIVE deployed UNWIRED-ghost
 * holdout and decide -- with real AUROC / macro-F1 / Brier at the production gate --
 * whether the homophilous-edge signal shou
... [+19450 chars truncated]

### Assistant | 2026-06-22T13:05:03.702Z

Now let me verify the audit points: (1) no other writes, (2) no consumers break, (3) determinism of imports, (4) check the `selectiveDeployPoint`/`gradeSelectiveDeploy`/`robustAboveGate` contract the script depends on.

### Assistant | 2026-06-22T13:05:04.101Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:05:05.432Z

[tool_use: Bash]

### User | 2026-06-22T13:05:09.501Z

[tool_result] 328:    generatedAt: new Date().toISOString(),
---END---

### User | 2026-06-22T13:05:11.951Z

[tool_result] H:/prism/scripts/measure-ghost-holdout-headtohead.mjs
H:/prism/scripts/measure-ghost-holdout-headtohead.test.mjs
---END GREP---

### Assistant | 2026-06-22T13:05:16.620Z

Good. Only consumers are the script itself and its own test. The only `new Date()` is in the report's `generatedAt` field (metadata, not part of the decision computation). The pure exports (`neighborArmSamples`, `hybridArmSamples`, `scoreArm`, `decideHeadToHead`) have no nondeterminism. Now let me verify the contract the script depends on — `selectiveDeployPoint`, `gradeSelectiveDeploy`, and especially `robustAboveGate` / `operatingPoint` fields — actually exist with the expected shape in `nn-graph-eval.mjs`.

### Assistant | 2026-06-22T13:05:18.517Z

[tool_use: Bash]

### User | 2026-06-22T13:05:23.340Z

[tool_result] 52:export const GATE_THRESHOLDS = Object.freeze({ auroc: 0.78, macroF1: 0.55, brier: 0.15 });
72:export function computeAUROC(scores, labels) {
103:export function computeMacroF1(predicted, truth) {
133:export function computeBrier(probs, outcomes) {
184: * Grade a metrics object against the gates. Returns { pass, verdict, failures }
185: * — verdict is "deploy-ready" when every gate clears, else 
... [+4676 chars truncated]

### Assistant | 2026-06-22T13:05:30.290Z

This is a critical finding area. The script's `decideHeadToHead` reads `grade(a.hybrid).robustAboveGate`. Line 350 confirms `gradeSelectiveDeploy` returns `robustAboveGate`. But there's a subtle field-name mismatch I need to verify carefully. The script's `decideHeadToHead` uses `dg.operatingPoint.coverage` and `dg.operatingPoint.classesEmitted`. Line 344-345 confirms `operatingPoint` has `coverage`, `classesEmitted`, `totalClasses`. Good.

But there's a deeper concern: the script's `op()` helper reads `arm.selective.deployGrade.operatingPoint`, and `scoreArm` builds `selective: { deployPoint, deployGrade }`. Let me verify `runAssessment` does NOT write NN-EVAL.json on a `directEmbed` invocation (line 902 shows a write-suppression path), and confirm `runAssessment` doesn't mutate the embedding cache or graph.

### Assistant | 2026-06-22T13:05:31.195Z

[tool_use: Read]

### User | 2026-06-22T13:05:32.317Z

[tool_result] 610	export function runAssessment(opts = {}) {
611	  let graph = opts.graph;
612	  if (!graph) {
613	    // U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): the live
614	    // system-viz graph crossed V8's ~512MB max-string-length. Use the streaming
615	    // reader for any graph >256MB. Preserve the test seam (readFileImpl) so
616	    // unit tests that inject smaller graphs still t
... [+6420 chars truncated]

### Assistant | 2026-06-22T13:05:38.715Z

`runAssessment` with `directEmbed:true` and a passed-in `graph` does NOT write anything — it only reads/computes and returns the result object. No NN-EVAL.json write, no graph mutation. The write-suppression path at line 902 belongs to a separate function (likely `writeAssessment`), which the script never calls.

Let me confirm: (a) the `assessHoldout` / `buildHoldout` path is deterministic given a fixed seed (uses a seeded PRNG, not `Math.random`), and (b) `readGraphStreaming` reads only. Let me also check the test file and confirm `selectiveDeployPoint` returns `productionPoint`/`maxCoveragePoint` but the script reads `op.coverage`/`op.classesEmitted` from `operatingPoint` — confirm field shape match.

### Assistant | 2026-06-22T13:05:41.549Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:05:42.771Z

[tool_use: Bash]

### User | 2026-06-22T13:05:46.068Z

[tool_result] scripts/lib/graph-io.mjs:102: * Added 2026-06-09 (OBSIDIAN-AI-SYNERGY / vault->GNN refpool): seed-ghost-*
scripts/lib/graph-io.mjs:115:    try { fs.renameSync(tmp, filePath); return; }
scripts/lib/graph-io.mjs:120:        try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup of the orphan */ }
scripts/seed-ghost-gnn-classify.mjs:3: * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENC
... [+1704 chars truncated]

### User | 2026-06-22T13:05:47.786Z

[tool_result] 6: * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
14: *   2. A seeded, deterministic fraction of them is HELD OUT — removed from the
32: *   node scripts/lib/nn-graph-eval.mjs --checkpoint c.json --holdout 200 --seed 7
40:import { loadGnnCheckpoint, classifyUnknownGhosts, isValidDispatcher, GNN_DEFAULTS } from "../seed-ghost-gnn-classify.mjs";
41:import { mulberry32
... [+1058 chars truncated]

### Assistant | 2026-06-22T13:05:55.155Z

Determinism confirmed: `buildHoldout` uses `mulberry32(seed)` — a seeded PRNG — and `seededShuffle` is Fisher-Yates over a copy. No `Math.random`. The multi-seed `[1337,7,42]` result is fully reproducible. The script's own pure exports add no nondeterminism.

Now the I/O safety question. The transitive imports DO contain writes, but I need to verify the script never reaches those write paths:
- `seed-ghost-gnn-classify.mjs:673` `fs.writeFileSync(tmp...)` — inside the `--apply` path / a write helper, NOT exported as `GNN_DEFAULTS` (the only symbol imported).
- `graph-io.mjs:115` `renameSync` — inside an atomic-write helper, not `readGraphStreaming`.

Let me confirm `readGraphStreaming` is read-only and that the imported symbols (`GNN_DEFAULTS`, `buildEngineDispatcherMap`, `buildStemToClass`, `neighborVote`, `confidenceHybridVote`, `buildGhostNeighborIndex`) don't trigger writes at import time (module top-level side effects).

### Assistant | 2026-06-22T13:06:00.229Z

[tool_use: Bash]

### User | 2026-06-22T13:06:05.550Z

[tool_result] 140:export function readGraphStreaming(filePath) {
--- readGraphStreaming body ---
(no write calls in readGraphStreaming if blank above)
---TOP-LEVEL SIDE EFFECTS (module load) of imported files---
== scripts/seed-ghost-gnn-classify.mjs ==
802:if (__isMain) process.exit(main(process.argv.slice(2)));
== scripts/measure-neighbor-vote-loo.mjs ==
336:if (isMain) process.exit(main());
== scripts/measur
... [+267 chars truncated]

### Assistant | 2026-06-22T13:06:11.351Z

Confirmed. All the imported script modules guard their `main()`/`process.exit` behind an `__isMain`/`isMain` check (`import.meta.url === pathToFileURL(process.argv[1])`), so importing them as a library triggers NO writes and NO `process.exit`. `readGraphStreaming` is read-only. The `measure-edge-class-homophily.mjs` showed as binary (likely a stray non-UTF8 byte) but its only imported symbol is `buildStemToClass` which is a pure function.

Now let me verify the error-budget / partial-write angle in `main()` and check the test file for any sneaky live-graph dependency that would make `25/25` a hollow pass.

### Assistant | 2026-06-22T13:06:13.476Z

[tool_use: Bash]

### User | 2026-06-22T13:06:17.670Z

[tool_result] 7: * failure + >=2 adversarial per exported pure function. Graph-free (main() owns the 542MB
10:import { test } from "node:test";
11:import assert from "node:assert/strict";
13:import {
16:import { GATE_THRESHOLDS } from "./lib/nn-graph-eval.mjs";
34:test("neighborArmSamples: happy -- votes, purity confidence, abstention", () => {
42:test("neighborArmSamples: failure -- a wrong vote is correct:fal
... [+2250 chars truncated]

### Assistant | 2026-06-22T13:06:23.366Z

The test suite is genuinely intent-encoding (R9-compliant): it exercises happy + ≥3 failure + ≥2 adversarial per pure function, with hand-computed metric values, abstention semantics, the robustness gate, and the exact false-positive-prevention case (`more classes but NOT robust -> do NOT wire`) that the commit message credits with catching the single-seed false WIRE. Graph-free, as claimed.

Let me run the test to confirm 25/25 actually passes (not a hollow claim), and verify the committed result JSON matches the committed decision (KEEP).

### Assistant | 2026-06-22T13:06:24.323Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:06:25.939Z

[tool_use: Bash]

### User | 2026-06-22T13:06:29.224Z

[tool_result]   ...
# Subtest: decideHeadToHead: adversarial -- more classes but NOT robust -> do NOT wire
ok 24 - decideHeadToHead: adversarial -- more classes but NOT robust -> do NOT wire
  ---
  duration_ms: 0.0343
  ...
# Subtest: decideHeadToHead: adversarial -- both pass, identical posture -> KEEP (no strict improvement)
ok 25 - decideHeadToHead: adversarial -- both pass, identical posture -> KEEP (no st
... [+168 chars truncated]

### User | 2026-06-22T13:06:32.875Z

[tool_result] 6:    "auroc": 0.78,
13:      "seed": 1337,
27:            "auroc": 0.7891,
58:              "robustAboveGate": true,
82:              "robustAboveGate": true,
94:            "auroc": 0.9646,
115:              "robustAboveGate": false,
136:              "robustAboveGate": false,
148:            "auroc": 0.7073,
179:              "robustAboveGate": false,
206:              "robustAboveGate": false,
... [+1254 chars truncated]

### Assistant | 2026-06-22T13:06:41.794Z

25/25 pass confirmed. The result JSON is internally consistent with the script logic and the commit message: seed 1337 → keep, seed 7 → WIRE, seed 42 → keep; `wireEverySeed = false` → aggregate `wireEdges: false` (KEEP direct-embed). This is exactly the multi-seed false-positive save the commit claims. The aggregate correctly requires ALL seeds to wire (`live.every(...)`), so a single-seed WIRE cannot promote.

One thing I want to verify carefully for silent-breakage: the script's `decideHeadToHead` reads `grade(arm).pass` and `op.classesEmitted`/`op.coverage` from `deployGrade.operatingPoint`. The JSON has `wireEdges:false` at seed 7 in the SEED result (line 437 says `wireEdges: true` for seed 7) — let me confirm there's no inconsistency between the seed-7 hybrid AUROC (0.8342, above gate) being marked WIRE but the aggregate being KEEP. That's correct behavior (seed 7 individually wires, but the aggregate requires every seed). Let me do a final cross-check on the `--out` write path safety and the `state/shared/nn-graph/` directory existence assumption (partial-write risk on a missing dir).

### Assistant | 2026-06-22T13:06:45.461Z

[tool_use: Bash]

### User | 2026-06-22T13:06:49.602Z

[tool_result] total 271538
drwxr-xr-x 1 wompu 197611         0 Jun 22 07:27 ./
drwxr-xr-x 1 wompu 197611         0 Jun 22 08:06 ../
--- does writeFileSync create parent dirs? NO. Check if script mkdir's the --out parent ---
(blank = no parent-dir creation; --out to a nonexistent dir throws ENOENT, caught at L529, returns 1 -- fail-loud, acceptable)
---check robustAboveGate is surfaced on deployGrade (the field 
... [+777 chars truncated]

### Assistant | 2026-06-22T13:07:08.050Z

All contracts verified. `gradeSelectiveDeploy` returns `robustAboveGate` at line 350 (the field `decideHeadToHead`'s `robust` check reads via `grade(a.hybrid).robustAboveGate === true`). The `--out` parent-dir is not created, but `writeFileSync` failure is caught at L528-529 and returns exit 1 — fail-loud, no partial write of shared state (the only write target is the operator-supplied `--out` path).

I've completed all four audit axes plus blast-radius. Here is my verdict.

---

VERDICT: PASS

summary: The new `scripts/measure-ghost-holdout-headtohead.mjs` is a genuinely standalone, non-destructive measurement script. It mutates no shared state (its single write at `measure-ghost-holdout-headtohead.mjs:528` targets only the operator-supplied `--out` path, fail-loud on error); no existing file imports it (only the script + its own test reference the name); the four pure exports are deterministic (no `Date.now`/`Math.random` in the decision path — the only `new Date()` is the report's `generatedAt` metadata, and the multi-seed holdout is driven by `mulberry32(seed)` Fisher-Yates in `nn-graph-eval.mjs:438`); and `main()` reads the graph via the read-only `readGraphStreaming` with the V8-string-cap-safe streaming reader. Tests run 25/25 green and encode real intent including the exact multi-seed false-positive save the commit claims; the committed result JSON is internally consistent with the script logic (seed 7 individually WIREs, aggregate KEEPs because `wireEverySeed` requires all 3).

findings: none

Audited consumers / edge-paths traced (so the PASS is auditable):
- `H:/prism/scripts/measure-ghost-holdout-headtohead.mjs:528` — the only `writeFileSync`; guarded, targets `opts.out` only, never NN-EVAL.json / embedding cache / graph.
- Blast radius: `grep -rl measure-ghost-holdout-headtohead` → only the script + `H:/prism/scripts/measure-ghost-holdout-headtohead.test.mjs`. No existing consumer breaks.
- `runAssessment` (`H:/prism/scripts/lib/nn-graph-eval.mjs:610-69
... [+1197 chars truncated]
