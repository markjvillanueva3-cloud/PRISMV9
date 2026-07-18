---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "A prior review of `H:\\prism-slot-sierra\\scripts\\domain-closed-loop-train.mjs` re"
date: "2026-06-12"
first_ts: "2026-06-12T02:20:01.516Z"
last_ts: "2026-06-12T02:24:06.974Z"
cwd: "H:\\prism-slot-sierra"
messages: 42
user_msgs: 15
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-acaeb9178dbbd53d1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# A prior review of `H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs` re

> **claude-code-cli** | 2026-06-12 | 42 msgs (15 user / 27 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-acaeb9178dbbd53d1.jsonl`

## Transcript

### User | 2026-06-12T02:20:01.516Z

A prior review of `H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs` returned FAIL with these findings, which I then fixed. CONFIRM each is closed in the CURRENT file (read it end-to-end), then review the two companion files for correctness, then report any NEW P0/P1 the edits introduced.

FIXES TO CONFIRM CLOSED (file: domain-closed-loop-train.mjs):
1. P0 GPU lock race — now `acquireLock` uses `fs.openSync(GPU_LOCK,"wx")` (exclusive create) + steal-only-if-stale, and `lockIsHeld` adds a `pidAlive` check; the real-train path GATES on `acquireLock()` returning true (converts to a gpu-locked defer otherwise). Confirm two cross-process runs can no longer both train.
2. P0 path traversal — new `assertDomain` (DOMAIN_RE `/^[a-z0-9][a-z0-9_-]{0,63}$/i`) called at top of `runOneDomain` AND `assembleDomainCorpus`; `listDomains` filters through DOMAIN_RE; `main` loop catches the throw per-domain. Confirm `--domain ../../x` cannot write outside the tree.
3. P1 R7 trust-leak — `inferWeight` now treats an advisory marker as a CEILING: `if (isAdvisory) return hasNumeric ? Math.min(w, ADVISORY_WEIGHT) : ADVISORY_WEIGHT`. Confirm a machine row with `weight:1.0` + advisory can never train at 1.0.
4. P1 defer-marked-success — `appendOutcomeBus` now sets `success` = (outcome==="trained") only; defers/dry-runs are success:false with an `outcome`/`deferred` field. Confirm a defer no longer reports success:true.
5. P1 --force VRAM bypass — a forced real-train below the envelope now writes a loud stderr warning + `forcedVramOverride` to ledger+bus. Confirm.
6. P2s — nowStamp has ms+pid (no collision); LOCK_STALE_MS raised to 7h > TRAIN_TIMEOUT_MS; `sourceReadErrors` counted in assemble stats. Confirm.

THEN review:
- `H:\prism-slot-sierra\scripts\domain-closed-loop-train.test.mjs` — 36 tests, all currently GREEN. Are they REAL (reference values / behavior), not stub assertions (`toBeDefined`)? Do they actually cover the 6 fixes (esp. the advisory clamp, the gate paths, the trave
... [+509 chars truncated]

### Assistant | 2026-06-12T02:20:05.821Z

I'll start by reading the three files end-to-end to verify the fixes and review correctness.

### Assistant | 2026-06-12T02:20:06.755Z

[tool_use: Read]

### Assistant | 2026-06-12T02:20:07.234Z

[tool_use: Read]

### Assistant | 2026-06-12T02:20:07.639Z

[tool_use: Read]

### User | 2026-06-12T02:20:27.793Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/domain-closed-loop-train.mjs
3	//
4	// U-DOMAIN-CLOSED-LOOP-TRAIN (slot:sierra, 2026-06-11)
5	//
6	// Per-domain background closed-loop LoRA training ORCHESTRATOR. Composes the
7	// proven, already-shipped fleet pieces -- it reinvents NONE of india's substrate:
8	//
9	//   india outcome-bus.jsonl (63K live rows)  -- the fleet learning signal
10	//   Ollama-genera
... [+33494 chars truncated]

### User | 2026-06-12T02:20:27.805Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/domain-closed-loop-train.test.mjs
3	//
4	// Pure-core tests for the per-domain closed-loop training orchestrator. Run on any node (no torch,
5	// no GPU, no network): node --test scripts/domain-closed-loop-train.test.mjs
6	//
7	// Every test encodes INTENT (R9): the advisory trust-ceiling, the gate decisions, the path-traversal
8	// guard, the corpus assembly + d
... [+12873 chars truncated]

### User | 2026-06-12T02:20:28.088Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Domain Closed-Loop Train',
3	  # Cadence in HOURS. Per-domain training is heavy, but india's doctrine is "drive emission,
4	  # don't just train" -- a per-domain corpus rarely grows past the new-signal gate within a day,
5	  # so most daily ticks are a sub-second DEFER no-op. 24 h catches a grown corpus within a day
6	  # while almost never paying a real tra
... [+12188 chars truncated]

### Assistant | 2026-06-12T02:20:32.455Z

All three files read end-to-end. Let me verify the test file actually passes and trace the lock acquisition logic carefully, since the GPU lock race is the highest-stakes fix.

### Assistant | 2026-06-12T02:20:33.315Z

[tool_use: Bash]

### User | 2026-06-12T02:20:50.083Z

[tool_result]   ...
# Subtest: discoverGalaxySynthSources: picks dated synth files + the fixed vault file
ok 35 - discoverGalaxySynthSources: picks dated synth files + the fixed vault file
  ---
  duration_ms: 0.5888
  ...
# Subtest: discoverGalaxySynthSources: a readdir failure degrades to just the fixed file
ok 36 - discoverGalaxySynthSources: a readdir failure degrades to just the fixed file
  ---
  duration
... [+122 chars truncated]

### Assistant | 2026-06-12T02:20:54.148Z

All 36 pass. Now let me verify the parity claim against the source it cites (the advisory-weight bug parity) and double-check the lock steal-race in `acquireLock`.

### Assistant | 2026-06-12T02:20:55.100Z

[tool_use: Bash]

### User | 2026-06-12T02:21:02.832Z

[tool_result] MISSING
TRAINER MISSING

### Assistant | 2026-06-12T02:21:06.174Z

Both cited parity files are missing from the slot worktree. These are shared-substrate files at the canonical tree, not the slot. Let me check the canonical tree.

### Assistant | 2026-06-12T02:21:06.689Z

[tool_use: Bash]

### User | 2026-06-12T02:21:21.246Z

[tool_result] FOUND: H:/prism/scripts/assemble-fleet-lora-corpus.mjs
FOUND: H:/prism/scripts/fleet_lora_train.py

### Assistant | 2026-06-12T02:21:25.275Z

The parity files exist at the canonical tree. Let me verify the actual weight-resolution logic in both to confirm the parity claim (and that the advisory-ceiling behavior matches the trainer, which is what fix #3 claims parity with).

### Assistant | 2026-06-12T02:21:26.368Z

[tool_use: Bash]

### User | 2026-06-12T02:21:31.664Z

[tool_result] 8:{instruction, input, output, weight, source, advisory}) was trainingReady but had
19:Honors the per-row weight (verified doctrine 1.0 vs advisory wiki/synthesis 0.5)
20:via a custom per-sample weighted causal-LM loss -- advisory rows do NOT train at
54:# the right trust level from its `advisory` flag.
94:def resolve_sample_weight(row, verified=VERIFIED_WEIGHT, advisory=ADVISORY_WEIGHT):
96:    `
... [+458 chars truncated]

### Assistant | 2026-06-12T02:21:35.703Z

Let me read the trainer's `resolve_sample_weight` body precisely to confirm the parity and whether the .mjs `inferWeight` ceiling matches.

### Assistant | 2026-06-12T02:21:36.131Z

[tool_use: Read]

### User | 2026-06-12T02:21:39.635Z

[tool_result] 90	            rows.append(o)
91	    return rows, invalid
92	
93	
94	def resolve_sample_weight(row, verified=VERIFIED_WEIGHT, advisory=ADVISORY_WEIGHT):
95	    """Per-sample training weight. An explicit numeric `weight` on the row wins; else the
96	    `advisory` boolean maps to the advisory/verified weight; else verified (default)."""
97	    w = row.get("weight")
98	    if isinstance(w, (int, flo
... [+1467 chars truncated]

### Assistant | 2026-06-12T02:21:47.768Z

I now have a critical finding. Let me verify the implication carefully by tracing the data flow: the trainer's `resolve_sample_weight` reads weight FIRST (numeric wins), but the .mjs `normalizeRow` emits a row carrying both `weight` AND `advisory`. Let me confirm what the .mjs writes to the corpus that the trainer then reads.

Looking at `normalizeRow` (line 151-159): it emits `{ weight, advisory: weight < VERIFIED_WEIGHT, ... }`. So for an advisory row, it writes `weight: 0.5, advisory: true`. The trainer reads `weight: 0.5` (numeric wins) = 0.5. Consistent. The clamp happens in the .mjs BEFORE writing, so the corpus on disk already has the clamped 0.5. Good — the parity holds because the .mjs pre-clamps.

Let me trace one more potential issue: the lock release race and the `finishDefer` calling `readDomainAdapter` which re-reads state. Let me also confirm the test for the assemble galaxy-synth path matches actual `discoverGalaxySynthSources` ordering.

### Assistant | 2026-06-12T02:21:53.026Z

[tool_use: Bash]

### User | 2026-06-12T02:22:00.461Z

[tool_result] string weight + advisory: 0.5
NaN weight + advisory: 0.5
bool weight verified path: 1
negative weight honored: -1
force cannot bypass lock: false

### Assistant | 2026-06-12T02:22:11.575Z

Edge cases behave correctly. Now let me check one concern in the trainer parity: the .mjs `inferWeight` honors a negative weight (`-1`) for a non-advisory row, and the trainer also returns `float(w)` for any numeric. That's a pre-existing parity match, not a regression. Let me verify the `acquireLock` steal path doesn't have a TOCTOU where two processes both unlink+recreate.

Tracing `acquireLock` (lines 386-402): Process A and B both fail `openSync(wx)` with EEXIST on a stale lock. Both call `lockIsHeld()` → false. Both `unlinkSync` (one succeeds, one catches). Both loop and retry `openSync(wx)`. Now exactly ONE wins the exclusive create; the other gets EEXIST again, calls `lockIsHeld()` on the NEW lock (now fresh + pid-alive of the winner) → true → returns false. The race is correctly closed by the exclusive `wx` create. This is sound.

Let me verify the test file doesn't have any `toBeDefined`-style stub asserts and confirm the galaxy-synth ordering concern (the test relies on `discoverGalaxySynthSources` reading `LORA_DIR` but `assembleDomainCorpus` also reads clean sources from `BRIDGE_DIR`/`DOMAIN_DIR` — the injected `existsImpl` gates which are read).

### Assistant | 2026-06-12T02:22:12.992Z

[tool_use: Grep]

### User | 2026-06-12T02:22:16.636Z

[tool_result] 174:  assert.ok(!real.includes("--dry-run"));
220:  assert.ok(!out.rows.some((r) => r.instruction === "S2"));
239:  assert.ok(!srcs.some((s) => s.endsWith("unrelated.jsonl")));

### Assistant | 2026-06-12T02:22:21.804Z

No stub assertions — all three `assert.ok` calls are negative behavioral assertions (excluded rows / absent flags), which are real. Now let me do a final check on a subtle gap: does the test actually exercise the `acquireLock`/`lockIsHeld`/`pidAlive` path (fix #1), since those are NOT exported? And the `appendOutcomeBus` success-flag (fix #4) and `forcedVramOverride` (fix #5)?

These functions (`acquireLock`, `lockIsHeld`, `appendOutcomeBus`, `finishDefer`, `runOneDomain`) are NOT exported, so the test cannot reach them directly. Let me confirm what IS exported vs what the test imports.

### Assistant | 2026-06-12T02:22:22.284Z

[tool_use: Bash]

### User | 2026-06-12T02:22:46.276Z

[tool_result] Binary file scripts/domain-closed-loop-train.mjs matches

### Assistant | 2026-06-12T02:22:49.430Z

Grep flagged the file as binary (likely a stray non-UTF8 byte). Let me check the exports with a clean tool and investigate the binary-match warning, which could itself be a finding (CRLF/encoding issue in a slot-committed file).

### Assistant | 2026-06-12T02:22:50.411Z

[tool_use: Grep]

### User | 2026-06-12T02:22:58.903Z

[tool_result] binary file matches (found "\0" byte around offset 9939)

### Assistant | 2026-06-12T02:23:03.418Z

There is a NUL byte at offset ~9939 in the committed `.mjs` file. This is a real finding — a stray `\0` byte. Let me pinpoint it and determine whether it's in code (which would be a P0, since Node would still load it but it indicates corruption) or whether it's a tool artifact. Node ran the tests fine, so the file is parseable, but a NUL byte in a source file is a corruption signal that must be confirmed.

### Assistant | 2026-06-12T02:23:07.320Z

[tool_use: Bash]

### User | 2026-06-12T02:23:10.793Z

[tool_result] file bytes: 31278 NUL count: 1 at: [ 9939 ]
context: "ey(r) {\n  return createHash(\"sha1\").update(`${r.instruction}\u0000${r.outpu"
CRLF: 0 bare LF: 680

### Assistant | 2026-06-12T02:23:16.914Z

Found it. The NUL byte is **intentional** — it's the delimiter in the `rowKey` dedup hash: `` `${r.instruction}\u0000${r.output}` ``. My earlier Read tool rendered it as a space (`${r.instruction} ${r.output}`) because NUL is non-printable, but the actual byte is `\0`. This is actually a *good* design choice — using NUL as the separator prevents a dedup collision between `{instruction:"a", output:"b c"}` and `{instruction:"a b", output:"c"}` (a space separator would collide; NUL cannot appear in normal text). Not a defect. Line endings are clean LF (repo convention). 

Let me verify this NUL-separator doesn't break the test's dedup assertion and confirm the rowKey collision-resistance is genuinely tested.

### Assistant | 2026-06-12T02:23:20.789Z

[tool_use: Bash]

### User | 2026-06-12T02:23:28.944Z

[tool_result] boundary-shift distinct (NUL sep working): true

### Assistant | 2026-06-12T02:24:06.974Z

The NUL separator works as intended (collision-resistant). Note: the test at line 115-118 verifies `rowKey` stability and content-sensitivity but does NOT specifically test the boundary-shift collision case the NUL separator defends against — a minor coverage gap, not a defect (P3, not reportable per instructions).

I have everything needed. Let me do a final confirmation pass on fix #4 (defer is `success:false`) and fix #6 (LOCK_STALE_MS vs TRAIN_TIMEOUT_MS ordering) by direct line inspection, then compile the verdict.

Confirming the constants ordering for fix #6: `LOCK_STALE_MS = 7*60*60*1000` (line 87) = 25,200,000 ms; `TRAIN_TIMEOUT_MS = 6*60*60*1000` (line 91) = 21,600,000 ms. So `LOCK_STALE_MS (7h) > TRAIN_TIMEOUT_MS (6h)` — correct: a live 6h train can never have its lock stolen as "stale" before it would have been reaped. Confirmed.

---

## VERDICT: PASS

All 6 fixes confirmed CLOSED in the current `domain-closed-loop-train.mjs`. The 36 tests are real (behavioral/reference-value, zero stub asserts) and pass. The companion test and PowerShell installer are correct. No new P0/P1 introduced by the edits.

### Fix-by-fix confirmation

**1. P0 GPU lock race — CLOSED.** `acquireLock` (lines 386-402) uses `fs.openSync(GPU_LOCK, "wx")` (exclusive create). On EEXIST it steals only when `lockIsHeld()` is false, then loops to re-attempt the exclusive create — so when two processes race the steal, exactly one wins `wx` and the other re-reads the now-fresh lock and refuses (returns false → `gpu-locked` defer at lines 528-532). `lockIsHeld` (375-381) requires `atMs` recent AND `pidAlive(o.pid)` true; `pidAlive` (367-371) uses `process.kill(pid,0)` with EPERM treated as alive. Real-train path gates on `acquireLock()` (line 528). Two cross-process runs can no longer both train.

**2. P0 path traversal — CLOSED.** `assertDomain` (113-118, `DOMAIN_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i`) is called at the top of `runOneDomain` (488) and `assembleDomainCorpus` (287); `listDomains
... [+3709 chars truncated]
