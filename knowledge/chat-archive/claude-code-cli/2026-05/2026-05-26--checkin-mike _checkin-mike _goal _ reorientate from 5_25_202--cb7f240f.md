---
type: "chat-session"
source: "claude-code-cli"
session_id: "cb7f240f-2c6d-48c0-b225-0a2fba99eec8"
title: "checkin-mike /checkin-mike /goal [ reorientate from 5/25/2026-5/26/2026 previous"
date: "2026-05-26"
first_ts: "2026-05-26T13:35:30.367Z"
last_ts: "2026-05-27T20:31:11.117Z"
cwd: "H:\\PRISM"
messages: 960
user_msgs: 416
assistant_msgs: 544
raw_file: "H:/.claude/projects/H--prism/cb7f240f-2c6d-48c0-b225-0a2fba99eec8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:46"
---

# checkin-mike /checkin-mike /goal [ reorientate from 5/25/2026-5/26/2026 previous

> **claude-code-cli** | 2026-05-26 | 960 msgs (416 user / 544 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/cb7f240f-2c6d-48c0-b225-0a2fba99eec8.jsonl`

## Transcript

### User | 2026-05-26T14:03:58.868Z

<command-message>checkin-mike</command-message>
<command-name>/checkin-mike</command-name>
<command-args>/goal [ reorientate from 5/25/2026-5/26/2026 previous tasks and units for mike | pick up where you left off  ] /loop [5m] /goal</command-args>

### User | 2026-05-26T14:03:58.868Z

# /checkin-mike — slot-locked /checkin

Force-takes the **mike** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `mike-work`, then runs the standard `/checkin` pipeline. Slot added 2026-05-16 as the 13th fleet slot per the operator directive "add a 13th chat slot, update everything that needs to update to intake a 13th chat".

## Slot binding (replaces /checkin Step 2)

```bash
STABLE="claude-<8hex-from-Chat-Isolation-line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="mike"
TOPIC="mike-work"

# Reap stale slots first, then force-take mike from whoever holds it.
node H:/prism/.claude/helpers/chat-slots.mjs reclaim
node H:/prism/.claude/helpers/chat-slots.mjs claim \
  --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" \
  --preferSlot $SLOT --force true --confirmRecent true
```

If the claim result carries `previousOwner`, surface it in the §Report — the evicted chat's id, topic, and last-heartbeat age are all useful context.

## Pipeline delegation

After the slot-claim above, execute the FULL `/checkin` pipeline from `H:/prism/.claude/commands/checkin.md`:

- **Slot-claim phase (steps 3-7)** — handoff bind under `mike-work` topic · chat-bus read · drift check (`audit-roadmap-drift.mjs`) · commit hygiene (dirty/staged/ahead-behind/worktree) · 6b roadmap slice · 6c BUILD_STATE · 6d Obsidian recent · 6e system-viz ping · 6f CLAUDE.md staleness · 6g local-compute health · 6h fleet activity + pickup candidates · §Report.
- **Dev pipeline phase (steps 8-14)** — fires only when args contain a task directive (`/loop`, `/goal`, `/pick-unit`, `unit`, `task`, `build`, or a verbatim filepath). Covers awareness inject verification, /system-viz-first audit doctrine, Obsidian-PRISM-OS routing, CLAUDE.md+GSD+skills+hooks+RTK token savings, /loop iter ticks, files-to-galaxy refresh, end-of-session pipeline (per-file scrutiny, 3-of-3 gate, close-out, doc reflection, commit, precompact
... [+1224 chars truncated]

### Assistant | 2026-05-26T14:04:30.067Z

I'll run the slot-claim as silent preamble, then act on the work order — reorient from mike's 5/25-5/26 work and enter the /loop.

### Assistant | 2026-05-26T14:04:30.183Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:04:31.273Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:04:32.264Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:04:32.910Z

[tool_use: Bash]

### User | 2026-05-26T14:04:59.709Z

[tool_result] {"ok":true,"content":"---\nsession: claude-cb7f240f\ntopic: cad-fusion-live-ms0\nslot: mike\nwritten_at: 2026-05-26T14:04:06.345Z\nmachine: DESKTOP-N7MI1VB\nfamily: Claude\nsession_key: claude-cb7f240f\nstatus: active\n---\n\n# HANDOFF: claude-cb7f240f\nUpdated: 2026-05-26T14:04:06.346Z\nFamily: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-cb7f240f\n\n## STATE\n(precompact auto-write — slot
... [+3848 chars truncated]

### User | 2026-05-26T14:05:14.849Z

[tool_result] 8e9c7133de [slot/mike] [WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0]/U-WCTP-A2-D...
f7a9a6c37d [slot/mike] [WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0]/U-WCTP-A2-D...
4fc61cc963 [slot/mike] [WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0]/U-WCTP-A2-D...
dd20ca8467 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WEDM-TRAINING-WIZARD-MS0]/U-WTW-A...

### User | 2026-05-26T14:06:24.345Z

[tool_result] Exit code 255

### User | 2026-05-26T14:08:34.565Z

[tool_result] state/shared/handoffs/HANDOFF-claude-1730eb7c-mike-cad-fusion-live.md  4.0K
state/shared/handoffs/HANDOFF-claude-eb71a012-mike-wedm-comprehens.md  3.3K
state/shared/handoffs/HANDOFF-claude-eb71a012-mike-wedm-training-p.md  2.0K
state/shared/handoffs/HANDOFF-claude-b99caaae-mike-program-proof-m.md  4.0K
state/shared/handoffs/HANDOFF-claude-b99caaae-mike-cad-fusion-live.md  4.0K
state/shared/handoff
... [+324 chars truncated]

### Assistant | 2026-05-26T14:08:45.779Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:08:46.803Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:08:47.801Z

[tool_use: Bash]

### User | 2026-05-26T14:12:31.314Z

[tool_result] 8e9c7133de 2026-05-25 23:14:03 -0500 [slot/mike] [WEDM-COMPREHENSIVE-TRAINING...
f7a9a6c37d 2026-05-25 22:52:07 -0500 [slot/mike] [WEDM-COMPREHENSIVE-TRAINING...
4fc61cc963 2026-05-25 22:31:39 -0500 [slot/mike] [WEDM-COMPREHENSIVE-TRAINING...
dd20ca8467 2026-05-25 19:17:11 -0500 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WEDM-TR...
23e4cadb2a 2026-05-25 01:26:48 -0500 [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-PRO
... [+85 chars truncated]

### User | 2026-05-26T14:14:42.620Z

[tool_result] ---
session: claude-eb71a012
topic: mike-wedm-comprehensive-pipeline
slot: mike
written_at: 2026-05-26T04:15:33.112Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-eb71a012
status: active
---

# HANDOFF: claude-eb71a012
Updated: 2026-05-26T04:15:33.112Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-eb71a012

## STATE
OVERNIGHT SESSION SUMMARY — 5 iters shipped on slot/mi
... [+2948 chars truncated]

### User | 2026-05-26T14:15:14.416Z

[tool_result] state/shared/handoffs/HANDOFF-mike-golf-consolidation-2026-05-18.md  6.0K
state/shared/handoffs/HANDOFF-claude-f4407df0-mike-cad-fusion-live.md  4.0K
state/shared/handoffs/HANDOFF-claude-ec095dfd-mike-wire-unwired-ms.md  742B
state/shared/handoffs/HANDOFF-claude-eb71a012-mike-wedm-training-p.md  2.0K
state/shared/handoffs/HANDOFF-claude-eb71a012-mike-wedm-comprehens.md  3.3K
state/shared/handoffs/
... [+339 chars truncated]

### Assistant | 2026-05-26T14:15:30.945Z

Mike's last position is clear: **WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0** (WCTP), Phase A2 LoRA-data shipped (5 commits on slot/mike). Next 5 iters queued: G2 (wizard tests) → A2a (training script) → A2b (eval triad) → A2 full-archive run → D2 (curriculum scheduler).

Starting loop-state, checking slot worktree, and verifying the WCTP envelope.

### Assistant | 2026-05-26T14:15:33.497Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:15:34.986Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:15:36.027Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:15:37.136Z

[tool_use: Bash]

### User | 2026-05-26T14:16:15.354Z

[tool_result] {"ok":true,"started":true,"target":20}

### User | 2026-05-26T14:16:38.571Z

[tool_result] WORKTREE_EXISTS
## slot/mike
?? scripts/run-vision-ocr.mjs
?? scripts/run-vision-ocr.test.mjs
Shell cwd was reset to H:\prism

### User | 2026-05-26T14:17:03.017Z

[tool_result] -rw-r--r-- 1 wompu 197611 37991 May 25 20:02 state/shared/specs/WEDM-COMPREHENSIVE-TRAINING-PIPELINE-V2-2026-05-25.html
-rw-r--r-- 1 wompu 197611 22022 May 25 19:55 state/shared/specs/WEDM-COMPREHENSIVE-TRAINING-PIPELINE-V2-2026-05-25.md
-rw-r--r-- 1 wompu 197611 21431 May 25 19:14 state/shared/specs/WEDM-TRAINING-COVERAGE-AUDIT-2026-05-25.md
-rw-r--r-- 1 wompu 197611 13500 May 22 17:39 state/shar
... [+130 chars truncated]

### User | 2026-05-26T14:17:12.744Z

[tool_result] 8e9c7133de [slot/mike] [WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0]/U-WCTP-A2-DSB-SMOKE (slot:mike /goal /yolo iter9): ...
f7a9a6c37d [slot/mike] [WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0]/U-WCTP-A2-DSB-WIRE (slot:mike /goal /yolo iter7): w...
4fc61cc963 [slot/mike] [WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0]/U-WCTP-A2-DSB (slot:mike /goal /yolo iter6): build ...
5a1be403bc [slot-mike] [MIKE-WEDM-CAP
... [+1414 chars truncated]

### Assistant | 2026-05-26T14:17:30.097Z

Slot/mike worktree confirmed; 2 untracked files (run-vision-ocr*) are peer leftovers — leaving them alone per slot discipline. Setting up tasks for the WCTP queue and finding LatheLoRATrainingScript pattern.

### Assistant | 2026-05-26T14:17:32.219Z

[tool_use: TaskCreate]

### Assistant | 2026-05-26T14:17:33.537Z

[tool_use: TaskCreate]

### Assistant | 2026-05-26T14:17:36.120Z

[tool_use: TaskCreate]

### Assistant | 2026-05-26T14:17:38.143Z

[tool_use: TaskCreate]

### Assistant | 2026-05-26T14:17:40.206Z

[tool_use: TaskCreate]

### Assistant | 2026-05-26T14:17:41.670Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:17:42.573Z

[tool_use: Bash]

### User | 2026-05-26T14:17:46.809Z

[tool_result] Task #1 created successfully: A2a — WEDMLoRATrainingScript (clone Lathe pattern)

### User | 2026-05-26T14:17:49.638Z

[tool_result] Task #2 created successfully: A2b — WEDM reward/reason/safety eval triad

### User | 2026-05-26T14:17:52.242Z

[tool_result] Task #3 created successfully: A2-FULL — full JM Die archive iteration (uncap @50)

### User | 2026-05-26T14:17:54.179Z

[tool_result] Task #4 created successfully: D2 — WEDMCurriculumSchedulerEngine

### User | 2026-05-26T14:17:56.667Z

[tool_result] Task #5 created successfully: G2 — WireEdmWizardPage test verification

### User | 2026-05-26T14:18:23.595Z

[tool_result] /usr/bin/ls: cannot access 'scripts/*lathe*lora*': No such file or directory
/usr/bin/ls: cannot access 'scripts/*lathe*train*': No such file or directory
/usr/bin/ls: cannot access 'scripts/run-lathe-lora*': No such file or directory

### system

... [880 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-27T19:33:24.142Z

You've hit your session limit · resets 3:50pm (America/Chicago)

### User | 2026-05-27T19:43:28.911Z

continue

### Assistant | 2026-05-27T19:43:52.804Z

[tool_use: Glob]

### User | 2026-05-27T19:43:55.246Z

[tool_result] H:/prism-slot-mike/mcp-server\web\src\__tests__\WireEdmWizardPage.test.tsx
H:/prism-slot-mike/mcp-server\web\src\pages\WireEdmWizardPage.tsx

### Assistant | 2026-05-27T19:44:01.174Z

[tool_use: Read]

### Assistant | 2026-05-27T19:44:02.138Z

[tool_use: Read]

### Assistant | 2026-05-27T19:44:03.740Z

[tool_use: Read]

### User | 2026-05-27T19:44:09.288Z

[tool_result] 1	/**
2	 * WireEdmWizardPage — Wire EDM Planning Wizard
3	 * U-P2PFS29: DXF upload + geometry parsing integration
4	 * U-P2PFS30: AI-recommended material dropdown with skim pass suggestions
5	 * U-P2PFS31: Tribal tip panel filtered by material + thickness
6	 */
7	import { useCallback, useEffect, useMemo, useState } from 'react';
8	import { useLocation, useNavigate } from 'react-router-dom';
9	impo
... [+6296 chars truncated]

### User | 2026-05-27T19:44:09.421Z

[tool_result] 395	  "wedm_taper_error_budget",                // U-WIRE-WEDM-OUTCOME-3: WEDMTaperErrorBudgetEngine.calculate
396	  "wedm_slug_tab_retention",                // U-WIRE-WEDM-OUTCOME-3: WEDMSlugTabRetentionEngine.calculate
397	  "wedm_program_compare",                   // U-WIRE-WEDM-PROGRAM-COMPARE-1: WEDMProgramComparisonEngine.compare
398	  "sinker_agi_master",                      // AGI-MASTE
... [+9067 chars truncated]

### User | 2026-05-27T19:44:09.457Z

[tool_result] 1	%
2	L001
3	(03/07/22)
4	
5	H175 = 0.0000
6	
7	
8	H1 =.0085 + H175
9	H2 =.0064 + H175
10	H3 =.0058 + H175
11	H4 =.0053 + H175
12	
13	N5 G90
14	N10 M91 (Adaptive Control Off)
15	N15 G92 X0.0 Y0.0
16	N20 G1 X0. Y0. F25.0
17	N25 M20 (Thread Wire)
18	N30 M78 M78 (Fill Tank)
19	N35 M80 (Water On)
20	N40 M82 (Wire On)
21	N45 M84 (Power On)
22	N50 E1221 H1 F.12 (PASS=1)
23	N55 M90 (Adaptive Control On)

... [+873 chars truncated]

### Assistant | 2026-05-27T19:44:20.377Z

[tool_use: Grep]

### User | 2026-05-27T19:44:27.558Z

[tool_result] 10:  solveWireEdmWizard,
11:  wireEdmParseGeometry,
12:  tribalSearch,
13:  wedmSafetyEnvelope,
14:  wedmAutonomyStatus,
15:  wedmRulStatus,
16:  wedmMaintenanceStatus,
17:  wedmCodePreview,
18:  wedmApprovalStatus,
19:  wedmRequestApproval,
225:          wedmSafetyEnvelope(),
226:          wedmAutonomyStatus(),
227:          wedmRulStatus(),
228:          wedmMaintenanceStatus(),
261:        cons
... [+480 chars truncated]

### Assistant | 2026-05-27T19:45:17.628Z

Deep-dive complete. Writing the synthesis as a canonical spec the wizard team can reference, then I'll stop at the first write per comprehensive-build cutoff rule (context is yellow).

### Assistant | 2026-05-27T19:51:38.946Z

[tool_use: Write]

### User | 2026-05-27T19:51:45.582Z

[tool_result] File created successfully at: H:/prism-slot-mike/state/shared/specs/WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-27.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T19:52:06.462Z

Spec landed at `state/shared/specs/WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-27.md`. Stopping here per comprehensive-build cutoff (context yellow @ 24%; the doc is the gate before any new engine code).

## Deep-dive verdict — the 4-line version

- **Pipeline = 11 stages.** Today: **5 wired** into wizard, **2 partial**, **4 fully unwired**.
- **The 4 unwired stages are the heart of "print → program":** PRINT INTAKE (Stage 1), FEATURE CLASSIFY (4), TEMPLATE SELECT (5), CASCADE DESIGN (6). The wizard accepts DXF only and runs everything through black-box `solveWireEdmWizard`; operator has no visibility into template/cascade decisions.
- **25 built dispatcher actions are not called by the wizard** — biggest losses: `wedm_template_select`, `wedm_part_family_match`, `wedm_adaptive_pass_count`/`_offsets`, `wedm_pre_flight_check`, all four iter1-22 LoRA actions, all three iter21 inference actions, all three iter22 Ollama bridge actions, all stage-1 blueprint-extract actions.
- **The 7-iter build sequence to close it all** is in §5 of the spec — iter23 (print-program Alpaca augmenter) gets us to training-ready FAST; iter25-28 unlock the wizard ergonomics.

## Existing-asset notes (per pre-write graph hit)

The graph flagged 3 nodes named `PrintToProgramPipelineEngine` / `ai-wedm-print-to-program` / `wedm-print-to-program`. Worth verifying with a direct read before iter25 — if there's already a `PrintToProgramPipelineEngine.ts` I should EXTEND it instead of forking. That's a 1-Grep audit at the top of iter25.

## Decision needed

Which to build first:
- **(A)** iter23 (print-program Alpaca augmenter) → iter24 (build the actual dataset) — gets you to "ready to train" in ~2 iters. Token-cheap.
- **(B)** iter25 (`WEDMPrintToProgramOrchestratorEngine`) first — backend chain that makes the wizard see every stage. Larger build, more leverage long-term.
- **(C)** Both in parallel — split with a second slot.

Which one?

### User | 2026-05-27T20:18:03.536Z

build one at a time

### Assistant | 2026-05-27T20:18:50.242Z

Building iter23 — `WEDMPrintProgramAlpacaAugmenter`. Highest-leverage path: gets us to training-ready in 2 iters.

### Assistant | 2026-05-27T20:19:52.016Z

[tool_use: Write]

### User | 2026-05-27T20:20:14.857Z

[tool_result] File created successfully at: H:/prism-slot-mike/mcp-server/src/engines/WEDMPrintProgramAlpacaAugmenterEngine.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T20:21:54.556Z

[tool_use: Write]

### User | 2026-05-27T20:22:05.372Z

[tool_result] File created successfully at: H:/prism-slot-mike/mcp-server/src/__tests__/WEDMPrintProgramAlpacaAugmenterEngine.test.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T20:22:14.648Z

[tool_use: Bash]

### User | 2026-05-27T20:22:53.579Z

[tool_result]  RUN  v4.1.5 H:/prism-slot-mike/mcp-server
 ✓ src/__tests__/WEDMPrintProgramAlpacaAugmenterEngine.test.ts (33 tests) 21ms
 Test Files  1 passed (1)
      Tests  33 passed (33)
   Start at  15:22:45
   Duration  1.96s (transform 168ms, setup 0ms, import 392ms, tests 21ms, environment 0ms)
 DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. 
... [+116 chars truncated]

### Assistant | 2026-05-27T20:23:02.283Z

33/33 PASS. Wiring dispatcher.

### Assistant | 2026-05-27T20:23:05.863Z

[tool_use: Edit]

### User | 2026-05-27T20:23:21.662Z

[tool_result] The file H:/prism-slot-mike/mcp-server/src/tools/dispatchers/edmDispatcher.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T20:23:39.282Z

[tool_use: Edit]

### User | 2026-05-27T20:24:19.483Z

[tool_result] The file H:/prism-slot-mike/mcp-server/src/tools/dispatchers/edmDispatcher.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T20:25:01.314Z

[tool_use: Edit]

### User | 2026-05-27T20:25:14.756Z

[tool_result] The file H:/prism-slot-mike/mcp-server/src/tools/dispatchers/edmDispatcher.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T20:26:06.024Z

[tool_use: Edit]

### User | 2026-05-27T20:26:22.086Z

[tool_result] The file H:/prism-slot-mike/mcp-server/src/tools/dispatchers/edmDispatcher.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-27T20:26:33.341Z

[tool_use: Grep]

### User | 2026-05-27T20:26:44.389Z

[tool_result] No files found

### Assistant | 2026-05-27T20:26:57.364Z

[tool_use: Bash]

### User | 2026-05-27T20:27:05.624Z

[tool_result]  M mcp-server/src/tools/dispatchers/edmDispatcher.ts
?? mcp-server/src/__tests__/WEDMPrintProgramAlpacaAugmenterEngine.test.ts
?? mcp-server/src/engines/WEDMPrintProgramAlpacaAugmenterEngine.ts
?? scripts/run-vision-ocr.mjs
?? scripts/run-vision-ocr.test.mjs
?? state/shared/specs/WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-27.md

### Assistant | 2026-05-27T20:27:29.454Z

[tool_use: Bash]

### User | 2026-05-27T20:27:36.584Z

[tool_result] ok 4 files changed, 1085 insertions(+)
ok slot/mi

### Assistant | 2026-05-27T20:27:50.607Z

iter23 shipped. **Print-aware Alpaca pairs are now the canonical training format.**

## What iter23 delivers

- **`WEDMPrintProgramAlpacaAugmenterEngine`** — pure transform, 33/33 PASS
  - Stable field ordering: `TITLE BLOCK → MATERIAL → SURFACE FINISH → DIMENSIONS → GD&T → raw_text`
  - Confidence-gated: tier auto-infer (`≥0.85 exact / ≥0.5 loose / <0.5 none`); below-floor falls back to program-only OR skips
  - Adversarial-safe (10MB raw_text → 4KB truncate; null print → no-print fallback; NaN/Infinity throws)
- **2 dispatcher actions**: `wedm_print_augment_pair`, `wedm_print_augment_batch`
- **`WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-27.md`** — 11-stage canonical pipeline spec, fleet-shareable

## Closed-loop substrate status

11 engines · 21 dispatcher actions · ~328 tests · 40 new tribal tips · memory atlas · canonical pipeline spec.

## Next: iter24

iter24 is **zero new code** — single MCP call to actually BUILD the Alpaca dataset over the 4,058 JM Die wire-EDM .NC files using iter23 as the augmenter. After that, you have a print-aware `wedm-alpaca-train.jsonl` ready to ship to a GPU machine.

Ready for iter24 when you say go.
