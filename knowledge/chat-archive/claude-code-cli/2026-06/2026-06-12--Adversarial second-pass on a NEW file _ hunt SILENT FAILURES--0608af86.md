---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Adversarial second-pass on a NEW file — hunt SILENT FAILURES and SAFETY-GATE BYP"
date: "2026-06-12"
first_ts: "2026-06-12T01:57:41.713Z"
last_ts: "2026-06-12T02:04:54.320Z"
cwd: "H:\\prism-slot-sierra"
messages: 60
user_msgs: 21
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-ae153fcdb0782f89d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Adversarial second-pass on a NEW file — hunt SILENT FAILURES and SAFETY-GATE BYP

> **claude-code-cli** | 2026-06-12 | 60 msgs (21 user / 39 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-ae153fcdb0782f89d.jsonl`

## Transcript

### User | 2026-06-12T01:57:41.713Z

Adversarial second-pass on a NEW file — hunt SILENT FAILURES and SAFETY-GATE BYPASSES specifically. Read end-to-end: `H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs`

WHAT IT IS: a per-domain background closed-loop LoRA-training orchestrator. Per manufacturing domain it: assembles a per-domain Alpaca corpus → gates (corpus-size + new-signal + VRAM-envelope + single-GPU-lock) → spawns `H:/prism/scripts/fleet_lora_train.py` (dry-run by default; real GPU train only with `--train`) → appends a training outcome to india's canonical `state/shared/outcome-bus.jsonl` → writes per-domain state. Committed to branch `slot/sierra`, operates on canonical fleet tree `H:/prism`.

CRITICAL SAFETY INVARIANT (the whole reason this is gated): a background scheduler firing this unattended, per domain, while Ollama models are RESIDENT in VRAM, must NEVER (a) evict Ollama — VRAM-guard must DEFER if free < envelope; (b) run two GPU trains at once — single-domain lock; (c) burn GPU on a stale corpus — new-signal gate. Verify EACH invariant actually holds in code, including the `--force` override and the dry-run path. A bypass here is a P0.

Hunt specifically for:
1. SILENT FAILURE: any catch{} that swallows an error and lets the pipeline continue as if it succeeded; any place `ok:true` is reported when work didn't actually happen; the outcome-bus append marked best-effort — does its failure get hidden in a way that matters?
2. SAFETY BYPASS: can `--force` + dry-run interact to fire a real GPU train? Can the lock be acquired but never released on an error path (does the finally cover spawn-throw)? Does `probeFreeVramGb` returning null ever fall through to TRAIN instead of DEFER?
3. PATH INJECTION: `--domain` flows into `domain-${domain}-${stamp}` and file paths — can a malicious/typo domain escape the dir (`../`)?
4. CONTRACT DRIFT: if fleet_lora_train.py CLI or the corpus shape changes, does this fail LOUD or silently mis-train?
5. ASCII-ONLY: repo enforces ASCII in code files —
... [+404 chars truncated]

### Assistant | 2026-06-12T01:57:44.949Z

I'll read the target file end-to-end, then trace its dependencies to verify the contract against the actual `fleet_lora_train.py` and the outcome-bus shape.

### Assistant | 2026-06-12T01:57:45.576Z

[tool_use: Read]

### User | 2026-06-12T01:57:46.426Z

[tool_result] read-once-guard: 'H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs' was already read 8s ago in this session and is unchanged (mtime 1781229301923). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### Assistant | 2026-06-12T01:57:50.093Z

The guard says it's already in context, but I don't actually see it. Let me force a re-read.

### Assistant | 2026-06-12T01:57:51.254Z

[tool_use: Bash]

### User | 2026-06-12T01:57:53.631Z

[tool_result] exists: 0
594 H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs

### Assistant | 2026-06-12T01:57:57.452Z

The file is 594 lines and exists. The read-once guard is blocking me but the content isn't in my context. Let me read it in ranges via offset.

### Assistant | 2026-06-12T01:57:58.130Z

[tool_use: Read]

### User | 2026-06-12T01:58:00.670Z

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
... [+10800 chars truncated]

### Assistant | 2026-06-12T01:58:02.975Z

[tool_use: Read]

### User | 2026-06-12T01:58:04.707Z

[tool_result] 200	  }
201	  if (locked) {
202	    return { train: false, reason: "gpu-locked: another domain train holds the single-train lock" };
203	  }
204	  // VRAM gates apply ONLY to a real GPU train (a dry-run uses no GPU -> requireVram=false).
205	  if (requireVram && !force && freeVramGb == null) {
206	    return { train: false, reason: "vram-unverified: nvidia-smi unavailable -> defer (use --force to 
... [+8153 chars truncated]

### Assistant | 2026-06-12T01:58:08.723Z

[tool_use: Read]

### User | 2026-06-12T01:58:12.074Z

[tool_result] 400	}
401	
402	function writeCorpus(domain, rows) {
403	  fs.mkdirSync(DOMAIN_DIR, { recursive: true });
404	  const out = path.join(DOMAIN_DIR, `${domain}-train.jsonl`);
405	  fs.writeFileSync(out, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
406	  return out;
407	}
408	
409	function nowStamp() {
410	  // ISO without separators that break a path: 20260611T2042
411	 
... [+8248 chars truncated]

### Assistant | 2026-06-12T01:58:14.896Z

I have the full file now (594 lines, read in 3 ranges). Now let me verify the critical contract claims against the actual `fleet_lora_train.py` and the outcome-bus shape. These are the load-bearing facts the file asserts.

### Assistant | 2026-06-12T01:58:17.097Z

[tool_use: Bash]

### User | 2026-06-12T01:58:26.613Z

[tool_result] === TRAINER EXISTS? ===
-rwxr-xr-x 1 wompu 197611 17510 Jun 11 08:08 H:\prism\scripts\fleet_lora_train.py
=== TRAINER ARGV CONTRACT (argparse) ===
17:GPU stack (the --dry-run path + fleet_lora_train_test.py run on any Python).
35:  python scripts/fleet_lora_train.py --dry-run
38:      --base Qwen/Qwen2.5-7B-Instruct \
39:      --corpus state/shared/lora/fleet-lora-combined.jsonl \
40:      --out s
... [+2775 chars truncated]

### Assistant | 2026-06-12T01:58:30.974Z

The trainer contract is confirmed: `--corpus`, `--out`, `--base`, `--max-steps`, `--dry-run` all exist with matching dest names, and `resolve_sample_weight` exists. Now let me verify the trainer's weight semantics (the R7 trust-leak invariant) and the `--out`/`--dry-run` interaction — does the trainer actually create adapter files on dry-run, and does the Python weight resolution match the JS `inferWeight`?

### Assistant | 2026-06-12T01:58:33.724Z

[tool_use: Bash]

### User | 2026-06-12T01:58:37.501Z

[tool_result] === PY resolve_sample_weight body ===
                invalid += 1
                continue
            rows.append(o)
    return rows, invalid


def resolve_sample_weight(row, verified=VERIFIED_WEIGHT, advisory=ADVISORY_WEIGHT):
    """Per-sample training weight. An explicit numeric `weight` on the row wins; else the
    `advisory` boolean maps to the advisory/verified weight; else verified (defa
... [+2094 chars truncated]

### Assistant | 2026-06-12T01:58:44.849Z

Critical confirmation on the dry-run path: when `--dry-run` is set, the Python trainer prints config and `return 0` **before** `train(args)` — it never loads torch, never touches the GPU, never writes to `--out`. So even with `--force`, the dry-run path is GPU-safe. This is the most important safety claim and it holds.

Now I've found a **real R7 trust-leak**: the JS `inferWeight` maps `metadata.advisoryOnly:true` / `mustHumanVerify:true` to 0.5, but the **Python** `resolve_sample_weight` only honors a top-level `weight` number or top-level `advisory:true` — it does NOT read `metadata.advisoryOnly`. Let me verify whether the JS-written corpus carries the `advisory` top-level flag that the trainer actually reads (line 142 sets `advisory: weight < VERIFIED_WEIGHT`), which would close the gap. Let me confirm the written row shape and check the outcome-bus contract and a couple edge cases.

### Assistant | 2026-06-12T01:58:47.788Z

[tool_use: Bash]

### User | 2026-06-12T01:58:49.123Z

[tool_result] Exit code 2
=== outcome-bus shape india consumes (auto-tap writer) ===
grep: H:\prism\scripts\outcome-bus-auto-tap.mjs: No such file or directory
/usr/bin/bash: eval: line 5: syntax error near unexpected token `('
/usr/bin/bash: eval: line 5: `echo "=== sample existing outcome-bus rows (field shape) ==="; tail -2 "H:\prism\state\shared\outcome-bus.jsonl" 2>&1'

### Assistant | 2026-06-12T01:58:51.678Z

The comment references `outcome-bus-auto-tap.mjs` which doesn't exist at that path. Let me find the real writer/reader and the bus shape.

### Assistant | 2026-06-12T01:58:53.099Z

[tool_use: Bash]

### User | 2026-06-12T01:59:12.220Z

[tool_result] H:\prism/.claude/hooks/outcome-bus-auto-tap.mjs
H:\prism/scripts/lib/orchestrator-outcome-bus-controller.mjs
H:\prism/scripts/lib/orchestrator-outcome-bus-controller.test.mjs

### Assistant | 2026-06-12T01:59:15.866Z

The writer is at `.claude/hooks/outcome-bus-auto-tap.mjs` (not `scripts/`). Let me verify the canonical row shape it writes and how readers consume it, plus inspect the live bus rows.

### Assistant | 2026-06-12T01:59:18.152Z

[tool_use: Bash]

### User | 2026-06-12T01:59:21.680Z

[tool_result] === auto-tap row shape ===
91:  process.stdout.write(JSON.stringify(payload ?? { continue: true }));
170:    try { fs.writeFileSync(THROTTLE_SIDECAR, JSON.stringify(trimmed)); } catch { /* swallow */ }
172:    try { fs.writeFileSync(THROTTLE_SIDECAR, JSON.stringify(ledger)); } catch { /* swallow */ }
200:// ─── failure→success pair detection (2026-05-28 slot:alpha — closes the
251:  ts: new Date()
... [+646 chars truncated]

### Assistant | 2026-06-12T01:59:25.263Z

Let me see the full row shape written by the auto-tap (lines 250-260) to confirm field parity, and check the live bus to see what shape india's consumers actually read.

### Assistant | 2026-06-12T01:59:26.947Z

[tool_use: Bash]

### User | 2026-06-12T01:59:30.106Z

[tool_result] === auto-tap full row ===
const hintValue = contextualHint();
const taskValue = hintValue || `${toolName}@${slot}`;     // consumer uses this for memory naming
const row = {
  ts: new Date().toISOString(),
  source: "outcome-bus-auto-tap",
  session_id: sessionId,
  slot,
  domain,
  tool: toolName,
  success,
  hint: hintValue,
  task: taskValue,
  previously_failed: previouslyFailed(hintValue),

... [+1418 chars truncated]

### Assistant | 2026-06-12T01:59:36.705Z

The outcome-bus shape is confirmed (63,821 live rows). The new script's row carries `ts/source/slot/domain/tool/success/hint` — a strict subset of the auto-tap shape, which is append-only JSONL with no required-field reader for this `source`. That's contract-compatible.

Now the key remaining checks: (1) the R7 trust-leak gap between JS `inferWeight` (reads `metadata.advisoryOnly`) and Python `resolve_sample_weight` (reads only top-level `advisory`) — does the written corpus close it via the top-level `advisory` flag? (2) ASCII scan. (3) path-injection on `--domain`. (4) the galaxy-synth `advisory:true` tagging path. Let me verify these directly.

### Assistant | 2026-06-12T01:59:39.412Z

[tool_use: Bash]

### User | 2026-06-12T01:59:41.732Z

[tool_result] === 1. NON-ASCII scan (line:col of any byte > 0x7F) ===
ASCII-CLEAN (no non-ASCII bytes)

=== 2. Does writeCorpus preserve top-level advisory flag? (normalizeRow sets advisory:weight<1.0) ===
Binary file H:\prism-slot-sierra\scripts\domain-closed-loop-train.mjs matches

### Assistant | 2026-06-12T01:59:46.905Z

ASCII-clean confirmed. The `grep -n advisory` returned "Binary file matches" — odd; likely a CRLF or encoding quirk in grep's detection. Let me re-run with text forcing and confirm the line numbers, and check the repo's actual line-ending convention (the regressions log shows CRLF flips are a recurring issue).

### Assistant | 2026-06-12T01:59:48.137Z

[tool_use: Bash]

### User | 2026-06-12T01:59:50.084Z

[tool_result] === advisory occurrences (forced text) ===
17://                 advisory-weight bug (advisoryOnly rows must train at 0.5, not 1.0) ->
110:// bridge-reasoning shape: an explicit numeric top-level `weight` wins; else an advisory marker
111:// (top-level `advisory:true` OR `metadata.advisoryOnly:true`/`mustHumanVerify:true`) -> 0.5;
113:// metadata.advisoryOnly:true but NO top-level advisory/weight,
... [+624 chars truncated]

### Assistant | 2026-06-12T01:59:57.066Z

Important finding on the R7 trust-leak: the chain is actually **closed correctly**. Here's the proof:

- `normalizeRow` (line 137-145) writes the corpus row with an explicit **top-level `weight`** field (line 141) AND a top-level `advisory: weight < VERIFIED_WEIGHT` (line 142).
- `writeCorpus` (line 405) serializes that full row including `weight`.
- Python `resolve_sample_weight` reads top-level `weight` first (numeric wins) — so even though Python ignores `metadata.advisoryOnly`, the JS side has already **materialized** the advisory 0.5 into a top-level numeric `weight`. The trainer reads 0.5. No trust leak.

The `file` command says "binary data" — that's a false positive from the `#!/usr/bin/env node` shebang + a NUL-free heuristic; CR count is 0 (pure LF, repo-correct) and the non-ASCII scan was clean. Let me now confirm the galaxy-synth advisory path end-to-end and probe the path-injection vector on `--domain`.

### Assistant | 2026-06-12T02:00:02.136Z

[tool_use: Bash]

### User | 2026-06-12T02:00:04.222Z

[tool_result] === 3. PATH INJECTION: does a ../ domain escape DOMAIN_DIR? ===
{"domain":"mill","corpus":"H:\\prism\\state\\shared\\lora\\domain\\mill-train.jsonl","escapesCorpus":false,"escapesOut":false}
{"domain":"../../../etc/evil","corpus":"H:\\prism\\state\\etc\\evil-train.jsonl","escapesCorpus":true,"escapesOut":true}
{"domain":"....windows","corpus":"H:\\prism\\state\\shared\\lora\\domain\\....windows-tr
... [+309 chars truncated]

### Assistant | 2026-06-12T02:00:11.688Z

**Confirmed P-finding: path traversal via `--domain`.** A `--domain ../../../etc/evil` escapes both `DOMAIN_DIR` and `ADAPTER_DIR` (`escapesCorpus:true, escapesOut:true`), and `a/b` creates a nested subdir. There is **no validation** on `domain` anywhere — `parseArgs` (line 529) pushes whatever follows `--domain` raw, and it flows into `path.join` for corpus write, state write, run-ledger, and outDir. Let me confirm there's truly no guard and assess the real-world severity (writeCorpus does `mkdirSync(DOMAIN_DIR)` not the escaped dir — let me check the actual write target).

### Assistant | 2026-06-12T02:00:16.589Z

[tool_use: Bash]

### User | 2026-06-12T02:00:23.964Z

[tool_result] === Does writeCorpus mkdir the ESCAPED parent? Trace the actual write ===
../../../tmp/pwned -> H:\prism\state\tmp\pwned-train.jsonl | parent: H:\prism\state\tmp
a/b/c -> H:\prism\state\shared\lora\domain\a\b\c-train.jsonl | parent: H:\prism\state\shared\lora\domain\a\b

=== Confirm: any domain validation/allowlist anywhere in file? ===
grep: Unmatched [, [^, [:, [., or [=
>>> NO domain validation
... [+8 chars truncated]

### Assistant | 2026-06-12T02:00:33.579Z

Confirmed: no domain validation exists. `writeCorpus` calls `mkdirSync(DOMAIN_DIR, {recursive:true})` (the base dir) but then `writeFileSync(path.join(DOMAIN_DIR, domain + "-train.jsonl"))` — for `a/b/c` the parent `domain/a/b` doesn't exist, so that specific case throws ENOENT (uncaught in `writeCorpus`, which would propagate). But `../../../tmp/pwned` resolves to `H:\prism\state\tmp\` whose parent likely exists or gets created — that's a genuine arbitrary-write-within-tree. Now let me verify the two remaining adversarial vectors: the lock-release-on-spawn-throw (finally coverage) and whether `--force` can ever reach a real train through the dry-run path. Let me also check the galaxy-synth `advisory:true` actually survives normalizeRow (does `inferWeight` see it?).

### Assistant | 2026-06-12T02:00:39.911Z

[tool_use: Bash]

### User | 2026-06-12T02:00:42.652Z

[tool_result] === R7: galaxy-synth row tagged advisory:true -> does inferWeight return 0.5? ===
synth advisory-only  weight = 0.5 (want 0.5)
synth w/ weight:1.0  weight = 1 (LEAK if 1.0 -- explicit weight wins over advisory tag)

### Assistant | 2026-06-12T02:00:48.940Z

**Confirmed R7 trust-leak (conditional):** when a galaxy-synthesis row carries an explicit top-level `weight:1.0` (a machine-generated row that legitimately or maliciously sets its own weight), the line-299 tagging spreads `advisory:true` AFTER the row but `inferWeight` checks the explicit numeric `weight` FIRST (line 117) and returns 1.0 — the advisory tag is **silently overridden**. Machine synthesis trains at verified ground-truth weight. The code comment at lines 252-254 explicitly promises galaxy-synth is "loaded at ADVISORY trust (0.5), never as verified ground truth" — that promise is breakable.

Now let me confirm whether galaxy-synth rows in the wild actually carry a top-level `weight`, to grade severity (P0 vs P1), and verify the lock finally-coverage logic one more time by re-reading the spawn path.

### Assistant | 2026-06-12T02:00:53.318Z

[tool_use: Bash]

### User | 2026-06-12T02:01:42.806Z

[tool_result] === Do galaxy-synthesis files exist + carry top-level weight? ===
galaxy-synthesis-lora-2026-06-10.jsonl
vault-galaxy-synthesis-dataset.jsonl

--- state/shared/lora/galaxy-synthesis-lora-2026-06-10.jsonl (first row keys) ---
keys: instruction,input,output,galaxy | has top-level weight: undefined
--- state/shared/lora/vault-galaxy-synthesis-dataset.jsonl (first row keys) ---
keys: instruction,input
... [+291 chars truncated]

### Assistant | 2026-06-12T02:01:51.187Z

Severity grading on the R7 leak: **today** the live galaxy-synth rows do NOT carry a top-level `weight` (keys are just `instruction,input,output,galaxy`), so the advisory tag holds and they train at 0.5 correctly. The leak is **latent** — it triggers only if a future galaxy-synth emitter adds a top-level `weight` field, which is exactly the kind of contract drift the file should defend against (it's machine-generated input the orchestrator explicitly distrusts). That makes it **P1** (latent trust-leak via contract drift), not P0.

Let me do the final verification pass: bridge-reasoning row shape (does it carry `metadata.advisoryOnly`?), the lock-leak edge case re-confirmation, and the `--all` + `--force` blast radius. Let me check the bridge-reasoning row shape since that's the clean-source path the comment claims carries `metadata.advisoryOnly`.

### Assistant | 2026-06-12T02:01:58.851Z

[tool_use: Bash]

### User | 2026-06-12T02:02:59.597Z

[tool_result] === bridge-reasoning row shape (comment claims metadata.advisoryOnly:true) ===
keys: id,instruction,input,output,metadata
metadata keys: galaxy,source,model,groundingSources,advisoryOnly,mustHumanVerify
metadata.advisoryOnly: true | top advisory: undefined | top weight: undefined

=== count bridge-reasoning rows that are advisory vs verified for mill ===
mill bridge-reasoning: advisory= 4  verifie
... [+16 chars truncated]

### Assistant | 2026-06-12T02:03:05.706Z

This confirms the **core fix is correct and load-bearing**: every bridge-reasoning mill row carries `metadata.advisoryOnly:true` with NO top-level `advisory` or `weight`. Without `inferWeight`'s line-120 check (`md.advisoryOnly === true`), all 4 rows would default to `VERIFIED_WEIGHT` 1.0 — the exact latent bug the file claims to fix. The JS materializes them to top-level `weight:0.5`, and Python's `resolve_sample_weight` reads that 0.5. The fix works for the real corpus. (And critically: Python alone, reading these raw bridge rows, would NOT see `metadata.advisoryOnly` — but it never reads the raw rows; it reads the JS-normalized corpus. The pipeline is correct.)

I have everything I need. Let me do one final targeted re-read of the spawn/lock/finally block and the `--force` dry-run interaction to lock the verdict on the two safety-critical questions.

### Assistant | 2026-06-12T02:03:06.683Z

[tool_use: Read]

### User | 2026-06-12T02:03:24.081Z

[tool_result] 440	  const freeVramGb = train ? probeFreeVramGb() : null; // dry-run never touches the GPU
441	  result.freeVramGb = freeVramGb;
442	  const locked = train ? lockIsHeld() : false;
443	  const decision = decideTrain({ rowCount: assembled.rows.length, newRows, freeVramGb, locked, force, requireVram: train });
444	  result.decision = decision;
445	
446	  if (!decision.train) {
447	    result.deferRe
... [+1593 chars truncated]

### Assistant | 2026-06-12T02:03:38.696Z

I now have complete verification of every safety path. Let me lock the analysis on the two crown-jewel safety questions, then the silent-failure findings:

**Safety question A — can `--force` + dry-run fire a real GPU train?** NO. The `train` flag and `force` flag are independent. `argv` uses `dryRun: !train` (line 461), so dry-run always passes `--dry-run`, and the Python trainer hard-returns 0 before `train(args)` when `--dry-run` is set (verified at py main: `if args.dry_run: ...; return 0`). `--force` only flips the gate decision (line 198, 205, 208) — it never sets `train`. Spawn timeout is also `train ? TRAIN_TIMEOUT_MS : DRY_RUN_TIMEOUT_MS`. **Holds.**

**Safety question B — lock leak on spawn-throw?** `acquireLock` is line 465 (only if `train`), the `spawnSync` is inside `try` (466), and `releaseLock` is in `finally` (476, only if `train`). A spawn throw is caught (472) AND finally still runs releaseLock. **Holds.** One sub-finding: `acquireLock` itself (line 465) is OUTSIDE the try — if `acquireLock`'s `writeFileSync` throws (e.g., disk full), it propagates uncaught out of `runOneDomain`, but no lock was written so nothing leaks. Acceptable.

**Safety question C — `probeFreeVramGb` null → DEFER not TRAIN?** Line 205: `requireVram && !force && freeVramGb == null` → defer. **BUT** with `--force`, line 205's `!force` short-circuits, line 208's `!force` short-circuits, and the function returns `{train:true}` (line 211). So `--force` on a real `--train` run bypasses the VRAM envelope entirely and WILL train blind even if Ollama is resident. This is the documented `--force` escape hatch, but it's the single most dangerous interaction. Let me confirm the docs flag this clearly — the comment at line 33 says the scheduled-task registration stays operator-gated, but `--force` on a `--train` invocation is the live VRAM-guard bypass.

Now the final silent-failure inventory — the `appendOutcomeBus` `success` field and the defer `ok:true` interaction:

### Assistant | 2026-06-12T02:03:39.873Z

[tool_use: Read]

### User | 2026-06-12T02:03:48.160Z

[tool_result] 385	// Wire to india: append a training OUTCOME to the canonical 63K-row bus india already consumes.
386	// Same append-only shape outcome-bus-auto-tap.mjs writes -> the learning signal goes THROUGH
387	// india (no MCP dependency, robust if :3100 is down).
388	function appendOutcomeBus(domain, runInfo) {
389	  const row = {
390	    ts: new Date().toISOString(),
391	    source: "domain-closed-loop
... [+451 chars truncated]

### Assistant | 2026-06-12T02:04:54.320Z

I have full verification of every path. Here's the analysis on the silent-failure question:

The defer-path writes `success: runInfo.ok === true` where `ok:true` is passed for a deliberate defer (line 453). So india's bus will see a `success:true` row for a domain that **did not train**. The `hint` field disambiguates (`defer:vram-pressure...`), so the signal isn't fully lost — but `success` is the field readers boolean-filter on. A bus consumer aggregating `success` rate by tool=`lora-train` would count every defer as a "successful train." This is a semantic-honesty issue (a defer being marked `success:true` on the india learning bus), not a pipeline silent-failure — but it's worth flagging as P1 because it pollutes the very learning signal the script exists to feed.

I have everything. Final verdict.

---

## VERDICT: FAIL — 1 P0 (latent), 3 P1. Core safety invariants (A/B/C) HOLD; the failures are a path-traversal write primitive, a conditional R7 trust-leak, a `--force` VRAM bypass under-documented at the call site, and a defer-marked-success bus pollution.

The three crown-jewel GPU-safety invariants are correctly implemented and I verified each against the real `H:/prism/scripts/fleet_lora_train.py` and the live 63,821-row `outcome-bus.jsonl`:
- **Dry-run is GPU-proof even with `--force`** — `fleet_lora_train.py` main hard-returns `0` before `train(args)` when `--dry-run` is set; `--force` never sets the `train` flag (`dryRun: !train`, line 461). PASS.
- **Lock release covers spawn-throw** — `spawnSync` in `try` (467), `releaseLock` in `finally` (476). PASS.
- **`probeFreeVramGb()` null → DEFER** — `decideTrain` line 205 defers on `freeVramGb == null` (without `--force`). PASS.
- **Trainer CLI contract verified live** — `--corpus/--out/--base/--max-steps/--dry-run` all exist with matching argparse dest names. PASS.
- **The advisory-weight fix is real and load-bearing** — verified all 4 live `bridge-reasoning/mill.jsonl` rows carry `metadata.advisoryOnly:true` 
... [+8600 chars truncated]
