# U-FORGE-AUDIT-OMNISCIENT

**Owner:** claude-99eca613 (forge-rgs-pipeline-r lane)
**Date filed:** 2026-05-09
**Origin:** /forge6 hook-optimization investigation + 2nd-audit retrospective
**Build target:** post-/compact session (fresh budget required)
**Constraint:** Tier 1 only on first ship — orchestrate existing assets, no new infrastructure

## Problem

`/forge-audit` runs blind on a richly-stocked codebase. Round 2 (10 capability-domain scrutiny agents) confirmed the audit surface produces low-precision findings because it doesn't consume the 5 awareness layers PRISM already maintains:

1. `state/shared/system-viz/system-graph.json` (10-layer, 627-edge live map)
2. `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` (DSL shortcodes E####/D##/A##/T####)
3. `knowledge/wiki/index.md` (722 entries) + `knowledge/memories/` (84 subdirs)
4. `CLAUDE.md` (project + global doctrine)
5. `PRISM-INVENTORY-LATEST.md` + `BUILD_STATE.json` + `MILESTONE_PROGRESS.json`

Half the gaps the v3 agents surfaced are already documented as intentional in `wiki/decisions/` or `memories/feedback/`. The audit re-derives instead of consulting.

## Goal

Upgrade `/forge-audit` to a conductor of existing assets that emits one **load-bearing artifact**:

> `state/shared/system-viz/audit-overlay.json` — per-node `{color, reason, shortcode, suggested_unit}` map, consumed by `system-viz.html` to tint the 3D graph green/yellow/red/blue.

This closes the loop the user has been asking for: visually see what's wired, what's orphan, where the bridges are missing, where each domain stands.

## Scope (Tier 1 only — zero new infrastructure)

Use only resources that already exist on disk or are available as native Claude Code subagents/MCP tools. No npm installs, no new engines, no new schema migrations.

### Assets the upgraded forge-audit MUST consume

| Asset | Use |
|---|---|
| `system-graph.json` | Orphans (zero inbound edges), bridges (1-hop pairs in same domain), coverage-by-domain |
| `CODE_SYSTEM_INDEX.json` + `codeSystemIndexEngine.resolve()` | Resolve every finding to a shortcode |
| `wiki/index.md` + `ObsidianMemoryRagEngine` | Prior-art dedup per finding |
| `CLAUDE.md` (both) | Doctrine grading (no inline Kienzle, /dedup tag, etc.) |
| `BUILD_STATE.json` | Built / unwired / pending / frontend-merge state |
| `MILESTONE_PROGRESS.json` | Envelope claim vs git delta |
| `BASELINE_INVENTORY.json` | Anti-regression baseline |
| `tribal-utilization-report.json` | Per-domain tribal density |

### Subagents to dispatch (parallel where possible)

| Subagent | Phase | Role |
|---|---|---|
| `pagerank-analyzer` | Phase 0 | Importance scoring on `system-graph.json` — weights priority of orphans |
| `code-archaeologist` | Phase 1 (×N domains) | Read-only deep architectural exploration per domain |
| `code-analyzer` | Phase 1 (×N domains) | Quality + test grading per domain |
| `physics-reviewer` | Phase 1 (where physics-relevant) | Doctrine compliance (Kienzle / Taylor / safety tier) |
| `byzantine-coordinator` | Phase 3 | Consensus on must-delete decisions |

### Native Claude tools

- `LSP.findReferences` / `incomingCalls` / `documentSymbol` for true import-graph orphan check (more accurate than text-derived)
- `codebase-memory-mcp` `search_graph` / `trace_call_path` / `get_architecture` — already loaded
- `Monitor` for long-audit progress on a per-event basis

## Phase plan

```
Phase 0  AWARENESS LOAD  (sequential, one shot)
  - load all 5 awareness layers above into memory once
  - dispatch pagerank-analyzer subagent → node importance scores
  - emit phase0_awareness.json (cached for downstream)

Phase 1  PARALLEL DOMAIN SCRUTINY  (mesh topology)
  domains := coverage-by-domain.json keys
  for each domain in parallel:
    spawn code-archaeologist (read-only)
    spawn code-analyzer
    if domain in {mill,lathe,edm,physics-safety}: spawn physics-reviewer
    each agent reads phase0_awareness.json (don't re-derive)
    each writes findings to state/shared/system-viz/agent-findings-v4/<domain>/<role>.json
    HARD time-box per agent: 6 min

Phase 2  CROSS-DOMAIN  (sequential)
  - bridge detection: graph algo over system-graph.json (betweenness centrality on intra-domain edges)
  - cycle detection: jq-based traversal on system-graph.json (no madge — Tier 1)
  - doctrine violations: regex sweep guided by CLAUDE.md rules + memory/feedback rules
  - dead-code: orphans where importance < threshold and inboundEdges == 0
  - emit phase2_crossdomain.json

Phase 3  VERIFICATION  (CoVe — Chain-of-Verification)
  for each finding from Phase 1+2:
    spawn 1-shot verifier (general-purpose subagent)
    verifier confirms or refutes with evidence (file:line)
    only verified findings (≥0.7 confidence) advance
  for dead_code candidates flagged for delete:
    byzantine-coordinator subagent → 3-of-3 consensus required

Phase 4  SYNTHESIS  (one shot, deterministic)
  emit:
    - state/shared/AUDIT-LATEST.json   (machine — rgs6 ingests this in Phase 0)
    - state/shared/AUDIT-LATEST.md     (human review)
    - state/shared/system-viz/audit-overlay.json   ★ THE LOAD-BEARING ARTIFACT
        per-node {nodeId, color: "green|yellow|red|blue", reason, shortcode, suggested_unit}
        green  = wired + tested + documented
        yellow = wired but missing tests OR docs
        red    = orphan (zero inbound edges, importance > 0)
        blue   = bridge-missing (1-hop pair in same domain, should be 0-hop)
    - state/shared/AUDIT-DELTA.md      (vs previous run baseline)

Phase 5  COMPOUND
  - append knowledge/wiki/log.md with run summary + delta
  - write knowledge/memories/project/forge_audit_<ISO-timestamp>.md
  - update state/shared/audit-baseline.json (delta computation source for next run)
  - regenerate system-viz with overlay applied (calls existing /system-viz skill regenerator)
```

## Files to create

```
H:/prism/.claude/scripts/forge-audit-omniscient.mjs        (top-level orchestrator)
H:/prism/.claude/scripts/audit-phase0-awareness.mjs        (loads 5 awareness layers)
H:/prism/.claude/scripts/audit-phase2-crossdomain.mjs      (bridge/cycle/doctrine sweep)
H:/prism/.claude/scripts/audit-phase4-synthesize.mjs       (emits 3 artifacts)
H:/prism/.claude/scripts/audit-phase5-compound.mjs         (wiki/memory/baseline writes)
H:/prism/.claude/scripts/_audit-overlay-schema.json        (audit-overlay.json schema)
H:/prism/.claude/commands/forge-audit.md                   (UPDATE — wire to omniscient orchestrator)
```

## Files to update

```
H:/prism/scripts/generate-system-viz.mjs    (claude-0413eca6 owns; coordinate via chat bus)
                                            (must read audit-overlay.json and apply colors)
H:/prism/state/shared/system-viz/system-viz.html  (claude-0413eca6 owns)
                                                  (overlay color application)
```

> **Coordination required:** the visualization-side wiring is in claude-0413eca6's lane. This unit's responsibility is producing `audit-overlay.json` correctly; consumption-side hookup is a follow-up coordination unit (U-VIZ-OVERLAY-RENDER).

## Lines-of-code budget

- Top orchestrator: ~150L
- Phase 0 awareness loader: ~120L (mostly file reads + pagerank dispatch)
- Phase 2 cross-domain: ~250L (graph algo + doctrine rule loader)
- Phase 4 synthesize: ~150L
- Phase 5 compound: ~80L
- Skill update: ~50L (forge-audit.md replacement)
- Tests: ~200L

**Total: ~1000 lines.** Achievable in a single fresh session.

## Acceptance criteria

- [ ] `/forge-audit` end-to-end produces `AUDIT-LATEST.{json,md}` + `audit-overlay.json` + `AUDIT-DELTA.md`
- [ ] `audit-overlay.json` validates against `_audit-overlay-schema.json`
- [ ] At least 80% of v3 round-2 findings are reproduced (sanity check vs `_AGGREGATE.json`)
- [ ] Wiki precheck suppresses ≥30% of findings that match prior-art (proves dedup works)
- [ ] Phase 5 writes a wiki log entry + memory entry
- [ ] Tests cover: happy path, empty awareness layers, malformed system-graph, orphan with importance=0 (suppressed), bridge between same-engine sister files (suppressed)
- [ ] Round-trip: feed AUDIT-LATEST.json into mock `/rgs6 generate --with-subagent-scrutiny` — Phase 0 ingests cleanly

## Out of scope for this unit

- ts-morph / madge / knip / semgrep integration → U-FORGE-AUDIT-RIGOR (Tier 2 follow-up)
- Visualization-side overlay rendering → U-VIZ-OVERLAY-RENDER (claude-0413eca6 lane)
- DSPy / Tree-of-Thought / Reflexion patterns → Tier 3, only after telemetry justifies
- The /forge upgrade (analogous omniscient version of /forge) → U-FORGE-OMNISCIENT, separate unit after this one ships

## Origin context for whoever runs this cold

- 5 RGS-pipeline commits already shipped (Tracks A+D + Track C Reflexion + Track B subagent fan-out + apply-update-points + future-ideas backlog).
- Round 2 v3 (1-per-domain × 10 domains) complete: `state/shared/system-viz/agent-findings-v3/_AGGREGATE.{md,json}` with 50 gaps / 8 conflicts / 42 opps / 14 high-leverage / 7 dead / 9 memory proposals, avg confidence 0.821.
- v3 fold into v2 envelope is owed but **lower priority than this unit** — this unit's audit-overlay.json is what makes `/rgs6 generate --with-subagent-scrutiny` actually consume the round-2 work meaningfully.
- Round 2 PROPER (10 agents PER DOMAIN = 100 agents) is task #75, deferred — should be redirected to read AUDIT-LATEST.json once this ships, not run blind again.
- Aggregator script at `H:/prism/.claude/scripts/aggregate-agent-findings.mjs` is uncommitted; commit it as a precursor unit if not already.

## Worktree

Build in main `H:/prism` on branch `cad-fusion-live-ms0` (current). The orchestrator + scripts don't conflict with peer chats; only the skill markdown update touches `.claude/commands/forge-audit.md` which has been quiet on the chat bus.

Commit format: `[CAD-FUSION-LIVE-MS0]/U-FORGE-AUDIT-OMNISCIENT: <short title>`
