---
name: forge6
description: Forge v6 — v5 + self-optimizing layer. Each phase of every forge run records pipeline telemetry; thresholds (tier-floor, context nudge, leverage min) self-tune from accumulated outcomes; failed compounding-gains audits auto-build the highest-leverage artifact instead of stalling. Strictly additive over v5.
---

---
effort: high
maxTurns: 50
policy:
  tier: 6
  triggers:
    - "forge6"
---

# Forge v6 — Self-Optimizing Pipeline

v6 inherits **everything** from v5 (Tool-Discipline Law, Compounding-Gains Law, Atomic-First Build Law, 6-chat synergy, viz-progress-update at every unit, all v4+v3+v2+v1 hard rules).

Read `H:/.claude/commands/forge5.md` for v5 baseline. v6 documents only the delta.

## What's new

Three feedback loops that v5 left open:

1. **Telemetry recording** at every phase boundary (P0/P0.5/P0.6/P1..P6 and per-unit) → `pipeline-telemetry.jsonl`.
2. **Adaptive thresholds** — Phase 0 reads `adaptive-thresholds.json` for live values of `tier_floor_pct`, `context_nudge_pct`, `context_urgent_pct`, `leverage_min`, `dispatcher_capacity_ceiling`, `expected_wired_delta_tolerance`. No more hardcoded magic numbers.
3. **Auto-build at Phase 6L compounding-gains audit** — if BLOCK, `auto-build-compounding-proposals.mjs` runs automatically, generates the highest-leverage artifact (wiki lessons / shared helper / domain digest), then re-audits. The compounding-gains tax can never stall a milestone.

## NEW LAW INHERITED FROM RGS6

### SELF-OPTIMIZATION LAW

Every forge run MUST emit telemetry, run adaptive-thresholds at close, and never reach the user with a S11.6/Phase-6L BLOCK without auto-build attempted. See `/rgs6` §SELF-OPTIMIZATION LAW for full text.

---

## PHASE 0 — PREFLIGHT (v5 + v6 thresholds load)

```bash
# Tool: adaptive-thresholds.mjs (NEW v6 — load tuned values)
TIER_FLOOR=$(node H:/prism/.claude/scripts/adaptive-thresholds.mjs --get tier_floor_pct)
CTX_NUDGE=$(node H:/prism/.claude/scripts/adaptive-thresholds.mjs --get context_nudge_pct)
CTX_URGENT=$(node H:/prism/.claude/scripts/adaptive-thresholds.mjs --get context_urgent_pct)
LEV_MIN=$(node H:/prism/.claude/scripts/adaptive-thresholds.mjs --get leverage_min)
DISP_CEIL=$(node H:/prism/.claude/scripts/adaptive-thresholds.mjs --get dispatcher_capacity_ceiling)
DELTA_TOL=$(node H:/prism/.claude/scripts/adaptive-thresholds.mjs --get expected_wired_delta_tolerance)

# Tool: pipeline-telemetry.mjs (NEW v6 — record P0 entry)
node H:/prism/.claude/scripts/pipeline-telemetry.mjs record \
  --milestone "$MILESTONE" --stage S0 --event stage_entry \
  --payload "{\"thresholds\":{\"tier_floor\":$TIER_FLOOR,\"ctx_nudge\":$CTX_NUDGE,\"lev_min\":$LEV_MIN}}"
```

PREFLIGHT v6 CARD adds:

```
Adaptive thresholds (live):
  tier_floor_pct:                  [N]   (default 90)
  context_nudge_pct:               [N]   (default 60)
  context_urgent_pct:              [N]   (default 80)
  leverage_min:                    [N]   (default 14)
  dispatcher_capacity_ceiling:     [N]   (default 200)
  expected_wired_delta_tolerance:  [N]   (default 0.20)
Telemetry: [N] records · [N] milestones tracked · last record [Hh] ago
```

## PHASE 0.5 — DEDUP (v5 + v6 telemetry)

```bash
# Tool: existing v5 dedup chain
/dont-reinvent
prism_dev:duplicate_check ...
duplicationGuardEngine.mustCheckBeforeCreating()

# Tool: pipeline-telemetry.mjs record decision
node H:/prism/.claude/scripts/pipeline-telemetry.mjs record \
  --milestone "$MILESTONE" --stage S0.5 --event decision \
  --payload "{\"dedup_verdict\":\"$VERDICT\",\"matches\":$N}"
```

## PHASE 0.6 — TIER-GATING (v5 + v6 adaptive threshold)

Use the live `tier_floor_pct` from adaptive-thresholds (not hardcoded 90):

```bash
PREREQ_PCT=$(node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json | jq '.domains[] | select(.label=="'"$DOMAIN"'") | .ratio * 100')
if [ "$PREREQ_PCT" -lt "$TIER_FLOOR" ]; then
  # Tool: pipeline-telemetry.mjs record violation
  node H:/prism/.claude/scripts/pipeline-telemetry.mjs record \
    --milestone "$MILESTONE" --stage S0.6 --event violation \
    --payload "{\"kind\":\"tier-skip\",\"prereq_pct\":$PREREQ_PCT,\"floor\":$TIER_FLOOR}"
  echo "BLOCK: tier floor $TIER_FLOOR not met"
  exit 1
fi
```

## PHASE 1..2B (v5 — same; add per-tool telemetry)

Each tool invocation gets a telemetry record:

```bash
# After each /dedup, /forge-audit, /code-index, etc:
node H:/prism/.claude/scripts/pipeline-telemetry.mjs record \
  --milestone "$MILESTONE" --stage S2 --event tool_used \
  --payload "{\"tool\":\"$TOOL\",\"hits\":$N,\"duration_ms\":$MS}"
```

## PHASE 3 — GENERATE (delegates to /rgs6 generate)

`/rgs6 generate` runs the 17-stage pipeline (16 v5 + S11.7 self-optimize gate).

## PHASE 4 — EXECUTE (v5 + v6 per-unit telemetry + adaptive nudge)

For each unit:

### 4A. Pre-unit
```bash
# Tool: viz-progress-update.mjs tick (v4)
node viz-progress-update.mjs tick --phase "$PHASE" --unit "$U"

# Tool: pipeline-telemetry.mjs record stage_entry
node pipeline-telemetry.mjs record --milestone "$MS" --unit "$U" --stage phase4_loop --event stage_entry
```

### 4B. The 4-LOOP (v5 — same)

### 4C. Post-unit telemetry + delta check
```bash
# Tool: system-viz-query.mjs coverage-by-domain
DELTA=$(node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json | ...)

# Tool: pipeline-telemetry.mjs record outcome
node pipeline-telemetry.mjs record --milestone "$MS" --unit "$U" --stage phase4_loop --event outcome \
  --payload "{\"kind\":\"leverage-realized\",\"predicted\":$PREDICTED,\"realized\":$REALIZED,\"verdict\":\"$([ $REALIZED -ge $((PREDICTED * (100 - DELTA_TOL * 100) / 100)) ] && echo pass || echo fail)\"}"
```

If `realized < predicted * (1 - delta_tolerance)`: telemetry records `verdict=fail`. Adaptive-thresholds will see this and may raise `leverage_min` next milestone.

### 4D. Anti-drift checkpoint (uses adaptive context_nudge_pct)

The compaction-budget-nudge hook (v4 PostToolUse) reads `adaptive-thresholds.json` instead of hardcoded 60%/80%. So if telemetry shows we've had drift incidents, nudge fires earlier next time.

### 4E. Phase complete
```bash
# Tool: viz-progress-update.mjs built (v4)
# Tool: auto-wire-plan.mjs --phase ... (v4)
# Tool: pipeline-telemetry.mjs record artifact
node pipeline-telemetry.mjs record --milestone "$MS" --stage phase4_loop --event artifact \
  --payload "{\"kind\":\"phase_built\",\"engines\":$N,\"target_dispatcher\":\"$DISP\"}"
```

## PHASE 5 — CONSENSUS (v5 + Agent 13)

13-agent hybrid review (v5's 12 + **Agent 13 Self-Optimization Compliance**).

```bash
# Tool: pipeline-telemetry.mjs record outcome (consensus verdict)
node pipeline-telemetry.mjs record --milestone "$MS" --stage S10 --event outcome \
  --payload "{\"kind\":\"consensus\",\"verdict\":\"$VERDICT\",\"hybrid_avg\":$AVG,\"agent11\":$A11,\"agent12\":$A12,\"agent13\":$A13}"
```

## PHASE 6 — HANDOFF (v5 + v6 self-optimize gate)

### 6A..6K (v5 — same)

### 6L. COMPOUNDING-GAINS AUDIT (v5)

```bash
# Tool: compounding-gains-audit.mjs --milestone "$MS" --apply
AUDIT_OUT=$(node compounding-gains-audit.mjs --milestone "$MS" --apply)
AUDIT_VERDICT=$(echo "$AUDIT_OUT" | grep "Verdict:" | awk '{print $2}')
```

### 6M. AUTO-BUILD ON BLOCK (NEW v6)

If audit verdict is BLOCK:
```bash
# Tool: auto-build-compounding-proposals.mjs (v6)
node H:/prism/.claude/scripts/auto-build-compounding-proposals.mjs --milestone "$MS"

# Re-audit
node compounding-gains-audit.mjs --milestone "$MS" --apply

# Tool: pipeline-telemetry.mjs record artifact + outcome
node pipeline-telemetry.mjs record --milestone "$MS" --stage S11.6 --event artifact \
  --payload "{\"kind\":\"auto_build\",\"class\":\"$CLASS\",\"path\":\"$PATH\"}"
```

If still BLOCK after auto-build: surface to user (rare — usually means the script needs a new candidate class for this milestone shape).

### 6N. SELF-OPTIMIZE GATE (NEW v6 — S11.7)

```bash
# Tool: pipeline-telemetry.mjs record stage_entry (S11.7 final)
node pipeline-telemetry.mjs record --milestone "$MS" --stage S11.7 --event stage_entry --payload '{"closing":true}'

# Tool: adaptive-thresholds.mjs (re-tune from accumulated telemetry)
node H:/prism/.claude/scripts/adaptive-thresholds.mjs

# Tool: pipeline-telemetry.mjs query --milestone (verify coverage)
COVERED_STAGES=$(node pipeline-telemetry.mjs query --milestone "$MS" --json | jq '[.[].stage] | unique | length')
if [ "$COVERED_STAGES" -lt 10 ]; then
  echo "WARN: only $COVERED_STAGES stages telemetered — Agent 13 may flag"
fi
```

## PROGRESS REPORTING (v6 expanded)

```
FORGE v6 PROGRESS
==================
P0   Preflight v5:    PASS — adaptive thresholds loaded ([N] params)
P0.viz   Bind:        graph @ [generatedAt] · TIER FLOOR map
P0.5     Dedup:       [verdict] (telemetry recorded)
P0.6     Tier-Gating: [PASS/BLOCK] @ tier_floor_pct=[N]
P1..P3   ...:         (telemetry per tool invocation)
P4       Execute:     [X]/[Y] units · viz tick logged · leverage realized [pass/fail per unit]
P5       Consensus:   13-agent hybrid avg [score] · A11=[N] A12=[N] A13=[N]
P6L      Compounding: [N] artifacts · auto-build fired? [Y/N]
P6N      Self-opt:    Telemetry [N] records this run · thresholds re-tuned ([params changed])

Cumulative ledger: [N] artifacts · velocity ratchet +[X]%
Adaptive threshold drift this milestone: [list of params that moved]
```

## END STATE

```
FORGE v6 COMPLETE
==================
Milestone:           [ID]
Telemetry:           [N] records emitted across [M] stages
Adaptive thresholds: re-tuned (changes: [list])
Compounding artifact: [class] auto-built? [Y/N] · path [PATH]
Quality:             Hybrid 13-agent avg [score] · A11 [score] · A12 [score] · A13 [score]
Build:               PASS · Tests [N] · Ω=[X] · S(x)=[X]
Surface coverage:    ~67% (v6 target — vs v5 ~60%, v4 ~50%, v3 ~40%, v2 ~15%, v1 ~4%)

Compounding ledger:
  Cumulative artifacts:  [N]
  Velocity ratchet:      +[X]%
  Auto-built artifacts:  [N] (this run + history)

Adaptive thresholds (post-tune):
  tier_floor_pct:               [N]  (was [N])
  context_nudge_pct:            [N]  (was [N])
  context_urgent_pct:           [N]  (was [N])
  leverage_min:                 [N]  (was [N])
  dispatcher_capacity_ceiling:  [N]  (was [N])
  expected_wired_delta_tolerance: [N]  (was [N])

Next: /forge6 [next idea]  |  /rgs6 self-optimize-audit
```

## ANTI-PATTERNS (v6 — supersedes v5)

All v5 anti-patterns PLUS the v6 anti-patterns from `/rgs6`:
- Telemetry-blind, threshold-ignorant, auto-build-skipped, tune-thrashing, telemetry-as-debug-log

## RELATIONSHIP

| Skill | Coverage | Key add |
|---|---|---|
| /forge..forge5 | ~4%..60% | (see prior versions) |
| **/forge6** | **~67%** | **telemetry + adaptive thresholds + auto-build closes propose→build + Agent 13 + S11.7** |

v6 is **strictly additive** over v5.

## QUICK REFERENCE

```bash
# v6 routes (via /rgs6)
/rgs6 telemetry                         # ledger summary
/rgs6 thresholds                        # current adaptive values
/rgs6 self-optimize-audit               # full health check

# Direct
node pipeline-telemetry.mjs summary
node adaptive-thresholds.mjs --get tier_floor_pct
node auto-build-compounding-proposals.mjs --milestone <id>
```

## V7 POINTER

Same as `/rgs6` §V7 POINTER. After v6 we hit diminishing returns on the forge/rgs improvement curve. v7 ships only when 3+ of those gaps cause real friction.
