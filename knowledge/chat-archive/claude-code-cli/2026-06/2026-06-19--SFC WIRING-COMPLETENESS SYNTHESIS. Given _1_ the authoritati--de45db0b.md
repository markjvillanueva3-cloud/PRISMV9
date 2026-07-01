---
type: "chat-session"
source: "claude-code-cli"
session_id: "de45db0b-5132-4533-b8e3-bed00dc03f4a"
title: "SFC WIRING-COMPLETENESS SYNTHESIS. Given (1) the authoritative WIRED-SET ground-"
date: "2026-06-19"
first_ts: "2026-06-19T15:13:03.806Z"
last_ts: "2026-06-19T15:14:54.581Z"
cwd: "H:\\prism\\mcp-server"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a01343190464822b0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SFC WIRING-COMPLETENESS SYNTHESIS. Given (1) the authoritative WIRED-SET ground-

> **claude-code-cli** | 2026-06-19 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/de45db0b-5132-4533-b8e3-bed00dc03f4a/subagents/workflows/wf_6f5e6525-64e/agent-a01343190464822b0.jsonl`

## Transcript

### User | 2026-06-19T15:13:03.806Z

SFC WIRING-COMPLETENESS SYNTHESIS. Given (1) the authoritative WIRED-SET ground-truth map and (2) 11 per-category wiring scans, produce the definitive launch-readiness wiring report.

=== GROUND-TRUTH WIRED-SET MAP ===
null

=== CATEGORY SCANS ===
--- scan 1 ---
I have all the data needed. Delivering the final table now without further tool calls.

---

## SFC Wiring Audit — Cutting Force / Power / Torque / Kienzle / Merchant / Specific Cutting Force

**Wiring definition:** WIRED = exported singleton/class imported AND called by UltimateSpeedFeedEngine.ts, SpeedFeedNineAxisOrchestratorEngine.ts, SpeedFeedOrchestratorEngine.ts, OR reachable via a `prism_calc` `speed_feed` / `sfc_*` / `ultimate_speed_feed` / `cutting_force` / `joint_speed_feed_optimize` dispatcher action. All file:line citations are verified from actual source reads.

---

| asset | type | classification | evidence (file:line) | 1-line note |
|---|---|---|---|---|
| `algorithms/KienzleForceModel.ts` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:49` (import), `:973` (`KienzleForceModel.calculate(...)`) | Primary Fc model; called via shim function inside `calculate()` |
| `algorithms/MerchantShearForceModel.ts` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:67` (import), `:1236` (`.calculateShearAngleCompat`), `:1243` (`.calculateForcesCompat`) | Shear-plane force + shear-angle compat shim; both methods called |
| `algorithms/SandvikTurningForceModel.ts` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:66` (import), `:1011` (`.calculateTangentialCompat(...)`) | Turning Fc via Sandvik kc0.4/mc empirical model |
| `algorithms/JaegerTempField.ts` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:57` (import), `:1489` (`.cuttingTemperatureCompat(...)`) | Cutting temperature; feeds thermal-softening / Taylor life path |
| `algorithms/StabilityLobeDiagram.ts` | algorithm | **WIRED** | `UltimateSpeedFeedEngine.ts:60` (import `stabilityEstimateCompat`), `:1362` (`stabilityEstimateCompat(
... [+119720 chars truncated]

### Assistant | 2026-06-19T15:14:54.581Z

I have the 11 category scans but the ground-truth WIRED-SET map is `null` — I need to note that explicitly and proceed by cross-checking scans against each other and against verified file:line evidence within the scans themselves. Let me synthesize.

# SFC WIRING-COMPLETENESS REPORT — Launch-Readiness Synthesis

> **R12 PROVENANCE NOTE — GROUND-TRUTH MAP WAS NULL.** The authoritative WIRED-SET map supplied to this synthesis was empty (`null`). I therefore could NOT cross-check scan WIRED claims against an independent authority. Every classification below is graded **only** on the file:line evidence the 11 scans themselves carry. Where a scan's WIRED claim rests on a *comment-only* or *type-only* reference, I have demoted it to UNWIRED (the scans' own authors did this correctly in scans 5/11). Counts are honest but inherit the scans' read accuracy — treat WIRED-via-dispatcher as "reachable through `prism_calc`," NOT "composed inside the SFC `calculate()`/`run()` hot path," which is the launch-critical distinction below.

---

## 1. HEADLINE

| Metric | Count |
|---|---|
| **Total SFC-applicable assets enumerated** (de-duplicated across 11 scans) | **~250 raw rows → 233 distinct assets** |
| **WIRED** (orchestrator call OR dispatcher action with a real call site) | **~95** |
| **UNWIRED-BUT-APPLICABLE** (true functional gaps) | **~96** |
| **DEAD/NA** (wrong domain, CAM/EDM/business/display, or duplicate) | **~62** |

**Per-category WIRED / UNWIRED / DEAD breakdown (honest, de-duplicated):**

| Category (scan) | Wired | Unwired-applicable | Dead/NA |
|---|---|---|---|
| 1. Force/Power/Kienzle/Merchant | 13 | 20 | 6 |
| 2. Thermal/Cryo/LAM/Heat-treat | 8 | 17 | 15 |
| 3. Tool wear / life | 5 | 19 | 2 |
| 4. Chatter / stability / FRF | 6 | 9 | 2 |
| 5. Deflection | **0** | 13 | 5+ |
| 6. Surface finish / integrity | 17 | 8 | 4 |
| 7. Chip | 8 | 8 | 3 |
| 8. Engagement geometry / CWE | 8 | 6 | 3 |
| 9. Spindle / holder / runout | 29 | 1 | 0 |
| 10. Material / machinabili
... [+17202 chars truncated]
