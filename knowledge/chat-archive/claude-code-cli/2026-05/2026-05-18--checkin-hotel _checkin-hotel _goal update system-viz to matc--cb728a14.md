---
type: "chat-session"
source: "claude-code-cli"
session_id: "cb728a14-145a-4c60-80b0-31cb31a94750"
title: "checkin-hotel /checkin-hotel /goal update system-viz to match current build. exp"
date: "2026-05-18"
first_ts: "2026-05-18T01:39:39.751Z"
last_ts: "2026-05-18T03:12:05.706Z"
cwd: "H:\\prism"
messages: 335
user_msgs: 153
assistant_msgs: 182
raw_file: "H:/.claude/projects/H--prism/cb728a14-145a-4c60-80b0-31cb31a94750.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:46"
---

# checkin-hotel /checkin-hotel /goal update system-viz to match current build. exp

> **claude-code-cli** | 2026-05-18 | 335 msgs (153 user / 182 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cb728a14-145a-4c60-80b0-31cb31a94750.jsonl`

## Transcript

### User | 2026-05-18T01:46:00.013Z

<command-message>checkin-hotel</command-message>
<command-name>/checkin-hotel</command-name>
<command-args>/goal update system-viz to match current build. expand all layers. /loop [10m] complete /goal</command-args>

### User | 2026-05-18T01:46:00.013Z

# /checkin-hotel — slot-locked /checkin

Force-takes the **hotel** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `hotel-work`, then runs the standard `/checkin` pipeline. Use when you want this specific slot regardless of who currently holds it.

## Slot binding (replaces /checkin Step 2)

> **AUTO-ENFORCED (U-SLOT-BIND-ENFORCE, 2026-05-18).** The
> `slot-bind-enforce.mjs` UserPromptSubmit hook already force-claimed `hotel`
> deterministically from the harness `session_id` the instant this
> `/checkin-hotel` prompt was submitted. If a `✅ slot-bind-enforce: slot
> hotel deterministically bound to claude-<id>` line is in context, use THAT
> chat id everywhere this session and skip the bash below (its idempotent
> fast-path already no-ops a correct binding). Run the bash manually ONLY if
> the hook emitted a `⚠️ no harness session_id` advisory — and then STABLE
> MUST come from the LIVE `**Chat Isolation:**` line in THIS session, NEVER
> from a conversation summary/handoff (a stale id there is the exact
> cross-chat unit-collision this hook was built to kill).

```bash
STABLE="claude-<8hex-from-the-LIVE-Chat-Isolation-line>"   # fallback only
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="hotel"
TOPIC="hotel-work"

# Reap stale slots first, then force-take hotel from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
```

If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `hotel-work` topic · chat-bus read 
... [+1196 chars truncated]

### Assistant | 2026-05-18T01:46:47.186Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:46:48.617Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:46:49.904Z

[tool_use: Bash]

### User | 2026-05-18T01:46:58.734Z

[tool_result] {"ok":true,"started":true,"target":20}

### User | 2026-05-18T01:47:05.624Z

[tool_result] graph: 2.29.0 nodes=136107 edges=225994 fsCoverage=false gen=?

### User | 2026-05-18T01:47:11.369Z

[tool_result] H:/prism/state/shared/system-viz/DRIFT_REPORT.json  222B
H:/prism/state/shared/system-viz/EXECUTIVE-BRIEFING.json  8.7K
H:/prism/state/shared/system-viz/WIKI-COVERAGE-AUDIT.json  12.2K
H:/prism/state/shared/system-viz/action-engine-edges-augmentation.json  193B
H:/prism/state/shared/system-viz/actions-atomic-augmentation.json  4.1M
H:/prism/state/shared/system-viz/agent-overlay.json  5.5K
H:/prism
... [+1156 chars truncated]

### Assistant | 2026-05-18T01:47:22.688Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:47:23.961Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:47:24.366Z

[tool_use: Read]

### User | 2026-05-18T01:47:29.098Z

[tool_result] {
  "generatedAt": "2026-05-17T20:27:08.236Z",
  "graphPath": "H:\\prism\\state\\shared\\system-viz\\system-graph.json",
  "total": 0,
  "byCategory": {},
  "namespaces": [],
  "summary": "no fsCoverage entries in graph"
}---layers in current graph---
{"L0":14,"L1":837,"L2":20,"L3":33,"L4":97,"L5":3852,"L6":8103,"L7":101,"L8":22110,"L9":69638,"L10":20309,"L11":22,"L4a":10250,"Lgit":721}

### User | 2026-05-18T01:47:36.829Z

[tool_result] meta keys: counts,headline,coverage,dispatcherCatCount,pageClusters,totals,vault,worktrees,roadmap,novelty,businessValueTotals,spotlight,newlyBuilt,fileCoverage,fileCoverageV2,heuristicCoverage,skippedTrees,molecules,coreInventory,fsInventory,engineDomainInventory,knowledgeInventory,staleness,fsDeepInventory,l11Leaves,wiringOverlay,galaxyConstituents,knowledgeGalaxy,layerBridges,stagnantFeatures,m
... [+1423 chars truncated]

### User | 2026-05-18T01:47:37.717Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+15304 chars truncated]

### Assistant | 2026-05-18T01:48:09.396Z

[tool_use: Bash]

### User | 2026-05-18T01:48:14.335Z

[tool_result] system-graph.json size: 
---running regen procs---

---mem---
phys=39.2% commit=43.9%

### Assistant | 2026-05-18T01:48:38.175Z

Memory healthy (commit 44%), no regen running — safe to do a full rebuild. Launching the canonical regen pipeline with `--full` (FAST generators update to current build + HEAVY generators expand L11/fs-deep layers).

### Assistant | 2026-05-18T01:48:40.267Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:48:41.279Z

[tool_use: Bash]

### User | 2026-05-18T01:48:45.466Z

[tool_result] {"ok":true,"iter":1,"target":20,"status":"running"}

### User | 2026-05-18T01:48:48.113Z

[tool_result] Command running in background with ID: bw63mjn52. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\cb728a14-145a-4c60-80b0-31cb31a94750\tasks\bw63mjn52.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-18T01:49:31.618Z

## §Report — slot hotel bound

- **Slot:** `hotel` ← `claude-cb728a14` (hook-enforced from harness session_id). Evicted prior owner `claude-2d30710b` (crashed-reclaim, hotel-work).
- **Git:** `cad-fusion-live-ms0` diverged 133↑/1↓ — not in scope of this work order; flagged only.
- All other check-in sections nominal — no actionable findings.

## Work order: update system-viz to match current build + expand all layers

**Assessment:**
- `system-graph.json` — schemaVersion 2.29.0, **136,107 nodes / 225,994 edges**, `fsCoverage=false`.
- `meta.totals` is **stale** — claims `nodes:20702` (the architecture-base headline) while the merged graph actually holds 136,107. Merge-augmentations carries the base meta forward without recomputing totals.
- Layers present: L0-L11 + L4a + Lgit. **L11 = 22 nodes** (file-leaf layer is sparse — the HEAVY generators haven't run) and `fsCoverage=false` confirms `fs-deep-inventory` is not merged → "expand all layers" requires `--full`.
- Memory healthy (commit 44%, phys 39%), no regen process running → safe to run the heavy path.

**Action:** launched `node scripts/regen-viz.mjs --full` in background — runs all 49 FAST generators (re-enumerate engines/dispatchers/hooks/actions from current disk = "match current build") **plus** the 2 HEAVY generators (`fs-deep-inventory` + `l11-file-leaves` = "expand all layers" / populate L11 + fsCoverage), then merge → repair → dedup → reparent → contains-edges → seed-ghosts → executive-briefing → drift gate. The pipeline now fails loud (exit 1 on any step failure or drift hard-fail) and aborts before post-merge stages on a SIGKILL'd merge.

Background task `bw63mjn52` will re-invoke me on completion. Scheduling a long fallback in case the heavy fs-walk hangs.

### Assistant | 2026-05-18T01:49:33.020Z

[tool_use: ScheduleWakeup]

### User | 2026-05-18T01:49:33.367Z

[tool_result] Next wakeup scheduled for 21:15:00 (in 1527s). Nothing more to do this turn — the harness re-invokes you when the wakeup fires or a task-notification arrives.

### Assistant | 2026-05-18T01:49:37.438Z

Regen pipeline running. I'll continue when `bw63mjn52` completes (or the fallback fires) — verify all layers populated, `fsCoverage` true, `meta.totals` reconciled, then close out the loop and `/goal`.

### User | 2026-05-18T01:54:37.858Z

<task-notification>
<task-id>bw63mjn52</task-id>
<tool-use-id>toolu_014TG6eMYuF1sfrpMuig6miQ</tool-use-id>
<output-file>C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\cb728a14-145a-4c60-80b0-31cb31a94750\tasks\bw63mjn52.output</output-file>
<status>completed</status>
<summary>Background command "Run full system-viz regeneration in background" completed (exit code 0)</summary>
</task-notification>

### Assistant | 2026-05-18T01:54:45.908Z

[tool_use: Bash]

### User | 2026-05-18T01:54:49.723Z

[tool_result]     depth=4  parentDirs=8685  emitted=21804  capDropped=0
    depth=5  parentDirs=6688  emitted=18514  capDropped=0
    depth=6  parentDirs=9031  emitted=20209  capDropped=0
    depth=7  parentDirs=2892  emitted=10282  capDropped=0
    depth=8  parentDirs=2396  emitted=8490  capDropped=0
    depth=9  parentDirs=1437  emitted=5005  capDropped=0
    depth=10  parentDirs=595  emitted=2252  capDropped
... [+2692 chars truncated]

### Assistant | 2026-05-18T01:54:56.082Z

[tool_use: Bash]

### User | 2026-05-18T01:55:00.449Z

[tool_result] 192:[regen-viz] ✓ generate-combo-detector.mjs  (2.0s)
212:[regen-viz] ✓ generate-engine-saturate.mjs  (1.8s)
225:[regen-viz] ✓ generate-wiki-entries.mjs  (67.7s)
234:[regen-viz] ✓ generate-formulas-atomic.mjs  (1.6s)
241:[regen-viz] ✓ generate-personas-expand.mjs  (1.6s)
247:[regen-viz] ✓ generate-skills-atomic.mjs  (1.8s)
253:[regen-viz] ✓ generate-schemas-atomic.mjs  (1.8s)
259:[regen-viz] ✓ gen
... [+1877 chars truncated]

### Assistant | 2026-05-18T01:55:05.172Z

[tool_use: Bash]

### User | 2026-05-18T01:55:09.037Z

[tool_result] [regen-viz] add parent→child contains edges (de-orphan leaf records)…
[parent-edges] added 8087 contains edges · degree-0 nodes 6359 → 48 · top kinds: priority-unit:3439, planned-unit:2318, git_commit:707, atomic_engine:677, milestone:319, misc-task:318, design-spec:92, pipeline-stage:86
[regen-viz] seed NN-GRAPH reference ghosts (unwired-engine pool)…

### Assistant | 2026-05-18T01:55:15.949Z

[tool_use: Bash]

### User | 2026-05-18T01:55:19.934Z

[tool_result] 732
=== last 25 lines ===
Confidence breakdown: { high: 147, medium: 401, low: 28, none: 105 }
Top 5 inferred dispatchers: [
  [ 'prism_cam', 165 ],
  [ 'UNKNOWN', 105 ],
  [ 'prism_turning', 78 ],
  [ 'prism_dev', 76 ],
  [ 'prism_calc', 42 ]
]
Reading graph H:\prism\state\shared\system-viz\system-graph.json...
Writing H:\prism\state\shared\system-viz\system-graph.json (nodes added=681 updated=0,
... [+732 chars truncated]

### Assistant | 2026-05-18T01:56:13.996Z

The regen log reveals a real failure — `seed-ghost-from-unwired.mjs` crashed with `RangeError: Invalid string length`, and the log then stops mid-`obsidian-bridge`. Getting ground truth before I claim anything.

### Assistant | 2026-05-18T01:56:16.502Z

[tool_use: Bash]

### Assistant | 2026-05-18T01:56:19.376Z

[tool_use: Bash]

### User | 2026-05-18T01:56:21.669Z

[tool_result] === bw63mjn52.output (real exit) ===
EXIT=0
=== running viz procs ===

### User | 2026-05-18T01:56:30.005Z

[tool_result] size_MB=387.8 mtime=2026-05-18T01:55:07.183Z
VALID JSON. nodes=243339 edges=693127 schema=2.29.0
layers={"L0":14,"L1":983,"L2":20,"L3":33,"L4":97,"L5":3875,"L6":8116,"L7":166,"L8":26064,"L9":69844,"L10":20309,"L11":102684,"L4a":10290,"Lgit":844}

### Assistant | 2026-05-18T01:57:56.216Z

[tool_use: Bash]

### system

... [255 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-18T03:02:21.302Z

Both commits landed. Running the mandatory 3-of-3 scrutiny gate against the main deliverable commit.

### Assistant | 2026-05-18T03:02:25.934Z

[tool_use: Bash]

### User | 2026-05-18T03:02:32.052Z

[tool_result] 813974b15b [MAIN] [FLEET-REAPER-FIX]/U-FR-TIER-TEST-DRIFT: realign tier test to OPT-2 crit=88
f73d74af1d [MAIN] [FLEET-REAPER]/U-FR-ADMIN-HUNT: SYSTEM-principal default + --hunt Task-Manager scan
f89dfe893d [MAIN] [TOKEN-AUDIT]/U-LOOP-INJECT-DEDUP: session-scoped injection dedup gate
=== scrutiny target ===
main commit: f73d74af1d
diffBytes=30079 truncated=false prompts A/B/C =30873/31341/32020

### Assistant | 2026-05-18T03:02:46.490Z

[tool_use: Agent]

### Assistant | 2026-05-18T03:02:54.506Z

[tool_use: Agent]

### Assistant | 2026-05-18T03:03:03.988Z

[tool_use: Agent]

### User | 2026-05-18T03:04:05.137Z

[tool_result] [{"type": "text", "text": "All paths verified. The implementation is sound:\n\n- **Acceptance 1 (no stubs/TODOs/placeholders):** Clean. `classifyKillError`, `buildHuntReport`, `formatHuntReport` are fully implemented. The `-AsSystem` no-op alias is documented intentional back-compat, not a stub.\n- **Acceptance 2 (concrete assertions):** Tests use real reference values and algebraic invariants \u2
... [+2423 chars truncated]

### User | 2026-05-18T03:04:38.323Z

[tool_result] [{"type": "text", "text": "Confirmed \u2014 the `\\` was a Grep rendering artifact; the actual file uses proper `//` comments and `node --check` passes. Now I have everything I need to render a verdict.\n\nLet me do a final review pass on the three focus areas:\n\n**1. The 29 (26 `test()`) new tests** \u2014 All real fail-on-revert oracles with concrete reference values. No `toBeDefined`/`toBeTrut
... [+4417 chars truncated]

### User | 2026-05-18T03:05:57.499Z

[tool_result] [{"type": "text", "text": "All paths resolve from `REPO_ROOT = resolve(__dirname, \"..\")` \u2014 `__dirname` is the script's directory (`H:\\PRISM\\scripts`), so `REPO_ROOT = H:\\PRISM`. These are absolute machine-drive paths, not user-profile-relative. SYSTEM has full access to `H:\\` drive paths. No path-resolution regression from the SYSTEM-principal change.\n\nOne remaining concern: the diff'
... [+5400 chars truncated]

### Assistant | 2026-05-18T03:06:13.444Z

All 3 reviewers **PASS**, zero blockers (one cosmetic note: 26 `test()` blocks, not 29 — I'll use the accurate count in docs). Recording the 3-of-3 consensus.

### Assistant | 2026-05-18T03:06:20.401Z

[tool_use: Bash]

### User | 2026-05-18T03:06:29.200Z

[tool_result] }
}
}
verdicts recorded, temp cleaned

### Assistant | 2026-05-18T03:06:59.139Z

3-of-3 PASS recorded. Now doc-reflection. Locating the FLEET-REAPER doctrine text in CLAUDE.md + the wiki entry:

### Assistant | 2026-05-18T03:07:00.830Z

[tool_use: Grep]

### Assistant | 2026-05-18T03:07:01.944Z

[tool_use: Bash]

### User | 2026-05-18T03:07:03.368Z

[tool_result] 343:[Omitted long matching line]
619:task reusing the fleet-reaper S4U pattern — pool-rebuild→drift→retrain→eval→
627:(`.claude/helpers/install-nn-graph-retrain-task.ps1`, S4U / 6-hour cadence,
689:## FLEET-REAPER-MS0 (2026-05-14, 6 files shipped)
702:- `.claude/helpers/install-fleet-reaper-task.ps1` — scheduled-task installer (`-DryRun` burn-in, `-StartOffsetSeconds 210`, elevation probe, `-RunNo
... [+661 chars truncated]

### User | 2026-05-18T03:07:13.480Z

[tool_result] 322
---
title: Fleet Reaper — slot-aware orphan-process reaper
type: architecture
status: shipped
shipped: 2026-05-14
milestone: [FLEET-REAPER-MS0, FLEET-REAPER-MS1]
---

# Fleet Reaper — slot-aware orphan-process reaper for the 7-chat fleet

## What it solves

PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each spawns
`node.exe` (hooks/MCP), `bash.exe` (the Bash tool), `git.e
... [+112 chars truncated]

### Assistant | 2026-05-18T03:08:06.800Z

[tool_use: Edit]

### User | 2026-05-18T03:08:06.807Z

[tool_result] <tool_use_error>File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.</tool_use_error>

### Assistant | 2026-05-18T03:08:23.329Z

[tool_use: Read]

### User | 2026-05-18T03:08:25.699Z

[tool_result] 330	// Modes: conventional → exploratory → hybrid → innovative → optimal
331	```
332	**15 scientific domains** (control theory, materials science, robotics, ML, precision, etc.) · **120+ formulas/algorithms** (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error). Entry point: `CrossDisciplinaryDeepLearningEngine`.
333	
334	## Recent regressions
335	<!-- Append-only log per Bor
... [+208 chars truncated]

### Assistant | 2026-05-18T03:08:28.822Z

[tool_use: Read]

### User | 2026-05-18T03:08:30.116Z

[tool_result] 337	
338	- 2026-05-18 | **`seed-ghost-from-unwired.mjs` pretty-printed the ~390 MB merged `system-graph.json` (`JSON.stringify(g, null, 2)`) at both write sites (`--apply` + `--revert`).** Once the graph crossed the size threshold the indented string exceeded V8's ~512 MB max-string-length cap → `RangeError: Invalid string length`, crashing the NN-GRAPH reference-pool seed stage out of every `rege
... [+5108 chars truncated]

### Assistant | 2026-05-18T03:08:50.509Z

[tool_use: Edit]

### User | 2026-05-18T03:08:56.340Z

[tool_result] The file H:/PRISM/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:09:04.180Z

[tool_use: Grep]

### User | 2026-05-18T03:09:06.062Z

[tool_result] 771-fixed → B verified). 55\55 tests: `scripts/__tests__/fleet-reaper-{tier,ballast,service-restart}.test.mjs`.
772-Wiki: `knowledge/wiki/architecture/fleet-reaper.md` (Tier 1-2 section). Memory:
773:[[reference_fleet_reaper_tier1_2026_05_17]].
774-
775:## FLEET-MEMORY-MONITOR-MS0 (2026-05-16, slot=golf-work, 5 files shipped)

### Assistant | 2026-05-18T03:09:28.139Z

[tool_use: Edit]

### User | 2026-05-18T03:09:32.397Z

[tool_result] The file H:/PRISM/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:09:39.975Z

[tool_use: Read]

### User | 2026-05-18T03:09:44.520Z

[tool_result] 308	`readDockerHealth` mirrored ONLY `parsed.services.*` — so `services.docker` was
309	never populated for real payloads, `dockerHealth.available` was permanently
310	false (spurious "docker down but ollama reachable" caveat every real run — a
311	latent FLEET-REAPER-MS1.1 bug), and the Tier-2 daemon-down safety guard was
312	DEAD in production (would `docker restart` against a dead daemon with r
... [+736 chars truncated]

### Assistant | 2026-05-18T03:10:08.336Z

[tool_use: Edit]

### User | 2026-05-18T03:10:12.645Z

[tool_result] The file H:/prism/knowledge/wiki/architecture/fleet-reaper.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:10:40.836Z

[tool_use: Write]

### User | 2026-05-18T03:10:44.647Z

[tool_result] File created successfully at: H:/prism/knowledge/memories/reference/reference_fleet_reaper_system_principal_2026_05_18.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-18T03:10:56.564Z

[tool_use: Bash]

### User | 2026-05-18T03:11:04.963Z

[tool_result] ok 3 files changed, 147 insertions(+)
ok cad-fus

### Assistant | 2026-05-18T03:11:25.526Z

[tool_use: TaskUpdate]

### User | 2026-05-18T03:11:25.995Z

[tool_result] Updated task #4 status

### Assistant | 2026-05-18T03:11:58.573Z

## ✅ Goal complete — reaper admin-mode + Task-Manager hunt

### What I found (Task-Manager scan)
72 `node.exe` + 21 `bash.exe` + 42 `cmd.exe` + 12 `pwsh.exe` running. The `PRISM Fleet Reaper` scheduled task was registered **S4U / current-user** — S4U can only kill the installing user's same-integrity processes, so `Stop-Process` returned **"Access is denied"** on elevated/cross-context node processes. That's exactly why "the reaper didn't get them" and why you saw a window flash access-denied.

### What shipped (3 commits, 103/103 tests, 3-of-3 scrutiny PASS)

**`U-FR-ADMIN-HUNT` (`f73d74af1d`)**
- **Installer → SYSTEM is now the default principal.** `NT AUTHORITY\SYSTEM` terminates *any* process regardless of owner/integrity, needs no UAC, runs in session 0 (no flashing window). `-AsCurrentUser` is the conservative S4U opt-out; `-AsSystem` kept as a back-compat no-op alias.
- **`--hunt` mode** — `node scripts/fleet-reaper-sweep.mjs --hunt` gives Claude Code a Task-Manager view: every node/bash/git process with class, age, RSS, owner, and reap verdict, heaviest-first. Verified live (68 targets, RSS-sorted).
- **`classifyKillError`** — an access-denied kill failure is now named explicitly, not a generic error.

**`U-FR-TIER-TEST-DRIFT` (`813974b15b`)** — fixed 7 pre-existing stale assertions in `fleet-reaper-tier.test.mjs` (it hard-coded `MEM_CRITICAL_PCT=95`; OPT-2 lowered it to 88 — unrelated to this work, surfaced in passing).

**`DOC-REFLECT`** — CLAUDE.md (regressions + FLEET-REAPER Tier 3) + wiki + memory. *(MEMORY.md skipped — over its 24.4 KB hard cap.)*

### ⚠️ One action you must run — the fix isn't live until you do
I changed the installer's *default*, but the **already-registered task is still S4U**. I can't re-register it (that needs admin elevation — only you can). Run this **in an elevated PowerShell** (or type it here with the `!` prefix if this session is elevated):

```
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/ins
... [+597 chars truncated]
