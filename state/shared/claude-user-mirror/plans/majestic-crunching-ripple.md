# PIPELINE-VAR-MS0 Roadmap Scrutiny Fixes

## Context
20-agent roadmap scrutiny of PIPELINE-VAR-MS0 found 7/13 dimensions failing (<70 score). The milestone file was already updated with fixes for the 3 worst dimensions (Enforcement Hooks 12→~75, MCP Utilization 30→~75, Variability Metrics 42→~80). 

Remaining fixes needed for: Exit Gate Rigor (63), Forge-Triple (62→fixed), Feature Cascade (42→fixed), Machinist Intent (62).

## Already Applied (in this session)
The milestone JSON at `H:\prism\mcp-server\data\milestones\PIPELINE-VAR-MS0.json` was updated with:
- `enforcement_hooks` block (physics agent, wiring agent, constants checker, stub detector, review gate, auto compact, test baseline)
- `mcp_utilization` block (session start/during/end actions, quality gates, skills per phase)
- `variability_metrics` block (quantitative targets: ≥40% block variability, 10-30% cycle time reduction, Ra variance ≤0.3µm, tool life ≥20%)
- `feature_cascade` block (NEW_HOOKS, NEW_ACTIONS, NEW_SKILLS, AVAILABLE_TO, SESSION_ARTIFACTS)
- `forge_triple` expanded with trigger event, dispatcher routing, skill signature

## Remaining Work

### 1. Rewrite Machinist Intent (5 phases)
**File:** `PIPELINE-VAR-MS0.json` — each phase's `intent` field
- P0: "38-stage auto-chain" → "After you generate a program, speed and feed for every cut is automatically optimized — no extra steps"
- P1: "Vary discharge/infeed" → "EDM automatically reduces power for smooth finishes; grinding dials back before burn"
- P2: "Vary power/speed" → "Laser slows at corners for clean cuts; waterjet auto-adjusts for taper"
- P3: Keep as-is (scored 9/10 — already machinist-focused)
- P4: "Hook + tests" → "All 9 program types pass the same safety checklist before loading"

### 2. Add Abort/Rollback to Exit Conditions (13 units)
Each unit needs `abort_criteria` (≥3 measurable) and `rollback_procedure` fields.

### 3. Add omega_floor to Exit Conditions
Each unit: `omega_floor: 0.85`

### 4. Quantify Vague Exit Conditions
- U-PV03: "feed reduces near singularity" → "feed reduces ≥30% when A < 15°"
- U-PV06: "corner speed reduction" → "corner speed reduces 30-50% from straight-line speed"
- U-PV08-10: safety thresholds reference MachineRegistry/MaterialRegistry values

### 5. Add Build PASS to U-PV13

## Verification
- Re-read updated milestone JSON
- Confirm all 20 scrutiny dimensions would score ≥60
- Run `npx tsc --noEmit` to verify JSON is valid
- Run `npx vitest run` on existing tests to confirm no regression
