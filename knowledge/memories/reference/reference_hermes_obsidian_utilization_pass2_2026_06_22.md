---
name: reference_hermes_obsidian_utilization_pass2_2026_06_22
description: Hermes+Obsidian utilization DEEP ASSESSMENT pass 2 (2026-06-22, slot:zulu, 5 parallel Sonnet readers over 65 specs + live verifier). VERDICT — both severely underutilized BUT root cause is "built-but-DARK" not unbuilt: capabilities ship default-OFF/unregistered/mock-default/extension-gated-noop. Live numbers: offload 22.2%, ollama-route-pretooluse 7679 fires/0 offloads, wiki-precheck-inject UNWIRED, prism_hermes mock-default, driver default-OFF. Highest ROI = ARM/WIRE not build.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.606Z
aliases: reference_hermes_obsidian_utilization_pass2_2026_06_22
---


# Hermes + Obsidian utilization — PASS 2 (2026-06-22, slot:zulu)

Operator (2nd time this session): "I STILL feel both are severely underutilized." Method: 5 parallel
Sonnet readers over the FULL corpus (30 Hermes + 35 Obsidian/vault specs + hermes-shann-article + pass-1),
reader 5 = live verifier. Full artifact: `state/shared/specs/HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22-PASS2.md`.

## VERDICT: operator is right — and the root cause is ONE pattern: BUILT-BUT-DARK
Nearly everything EXISTS on disk and ships **default-OFF / unregistered / mock-by-default / gated-to-no-op**.
The fleet built for months and rarely armed. Highest ROI now = ARM/WIRE, not new builds.

## LIVE-VERIFIED (trust these — reader 5 read actual values)
- Ollama offload **22.2%** (327/1470), below 30% target.
- **`ollama-route-pretooluse`: 7,679 fires / 0 offloads** — wired but a NO-OP (gated to `.log/.txt/.out`;
  passes all code to Claude). Biggest dead token lever.
- **`wiki-precheck-inject` = 0 settings refs** (wiki PSN leg not auto-injecting).
- **`prism_hermes` = MOCK-default** (8 actions; live needs `PRISM_HERMES_MOCK=0`+`noMock:true`).
- Obsidian read/write/reverse spine IS wired+live (`stop-obsidian-memory-feed`, `h-to-c-obsidian-mirror`) — healthy.
- HermesAutonomousDriver (built+proven this session) ships **default-OFF** → autonomous exec still 0 until armed.

## R12 UNRELIABLE FINDING
Reader 5's `Get-ScheduledTask` returned empty for ALL "PRISM" tasks, but Fleet-Reaper/task-health are
observably firing → the query was BROKEN (non-elevated headless PS), NOT proof tasks are absent. The Hermes
offline crons (Dream/Self-Reflect/Bridge) MAY be unregistered (prior specs say so) but **re-verify with a
working elevated query first**. (Same "verify the live value" lesson as this session's false-P0s.)

## TOP ACTIONS (ranked)
- **A1 (operator, ~5min, highest):** connect Hermes↔PRISM MCP — uncomment `mcp_servers:` in
  `%LOCALAPPDATA%/hermes/config.yaml` → `:3100/mcp` + filesystem-MCP at `H:/prism/knowledge`. THE unlock.
- **A2/A3 (operator, elevated):** register Hermes offline crons (re-verify first) + durable Grok proxy task.
- **B5 (code, alpha, biggest token win):** fix `ollama-route-pretooluse` extension gate → 22%→30%+.
- **B7 (code, ZULU's domain):** fix `zulu-advisory-inject` phantom-critical → route through authoritative
  per-turn `usage` (same class as the compact-phantom-byte fixes). I can do this on operator's go.
- **B6:** wire `wiki-precheck-inject`. **C9:** Brain-Refresh orchestrator. **C12:** PSN-RAG into Hermes 4 stages.

Doc-reported (re-verify): wiki 82.9% unembedded, 16,628 orphan notes (23.9%), classifier 79% misroute to business.

Linked: [[reference_hermes_obsidian_utilization_assessment_2026_06_22]] (pass1) · [[reference_hermes_autonomous_driver_built_2026_06_22]] · [[feedback_verify_live_config_value_not_symptom]].
