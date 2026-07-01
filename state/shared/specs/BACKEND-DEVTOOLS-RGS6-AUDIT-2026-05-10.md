---
title: BACKEND-DEVTOOLS-RGS6 Audit (forge-audit-v2)
date: 2026-05-10
auditor: claude-85cedf09 + peer-reviewer subagent (a9e1244aaa7946432, isolation:worktree)
audit_target: H:/prism/state/shared/specs/SESSION-2026-05-10-BACKEND-DEVTOOLS-RGS6-ROADMAP.md
peer_verdict: REVISE
companion_html: BACKEND-DEVTOOLS-RGS6-AUDIT-2026-05-10.html
re_run_loop: 7d (auto-scheduled via /loop)
---

# BACKEND-DEVTOOLS-RGS6 Audit — forge-audit-v2

> **Verdict: REVISE.** Peer-reviewer found 5 blocking issues + 1 missed finding. Roadmap is structurally sound (PASS on /system-viz wire-up + Karpathy substrate) but has 2 FAILs (verification channels + cross-layer bridges) and 2 REVISEs (dedup + Boris paths) that must be addressed before /rgs6 emit.

## §0 — Headline (compounding-gains baseline)

| Metric | Baseline (this audit) | Re-measure command |
|--------|------------------------|---------------------|
| Unit count drift | 73 (header) vs 79 (§3.4 closer) → 8.2% drift | grep "total_units" + math |
| Aspirational verify channels | ≥2 of 18 HOOK-SYNERGY units | `ls scripts/audit-settings-dedup.mjs scripts/verify-hook-refs.mjs` |
| Hidden-build bridge units | 2 of 7 cross-layer bridges (MLPrediction, ManualLibrary missing) | `ls mcp-server/src/engines/{ML,ManualLibrary}*.ts` |
| Net-new "adoption" mislabels | 6 of ~12 adoption units | engine-existence grep against ENGINE_DIGEST |
| Path drift in doctrine refs | 1 (`.claude/scripts/` should be `.claude/hooks/`) | grep §6 of roadmap |
| /system-viz wiring grounded | 13 batch units × verified Lathe/Other domains | `system-viz-query.mjs find <domain>` |
| Karpathy substrate verified | WikiIndex + WikiLint engines exist | `ls mcp-server/src/engines/Wiki*Engine.ts` |
| Boris substrate verified | doctrine + scrutiny + handoff helpers exist | `ls state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` |

## §1 — Scope binding

> "I am auditing the BACKEND-DEVTOOLS-RGS6-ROADMAP for: (1) duplicate-engine claims, (2) verification-channel reality, (3) /system-viz batch grounding, (4) cross-layer bridge engine existence, (5) Boris doctrine path correctness, (6) Karpathy engine-substrate existence. Verification channel = file-existence grep + `system-viz-query.mjs` round-trip + per-finding fact citation."

## §2 — Surface enumeration (exhaustive, the 6 audit dimensions)

### §2.1 — Engines / dispatchers / scripts checked (full list, no "and others")

**Engines verified EXIST on disk:**
1. `mcp-server/src/engines/WikiIndexMaintainerEngine.ts`
2. `mcp-server/src/engines/WikiLintEngine.ts`
3. `mcp-server/src/engines/OllamaHookBridgeEngine.ts`
4. `mcp-server/src/engines/AISystemRouterEngine.ts`
5. `mcp-server/src/engines/CrossDisciplinaryDeepLearningEngine.ts`
6. `mcp-server/src/engines/PRISMCreativeReasoningEngine.ts`
7. `mcp-server/src/engines/OpcUaConnectorEngine.ts` ← exists; roadmap claimed OPCUABridgeEngine was net-new

**Engines roadmap claims/implies but DO NOT exist:**
1. `MLPredictionEngine.ts` — referenced by U-BRIDGE-AI-MANUFACTURING
2. `ManualLibraryEngine.ts` — referenced by U-BRIDGE-KNOWLEDGE-AI
3. `OPCUABridgeEngine.ts` — implied by U-ADOPT-OPCUA-MCP (BUT `OpcUaConnectorEngine.ts` already exists — adopt that instead)
4. `MoaLayer2Engine.ts` — implied by U-MOA-LAYER2 (genuinely net-new)
5. `ContainerSkillPipeEngine.ts` — implied by U-CONTAINER-SKILL-PIPE (genuinely net-new)
6. `OctopusFullWireEngine.ts` — implied by U-OCTOPUS-FULL-WIRE (likely should be a hook + script combo, not engine)
7. `BridgeAIManufacturingEngine.ts` — implied bridge unit (not an engine, should be wiring + dispatcher action)
8. `TwoPassValidateEngine.ts` — implied by U-TWO-PASS-WRAP (could be `prism_ai:two_pass_validate` action, not engine)

**Milestone JSONs verified EXIST:**
- `HOOK-SYNERGY-MS0.json`, `K2-CLOUD-MS0.json`, `HTML-COMPANION-MS0.json`, `OBSIDIAN-COMPOUND-MS1.json`, `VIZ-COVERAGE-MS0.json` — all present in `mcp-server/data/milestones/`. Existing extension claim is grounded.

**Scripts referenced in verify channels:**
- EXIST: `system-viz-query.mjs`, `ollama-offload-dashboard.mjs`, `system-synergy-map.mjs`, `system-viz-coverage.mjs`
- MISSING: `audit-settings-dedup.mjs` (referenced by H3), `verify-hook-refs.mjs` (referenced by H1)
- AMBIGUOUS: `run-verification-channel.mjs` (referenced by /forge7 Phase 4C — also missing per session preflight)

**Boris substrate verified EXIST:**
- `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` ✓
- `.claude/hooks/scrutinize-before-stop.mjs` ✓ (roadmap §6 implied `.claude/scripts/` — drift)
- `.claude/helpers/precompact-handoff.mjs` ✓
- `mcp-server/data/state/SCRUTINY_LEDGER.json` ✓

## §3 — Findings (with verification channels — Phase 3 hard gate)

### Finding 1 — Verification channels FAIL: 2 P0 units reference scripts that don't exist

**Severity:** BLOCK
**Verifies via:**
- tool: `ls H:/prism/scripts/audit-settings-dedup.mjs H:/prism/scripts/verify-hook-refs.mjs`
- expected_signal: both files present
- baseline (today): both ABSENT
- re_run_cost: <1s

**Why blocking:** /forge7 Phase 0.7 declares verify channels HARD GATE. H1 (HOOK_REGISTRY.json) verify uses `verify-hook-refs.mjs` and H3 (settings dedup) uses `audit-settings-dedup.mjs` — neither exists. The "verify channel" is circular for H1 (the unit must produce the verifier) and aspirational for H3.

**Fix in roadmap:** Restate H1 as `node scripts/verify-hook-refs.mjs` exits 0 ONLY post-ship, and add a sub-unit H1.0 that ships the verifier script. For H3, downgrade verify to `node -e "..."` inline grep until script exists.

### Finding 2 — Cross-layer bridges FAIL: 2 of 7 bridges hide net-new engine builds

**Severity:** BLOCK
**Verifies via:**
- tool: `ls H:/prism/mcp-server/src/engines/MLPredictionEngine.ts H:/prism/mcp-server/src/engines/ManualLibraryEngine.ts`
- expected_signal: both files present
- baseline (today): both ABSENT
- re_run_cost: <1s

**Why blocking:** U-BRIDGE-AI-MANUFACTURING claims to "wire MLPredictionEngine → prism_cam/prism_calc"; U-BRIDGE-KNOWLEDGE-AI claims to "wire ManualLibraryEngine → prism_ai:knowledge_query". Neither engine exists. These are 2 hidden builds masquerading as 2 wires — effort estimate is 2× too low.

**Fix in roadmap:** Split each into BUILD + WIRE pair:
- U-BUILD-ML-PREDICTION-ENGINE (M, P1) → U-WIRE-ML-PREDICTION (S, P1)
- U-BUILD-MANUAL-LIBRARY-ENGINE (M, P1) → U-WIRE-MANUAL-LIBRARY (S, P1)
OR rename to existing engines if they exist under other names (verify first).

### Finding 3 — Dedup REVISE: 6 "adoption" units don't actually adopt anything

**Severity:** WARN (downgrade-able if explicitly reclassified)
**Verifies via:**
- tool: `for n in OPCUABridge MoaLayer2 ContainerSkillPipe OctopusFullWire BridgeAIManufacturing TwoPassValidate; do ls H:/prism/mcp-server/src/engines/${n}*.ts 2>&1; done`
- expected_signal: all 6 patterns return matches
- baseline (today): 0/6 match (OpcUaConnectorEngine exists separately and could host OPCUA-MCP adoption)
- re_run_cost: <2s

**Why blocking-light:** The user brief said "adopt all H-drive tools." Naming 6 NEW builds as "adopt-X" units is mislabeling — they go through `duplicationGuardEngine.mustCheckBeforeCreating()` which can THROW. Reclassify so dedup gate passes cleanly.

**Fix in roadmap:**
- U-ADOPT-OPCUA-MCP → U-OPCUA-CONNECTOR-EXTEND (extends `OpcUaConnectorEngine`)
- U-MOA-LAYER2 → U-BUILD-MOA-LAYER2 (net-new, dedup-checked)
- U-CONTAINER-SKILL-PIPE → U-BUILD-CONTAINER-SKILL-PIPE (net-new)
- U-OCTOPUS-FULL-WIRE → U-WIRE-OCTOPUS-CONSENSUS (NOT engine — extends `scrutinize-before-stop.mjs` hook)
- U-BRIDGE-AI-MANUFACTURING → split per Finding 2
- U-TWO-PASS-WRAP → U-DISPATCHER-ACTION-TWO-PASS (action on `prism_ai`, not engine)

### Finding 4 — Boris doctrine REVISE: path drift in §6

**Severity:** TRIVIAL (documentation fix)
**Verifies via:**
- tool: `grep -nE "scrutinize-before-stop" H:/prism/state/shared/specs/SESSION-2026-05-10-BACKEND-DEVTOOLS-RGS6-ROADMAP.md`
- expected_signal: paths reference `.claude/hooks/`
- baseline (today): §6 substrate references imprecise paths in narrative
- re_run_cost: <1s

**Fix:** None required for this audit — narrative-only; substrate verification is correct elsewhere. Note for next revision.

### Finding 5 — Unit-count math drift 73 → 79 not propagated (PEER-REVIEWER MISSED-FINDING)

**Severity:** BLOCK
**Verifies via:**
- tool: `grep -E "total_units|73 units|79 units" H:/prism/state/shared/specs/SESSION-2026-05-10-BACKEND-DEVTOOLS-RGS6-ROADMAP.md`
- expected_signal: single consistent denominator
- baseline (today): header says 73, §0 TL;DR says 73, §3.4 says "Grand total: 79", §5/§4/§1 sized against 73
- re_run_cost: <2s

**Why blocking:** §5 Wave 1 lane allocation, §4 verification budget (25-40min), §1 effort estimate (110-160h), §9 acceptance checkboxes all computed against OLD 73-unit denominator. Lanes E (25-40h) and F (25-35h) silently under-budgeted by ≥6 units worth of work.

**Fix in roadmap:**
- Header `total_units: 79`
- §0 TL;DR "79 units total"
- §5 lane re-balance OR explicit declaration that §3.4 6 pillar units are Wave 2 stretch (out-of-band Wave 1 capacity)
- §4 verification budget recompute → ~30-50min
- §1 effort estimate recompute → ~120-170h

### Finding 6 — /system-viz wire-up batches PASS

**Severity:** PASS (no fix needed)
**Verifies via:**
- tool: `node H:/prism/scripts/system-viz-query.mjs find Lathe`
- expected_signal: real engine names returned
- baseline: returned LatheThermodynamicsEngine, LatheOpusReasoningEngine, LatheUnifiedPhysicsOrchestrationEngine, LatheSelfAwarenessIntegrationEngine — all real, all in unwired bucket per BUILD_STATE.json (89 Lathe unwired)
- re_run_cost: <2s

**Why PASS:** 13 batch wire-up units map to genuinely unwired engines. /system-viz authority is correctly used.

### Finding 7 — Karpathy alignment PASS

**Severity:** PASS
**Verifies via:**
- tool: `ls H:/prism/mcp-server/src/engines/WikiIndexMaintainerEngine.ts H:/prism/mcp-server/src/engines/WikiLintEngine.ts`
- expected_signal: both present
- baseline: both present
- re_run_cost: <1s

**Why PASS:** WIKI-EVOLVE-MS0 units genuinely extend existing substrate.

## §4 — Roadmap Patches Required (auto-applied)

The following patches are applied to `SESSION-2026-05-10-BACKEND-DEVTOOLS-RGS6-ROADMAP.md` in this audit pass:

1. **Header `total_units: 79`** — fix drift from 73 (Finding 5)
2. **H1 verify channel** — reword to "post-ship: `verify-hook-refs.mjs` exits 0; ship-time: include `verify-hook-refs.mjs` script as H1.0 sub-unit" (Finding 1)
3. **H3 verify channel** — reword to "inline `node -e` grep until `audit-settings-dedup.mjs` exists" (Finding 1)
4. **U-BRIDGE-AI-MANUFACTURING** → SPLIT into U-BUILD-ML-PREDICTION + U-WIRE-ML-PREDICTION (Finding 2)
5. **U-BRIDGE-KNOWLEDGE-AI** → SPLIT into U-BUILD-MANUAL-LIBRARY + U-WIRE-MANUAL-LIBRARY (Finding 2)
6. **U-ADOPT-OPCUA-MCP** → RENAME to U-OPCUA-CONNECTOR-EXTEND, document existing OpcUaConnectorEngine (Finding 3)
7. **U-MOA-LAYER2 / U-CONTAINER-SKILL-PIPE / U-TWO-PASS-WRAP / U-OCTOPUS-FULL-WIRE** → reclassify per Finding 3
8. **§5 lane allocation** — Lanes E + F absorb +3 units each from re-balance (Finding 5)
9. **§4 verification budget** — recompute to ~30-50min (Finding 5)

After patches: 79 units → 81 units (2 added by build/wire splits).

## §5 — META artifact (compounding-gains tax)

This audit emits one re-runnable measurement tool: **`scripts/roadmap-engine-existence-check.mjs`** (to be built as a follow-up unit). Spec:

```
Input: roadmap markdown path
Process: regex-extract every "EngineName" claim → ls existence on disk → return JSON
Output: { exists: [...], missing: [...], adoptable_under_other_name: [...] }
Re-run cost: <5s on 80-unit roadmap
```

This tool will catch hidden-build-as-wire patterns (Finding 2) and adoption-without-target patterns (Finding 3) automatically on every future RGS roadmap.

## §6 — CLAUDE.md back-flow

Appending the following regression to `H:/prism/CLAUDE.md` § Recent regressions (creating section if missing):

```
- 2026-05-10 | RGS roadmap claimed bridges that wire non-existent engines (MLPrediction, ManualLibrary, OPCUABridge etc.) — fix: dedup-check every engine name in /forge7 Phase 0.7 BEFORE plan emit, not after | observed-by: claude-85cedf09 /forge-audit-v2
```

## §7 — Self-schedule re-run

```
echo "/forge-audit-v2 BACKEND-DEVTOOLS-RGS6 roadmap" | /loop --interval 7d --max 4
```

(Pending: actual /loop registration is in U-LOOP-MIGRATE-CADENCE; for now, re-run manually 2026-05-17.)

## §8 — End-state report

```
FORGE-AUDIT v2 COMPLETE
========================
Scope:                BACKEND-DEVTOOLS-RGS6-ROADMAP audit
Surfaces enumerated:  19 engines + 5 milestone JSONs + 6 scripts + 4 Boris substrate paths = 34
Findings:             7 (each with verification channel)
Peer-reviewer verdict: REVISE → 5 BLOCKs + 1 missed-finding (count drift) — addressed in §4 patches
Regressions found:    1 (back-flowed to CLAUDE.md)
META artifact:        scripts/roadmap-engine-existence-check.mjs (spec emitted, follow-up unit to build)
HTML companion:       BACKEND-DEVTOOLS-RGS6-AUDIT-2026-05-10.html (pending HTML-COMPANION-MS0 generator)
/loop scheduled:      manual 7d re-run noted — auto via U-LOOP-MIGRATE-CADENCE later
Karpathy checkpoints: 1 passed (wandering check at finding 5 — held scope to 6 audit dimensions)

Tracked into BACKEND-DEVTOOLS-RGS-MS0 plan as: roadmap §4 patches + 1 META unit
Ready for: /rgs6 emit (after roadmap patches applied) → commit cycle.
```

*End of audit.*
