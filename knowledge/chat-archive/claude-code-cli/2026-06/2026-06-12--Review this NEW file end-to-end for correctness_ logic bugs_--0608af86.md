---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Review this NEW file end-to-end for correctness, logic bugs, and edge-case handl"
date: "2026-06-12"
first_ts: "2026-06-12T01:57:29.645Z"
last_ts: "2026-06-12T01:58:24.876Z"
cwd: "H:\\prism-slot-sierra"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a1cb40bc6976610e9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review this NEW file end-to-end for correctness, logic bugs, and edge-case handl

> **claude-code-cli** | 2026-06-12 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a1cb40bc6976610e9.jsonl`

## Transcript

### User | 2026-06-12T01:57:29.645Z

Review this NEW file end-to-end for correctness, logic bugs, and edge-case handling: `H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs`

CONTEXT — it is a per-domain background closed-loop LoRA-training ORCHESTRATOR that COMPOSES already-shipped pieces (must reinvent none):
- Trainer `H:/prism/scripts/fleet_lora_train.py` — VERIFIED CLI: `--corpus <jsonl> --out <dir> --base <hf-id> --max-steps N --dry-run`. `--dry-run` builds the dataset and prints a summary WITHOUT torch (exit 0). Corpus rows are Alpaca `{instruction, output}` (+optional input, weight, advisory).
- Corpus sources (canonical H:/prism): `state/shared/lora/bridge-reasoning/<domain>.jsonl` (rows carry `metadata.advisoryOnly:true`) + galaxy-tagged `galaxy-synthesis-lora-*.jsonl` and `vault-galaxy-synthesis-dataset.jsonl` (rows carry a `galaxy` field; machine-generated → must be ADVISORY weight 0.5).
- India wire: appends a training-outcome row to canonical `state/shared/outcome-bus.jsonl` (append-only).
- CANON_ROOT is resolved by de-slotting the script dir (H:/prism-slot-sierra → H:/prism) because the substrate is a fleet-wide singleton.

It was live-proven: `--domain mill` → gate "ready" → trainer dry-run exit 0, 35 rows all advisory; india bus row appended; state written.

GRADE PASS/FAIL and flag P0/P1 issues ONLY (file:line + one-line fix). Focus:
1. Pure functions: `inferWeight` (maps metadata.advisoryOnly AND top-level advisory AND numeric weight correctly?), `decideTrain` (gate order, requireVram for dry-run, force semantics, null-VRAM fail-safe), `normalizeRow`, `parseJsonl`, `parseNvidiaSmiFreeMb`, `dedupRows`, `buildTrainerArgv`.
2. GPU lock (`acquireLock`/`releaseLock`/`lockIsHeld`): race-safe enough? stale-steal correct? could two concurrent `--all` runs both train?
3. Cursor/new-signal: does a dry-run correctly NOT advance the cursor (`trainedRows`)? does a deferred domain keep prevRows?
4. R12 fail-loud: any silent no-op path? every defer has an explicit reason?
5. CANON_ROOT de-
... [+338 chars truncated]

### Assistant | 2026-06-12T01:57:36.646Z

I'll review this file end-to-end. Let me read it first.

### Assistant | 2026-06-12T01:57:37.304Z

[tool_use: Read]

### User | 2026-06-12T01:57:39.000Z

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
... [+27995 chars truncated]

### Assistant | 2026-06-12T01:57:47.602Z

I have the full file. Let me trace the critical paths carefully, focusing on the areas the prompt flagged. Let me verify a few things about the lock race and the GPU probe ordering by re-reading the key sections closely.

Now let me analyze each focus area systematically.

**1. Pure functions analysis:**

- `inferWeight` (115-122): order is numeric `weight` wins → `advisory:true` → `metadata.advisoryOnly`/`mustHumanVerify` → 1.0. Correct. But note a subtle interaction with `assembleDomainCorpus`: galaxy-synth rows get `{...o, advisory:true}` spread (line 299), then `normalizeRow`→`inferWeight`. If a galaxy-synth row carried a top-level numeric `weight: 1.0`, `inferWeight` returns 1.0 — the `advisory:true` tag is *overridden* by the numeric weight. Let me check that.

**2. The lock race (TOCTOU).** Let me look very carefully at the gate→acquire ordering.

The decision is computed at line 443 with `locked = lockIsHeld()` (line 442). Then `acquireLock` happens at line 465 — **after** the decision. Between the `lockIsHeld()` check and `acquireLock()`, there is corpus assembly already done, but more importantly two concurrent processes both pass the check before either writes. This is the classic TOCTOU. Let me confirm there's no atomic guard.

### Assistant | 2026-06-12T01:57:48.532Z

[tool_use: Read]

### User | 2026-06-12T01:57:50.133Z

[tool_result] 355	function acquireLock(domain) {
356	  fs.mkdirSync(DOMAIN_DIR, { recursive: true });
357	  fs.writeFileSync(GPU_LOCK, JSON.stringify({ domain, pid: process.pid, atMs: Date.now() }));
358	}
359	
360	function releaseLock(domain) {
361	  const o = readLock();
362	  if (o && o.domain === domain && o.pid === process.pid) {
363	    try { fs.unlinkSync(GPU_LOCK); } catch { /* already gone */ }
364	  }
... [+159 chars truncated]

### Assistant | 2026-06-12T01:58:24.876Z

Confirmed. `acquireLock` uses plain `writeFileSync` with no `wx` exclusivity flag and no atomic create-or-fail. Combined with the check-then-act gap (line 442 check → line 465 acquire), two concurrent `--all` runs can both train. Let me verify the `--all` loop is sequential per-process (it is, line 565-567), so the race is strictly *across two separate process invocations* (e.g., two scheduled-task fires, or `--all` + a manual `--domain`). That is exactly the scenario the safety design claims to prevent ("a background scheduler firing this per domain CANNOT ... run two trains at once").

Let me also check the VRAM unit-conversion and the `nowStamp` collision concern.

I have everything I need. Let me verify one more thing — whether `discoverGalaxySynthSources` could include a domain-clean file or double-count, and confirm the `--list` exit code behavior. The analysis is complete.

## VERDICT: FAIL

Two issues cause wrong behavior that contradicts the file's own stated safety guarantees (P0 lock race) and corrupt training trust (P1 advisory override). Numbered findings below.

---

### P0 — GPU lock is not race-safe; two concurrent invocations can both train

**`domain-closed-loop-train.mjs:442` + `:465` (and `acquireLock` :355-358)**

The decision reads `locked = lockIsHeld()` at line 442, but `acquireLock(domain)` does not happen until line 465 — a check-then-act (TOCTOU) gap. Worse, `acquireLock` uses `fs.writeFileSync(GPU_LOCK, ...)` with no exclusive-create flag, so even with zero time gap it cannot fail when a lock already exists. Two separate process invocations (the exact "background scheduler firing this per domain" scenario the header at lines 29-33 promises is safe, or `--all` racing a manual `--domain X --train`) both pass `lockIsHeld()===false`, both `writeFileSync` the lock (second silently clobbers the first), and **both run a real GPU train simultaneously** — evicting resident Ollama, the precise failure the design claims is impossible. The single-pro
... [+3740 chars truncated]
