---
type: "chat-session"
source: "claude-code-cli"
session_id: "f27ecf49-ca75-4d3e-b761-aa4fa25998f6"
title: "Review ONE integration-runner file end-to-end; report P0/P1 then grade PASS or F"
date: "2026-06-01"
first_ts: "2026-06-01T17:02:20.976Z"
last_ts: "2026-06-01T17:05:05.138Z"
cwd: "H:\\prism-slot-delta"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-acb2ef22ed8b4505a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:42"
---

# Review ONE integration-runner file end-to-end; report P0/P1 then grade PASS or F

> **claude-code-cli** | 2026-06-01 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-acb2ef22ed8b4505a.jsonl`

## Transcript

### User | 2026-06-01T17:02:20.976Z

Review ONE integration-runner file end-to-end; report P0/P1 then grade PASS or FAIL. It JUST RAN LIVE successfully (RUN-EXIT=0) — verify correctness/safety, not whether it runs.

FILE: H:/prism-slot-delta/scripts/cad-fusion-xray-roundtrip.mjs

WHAT IT DOES: loads a real xray feature-presence print (state/shared/ocr-ground-truth/cad-prototype-<part>.json), builds an achievable box CAD live on the Fusion bridge (port 18365), derives the built model's feature-presence, diffs it against the xray print, logs every MISSING feature to a dual-training ledger (recordFix), and reaps every doc it created (prefix-scoped) in a finally block. Composes already-tested+scrutinized libs: cad-fusion-live-bridge, cad-fusion-roundtrip-orchestrator (BOX_COURSE/boxApplyParams), cad-fusion-doc-lifecycle (reapByPrefix), cad-fusion-model-to-feature-presence (modelToFeaturePresence), cad-fusion-xray-print-diff (diffXrayPrints/missingFeaturesAsFixes), cad-fusion-model-to-print (modelToPrint), cad-fix-training-ledger (recordFix/FIX_LEDGER_REL).

SAFETY INVARIANTS that MUST hold (load-bearing):
1. CLOSE-ENFORCEMENT: the doc reap (reapByPrefix) MUST run even if the build throws mid-run — so a mid-run failure never leaks Fusion windows. Verify the try/finally guarantees this.
2. The reap is prefix-scoped (DOC_PREFIX = "PRISM-DELTA-XRAY-<ts>-") so it NEVER closes the operator's open part (DIE CASE) or any non-run doc.
3. The dual-training ledger must only get fixes with real signal (wrong != right, non-null) — but that's enforced by recordFix/buildFixEntry; verify the runner doesn't bypass it.

Check specifically: (1) is the finally block guaranteed to run the reap on every exit path (including the bridge-unhealthy early process.exit BEFORE the try — is that acceptable, i.e. nothing built yet so nothing to reap)? (2) exit codes correct (2 on abort/fail, 0 on success)? (3) loadXrayPrint robustness (missing dir, missing part, parse error) — any throw that escapes? (4) the await-in-loop for recordFix 
... [+178 chars truncated]

### Assistant | 2026-06-01T17:02:39.249Z

I'll review this integration-runner file end-to-end, checking the safety invariants and the specific concerns raised.

### Assistant | 2026-06-01T17:02:39.986Z

[tool_use: Read]

### User | 2026-06-01T17:02:53.014Z

[tool_result] 1	// cad-fusion-xray-roundtrip.mjs — the FULL operator pipeline against xray's REAL OCR output, live on the delta bridge.
2	//
3	// Operator goal (2026-06-01): "run full pipeline loops of print reading/extraction, comparing to data of matching cad
4	// file in system, draw cad file from scratch" + "log any fixes... so we can train print-reading + cad/cam together."
5	//
6	// This runner closes tha
... [+8440 chars truncated]

### Assistant | 2026-06-01T17:03:19.274Z

Now let me verify the contracts of the composed libraries the safety analysis depends on. The load-bearing claims are about `reapByPrefix`, `recordFix`/`buildFixEntry`, and the diff/missing-fixes functions. Let me read them.

### Assistant | 2026-06-01T17:03:20.391Z

[tool_use: Read]

### Assistant | 2026-06-01T17:03:20.563Z

[tool_use: Read]

### User | 2026-06-01T17:03:25.060Z

[tool_result] 1	// cad-fusion-doc-lifecycle.mjs — enforce Fusion document close so closed-loop testing can't leak windows.
2	//
3	// U-CADTP-DOC-LIFECYCLE (operator directive 2026-06-01: "auto enforce you to close fusion files when you're
4	// done — or we end up with hundreds of windows + wasted RAM/CPU/GPU"). The deployed bridge's /new
5	// (`_new_document`) calls app.documents.add() and NEVER closes the prio
... [+12566 chars truncated]

### User | 2026-06-01T17:03:25.198Z

[tool_result] 1	// cad-fix-training-ledger.mjs — log every print/CAD fix during closed-loop testing for DUAL training.
2	//
3	// U-CADTP-FIX-LEDGER (operator directive 2026-06-01: "as you test and compare, log any fixes you had to make
4	// to prints and cad so we can train the print reading capabilities at the same time as the cad/cam"). Every
5	// correction made while replicating a reference is a labeled tra
... [+6437 chars truncated]

### Assistant | 2026-06-01T17:03:31.364Z

Let me verify the remaining composed contracts — `missingFeaturesAsFixes`/`diffXrayPrints` (does `missingFeaturesAsFixes` produce signal-bearing fixes), and `makeRunCandidate`/`bridgeHealth` shapes the runner relies on.

### Assistant | 2026-06-01T17:03:32.342Z

[tool_use: Read]

### Assistant | 2026-06-01T17:03:32.670Z

[tool_use: Read]

### User | 2026-06-01T17:03:35.204Z

[tool_result] read-once-guard: 'H:\prism-slot-delta\scripts\lib\cad-fusion-xray-print-diff.mjs' was already read 19m ago in this session and is unchanged (mtime 1780332217176). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-06-01T17:03:42.937Z

[tool_result] 1	// cad-fusion-live-bridge.mjs — the LIVE transport that turns the convergence harness into a real closed loop.
2	//
3	// U-CADTP-LIVE-BRIDGE (MS-CAD-TRAINING-PIPELINE — the live half of #10/#15). geom-diff (the metric) and the
4	// convergence-harness (the loop) are pure: they need an injected `runCandidate(params)→model`. This lib is the
5	// only piece that actually talks to the deployed PRISM
... [+6252 chars truncated]

### Assistant | 2026-06-01T17:03:51.318Z

I have the print-diff lib in context already. Let me confirm the key contract: that `missingFeaturesAsFixes` produces signal-bearing fixes (so the runner doesn't bypass `buildFixEntry`'s R12 guard), and verify the diff verdict shape. Let me grep the specific functions.

### Assistant | 2026-06-01T17:03:54.233Z

[tool_use: Grep]

### User | 2026-06-01T17:03:58.094Z

[tool_result] 59:export function diffXrayPrints(source, candidate, opts = {}) {
60-  const minER = Number.isFinite(opts.minEvidenceRatio) ? opts.minEvidenceRatio : 0.3;
61-  const requireAll = opts.requireAll !== false;
62-  const src = normalizeXrayPrint(source, opts);
63-  const cand = normalizeXrayPrint(candidate, opts);
64-
65-  const caveats = [];
66-  const required = []; // source features at/above the e
... [+2018 chars truncated]

### Assistant | 2026-06-01T17:04:04.311Z

I see something important in the grep output at line 87. Let me read that exact region to confirm whether it's a real syntax defect or a grep-rendering artifact.

### Assistant | 2026-06-01T17:04:05.568Z

[tool_use: Read]

### User | 2026-06-01T17:04:09.894Z

[tool_result] 86	
87	  // R12: no required features → no-data. Cannot pass against an empty/all-weak source.
88	  if (requiredCount === 0) {
89	    return {
90	      version: XRAY_PRINT_DIFF_VERSION, verdict: "no-data", scorePct: 0, requiredCount: 0,
91	      matched, missing, extra, checks,
92	      caveats: [...caveats, "no source features at/above the evidence floor — cannot evaluate print↔print match"],
93	
... [+1109 chars truncated]

### Assistant | 2026-06-01T17:05:05.138Z

Confirmed — line 87 is a normal `//` comment; the `\ R12` in the grep output was a rendering artifact, not a defect. The source is clean.

Now I have all the contracts needed. Let me verify the runner against each invariant and the 5 specific concerns.

**Invariant analysis:**

1. **CLOSE-ENFORCEMENT (try/finally)** — The `try` block (line 69) wraps the entire build+diff+ledger sequence. The `finally` block (lines 98-101) runs `reapByPrefix(postExecute, DOC_PREFIX)` and `writeFileSync(LEDGER, ...)`. JavaScript guarantees `finally` runs on normal completion, on a thrown exception caught at line 95, and even on an exception inside the `catch` block. So a mid-run throw (e.g. `runCandidate` throwing on a failed build step) is caught at line 95→97, then the `finally` reaps. Verified: the reap is guaranteed on every path that reaches the try.

2. **Prefix-scoping** — `DOC_PREFIX = "PRISM-DELTA-XRAY-" + Date.now() + "-"` (line 40), unique per run. `namedApply` (line 72) tags every created doc `DOC_PREFIX + (++seq)`. `reapByPrefixCode` closes only docs whose name `.startswith(prefix)` AND that are not the active doc; if the active doc matches the prefix it re-activates a non-matching doc first. The operator's "DIE CASE" doc never starts with `PRISM-DELTA-XRAY-<ts>-`, so it can never be a reap target. Verified.

3. **Ledger signal-gating** — The runner calls `missingFeaturesAsFixes` (each fix has `wrong:"absent"`, `right:"present(...)"`, non-null, distinct) then passes each to `recordFix`, which calls `buildFixEntry` (R12 guards: both non-null, `wrong !== right`). The runner does NOT construct entries directly or bypass `recordFix`. Verified — gate intact.

**The 5 specific checks:**

1. **Early `process.exit(2)` before the try** (lines 57, 65) — both are reached *before* any doc is built (`runCandidate` runs inside the try at line 74). Nothing was created, so nothing to reap. Acceptable. Both write the ledger first, then exit 2. Correct.

2. **Exit codes** — line 108: `proc
... [+8128 chars truncated]
