---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "Synthesize a LATHE DATABASE WIRING MATRIX + gap plan from these 5 audits. == mac"
date: "2026-05-29"
first_ts: "2026-05-29T18:05:48.448Z"
last_ts: "2026-05-29T18:09:11.820Z"
cwd: "H:\\prism-slot-whiskey"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_f751bdab-0aa/agent-af24e261056634a40.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:14"
---

# Synthesize a LATHE DATABASE WIRING MATRIX + gap plan from these 5 audits. == mac

> **claude-code-cli** | 2026-05-29 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-whiskey
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_f751bdab-0aa/agent-af24e261056634a40.jsonl`

## Transcript

### User | 2026-05-29T18:05:48.448Z

Synthesize a LATHE DATABASE WIRING MATRIX + gap plan from these 5 audits.

== machines+controllers ==
I have everything needed. Summary of findings:

**MACHINES** — Two distinct DBs exist:
- `ShopConfigurationEngine.ts` carries the canonical JM Die fleet: LTH-01..07 (7 Okuma lathes, all `controller:"okuma"`) within its 21-machine roster. Exposed via `prism_business:shop_config_machines` / `shop_config_get`.
- `LatheKinematicsDeepLearningEngine.ts` carries a *separate* 3-entry `OKUMA_MACHINE_DATABASE` (keys `LB300M`/`LB3000EX`/`LB4000EX`, all OSP-P300L) with axis/turret/envelope/safety-zone/build-quality detail. Exposed via `prism_turning:lathe_kinematics_get_machine_specs`. **The key mismatch is the gap**: this lathe-domain action keys on `LB300M` not the JM Die `LTH-01..07` IDs, so a lathe query for `LTH-07` returns null.

**CONTROLLERS** — Okuma OSP dialect DB is `okuma-dialect-knowledge.ts` (54 tips), consumed by `OkumaDialectKnowledgeEngine`, fully wired — but via `prism_data:box_okuma_dialect_*`, not the lathe surface. OSP program parsing (`OkumaOSPParserEngine`) is wired only indirectly (`prism_turning:turning_min_fingerprint`), with no standalone parse action.

| Category | DB path + count | Dispatcher action | Consuming engine | Verdict | Proposed wiring |
|---|---|---|---|---|---|
| **MACHINES — JM Die fleet** | `mcp-server/src/engines/ShopConfigurationEngine.ts` (LTH-01..07 = 7 Okuma lathes within 21-machine roster) | `prism_business:shop_config_machines`, `shop_config_get` | `ShopConfigurationEngine` | **PARTIAL** — wired, but on the *business* surface, not the lathe surface; no lathe-domain lookup by machine_id | Add `prism_turning:lathe_machine_lookup` (machine_id → spec) routing through `ShopConfigurationEngine.getMachines()` filtered to `type:"Lathe"`, so lathe chats query the canonical LTH fleet without crossing into `prism_business`. |
| **MACHINES — lathe kinematics specs** | `mcp-server/src/engines/LatheKinematicsDeepLearningEngine.ts` `OKUMA_MACH
... [+28584 chars truncated]

### Assistant | 2026-05-29T18:06:08.779Z

I'll synthesize the 5 audits into a single wiring matrix and gap plan. Let me write the deliverable directly.

### Assistant | 2026-05-29T18:08:12.952Z

[tool_use: Write]

### User | 2026-05-29T18:08:31.823Z

[tool_result] File created successfully at: H:/prism-slot-whiskey/state/shared/specs/LATHE-DB-WIRING-MATRIX.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-29T18:09:11.820Z

The matrix is written. The pre-write graph advisory flagged `lathe-engine-wiring` and `lathe-73-family-matrix` as related nodes — this deliverable is a one-time synthesis spec (not a new engine/asset), so no dedup conflict; it complements those graph nodes rather than duplicating them.

`H:/prism-slot-whiskey/state/shared/specs/LATHE-DB-WIRING-MATRIX.md`

**Synthesis result — 10 categories, 16 matrix rows:**
- **9 WIRED** (skip): materials, SFC, vendor inserts, fixturing physics, strategy catalog, feature recog, toolpath wear, OSP dialect KB, generic controller, posts
- **5 PARTIAL**: JM fleet machines (no lathe lookup), kinematics specs (`LB300M` keys ≠ `LTH-01..07`, 3 of 7), G70-G76 dialect map (camDispatcher-only), OSP parser (fingerprint sub-call only), alarms (no lathe entry point for 100%-Okuma fleet)
- **4 GAP** (highest value — dormant dead data / fully-unwired engines): Okuma-Multus insert+grade catalog, turning holders/boring-bars, workholding product catalog, `PPCannedCycleValidatorEngine`

**Build order: 9 wiring units** — Tier A (7 standalone DB reads: `lathe_insert_grade_lookup`, `lathe_toolholder_lookup`, `lathe_boring_bar_select`, `lathe_workholding_catalog_lookup`, `okuma_osp_parse`, `lathe_canned_cycle_dialect`, `lathe_alarm_lookup`) → Tier B (3 derived: `lathe_machine_lookup`, kinematics re-key resolver, `lathe_canned_cycle_validate`) → Tier C (6 optional ergonomics aliases, deferrable). Each carries the exact `await import()` route + a real-behavior test assertion.

**Key risks flagged:** 4 categories are code-embedded (no data file — test behavior not presence); SFC is oscar's domain (wire the client call to the existing facade, never duplicate Kienzle/Taylor); `MonolithWorkholdingDatabaseEngine`'s documented-broken bridge (wire the category accessor + assert non-empty to refute the stale docstring); machine-roster SSOT contention (B1 before B2, alias don't fork); no empty audit inputs.
