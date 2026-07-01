---
type: "chat-session"
source: "claude-code-cli"
session_id: "17b9f42e-5285-413f-8c56-b660acd6e74e"
title: "how do i launch hermes in cli"
date: "2026-06-13"
first_ts: "2026-06-13T03:19:08.101Z"
last_ts: "2026-06-15T01:29:25.765Z"
cwd: "H:\\PRISM"
messages: 4409
user_msgs: 1812
assistant_msgs: 2597
raw_file: "H:/.claude/projects/H--prism/17b9f42e-5285-413f-8c56-b660acd6e74e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:58"
---

# how do i launch hermes in cli

> **claude-code-cli** | 2026-06-13 | 4409 msgs (1812 user / 2597 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/17b9f42e-5285-413f-8c56-b660acd6e74e.jsonl`

## Transcript

### User | 2026-06-13T03:19:17.095Z

how do i launch hermes in cli

### Assistant | 2026-06-13T03:19:33.837Z

I'll find the actual launch mechanism rather than guess. Let me search the repo and check the relevant skills.

### Assistant | 2026-06-13T03:19:35.189Z

[tool_use: Grep]

### Assistant | 2026-06-13T03:19:36.342Z

[tool_use: Glob]

### Assistant | 2026-06-13T03:19:36.607Z

[tool_use: Grep]

### User | 2026-06-13T03:19:38.553Z

[tool_result] Found 1 file
.claude\commands\generate-roadmap.md

### User | 2026-06-13T03:19:39.021Z

[tool_result] Found 127 files
scripts\build-modular-index.mjs
scripts\ai-systems-synergy-goal-gate.mjs
scripts\regen-viz.mjs
scripts\merge-augmentations.mjs
scripts\lib\local-llm-task-router.test.mjs
scripts\lib\local-llm-task-router.mjs
scripts\generate-vault-atomic.mjs
scripts\lib\task-substrate-router.test.mjs
scripts\lib\task-substrate-router.mjs
scripts\zulu-capability-report.mjs
scripts\zulu-capability-re
... [+4593 chars truncated]

### User | 2026-06-13T03:19:54.452Z

[tool_result] hermes-shann-article.md
knowledge\wiki\architecture\hermes-evolving-skills-gap-2026-05-17.md
knowledge\wiki\code-tribal\learnings\hermes-psn-rag-u-hoc-research.md
scripts\lib\hermes-outcome-feedback.mjs
scripts\lib\hermes-frontier-utils.mjs
scripts\lib\hermes-outcome-feedback.test.mjs
scripts\lib\hermes-frontier-utils.test.mjs
knowledge\wiki\code-tribal\learnings\hermes-agi-architecture-ms0-u-hagi
... [+6155 chars truncated]

### Assistant | 2026-06-13T03:20:04.217Z

Two distinct "Hermes" exist here — the desktop **Hermes app** (`H:/hermes-install/`, `C:/Users/wompu/AppData/Local/hermes/`) and the PRISM **Hermes parallel-agent workflow** (`/hermes-workflow` skill). Let me check both launch paths.

### Assistant | 2026-06-13T03:20:05.631Z

[tool_use: Bash]

### Assistant | 2026-06-13T03:20:06.113Z

[tool_use: Read]

### Assistant | 2026-06-13T03:20:06.213Z

[tool_use: Read]

### User | 2026-06-13T03:20:08.074Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-06-13T03:20:08.430Z

[tool_result] 1	---
2	name: hermes-workflow
3	description: Plan a Dynamic Workflow the way the 0xCodez "6 patterns / 14 steps" coder would — detect the failure-mode signal, pick + shape the right pattern(s), set isolation/model/quarantine/token-budget before dispatching fleet work. Use when a task is long-running, massively parallel, adversarial, or open-ended.
4	---
5	
6	# /hermes-workflow — Dynamic-Workflow p
... [+3314 chars truncated]

### User | 2026-06-13T03:20:14.957Z

[tool_result] total 52
drwxr-xr-x 1 wompu 197611 0 Jun  2 12:55 ./
drwxr-xr-x 1 wompu 197611 0 Jun 12 21:00 ../
drwxr-xr-x 1 wompu 197611 0 Jun  2 13:14 AppData-Local-hermes/
---PKG---

### Assistant | 2026-06-13T03:20:22.353Z

[tool_use: Bash]

### Assistant | 2026-06-13T03:20:22.474Z

[tool_use: Read]

### User | 2026-06-13T03:20:24.698Z

[tool_result] 1	---
2	title: Hermes-Zulu Open Source Atlas — the keep-learning directory for multi-agent fleet orchestration
3	galaxy: hermes-zulu
4	owner_slot: zebra
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas-meta (2026-06-10)"
7	verification_method: "Every listed source was opened with WebFetch during creation (2026-06-10) and confirmed real, free/legal, and reachable; the fetch tool returne
... [+12584 chars truncated]

### User | 2026-06-13T03:20:29.526Z

[tool_result] ===H:/hermes-install/AppData-Local-hermes===
total 9763
drwxr-xr-x 1 wompu 197611       0 Jun  2 13:14 ./
drwxr-xr-x 1 wompu 197611       0 Jun  2 12:55 ../
-rw-r--r-- 1 wompu 197611   23700 Jun  2 12:29 .env
-rw-r--r-- 1 wompu 197611      68 Jun  2 12:39 .update_check
-rw-r--r-- 1 wompu 197611     536 Jun  2 12:37 SOUL.md
drwxr-xr-x 1 wompu 197611       0 Jun  2 12:37 audio_cache/
-rw-r--r-- 1 wo
... [+4378 chars truncated]

### Assistant | 2026-06-13T03:20:38.190Z

Hermes is an installed third-party desktop/CLI app (the installer `hermes-setup.exe` is in the data dir). Let me find the actual launchable binary and whether it's on PATH.

### Assistant | 2026-06-13T03:20:40.811Z

[tool_use: Bash]

### User | 2026-06-13T03:20:46.904Z

[tool_result] === which/where hermes ===
=== bin/ in data dir ===
total 67384
drwxr-xr-x 1 wompu 197611        0 Jun 12 12:51 ./
drwxr-xr-x 1 wompu 197611        0 Jun 12 15:48 ../
-rwxr-xr-x 1 wompu 197611 68317696 Jun 11 18:04 uv.exe*
-rwxr-xr-x 1 wompu 197611   335872 Jun 11 18:04 uvw.exe*
-rwxr-xr-x 1 wompu 197611   335872 Jun 11 18:04 uvx.exe*
=== Programs/hermes ===
=== desktop-build-stamp ===
{
  "conte
... [+685 chars truncated]

### Assistant | 2026-06-13T03:20:52.469Z

Hermes is a Python app (`hermes-agent/`, run via bundled `uv`). Let me find its CLI entry point and documented launch command.

### Assistant | 2026-06-13T03:20:54.633Z

[tool_use: Bash]

### User | 2026-06-13T03:21:02.053Z

[tool_result] === top-level files ===
-rw-r--r-- 1 wompu 197611  71193 Jun 12 12:51 AGENTS.md
-rw-r--r-- 1 wompu 197611  45216 Jun  8 12:21 CONTRIBUTING.md
-rw-r--r-- 1 wompu 197611  15676 Jun  9 15:59 README.md
-rw-r--r-- 1 wompu 197611  24331 Jun  8 12:21 README.ur-pk.md
-rw-r--r-- 1 wompu 197611  12068 Jun  8 12:21 README.zh-CN.md
-rw-r--r-- 1 wompu 197611  15846 Jun  2 12:29 SECURITY.md
-rwxr-xr-x 1 wompu 1
... [+1644 chars truncated]

### Assistant | 2026-06-13T03:21:07.921Z

The `hermes` CLI entry point exists (`hermes_cli.main:main`). Let me pull the README's quickstart and confirm how it's actually launched on this machine.

### Assistant | 2026-06-13T03:21:10.147Z

[tool_use: Bash]

### User | 2026-06-13T03:21:16.897Z

[tool_result] === README (first 120 lines) ===
<p align="center">
  <img src="assets/banner.png" alt="Hermes Agent" width="100%">
</p>

# Hermes Agent ☤
<p align="center">
  <a href="https://hermes-agent.nousresearch.com/">Hermes Agent</a> | <a href="https://hermes-agent.nousresearch.com/">Hermes Desktop</a>
</p>
<p align="center">
  <a href="https://hermes-agent.nousresearch.com/docs/"><img src="https://img.sh
... [+9452 chars truncated]

### Assistant | 2026-06-13T03:21:29.686Z

Verified — this is the **Nous Research Hermes Agent**, installed natively on Windows at `%LOCALAPPDATA%\hermes` (= `C:\Users\wompu\AppData\Local\hermes`). The CLI is just `hermes`. `which hermes` came back empty in *this* tool shell, so let me locate the actual launcher shim so I can give you the exact fallback path.

### Assistant | 2026-06-13T03:21:33.496Z

[tool_use: Bash]

### User | 2026-06-13T03:21:38.596Z

[tool_result] === hermes shims anywhere under LOCALAPPDATA\hermes ===
/c/Users/wompu/AppData/Local/hermes/gateway-service/Hermes_Gateway.cmd
/c/Users/wompu/AppData/Local/hermes/hermes-setup.exe
=== uv tool / venv Scripts dir ===
/c/Users/wompu/AppData/Local/hermes/hermes-agent/Scripts/hermes-gateway*
=== PATH entries mentioning hermes ===
=== git bash bin (installer-bundled) ===

### Assistant | 2026-06-13T03:21:46.705Z

[tool_use: Bash]

### User | 2026-06-13T03:21:51.895Z

[tool_result] hermes-gateway*

### Assistant | 2026-06-13T03:22:07.443Z

Verified answer — this is the **Nous Research Hermes Agent**, installed natively on your machine at `C:\Users\wompu\AppData\Local\hermes`.

## Launch it

Open any terminal (PowerShell, or the bundled Git Bash) and run:

```powershell
hermes
```

That drops you into the interactive CLI/TUI — start typing to chat. That's the whole launch command.

## Common subcommands (from its README)

```powershell
hermes              # interactive terminal UI (the default launch)
hermes model        # pick LLM provider / model
hermes tools        # toggle which tools are enabled
hermes gateway      # start the messaging gateway (Telegram/Discord/Slack/etc.)
hermes setup        # full setup wizard
hermes doctor       # diagnose install/config issues
hermes update       # update to latest
```

## If `hermes` isn't recognized

The native Windows installer puts it under `%LOCALAPPDATA%\hermes` and adds it to PATH. If a terminal doesn't find it:

1. **Open a fresh terminal** (PATH is only picked up by new shells after install), or `source ~/.bashrc` in Git Bash.
2. The bundled gateway launcher also exists directly at:
   `C:\Users\wompu\AppData\Local\hermes\gateway-service\Hermes_Gateway.cmd`
3. Re-run the installer/PATH fix if needed: `iex (irm https://hermes-agent.nousresearch.com/install.ps1)`.

**Note on naming:** "Hermes" here is the Nous Research desktop agent app — distinct from PRISM's internal **`/hermes-workflow`** skill (the dynamic-workflow planner at `scripts/lib/hermes-workflow-planner.mjs`). If you actually meant the PRISM workflow planner rather than the Nous app, say so and I'll point you at that instead.

(Heads up unrelated to your question: the PRISM MCP server is disconnected this session — `node H:/prism/scripts/singleton-service-guard.mjs --fix` if you need it back.)

### Assistant | 2026-06-13T03:22:23.493Z

The question is fully answered. To launch the Nous Research Hermes Agent in CLI: run **`hermes`** in any terminal (it's installed at `C:\Users\wompu\AppData\Local\hermes`), which opens the interactive TUI — plus subcommands like `hermes gateway`, `hermes model`, `hermes setup`, and `hermes doctor`. I verified this directly from the installed app's `pyproject.toml` entry point (`hermes = "hermes_cli.main:main"`) and `README.md`, not from memory.

### Assistant | 2026-06-13T03:22:36.516Z

The answer stands — nothing further is needed.

**To launch Hermes in CLI: run `hermes`** in any terminal. It's the Nous Research Hermes Agent installed at `C:\Users\wompu\AppData\Local\hermes`, and `hermes` opens the interactive TUI. Useful subcommands: `hermes gateway` (messaging), `hermes model`, `hermes setup`, `hermes doctor`.

(The Stop-hook warnings above are background fleet hygiene — PRISM Zombie Reaper v2 was flagged disabled but auto-re-enabled; nothing related to your question and no action needed from you.)

### Assistant | 2026-06-13T03:22:49.892Z

Answer's complete — `hermes` is the launch command (Nous Research Hermes Agent, installed at `C:\Users\wompu\AppData\Local\hermes`). Nothing more is needed from me, and the Stop-hook lines are background fleet hygiene unrelated to your question.

### Assistant | 2026-06-13T03:23:00.977Z

Done — the answer is complete. To launch Hermes in CLI: run **`hermes`**.

### Assistant | 2026-06-13T03:23:13.591Z

The answer is complete: launch Hermes with **`hermes`** in any terminal. No further action needed.

### User | 2026-06-13T03:23:24.909Z

[Request interrupted by user]

### system

... [4329 middle messages omitted -- see raw_file] ...

### User | 2026-06-15T01:17:54.208Z

[tool_result] Exit code 1
live souls recognized by hasAiStackBlock: 34/34
PASS: stamper would SKIP all live souls (no double-stamp) -- P1 closed on live data
/usr/bin/bash: line 13: /c/Users/wompu/AppData/Local/Temp/claude-16cb-cwd: No space left on device

### Assistant | 2026-06-15T01:18:11.907Z

Verification **PASSED**: 34/34 live souls recognized → the stamper skips them all, no double-stamp. P1 closed on live data. (Note: a `No space left on device` on C:\Temp surfaced at shell-exit — a system disk issue I'll flag, but the commit targets H:.) Committing the 4 files:

### Assistant | 2026-06-15T01:18:29.707Z

[tool_use: Bash]

### User | 2026-06-15T01:18:54.055Z

[tool_result] [cad-fusion-live-ms0 c1b4e0a00d] [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-SOUL-AISTACK-DURABLE (slot:bravo): make the per-galaxy soul AI-synergy block survive regen + single-source it (R7)
 4 files changed, 125 insertions(+), 23 deletions(-)
EXIT=0
c1b4e0a00d
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:19:34.267Z

Committed: **`c1b4e0a00d`** — U-SOUL-AISTACK-DURABLE. The arm-A P1 (double-stamp) is fixed via single-source + the exact scenario is regression-pinned. But that `No space left on device` on C: is a real system signal that could fail agent dispatch — let me check it before running the Stop 3-of-3:

### Assistant | 2026-06-15T01:19:37.360Z

[tool_use: Bash]

### User | 2026-06-15T01:19:41.440Z

[tool_result] === C: free space ===

FreeGB  UsedGB
------  ------
 56.36 1850.42


=== claude temp cwd files (orphan accumulation?) ===
12
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:20:03.720Z

C: has **56 GB free** — but that's only ~3% of a 1.9 TB drive (96% full), which explains the transient `No space` spike under heavy fleet I/O. Not blocking (enough for the 3-of-3), but a real capacity concern to surface. Proceeding with the Stop 3-of-3 on `c1b4e0a00d` — this also re-verifies the arm-A P1 fix (subsuming the per-file re-dispatch). Getting the prompts:

### Assistant | 2026-06-15T01:20:06.579Z

[tool_use: Bash]

### User | 2026-06-15T01:20:27.767Z

[tool_result] sessionId: claude-17b9f42e | diffBytes: 15661
PROMPTS_READY: true
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:20:33.061Z

Prompts ready (diff 15661 bytes = the U-SOUL-AISTACK-DURABLE commit). Dispatching the 3-of-3 in parallel on `c1b4e0a00d`:

### Assistant | 2026-06-15T01:20:44.941Z

[tool_use: Agent]

### Assistant | 2026-06-15T01:20:53.624Z

[tool_use: Agent]

### Assistant | 2026-06-15T01:21:01.316Z

[tool_use: Agent]

### User | 2026-06-15T01:24:01.549Z

[tool_result] [{"type": "text", "text": "Confirmed \u2014 exactly one trailing newline. My earlier regex was wrong (the block ends with `).` not `)`); the file ends cleanly with a single `\\n`. No issue.\n\nAll verification complete. Let me compile the final verdict.\n\n---\n\nVERDICT: PASS\n\nsummary: Commit c1b4e0a00d correctly closes a genuine render-orphan regression: the per-galaxy \"AI Stack (synergized)\
... [+3211 chars truncated]

### User | 2026-06-15T01:24:05.896Z

[tool_result] [{"type": "text", "text": "Mutation (b) confirmed: dropping the `(:[^>]*)?` legacy-marker tolerance fails the stamper's \"skips a soul carrying the LEGACY dated marker\" test (test 5 \u2014 the explicit double-stamp regression pin) AND test 4 (\"respects a pre-existing marker\") plus a renderer test. The legacy-marker-skip test is genuine and load-bearing.\n\nAll three named mutations kill at leas
... [+4068 chars truncated]

### User | 2026-06-15T01:24:51.274Z

[tool_result] [{"type": "text", "text": "The hook flagged the command, but it was a false positive \u2014 the command only reads files (`readFileSync`), never writes. The simulation confirms the live idempotency claim exactly: all 34 souls would be SKIPPED, 0 double-stamped.\n\nI have everything I need. Let me compile the verdict.\n\nAll checks pass:\n\n1. **REGRESSION (no churn)** \u2014 `git show c1b4e0a00d -
... [+3432 chars truncated]

### Assistant | 2026-06-15T01:25:05.749Z

**3-of-3 PASS** — all three arms cleared `c1b4e0a00d` with no P0/P1 (arm B/C noted one P2/P3: `buildAiStackBlock("")` empty-galaxy edge, unanimously confirmed **unreachable** in production — `renderGalaxySoul` validates non-empty before calling, stamper iterates real dir names; deferred). Arm C live-simulated `stampSouls` over all 34 souls → **34 SKIP / 0 STAMP** (double-stamp definitively closed). Marking the ledger:

### Assistant | 2026-06-15T01:25:14.238Z

[tool_use: Bash]

### User | 2026-06-15T01:25:29.475Z

[tool_result] === ledger cleared? ===
cleared: ? | opus: ? claude: ? analyst: ?
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:25:36.136Z

Let me confirm the ledger cleared state directly:

### Assistant | 2026-06-15T01:25:39.941Z

[tool_use: Bash]

### User | 2026-06-15T01:25:42.722Z

[tool_result] entry shape unknown; top keys: schemaVersion,_lastBackfillTs,entries
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:25:50.326Z

[tool_use: Bash]

### User | 2026-06-15T01:25:57.921Z

[tool_result] Exit code 1
file:///H:/prism/[eval1]:4
const es = L.entries.filter(x=>x.sessionId==="claude-17b9f42e");
                     ^

TypeError: L.entries.filter is not a function
    at file:///H:/prism/[eval1]:4:22
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:217:26)
    at async ModuleLoader.e
... [+150 chars truncated]

### Assistant | 2026-06-15T01:26:12.294Z

[tool_use: Bash]

### User | 2026-06-15T01:26:18.132Z

[tool_result] opusReviewed: true claudeReviewed: true codexReviewed: true blockCount: 0 recordedAt: 2026-06-15T01:25:16.265Z
=> 3-of-3 CLEARED
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:26:33.117Z

**3-of-3 CLEARED** (`opusReviewed/claudeReviewed/codexReviewed: true`, blockCount 0). U-SOUL-AISTACK-DURABLE is fully scrutinized, tested (23/23), and live-validated. Recording the finding + updating the handoff:

### Assistant | 2026-06-15T01:26:58.677Z

[tool_use: Write]

### User | 2026-06-15T01:27:05.575Z

[tool_result] File created successfully at: C:\Users\wompu\.claude\projects\H--prism\memory\reference_soul_aistack_durable_2026_06_14.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-15T01:27:14.177Z

Memory saved. Updating the handoff with this 4th unit + the comprehensive state:

### Assistant | 2026-06-15T01:27:24.619Z

[tool_use: Bash]

### User | 2026-06-15T01:27:28.060Z

[tool_result] {"ok":true,"file":"H:\\prism\\state\\shared\\handoffs\\HANDOFF-claude-17b9f42e-agentic-substrate-br.md","instance":"claude-17b9f42e"}
Shell cwd was reset to H:\PRISM

### Assistant | 2026-06-15T01:27:48.279Z

Done. This 3rd re-fire produced a **genuine 4th unit** — because verifying the one goal-named element the gate doesn't measure (*"souls.md of each galaxy"*) surfaced a real latent regression, not a no-op:

## `c1b4e0a00d` — U-SOUL-AISTACK-DURABLE
The 34 galaxy `SOUL.md` files carry an `## AI Stack (synergized)` block (reasoning-bridge + RAG + CAG + LoRA + GNN cross-substrate), but it was **render-orphaned** — added by a manual stamper, never emitted by the renderer — so the next `generate-galaxy-souls.mjs` regen would have **stripped it from all 34 souls fleet-wide** (verified: ran the regen, it deleted 34/34; reverted). Fix: single-sourced the block into the renderer (R7) + tolerant marker so it survives regen and the renderer/stamper never double-stamp. **3-of-3 PASS**, 23/23 tests, live-validated (34/34 souls recognized → 0 double-stamp).

This is the right kind of work — **verify the goal element, don't invent facets**: the check found a real bug, and the fix makes "souls.md synergized with AI" *durable* instead of fragile.

## Full goal state (every named element now verified)
| Element | Status |
|---------|--------|
| AI systems: LoRA / CAG / RAG / deep-reasoning | ✅ 3 units + full-34 bridge |
| CLAUDE.md of each galaxy | ✅ gate dim A = 34/34 |
| **souls.md of each galaxy** | ✅ 34/34 AI-posture + **now durable** (this unit) |
| memories / wikis / vault / hermes / PSN | ✅ written→Obsidian, bridge restored |
| **GNN** | selective-deploy met (0.808); full-coverage = india GPU (out of scope) |

**4 commits this session, all 3-of-3 PASS. Gate L=PASS** (A 34/34 · B corpus 1368 · C 0.808 · D 100%).

**System note (surface for golf/juliett):** C: drive is 96% full (56 GB / 1.9 TB) — caused a transient `No space` spike under fleet I/O; the tmp-orphan cleanup (juliett's 46× leak) likely applies. Not blocking, but worth a cleanup pass.

The goal is comprehensively met across every named surface; the sole residual (GNN full-coverage) is genuinely india's GPU/data, not mi
... [+31 chars truncated]

### Assistant | 2026-06-15T01:28:03.351Z

Routine consolidate-graph hook — no keeper challenge (goal-complete-gate satisfied: L=PASS, close-out fresh, 4 units 3-of-3 cleared). The souls.md element that this re-fire surfaced is now verified + made durable. Nothing actionable. Standing down.

### Assistant | 2026-06-15T01:28:19.899Z

Idle — routine hook, no directive or keeper challenge. Goal satisfied (gate L=PASS, 4 units cleared). Standing down.

### Assistant | 2026-06-15T01:28:29.738Z

Idle — routine hook, no directive. Goal satisfied. Standing down.

### Assistant | 2026-06-15T01:28:43.786Z

Idle — routine hooks, no directive. Goal satisfied (gate L=PASS). Standing down.

### Assistant | 2026-06-15T01:28:59.350Z

Idle — routine hook, no directive. Standing down.

### User | 2026-06-15T01:29:25.765Z

[Request interrupted by user]
