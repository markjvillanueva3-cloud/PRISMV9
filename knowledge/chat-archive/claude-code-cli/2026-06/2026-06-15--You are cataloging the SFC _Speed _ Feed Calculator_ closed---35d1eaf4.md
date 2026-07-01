---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "You are cataloging the SFC (Speed & Feed Calculator) closed-loop training + vend"
date: "2026-06-15"
first_ts: "2026-06-15T14:01:45.548Z"
last_ts: "2026-06-15T14:11:05.427Z"
cwd: "H:\\prism-slot-oscar"
messages: 87
user_msgs: 40
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-ac1e3a33194b50283.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# You are cataloging the SFC (Speed & Feed Calculator) closed-loop training + vend

> **claude-code-cli** | 2026-06-15 | 87 msgs (40 user / 47 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-ac1e3a33194b50283.jsonl`

## Transcript

### User | 2026-06-15T14:01:45.548Z

You are cataloging the SFC (Speed & Feed Calculator) closed-loop training + vendor-comparison frontier, slot:oscar. Repo root: H:/prism-slot-oscar.

READ THESE MEMORY FILES END-TO-END (C:/Users/wompu/.claude/projects/H--prism/memory/):
- reference_oscar_sfc_frontier_2026_06_10.md  (the frontier/open-work list)
- reference_oscar_sfc_closed_loop_training_2026_06_08.md
- reference_oscar_sfc_closed_loop_complete_2026_06_12.md
- reference_oscar_sfc_full_input_sweep_2026_06_08.md
- reference_oscar_sfc_all_axis_sweep_2026_06_09.md
- reference_oscar_sfc_per_vendor_compare_2026_06_09.md
- reference_oscar_sfc_live_vendor_compare_2026_06_09.md
- reference_oscar_sfc_galaxy_completeness_audit_2026_05_29.md
- reference_oscar_sfc_baseline_coverage_ceiling.md
- reference_oscar_sfc_fulltune_pipeline_2026_06_14.md  (this session's SFC-FULLTUNE status)
- reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14.md  (a key finding: U-FT-11/12 plan premise was stale)

Focus especially on: the CLOSED-LOOP TRAINING (deriving + persisting per-(ISO×mode) calibration from the sweep ledger), the VENDOR COMPARISON to G-Wizard / HSMAdvisor (per-vendor published deltas, vendor fairness), the FULL INPUT SWEEP (the billions-of-combinations space), and the GPU/Blackwell-in-the-loop work.

For each distinct planned/open capability: verify against the repo (grep engines/dispatchers; `git -C H:/prism-slot-oscar log --oneline -400 | grep -i <kw>`) and verdict BUILD / DONE / OUTDATED / BLOCKED with evidence (file:line or commit), status, value. Be EXHAUSTIVE.

Return a markdown table [Feature | Source memory | Verdict | Status | Evidence | Value | rationale]. End with: (a) a clear statement of WHAT REMAINS to "finish the SFC closed-loop training over every logical input with G-Wizard/HSMAdvisor comparison", and (b) whether the vendor-comparison data (G-Wizard/HSMAdvisor reference values) actually exists in the repo for the full input space or is a gap — cite where the vendor data lives.

### Assistant | 2026-06-15T14:01:52.951Z

I'll systematically read all the memory files and then verify against the repo to produce an exhaustive catalog.

### Assistant | 2026-06-15T14:01:53.169Z

[tool_use: Read]

### Assistant | 2026-06-15T14:01:53.615Z

[tool_use: Read]

### User | 2026-06-15T14:01:57.438Z

[tool_result] 1	---
2	name: reference_oscar_sfc_frontier_2026_06_10
3	description: SFC (oscar) frontier 2026-06-10 — CSFH combinatorial harness STALLED at unit 01; resume at U-CSFH-02; single-source ledger location.
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: 930f37b5-d5cf-4924-8d86-d7713730da3d
8	---
9	
10	# SFC (oscar) frontier — 2026-06-10 context-regain
11	
12	**Single-source
... [+1961 chars truncated]

### User | 2026-06-15T14:01:59.113Z

[tool_result] 1	---
2	name: reference_oscar_sfc_closed_loop_training_2026_06_08
3	description: PRISM SFC closed-loop training layer — derive+persist per-(ISO×mode) Vc calibration model from the live sweep ledger; PRISM is systematically conservative vs vendor baseline (the safe direction); apply is operator-gated never auto.
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: 8b4b9149-35
... [+3031 chars truncated]

### Assistant | 2026-06-15T14:02:02.867Z

Good, now reading the remaining memory files in parallel.

### Assistant | 2026-06-15T14:02:04.069Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:04.371Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:05.138Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:05.368Z

[tool_use: Read]

### User | 2026-06-15T14:02:09.419Z

[tool_result] 1	---
2	name: reference_oscar_sfc_closed_loop_complete_2026_06_12
3	description: "SFC closed-loop COMPLETE (slot:oscar, 2026-06-12): the CSFH 13-unit harness shipped end-to-end -- predict->record-actuals->derive-calibration->apply-to-live-physics, flag-gated + safety-clamped. The learn->apply ring that 'trained in a sandbox nobody read' is now closed."
4	metadata: 
5	  node_type: memory
6	  type: 
... [+4768 chars truncated]

### User | 2026-06-15T14:02:10.230Z

[tool_result] 1	---
2	name: reference_oscar_sfc_full_input_sweep_2026_06_08
3	description: "SFC full-input-space sweep (69,120 cells = all app-page selectable inputs, 803× the 86-cell sample) reveals PRISM conservatism is MATERIAL-DEPENDENT, and the GPU judge pins the only safety flag to aggressive_rush mode on hard materials (+32.9% too_aggressive)."
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  o
... [+4336 chars truncated]

### User | 2026-06-15T14:02:11.287Z

[tool_result] 1	---
2	name: reference_oscar_sfc_all_axis_sweep_2026_06_09
3	description: "SFC all-axis calc sweep (U-OSC-ALL-AXIS-SWEEP) runs every named goal axis through the live NineAxisOrchestrator (OAT x2 regimes + factorial); finding = 16/25 axes LIVE, 9 inert-at-baseline needing triage"
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: 8b4b9149-3502-4570-8dd8-b4bc90fad6ab
8	---

... [+4319 chars truncated]

### User | 2026-06-15T14:02:11.466Z

[tool_result] 1	---
2	name: reference_oscar_sfc_per_vendor_compare_2026_06_09
3	description: "SFC tri-comparator now surfaces explicit PRISM-vs-G-Wizard / PRISM-vs-HSMAdvisor per-vendor published deltas; finding = PRISM uniformly +67-91% on feed vs all 4 published sources (valid aggressive-roughing strategy, NOT a bug)"
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: 8b4b9149-3502-45
... [+3992 chars truncated]

### Assistant | 2026-06-15T14:02:15.419Z

Now reading the final four memory files in parallel.

### Assistant | 2026-06-15T14:02:16.566Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:17.352Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:17.714Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:18.102Z

[tool_use: Read]

### User | 2026-06-15T14:02:19.325Z

[tool_result] 1	---
2	name: reference_oscar_sfc_live_vendor_compare_2026_06_09
3	description: "SFC goal comparison-half is EXECUTED against all available real data: 144-cell live tri-vendor sweep ran clean; live G-Wizard contributes 0 cells because the 41K-row crib is geometry-only (sfm=ipt=0), NOT a tooling block."
4	metadata:
5	  node_type: memory
6	  type: reference
7	  originSessionId: 8b4b9149-3502-4570-8d
... [+10035 chars truncated]

### User | 2026-06-15T14:02:22.090Z

[tool_result] 1	---
2	name: reference_oscar_sfc_galaxy_completeness_audit_2026_05_29
3	description: SFC galaxy completeness audit (2026-05-29) — COMPLETE-AFTER-REMEDIATION. 1st run (inline) wrongly said COMPLETE; re-run workflow+codex found 3 real P0/P1 + docs (inlined kc, detector false-negative, untracked imported engine) — all fixed (vitest 62/62). Lesson: the inline pass missed what the adversarial re-run c
... [+4293 chars truncated]

### User | 2026-06-15T14:02:22.603Z

[tool_result] 1	---
2	name: reference-oscar-sfc-baseline-coverage-ceiling
3	description: The 84.6% structural coverage ceiling on vendor baseline comparison — manufacturer catalogs lack SFM/IPT columns. NOT an algorithm bug. CatalogJoiner recovers the matched cells.
4	metadata:
5	  node_type: memory
6	  type: reference
7	---
8	
9	# SFC baseline-comparison coverage ceiling (structural, not a bug)
10	
11	When dif
... [+1036 chars truncated]

### User | 2026-06-15T14:02:22.989Z

[tool_result] 1	---
2	name: reference_oscar_sfc_fulltune_pipeline_2026_06_14
3	description: SFC-FULLTUNE batch sweep+compare+baseline+triage+autonomous-cron pipeline shipped (10/14 units + U-FT-CRON) on slot/oscar 2026-06-14; the 342ms/cell was 99% bus I/O not physics (O_APPEND fix); full 20.3M-cell sweep runnable ~2.5min/14workers. Remaining 4 units (calib pair U-FT-11/12 HIGH-risk axis-mapping crux, tier-2 U-
... [+8236 chars truncated]

### Assistant | 2026-06-15T14:02:34.757Z

Now reading the final calib-axis-finding memory file, and in parallel running git log searches and key grep checks.

### Assistant | 2026-06-15T14:02:36.285Z

[tool_use: Read]

### Assistant | 2026-06-15T14:02:40.239Z

[tool_use: Bash]

### User | 2026-06-15T14:02:41.161Z

[tool_result] 1	---
2	name: reference_oscar_sfc_fulltune_calib_axis_finding_2026_06_14
3	description: VERIFIED FINDING (slot:oscar 2026-06-14) — the SFC-FULLTUNE plan's U-FT-11/U-FT-12 premise is STALE. U-OSC9-CALIB-APPLY-WIRE already made the DL write/read/apply segment keys coherent (all iso|_|regime, tool-agnostic). The plan's "add toolMaterial at the apply site" fix would REGRESS the live calib loop. And th
... [+4753 chars truncated]

### User | 2026-06-15T14:02:51.164Z

[tool_result] d26fc2411c [oscar] [SFC-FULLTUNE]/U-FT-12: lock calib write-key==apply-key coherence (anti-regression)
b53c0b641c [oscar] [SFC-FULLTUNE]/U-FT-14: inline-physics-constant CI guard (Kienzle/Taylor/mc, ratcheted)
210ea3febe [oscar] [SFC-FULLTUNE]/U-FT-09: Ollama-reasoned divergence triage (code-verified, advisory)
73f3e1fd5e [oscar] [SFC-FULLTUNE]/U-FT-CRON: autonomous closed-loop orchestrator + sche
... [+12069 chars truncated]

### Assistant | 2026-06-15T14:02:58.416Z

Now verifying key engines, files, and the remaining open unit against the actual repo.

### Assistant | 2026-06-15T14:03:02.313Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:03:03.836Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:03:04.603Z

[tool_use: Bash]

### User | 2026-06-15T14:03:19.755Z

[tool_result] 210ea3febe [oscar] [SFC-FULLTUNE]/U-FT-09: Ollama-reasoned divergence triage (code-verified, advisory)
2d5d4d7d0a [oscar] [SFC-FULLTUNE]/U-FT-10: read-only CSFH sweep actions on the L2 MCP allowlist
d74caa447d [oscar] [SFC-FULLTUNE]/U-FT-06: streaming compare/baseline reducer (shards -> moat)
c6dbfafb6d [oscar] [SFC-FULLTUNE]/U-FT-04: batch sweep worker (forked child, FAST, unit-atomic shards)
c12
... [+8815 chars truncated]

### User | 2026-06-15T14:03:36.340Z

[tool_result] mcp-server/scripts/sfc-aggregate.mjs
mcp-server/scripts/sfc-batch-coordinator.mjs
mcp-server/scripts/sfc-batch-worker.mjs
mcp-server/scripts/sfc-closed-loop-cron.mjs
mcp-server/scripts/sfc-divergence-triage.mjs
mcp-server/scripts/sfc-divergence-triage.test.mjs

### User | 2026-06-15T14:03:36.560Z

[tool_result] mcp-server/src/engines/GWizardAdapterEngine.ts
mcp-server/src/engines/GWizardLibraryExporterEngine.ts
mcp-server/src/engines/HSMAdvisorAdapterEngine.ts
mcp-server/src/engines/HSMAdvisorComparatorBridgeEngine.ts
mcp-server/src/engines/HSMAdvisorLibraryExporterEngine.ts
mcp-server/src/engines/HSMAdvisorMachineExporterEngine.ts
mcp-server/src/engines/HSMDwellAtCornerEngine.ts
mcp-server/src/engines/S
... [+1145 chars truncated]

### Assistant | 2026-06-15T14:03:47.888Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:03:49.830Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:03:51.899Z

[tool_use: Bash]

### User | 2026-06-15T14:03:59.789Z

[tool_result] 4ae684e0e2 [oscar] [OSCAR-SFC-9AXIS-MS0]/U-OSC9-CALIB-APPLY-WIRE: close the SFC self-learning loop (CSFH unit 12/13 -- KEYSTONE)
5bffb4f830 [oscar] [OSCAR-SFC-9AXIS-MS0]/U-OSC9-CALIB-PERSIST: durable self-learning calibration (CSFH unit 11/13)
f8b1d6dee2 [oscar] [OSCAR-SFC-9AXIS-MS0]/U-CSFH-DOC-REFLECT: galaxy frontier reflect 10-DISPATCHER-WIRE shipped (9/13, c75a68d174), CSFH live on prism_calc;
... [+7123 chars truncated]

### system

... [7 middle messages omitted -- see raw_file] ...

### User | 2026-06-15T14:05:22.557Z

[tool_result] 93de130f59 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALL-AXIS-TOOLLIFE (slot:oscar): credit axes live via Taylor tool-life, not only the speed/feed headline
08d7fc6d37 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALL-AXIS-SWEEP (slot:oscar): run calculations across EVERY named goal axis with max variability (clause 1)
4c544db4ae [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSC
... [+9985 chars truncated]

### Assistant | 2026-06-15T14:05:36.874Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:05:39.598Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:05:41.065Z

[tool_use: Bash]

### User | 2026-06-15T14:05:42.595Z

[tool_result] c2e24854ec [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-BY-DESIGN-LABEL (slot:oscar): distinguish by-design-inert axes from genuine remaining gaps in the all-axis sweep
a2ec922ca2 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-FEATURES (slot:oscar): wire controller smoothing into the default prism_optimized path (FIX-2 from dead-axis triage)
907e74acab [MAIN]
... [+3990 chars truncated]

### User | 2026-06-15T14:05:49.823Z

[tool_result] Exit code 2
mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts
mcp-server/src/engines/SpeedFeedExhaustiveCombinationEngine.ts
mcp-server/src/engines/SpeedFeedTriVendorBatchComparatorEngine.ts

### User | 2026-06-15T14:05:51.797Z

[tool_result] mcp-server/src/data/sfc-batch-units.test.ts
mcp-server/src/data/sfc-batch-units.ts
mcp-server/src/data/sfc-combinatorial-axes.test.ts
mcp-server/src/data/sfc-combinatorial-axes.ts
mcp-server/src/data/sfc-combinatorial-baseline-params.ts
mcp-server/src/data/sfc-combinatorial-compare.ts
mcp-server/src/data/sfc-combinatorial-datasource.ts
mcp-server/src/data/sfc-combinatorial-driver.ts
mcp-server/src
... [+240 chars truncated]

### Assistant | 2026-06-15T14:06:00.100Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:06:03.179Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:06:05.276Z

[tool_use: Bash]

### User | 2026-06-15T14:06:05.428Z

[tool_result] Exit code 2
---
---

### User | 2026-06-15T14:06:10.774Z

[tool_result] (Bash completed with no output)

### User | 2026-06-15T14:06:17.300Z

[tool_result] cd645121c9 [delta] [CAD-CLOSED-LOOP-TRAIN]/U-G2-EXTRACTS: extend templater to wiki extracts (+22 CAD pairs); corpus 675->697; deterministic-templating lever maxed
8279b3d14d [delta] [CAD-CLOSED-LOOP-TRAIN]/U-G4-VALIDATED: QLoRA dry-run OK on 675 pairs; base cached + GPU 76GB free; condition-4 1-command-from-running (needs torch venv path)
85a9f56bee [delta] [CAD-CLOSED-LOOP-TRAIN]/U-G2-CORPUS-GROW
... [+3677 chars truncated]

### Assistant | 2026-06-15T14:06:20.608Z

Now I have enough data. Let me do a few final targeted checks to nail down the exact status of the remaining open items.

### Assistant | 2026-06-15T14:06:22.567Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:06:25.611Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:06:27.671Z

[tool_use: Bash]

### User | 2026-06-15T14:06:28.287Z

[tool_result] NOT IN WORKTREE

### Assistant | 2026-06-15T14:06:29.577Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:06:32.062Z

[tool_use: Bash]

### User | 2026-06-15T14:06:36.494Z

[tool_result] 835df42c74 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-CERAMIC-CBN-BASELINE (slot:oscar): ceramic + CBN baselines — non-carbide comparison now COMPLETE (all 4 tool materials)
c78faa5a73 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-HSS-BASELINE (slot:oscar): add HSS non-carbide comparison baseline — close the carbide-only reference-data gap
6a3ad56545 
... [+196 chars truncated]

### User | 2026-06-15T14:06:41.891Z

[tool_result] ---
---
---

### User | 2026-06-15T14:06:48.809Z

[tool_result] 4a00b41df9 [MAIN] [PSN-DORMANCY-AUDIT-MS0]/U-BRIDGE-AI-TIER2-TIER3 (slot:whiskey iter6): Tier-2->Tier-3 specialist routing for cad/cam/safety/quality
a9afe53ebc [MAIN] [PSN-DORMANCY-AUDIT-MS0]/U-BRIDGE-AI-TIER1-TIER2-SKILL (slot:whiskey iter4): /system-coordinate operator skill — wraps prism_ai:system_coordinate
0fd50119bd [MAIN] [PSN-DORMANCY-AUDIT-MS0]/U-BRIDGE-AI-TIER1-TIER2-DOCS (slot:whiskey 
... [+450 chars truncated]

### User | 2026-06-15T14:06:54.163Z

[tool_result] a2ec922ca2 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-FEATURES (slot:oscar): wire controller smoothing into the default prism_optimized path (FIX-2 from dead-axis triage)
16b36cb284 [charlie] [QUOTING-DATA-WIRE]/U-QDW-INDEX: galaxy MEMORY — record data-file index (33 files) + juliett DB cross-galaxy edge
73bbdc5e1f [charlie] [QUOTING-DATA-WIRE]/U-QDW-INDEX: wire all quo
... [+430 chars truncated]

### Assistant | 2026-06-15T14:06:59.224Z

The re-anchor shows `SfcConstantChangeProposalEngine.ts` is actively being worked on (U-FT-13 in progress). Let me do the final targeted checks to complete the catalog.

### Assistant | 2026-06-15T14:07:00.806Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:07:02.772Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:07:03.475Z

[tool_use: Bash]

### User | 2026-06-15T14:07:08.785Z

[tool_result] mcp-server/src/engines/SfcConstantChangeProposalEngine.ts
EXISTS
d26fc2411c [oscar] [SFC-FULLTUNE]/U-FT-12: lock calib write-key==apply-key coherence (anti-regression)
b53c0b641c [oscar] [SFC-FULLTUNE]/U-FT-14: inline-physics-constant CI guard (Kienzle/Taylor/mc, ratcheted)
210ea3febe [oscar] [SFC-FULLTUNE]/U-FT-09: Ollama-reasoned divergence triage (code-verified, advisory)
73f3e1fd5e [oscar] [SF
... [+171 chars truncated]

### User | 2026-06-15T14:07:17.240Z

[tool_result] (Bash completed with no output)

### User | 2026-06-15T14:07:25.761Z

[tool_result]  M .claude/commands-archive/_flat-variants/cam-fixture.md
 M .claude/commands-archive/_flat-variants/cam-post-lint.md
 M .claude/commands-archive/_flat-variants/cam-toolpath-check.md
 M .claude/commands-archive/_flat-variants/cam-workholding.md
 M .claude/commands-archive/_flat-variants/grinder-harden.md
 M .claude/commands-archive/_flat-variants/grinder-learn.md
 M .claude/commands-archive/_flat-
... [+807 chars truncated]

### Assistant | 2026-06-15T14:07:28.579Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:07:29.665Z

[tool_use: Bash]

### User | 2026-06-15T14:07:36.918Z

[tool_result]  M .claude/commands/awareness-snapshot.md
 M .claude/commands/big-blob-hunt.md
 M .claude/commands/capture-claude-credentials.md
 M .claude/commands/checkin-alpha.md
 M .claude/commands/checkin-bravo.md
 M .claude/commands/checkin-charlie.md
 M .claude/commands/checkin-delta.md
 M .claude/commands/checkin-echo.md
 M .claude/commands/checkin-foxtrot.md
 M .claude/commands/checkin-golf.md
 M .claude
... [+728 chars truncated]

### User | 2026-06-15T14:07:42.667Z

[tool_result] /**
 * SfcConstantChangeProposalEngine (U-FT-13, SFC-FULLTUNE) -- tier-2 constant-change proposal pipeline.
 * ====================================================================================================
 *
 * The SFC closed loop's tier-1 (per-(iso|_|regime) speed/feed calibration multipliers, U-OSC9) self-
 * corrects WITHOUT touching physics. Tier-2 is the rare, gated escalation: when a 
... [+1810 chars truncated]

### Assistant | 2026-06-15T14:07:47.669Z

[tool_use: Bash]

### Assistant | 2026-06-15T14:07:50.030Z

[tool_use: Bash]

### User | 2026-06-15T14:07:55.763Z

[tool_result]  M .claude/helpers/.session-breadcrumb.json
 M .claude/helpers/__tests__/chat-slots-bindings.test.mjs
 M .claude/helpers/__tests__/chat-slots-rename.test.mjs
 M .claude/helpers/__tests__/pipeline-concurrency.test.mjs
 M .claude/helpers/_archive/knowledge-augmented-reasoning-v2.mjs
 M .claude/helpers/_archive/knowledge-augmented-reasoning-v3.mjs
 M .claude/helpers/advisor-session-log.mjs
 M .claude
... [+539 chars truncated]

### User | 2026-06-15T14:08:02.696Z

[tool_result] a2ec922ca2 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-FEATURES (slot:oscar): wire controller smoothing into the default prism_optimized path (FIX-2 from dead-axis triage)

### Assistant | 2026-06-15T14:11:05.427Z

I now have a complete picture. Let me compile the exhaustive markdown table.

---

## SFC Closed-Loop Training + Vendor-Comparison Feature Catalog

### Evidence key
- **slot/oscar branch** = committed in `H:/prism-slot-oscar` on `slot/oscar`
- **MAIN branch** = committed to `main` (via `[BOOTSTRAP-SLOT-ENFORCE]` commits from oscar)
- **WIP** = file exists on disk, not yet committed (`git status` dirty, U-FT-13)
- **PENDING** = task listed, no file on disk yet (U-FT-11)

---

| Feature | Source memory | Verdict | Status | Evidence (commit or file:line) | Value | Rationale |
|---|---|---|---|---|---|---|
| **L1 per-(iso×regime) segmented calibration** — `SpeedFeedDeepLearningEngine` per-segment speed/feed factors, ISO-group × CutType key `iso|_|regime` | `closed_loop_training_06_08`, `closed_loop_complete_06_12` | DONE | Shipped, committed | `b80a1e6365` (U-OSC9-SEGMENTED-CALIBRATION) + `09674e4971` (SEG-CALIB-FORWARD) on slot/oscar | Core L1 learning primitive; the ring that self-corrects Vc/fz per material group and cut regime | Without this there is no closed loop at all |
| **Calibration persistence** — `sfc-calib-factors.json` atomic tmp→rename, fail-soft, clamp [0.5,2.0] on load, hermetic in tests | `closed_loop_complete_06_12` | DONE | Shipped, committed | `5bffb4f830` (U-OSC9-CALIB-PERSIST) on slot/oscar; `mcp-server/data/state/sfc-calib-factors.json` target path | Factors survive process restart | Without this the learned loop resets every session |
| **Calibration apply to live physics (KEYSTONE)** — `UltimateSpeedFeedEngine` STEP 18F applies correction to emitted operating point; flag-gated `PRISM_SFC_CALIB_APPLY` default OFF; 4 safety invariants; Vf/MRR recomputed not scaled | `closed_loop_complete_06_12`, `fulltune_calib_axis_06_14` | DONE | Shipped, committed | `4ae684e0e2` (U-OSC9-CALIB-APPLY-WIRE) on slot/oscar | Closes the learn→apply ring so learned factors actually move live output | The loop was "trained in a sandbox nobody read" before this |
| **
... [+22356 chars truncated]
