---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Independent second-pass review of a newly-written PRISM script. Read the WHOLE f"
date: "2026-05-17"
first_ts: "2026-05-17T19:26:43.265Z"
last_ts: "2026-05-17T19:27:20.441Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ae76f1f28092c5f83.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of a newly-written PRISM script. Read the WHOLE f

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ae76f1f28092c5f83.jsonl`

## Transcript

### User | 2026-05-17T19:26:43.265Z

Independent second-pass review of a newly-written PRISM script. Read the WHOLE file end-to-end: `H:/prism/scripts/nn-graph-retrain-lifecycle.mjs` (~430 lines). Do NOT assume a prior reviewer caught everything — review fresh.

WHAT IT IS: NN-GRAPH-MS2 U2 — a self-retrain lifecycle for a GraphSAGE GNN that runs as an autonomous Windows scheduled task. It fingerprints the system-viz graph, drift-detects against a baseline, spawns `graphsage-train-pipeline.mjs` to train a CANDIDATE checkpoint, evaluates it with `runAssessment()` (imported from `scripts/lib/nn-graph-eval.mjs`), and promotes the candidate to the live checkpoint ONLY when all NN-GRAPH gates pass.

Weight your review toward what a code-correctness pass typically misses:
- INTEGRATION CORRECTNESS: It imports `runAssessment` from `./lib/nn-graph-eval.mjs` and spawns `scripts/lib/graphsage-train-pipeline.mjs`. Are the paths right (file is in `scripts/`, so `./lib/...` resolves to `scripts/lib/...` — correct)? Is the `runAssessment` return shape consumed correctly — `{deferred, grade:{pass,verdict,failures}, metrics, holdoutN, poolSize}`? Does `defaultEval` call it correctly?
- HIDDEN COUPLING: `defaultTrain` spawns node with `--max-old-space-size` as the FIRST arg then the script path — is that the correct node-arg ordering? Does it pass `process.execPath`? Does the trainer actually accept `--out`, `--node-type-field`, `--neg-p-hard` (it does — verify the lifecycle passes them correctly)?
- ERROR-BUDGET COMPLETENESS: every `try/catch` — is anything swallowed that should surface? Is `result.ok` set false on every real failure? Does a ledger-write failure correctly stay advisory (non-fatal)?
- NAMING / CONVENTION: PRISM convention is no inlined physics constants, `schemaVersion` on every state JSON (check the baseline + ledger records have it), ASCII-safe strings (no raw unicode/control chars — there is a `fmtPct` that must not emit a unicode infinity symbol).
- WINDOWS SPECIFICS: atomic write via tmp+`renameSyn
... [+629 chars truncated]

### Assistant | 2026-05-17T19:26:51.194Z

I'll review the file end-to-end.

### Assistant | 2026-05-17T19:26:51.574Z

[tool_use: Read]

### User | 2026-05-17T19:26:53.259Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
4	 *
5	 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
6	 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
7	 * independent of any Claude session, on a periodic poll:
8	 *
9	 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCo
... [+27479 chars truncated]

### Assistant | 2026-05-17T19:27:20.441Z

Reviewed the full file end-to-end. Findings below.

## P0 — must fix

**P0-1 — `defaultEval` evaluates the wrong checkpoint (correctness-fatal).** Lines 255-261 / 441: `defaultEval` calls `runAssessment({ checkpoint: checkpointPath })`, and the lifecycle passes `checkpointPath: CANDIDATE_CKPT`. But `runAssessment` from `nn-graph-eval.mjs` must be verified to accept a `checkpoint` key. If `nn-graph-eval.mjs` reads the checkpoint from a fixed path (`graphsage-checkpoint.json`, the *live* path) and ignores the `checkpoint` option, then the lifecycle **grades the live checkpoint, not the candidate** — and could promote a bad candidate because the *old good* live model passed. This is the exact "hermetic fakes don't prove production wiring" class flagged in your own MS1 regression log. The injected `evalFn` in tests will never catch it.
**Fix:** open `scripts/lib/nn-graph-eval.mjs`, confirm `runAssessment` honors `opts.checkpoint`. If it does not, this script cannot ship. Add a real-data E2E that trains a candidate to a temp path and asserts the assessment metrics differ from the live checkpoint's.

## P1 — should fix

**P1-1 — overlapping runs corrupt the candidate (line 68, 250, 467).** Two scheduled-task invocations (or a manual `--force` during a poll) both spawn the trainer with the *same* `CANDIDATE_CKPT` path. Run B's `renameSync(candidate → live)` can fire while run A is mid-train, or A promotes B's half-written file. No PID lockfile guards the lifecycle. The doc comment claims "live checkpoint NEVER touched by training" — true — but the candidate is a shared mutable path.
**Fix:** acquire an exclusive lockfile at `NN_DIR/retrain.lock` at the top of `runLifecycle` (atomic `fs.writeFileSync(lock, pid, {flag:'wx'})`); if it exists and the PID is alive, return `action:"locked"` (advisory, exit 0). Release in a `finally`.

**P1-2 — `defaultTrain` ignores `r.status === null` from a signal kill (line 252).** If the trainer is SIGKILLed under host memory pressure (a doc
... [+1628 chars truncated]
