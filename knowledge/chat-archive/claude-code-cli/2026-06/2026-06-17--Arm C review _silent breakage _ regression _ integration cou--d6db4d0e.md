---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Arm C review (silent breakage / regression / integration coupling) of the Dream-"
date: "2026-06-17"
first_ts: "2026-06-17T23:53:17.158Z"
last_ts: "2026-06-17T23:56:55.815Z"
cwd: "H:\\prism"
messages: 59
user_msgs: 22
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-af364bf0a8700a719.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Arm C review (silent breakage / regression / integration coupling) of the Dream-

> **claude-code-cli** | 2026-06-17 | 59 msgs (22 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-af364bf0a8700a719.jsonl`

## Transcript

### User | 2026-06-17T23:53:17.158Z

Arm C review (silent breakage / regression / integration coupling) of the Dream-Cycle cron fix in H:/prism (slot:bravo). Read: `cd H:/prism && git show $(git log --grep=U-DREAM-CYCLE-TIMEOUT --format=%H -1)`. Files: scripts/hermes-dream-cycle-synth.mjs (runGalaxyCascade), its .test.mjs, .claude/helpers/install-hermes-dream-cycle-task.ps1.

The fix adds `timeout`+`killSignal:"SIGTERM"` to the execFileSync in runGalaxyCascade, treats killed/ETIMEDOUT as fail-soft, and raises the scheduled-task ExecutionTimeLimit 120s->30min.

Hunt SILENT BREAKAGE + DRIFT:
1. INSTALLER-vs-LIVE drift: the .ps1 now says 30min; the LIVE task was updated separately via Set-ScheduledTask. Is the durable source-of-truth (.ps1) self-consistent? Does re-running it (or a peer installer) revert anything?
2. SIGTERM mid-rebuild: galaxy-synthesis-refresh.mjs (the spawned child) does index+embedding sidecar rebuilds. Could a SIGTERM at the 20min mark leave a half-written sidecar? Is that a NEW risk vs the old OS-kill at the task limit (same risk)? Note if real.
3. Does the fix cover BOTH the `run()` (sync) and `runWithSynth()` (`--llm-synth`) CLI paths — both call runGalaxyCascade?
4. Could the new branch swallow a genuine crash (mis-classify a non-timeout error as a timeout)? Confirm only killed/ETIMEDOUT reach the timeout branch.
5. R12/fail-loud: is the timeout adequately logged?
Grade PASS or FAIL with P0/P1/P2 + file:line.

### Assistant | 2026-06-17T23:53:19.880Z

I'll investigate the Dream-Cycle cron fix systematically. Let me start by reading the commit and the relevant files.

### Assistant | 2026-06-17T23:53:20.551Z

[tool_use: Bash]

### User | 2026-06-17T23:53:23.828Z

[tool_result] commit 7122c1a9935092aa9f7a498e503061a3599b9ff5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 17 15:07:51 2026 -0500

    [MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT (slot:bravo): 267014 was a PT2M task-timeout, NOT an OOM -- raise limit 2min->30min + bound the galaxy-cascade execFileSync (20min self-timeout, fail-soft). Synth=9s/19156 memos; ETIMEDOUT detect
... [+463 chars truncated]

### Assistant | 2026-06-17T23:53:25.473Z

I'll read the full diff and the relevant files in parallel.

### Assistant | 2026-06-17T23:53:26.895Z

[tool_use: Bash]

### Assistant | 2026-06-17T23:53:27.443Z

[tool_use: Read]

### User | 2026-06-17T23:53:27.623Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-17T23:53:27.845Z

[tool_use: Read]

### User | 2026-06-17T23:53:28.593Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/hermes-dream-cycle-synth.mjs
3	// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B1-HMEMV04 (2026-05-27, slot:alpha):
4	// Hermes dream-cycle synthesis (the cross-memo connection-discovery half of
5	// HMEMV04). The reverse-mirror H:→C: hook half shipped 2026-05-26 in commit
6	// 5bcf40f66f69 (.claude/hooks/h-to-c-obsidian-mirror.mjs).
7	//
8	// "Dreams" = nightly synth
... [+21924 chars truncated]

### User | 2026-06-17T23:53:28.751Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Hermes Dream-Cycle Synth',
3	  # Run nightly at 03:17 local — off-hour minute to avoid the :00/:30 fleet
4	  # collision per the cron-style off-minute discipline. Also avoids the daily-
5	  # context window which fires earlier in the morning.
6	  [string]$Time = '03:17',
7	  [switch]$DryRun,
8	  [switch]$RunNow,
9	  [switch]$Uninstall,
10	  [switch]$Interact
... [+9331 chars truncated]

### Assistant | 2026-06-17T23:53:31.738Z

I have the synth file and installer. Now let me read the test file and the spawned child to assess the SIGTERM-mid-rebuild and crash-misclassification risks.

### Assistant | 2026-06-17T23:53:32.678Z

[tool_use: Read]

### User | 2026-06-17T23:53:33.512Z

[tool_result] 1	// scripts/hermes-dream-cycle-synth.test.mjs
2	// Tests for U-GALAXY-MS1-B1-HMEMV04 dream-cycle synthesis.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  extractKeywords,
8	  jaccard,
9	  listAllMemos,
10	  findConnections,
11	  clusterByMemo,
12	  synthesizeDreamMarkdown,
13	  run,
14	  runGalaxyCascade,
15	} from "./hermes-dream-cycle-s
... [+21303 chars truncated]

### Assistant | 2026-06-17T23:53:34.306Z

[tool_use: Bash]

### User | 2026-06-17T23:53:37.553Z

[tool_result] commit 7122c1a9935092aa9f7a498e503061a3599b9ff5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 17 15:07:51 2026 -0500

    [MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT (slot:bravo): 267014 was a PT2M task-timeout, NOT an OOM -- raise limit 2min->30min + bound the galaxy-cascade execFileSync (20min self-timeout, fail-soft). Synth=9s/19156 memos; ETIMEDOUT detect
... [+4412 chars truncated]

### Assistant | 2026-06-17T23:53:42.310Z

Now let me investigate the spawned child (galaxy-synthesis-refresh.mjs) for the SIGTERM-mid-rebuild risk, and check the live task / installer drift. Let me look at the child's sidecar-write behavior and Windows SIGTERM semantics.

### Assistant | 2026-06-17T23:53:43.955Z

[tool_use: Bash]

### User | 2026-06-17T23:53:47.849Z

[tool_result] -rwxr-xr-x 1 wompu 197611 18263 Jun  4 10:31 scripts/galaxy-synthesis-refresh.mjs*
---SIDECAR WRITES---
47:import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
152:export function stripEmbeddingVectors(galaxies, embPath = EMB_SIDECAR_PATH, { readFileImpl = readFileSync, writeFileImpl = writeFileSync, renameImpl = renameSync, existsImpl = existsSync } = {}) {
162:    const
... [+94 chars truncated]

### Assistant | 2026-06-17T23:53:52.559Z

The child uses atomic tmp+rename for at least one sidecar. Let me see the full write paths in the child and whether all writes are atomic, plus check how it spawns its own subprocesses (which SIGTERM may not reach on Windows).

### Assistant | 2026-06-17T23:53:52.951Z

[tool_use: Read]

### User | 2026-06-17T23:53:53.852Z

[tool_result] 140	// Fail-soft: resolveSynthesisModel never throws (except on a missing fallback, which we always
141	// supply) — ollama-down → fallback; weak host → the same small model; Blackwell → 32B.
142	// Pure/injectable: `resolveImpl` lets a test pin the resolved model without a GPU or Ollama.
143	export async function resolveModelForRun(args, rawArgv = process.argv, { resolveImpl = resolveSynthesisMod
... [+6613 chars truncated]

### Assistant | 2026-06-17T23:53:58.603Z

Now I understand the child's write structure. Key findings:

1. The child spawns its OWN grandchild subprocesses (`BUILD_INDEX_SIDECAR`, `BUILD_EMB_SIDECAR`, `META_SCRIPT`) via `execFileSync`. Those grandchildren are the ones doing the heavy index+embedding rebuilds.
2. `writeSynthesisDoc` (the per-galaxy synthesis write) — let me check if it's atomic.

Let me verify the grandchild atomicity and the SIGTERM-on-Windows reachability, plus confirm the live task vs installer drift.

### Assistant | 2026-06-17T23:54:00.960Z

[tool_use: Bash]

### Assistant | 2026-06-17T23:54:04.110Z

[tool_use: Bash]

### User | 2026-06-17T23:54:05.408Z

[tool_result] ===writeSynthesisDoc===
55:  writeSynthesisDoc,
176:  writeImpl = writeSynthesisDoc,
===const paths===
69:const META_SCRIPT = "H:/prism/scripts/galaxy-meta-synthesis.mjs";
70:const BUILD_INDEX_SIDECAR = "H:/prism/scripts/build-memory-index-sidecar.mjs";
71:const BUILD_EMB_SIDECAR = "H:/prism/scripts/build-memory-embeddings-sidecar.mjs";
73:const SUBPROCESS_TIMEOUT_MS = 600000;
178:  execImpl = (sc
... [+432 chars truncated]

### User | 2026-06-17T23:54:10.440Z

[tool_result] ===LIVE TASK STATE===
ExecutionTimeLimit=PT30M
Args="H:\PRISM\scripts\hermes-dream-cycle-synth.mjs"
LastResult=267014
LastRun=06/17/2026 03:17:17

### Assistant | 2026-06-17T23:54:15.731Z

This is a significant finding. The LIVE task's `Args="H:\PRISM\scripts\hermes-dream-cycle-synth.mjs"` — it does NOT have `--llm-synth`. But the installer (`.ps1` line 87) registers WITH `--llm-synth`. This is installer-vs-live drift. Let me dig deeper into:
1. The drift implications (the live task is missing `--llm-synth` and was set to PT30M separately).
2. `writeSynthesisDoc` import source — is it imported from a lib (atomic?).
3. The `SUBPROCESS_TIMEOUT_MS = 600000` (10min) per grandchild — with 3 grandchildren sequentially that's up to 30min, but the parent cascade self-timeout is 20min. Interaction matters.

### Assistant | 2026-06-17T23:54:17.614Z

[tool_use: Bash]

### Assistant | 2026-06-17T23:54:19.332Z

[tool_use: Bash]

### User | 2026-06-17T23:54:22.185Z

[tool_result] ===writeSynthesisDoc import===
12:// was built from). This script gathers each galaxy's CURRENT cluster (via the
59:} from "./galaxy-reflection-synthesis.mjs";
60:import { tryClaimSynthesis, tryReleaseSynthesis, CHAT_ID_RE } from "./galaxy-synthesis-claim.mjs";
===where defined===

### User | 2026-06-17T23:54:24.967Z

[tool_result] ===build-memory-embeddings-sidecar atomic?===
14:// ~10.9k embeds take a few minutes; --resume skips already-embedded keys so a
19://   node scripts/build-memory-embeddings-sidecar.mjs --resume       # continue
25:import { readFileSync, writeFileSync, renameSync, existsSync, statSync } from "node:fs";
58:    else if (k === "--resume") a.resume = true;
125:  const tmp = `${outPath}.tmp.${process.pi
... [+685 chars truncated]

### Assistant | 2026-06-17T23:54:29.287Z

Both grandchild sidecar writers use atomic tmp+rename (`.tmp.${pid}` then `renameSync`). So a SIGTERM mid-write of the *final sidecar* leaves a `.tmp.PID` orphan, not a corrupted sidecar — the rename is atomic. Let me verify the embeddings sidecar's `--resume` incremental behavior (whether it writes intermediate state that could be torn) and check `writeSynthesisDoc` (defined in galaxy-reflection-synthesis.mjs).

### Assistant | 2026-06-17T23:54:31.641Z

[tool_use: Bash]

### User | 2026-06-17T23:54:35.418Z

[tool_result] ===writeSynthesisDoc def===
===emb sidecar incremental write during loop?===
25:import { readFileSync, writeFileSync, renameSync, existsSync, statSync } from "node:fs";
47:const CHECKPOINT_EVERY = 250;            // flush .partial every N successful embeds
126:  writeFileSync(tmp, JSON.stringify(sidecar), "utf8");
127:  if (atomic) renameSync(tmp, outPath);
128:  else renameSync(tmp, `${outPath}.p
... [+92 chars truncated]

### Assistant | 2026-06-17T23:54:40.216Z

The embeddings sidecar flushes a `.partial` via the same atomic tmp+rename pattern (`writeFileSync(tmp); renameSync(tmp, outPath.partial)`) every 250 embeds, and only writes the FINAL sidecar atomically at the end. So a SIGTERM mid-run leaves either a `.tmp.PID` orphan or a `.partial` — never a torn final sidecar, and `--resume` recovers. Let me confirm `writeSynthesisDoc` is from galaxy-reflection-synthesis (the import line 59) and check its write atomicity, then examine the SIGTERM-doesn't-kill-grandchildren issue on Windows.

### Assistant | 2026-06-17T23:54:41.570Z

[tool_use: Bash]

### User | 2026-06-17T23:54:45.818Z

[tool_result] ===find writeSynthesisDoc===
scripts/galaxy-reflection-synthesis.mjs
scripts/galaxy-reflection-synthesis.test.mjs
scripts/galaxy-synthesis-refresh.mjs
===its write===
190:export function writeSynthesisDoc({ galaxy, doc, outDir = DEFAULT_PATTERNS_DIR, writeImpl = writeFileSync, mkdirImpl = mkdirSync, renameImpl = renameSync, existsImpl = existsSync }) {

### Assistant | 2026-06-17T23:54:50.375Z

[tool_use: Read]

### User | 2026-06-17T23:54:51.417Z

[tool_result] 190	export function writeSynthesisDoc({ galaxy, doc, outDir = DEFAULT_PATTERNS_DIR, writeImpl = writeFileSync, mkdirImpl = mkdirSync, renameImpl = renameSync, existsImpl = existsSync }) {
191	  if (!doc || typeof doc !== "string") throw new Error("writeSynthesisDoc: refusing to write empty doc");
192	  if (!existsImpl(outDir)) mkdirImpl(outDir, { recursive: true });
193	  const outPath = join(outD
... [+736 chars truncated]

### Assistant | 2026-06-17T23:54:55.692Z

All write paths in the entire cascade chain (`writeSynthesisDoc`, `stripEmbeddingVectors`, both grandchild sidecar writers) use atomic tmp+rename. So the SIGTERM-mid-rebuild risk is bounded: a half-written sidecar cannot occur; the worst case is a `.tmp.PID` orphan file left behind. Let me confirm one remaining concern — whether SIGTERM actually reaches/terminates the grandchild process tree on Windows, and the exit-code interaction. Let me verify the live result code meaning and the node version.

### Assistant | 2026-06-17T23:54:57.790Z

[tool_use: Bash]

### User | 2026-06-17T23:55:03.295Z

[tool_result] ===node version===
v22.12.0
===267014 decimal=hex===
0x41306
===any .tmp orphans in patterns dir===
-rw-r--r-- 1 wompu 197611 22597109 Jun 12 11:36 state/shared/memory-embeddings-sidecar.json.partial
(orphan scan done)

### Assistant | 2026-06-17T23:55:09.192Z

Confirmed evidence: a 22.5MB `.partial` orphan exists from a Jun 12 run — proving the cascade HAS been killed mid-embedding-rebuild before (consistent with the old 2-min OS-kill). This validates that the atomic-write design already handled the abrupt-kill case correctly (`.partial`, not a corrupted final sidecar), and `--resume` recovers. The new SIGTERM-at-20min is the SAME class of interruption the system already survives — not a new risk.

Now let me confirm the key drift finding and the crash-misclassification analysis. The live task `LastResult=267014` and `Args` has no `--llm-synth`. Let me check the spec doc to understand what the author actually changed live vs what the installer says.

### Assistant | 2026-06-17T23:55:11.205Z

[tool_use: Bash]

### User | 2026-06-17T23:55:16.492Z

[tool_result] ===spec mentions of llm-synth / Set-ScheduledTask / live task===
35:| Orchestrator | `PRISM Zulu Orchestrator` task | **Ready, lastResult=0 ✓** (was "never registered" @ 06-01 NO-GO — now CLOSED) |
42:| Dream-cycle | `PRISM Hermes Dream-Cycle Synth` task | **FIXED 2026-06-17** ✓ — 267014 was NOT an OOM (corrected §8): the `PT2M` task limit was too short for synth+llm-synth+cascade; raised to 30min
... [+2140 chars truncated]

### Assistant | 2026-06-17T23:55:22.339Z

The spec confirms: the live task limit was updated in place to PT30M (verified PT30M live). The spec at line 101 admits the green LastTaskResult "will be confirmed on the next 03:17 run" — and indeed the LIVE `LastResult=267014` is from the 03:17:17 run on 06/17, which is the run BEFORE the fix committed at 15:07. So the live task has PT30M but its last actual run was pre-fix. That's expected.

Now the critical drift question: the LIVE task `Args` has NO `--llm-synth`, but the installer registers WITH `--llm-synth`. Let me verify this is a pre-existing drift (not introduced by this commit) and confirm whether re-running the installer would change behavior. Let me check git history of the installer's `--llm-synth` line.

### Assistant | 2026-06-17T23:55:25.314Z

[tool_use: Bash]

### User | 2026-06-17T23:55:31.865Z

[tool_result] ===when did --llm-synth enter the installer===
7122c1a993 [MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT (slot:bravo): 267014 was a PT2M task-timeout, NOT an OOM -- raise limit 2min->30min + bound the galaxy-cascade execFileSync (20min self-timeout, fail-soft). Synth=9s/19156 memos; ETIMEDOUT detection proven live on node22; live task now PT30M; 40/40 tests (+4 cascade-timeout). Corrects HER
... [+325 chars truncated]

### Assistant | 2026-06-17T23:55:36.843Z

Interesting — the grep found 1 match in this commit's diff, but that's the comment context line `# 30min ... --llm-synth` not the `$action` line itself. The `--llm-synth` flag in `$action` (line 87) was added by the *earlier* commit `d0566c6116` (U-OBS-DREAM-LLM-PROMOTE). Let me confirm the `$action` line specifically wasn't modified by this commit and assess the installer-vs-live drift precisely.

### Assistant | 2026-06-17T23:55:39.770Z

[tool_use: Bash]

### User | 2026-06-17T23:55:45.167Z

[tool_result] ===exact diff lines mentioning llm-synth in THIS commit===
23:+#   (2) the action gained --llm-synth (cold-loads qwen2.5-coder:32b + per-edge
===does d0566c6116 say it applied --llm-synth LIVE?===
commit d0566c6116fce1223f6664102feed1b77befe8cb
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 04:03:27 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNE
... [+372 chars truncated]

### Assistant | 2026-06-17T23:55:52.909Z

Now I have the full picture on the drift. The grep `1` was just the comment line. The `$action` `--llm-synth` was added by `d0566c6116` (alpha, 2026-06-09), which claimed "applied live." But the LIVE task TODAY has `Args="...hermes-dream-cycle-synth.mjs"` with NO `--llm-synth`. So there are two layers of drift, neither introduced by this commit but both relevant to whether the fix actually holds in production:

1. **Live task limit (PT30M)** — correctly applied live (verified PT30M). The installer matches (30min). Consistent.
2. **Live task args (no `--llm-synth`)** — DRIFTED. Installer says `--llm-synth`; live says bare. This is a *pre-existing* drift from d0566c6116, but it directly affects this commit's root-cause analysis (the commit cites `--llm-synth` as cause #2 of the overrun, yet the live task never actually ran with it).

Let me do a final confirmation on the crash-misclassification branch logic (question 4) and verify the test suite passes, then I have everything.

### Assistant | 2026-06-17T23:55:54.130Z

[tool_use: Bash]

### User | 2026-06-17T23:55:58.555Z

[tool_result] ===run the test file===
    1..9
ok 8 - runGalaxyCascade
  ---
  duration_ms: 0.8087
  type: 'suite'
  ...
1..8
# tests 40
# suites 8
# pass 40
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 110.3961

### Assistant | 2026-06-17T23:56:08.892Z

40/40 tests pass. Let me do the final analysis on the crash-misclassification branch (question 4) — confirming only `killed===true || code==="ETIMEDOUT"` reaches the timeout branch, and that a genuine SIGTERM from an external source (e.g., OS shutdown, fleet-reaper) would be misclassified.

The branch logic at lines 350-362:
- `e.killed === true || e.code === "ETIMEDOUT"` → timeout branch (fail-soft, `timedOut:true`)
- `e.status === 3` → benign
- else → generic fail-soft (`ok:false`, logged)

Key subtlety: `e.killed === true` is set by `execFileSync` whenever IT killed the child due to timeout. But `execFileSync` also sets `killed:true` if the child is killed by ANY signal the parent sent OR — critically — `child.killed` reflects whether `.kill()` was called. A genuine crash (child calls `process.exit(1)`) sets `status:1`, `killed:false` → correctly falls to generic branch. A child killed by an EXTERNAL signal (not the timeout) — e.g. the fleet-reaper SIGTERM'ing the grandchild — would surface as `signal:'SIGTERM'`, `killed:true` on the parent's view. That WOULD be misclassified as a self-timeout. But the consequence is benign (both paths are fail-soft, dream synth still exits 0); only the log message and `timedOut` flag would be slightly inaccurate. Let me verify there's no path where a real non-timeout error sets `killed:true` with a misleading downstream effect.

### Assistant | 2026-06-17T23:56:15.269Z

[tool_use: Bash]

### User | 2026-06-17T23:56:21.017Z

[tool_result] exit(1) crash -> GENERIC-FAILSOFT(status=1) killed=undefined code=undefined status=1
uncaught throw -> GENERIC-FAILSOFT(status=1) killed=undefined code=undefined
real timeout -> TIMEOUT-BRANCH killed=undefined code=ETIMEDOUT
missing script -> GENERIC-FAILSOFT(status=1) killed=undefined code=undefined status=1

### Assistant | 2026-06-17T23:56:55.815Z

Empirically proven on the live node v22.12.0:
- A genuine crash (`exit(1)`, uncaught throw) → `status=1`, `killed=undefined`, `code=undefined` → correctly hits GENERIC-FAILSOFT, NOT the timeout branch.
- A real timeout → `code=ETIMEDOUT` → correctly hits TIMEOUT-BRANCH.
- A missing script → GENERIC-FAILSOFT.

So question 4 is clean: a genuine crash is NOT misclassified as a timeout. The only theoretical mislabel is an external SIGTERM killing the child (fleet-reaper / OS shutdown), which would set `killed:true` — but both that branch and the generic branch are fail-soft (dream synth exits 0 regardless), so the consequence is purely a cosmetic log inaccuracy, not a swallowed crash. No functional risk.

I have everything I need. Let me compile the verdict.

## Arm C Review — U-DREAM-CYCLE-TIMEOUT (commit `7122c1a993`)

VERDICT: PASS

summary: The cascade self-timeout is correct and fail-soft, the crash-misclassification concern is empirically disproven (a genuine non-zero exit lands in the generic branch, only real timeouts/`ETIMEDOUT` reach the timeout branch), and the SIGTERM-mid-rebuild risk is bounded — every write in the entire cascade chain is atomic tmp+rename, so a kill leaves a `.tmp.PID`/`.partial` orphan (recoverable via `--resume`), never a torn sidecar. This is the SAME interruption class the old 2-min OS-kill already produced (proven by a live 22.5 MB `.partial` orphan from a prior kill). The one real defect is an installer-vs-live drift on the action args, which is P2 (pre-existing, not introduced here) and does not undermine the fix.

findings:
- [P2] `.claude/helpers/install-hermes-dream-cycle-task.ps1:87` vs live task — **installer/live drift on the action args.** The installer registers `$action` with `--llm-synth` (added by prior commit `d0566c6116`, "applied live"), but the LIVE scheduled task today runs bare: `Args="H:\PRISM\scripts\hermes-dream-cycle-synth.mjs"` (verified via `Get-ScheduledTask`). The commit message and the `.ps1` comment (lines
... [+4004 chars truncated]
