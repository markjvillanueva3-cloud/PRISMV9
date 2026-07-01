# JULIETT — Open Tasks Compiled from Last Night's Sessions
**Date:** 2026-05-19
**Compiled by:** claude-db7a0592 (slot juliett, /startup-juliett resumption)
**Sources:**
- `state/shared/slot-task-queues.json:queues.juliett` (87 units, all `status:unset`)
- `state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-V2.md` (8 stages, ~50 stage-units)
- `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md` (ROI swarm)
- `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md` (synergy chain)
- `state/shared/specs/JULIETT-FAN-OUT-T1-T5-ADDENDUM-2026-05-17.md` (5 fan-out)
- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` (3 GAP-HERMES units)
- `state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json` (audit-discovered gap)
- `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json` (envelope: 1 shipped, in_progress)

---

## 0. Honest scope (R12 fail-loud)

| Surface | Count |
|---|---|
| Units in juliett's runtime queue | **87** |
| Units shipped + envelope-recorded | 1 (U-PRECOMMIT-PATHSPEC-ONLY) |
| Net OPEN units in juliett's name | **~86** (queue) + 3 GAP-HERMES + new docker-block (this session) ≈ **92** |
| Realistic per-/loop-iter throughput | 1 Stage 1 unit (1-line fix) OR ½ Stage 2 unit (audit) |
| Realistic per-chat throughput (before /compact) | 5-15 units |

**Conclusion:** "complete all tasks" is a multi-chat marathon. This chat ships ~10 highest-leverage units, hands off the rest via the per-slot handoff. The /loop 5m cycle is the right cadence to pace it.

---

## 1. Priority ladder (the /loop pickup order)

### 1A. Docker / business-account units (new this session — sibling [[DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19]])
| Order | Unit ID | Cost | Why first |
|---|---|---|---|
| 1 | U-DOCKER-MCP-DISPATCHER | M | Unblocks the 6 CAM bridges in PRISM-APP-QUEUE (Mastercam/hyperMILL/Fusion360/etc); compounding leverage |
| 2 | U-DOCKER-MODELS-FALLBACK | S | Resilience when Ollama wedges; small patch |
| 3 | U-DOCKER-SCOUT-SCHEDULED | S | Once user runs `docker scout config organization`, this auto-wires weekly scan |
| 4 | U-DOCKER-CATALOG-AUDIT | S | Identifies upstream MCP servers PRISM could call instead of build (R8 dedup-preflight at the stack level) |
| 5 | U-DOCKER-HUB-PUBLISH | M | Multi-PC fleet sync; deferred until #3 lands |

### 1B. Stage 1 cheap P0 fixes (already named in V2 work plan, juliett-owned subset)
These are 1-line / 30-min units; ideal /loop 5m iter fodder. Most are owned by other slots in v2, but juliett can ship anything where the named slot is idle.
| Order | Unit ID | Cost | Slot in v2 |
|---|---|---|---|
| 6 | U-STOP-FORCE-LOOP-1LINE | XS | alpha (juliett if alpha idle) |
| 7 | U-TRIBAL-EMBED-SYMLINK | XS | delta |
| 8 | U-MEMORY-RELEVANCE-FIX | S | bravo |
| 9 | U-LOOP-ABANDONED-PICKUP | M | **juliett (canonical)** |
| 10 | U-HERMES-CLARIFY | XS (1-line operator question) | **juliett (canonical)** |

### 1C. Top of juliett runtime queue (state/shared/slot-task-queues.json, first 15)
| Order | Unit ID | Status | Title |
|---|---|---|---|
| 11 | U-DPM0-CELL-EXTRACT | shipped already (commit `cells-extract`) — verify + close-out | extract 62 not-fully-built domain×stage cells |
| 12 | U-GAP-SF-ADVANCED-FEED-OPT | unset | Re-modularize PRISM_ADVANCED_FEED_OPTIMIZER from v8.89 monolith |
| 13 | U-GAP-SF-NC-CALIBRATION | unset | Shop-proven S/F calibration from 35K+ JM DIE NC programs |
| 14 | U-WIRE-BACKLOG-SF | unset | Wire ~12 unwired speed-feed engines |
| 15 | U-BRIDGE-LEARN-SFC | unset | Closed-loop learning → SFC parameter refinement |
| 16 | U-BRIDGE-WIRE-SPEED | unset | Wire 4 unwired Speed engines |
| 17 | μS-D30..D33 | unset | Speed/feed recommender block (4 sub-units) |
| 18 | U-CAMX22-FIX-SILENT-SKIP | shipped already (2026-05-18) — verify + close-out | AutoSpeedFeed sync optimize |
| 19 | U-CAMX22 | unset | Wire AutoSpeedFeedEngine into PrintToProgram |
| 20 | U-CH03 | unset | Fix Ti kc1_1=1400→2800 + h_avg 2x error |
| 21 | U-CH12 | unset | Bootstrap Cpk + SpeedFeedOrchestrator HSS deflection + Hessian |
| 22 | U-CH13 | unset | Canonical force-engine imports |
| 23 | U-CW-01 | unset | Wire MachineAwareSpeedFeedEngine → prism_calc + prism_safety |
| 24 | U-CW-02 | unset | Wire ProvenSpeedFeedAggregatorEngine |
| 25 | U-CW-06 | unset | Wire 3 AI-variant SFC engines |

### 1D. GAP-HERMES units (3 new from HERMES-EVOLVING-SKILLS-RESEARCH)
| Order | Unit ID | Slot in spec | Why deferred |
|---|---|---|---|
| 26 | U-GAP-HERMES-EVAL | mike | Research + 1 docker-Hermes session; precedes any port decision |
| 27 | U-GAP-SKILL-AUTO-GEN-MS0 | lima | 4-6 sub-units; MS0 milestone scope; **critical compounding lever** |
| 28 | U-GAP-HERMES-MULTI-SURFACE-MSG | mike | Post-revenue; JM-Die shop-floor messaging |
| 29 | U-GAP-POST-BUILD-UTILITY-SCAN | lima | Sister meta-lever, sibling of #27 |

### 1E. Stage 2 doctrine + META (after Stage 1)
| Order | Unit ID | Slot in v2 |
|---|---|---|
| 30 | U-B1-DOC-BACKFLOW-WATCH | echo |
| 31 | U-NEW-TOOL-AUTO-WIRE | echo |
| 32 | U-AUTO-MEMORY-WRITE | bravo |

### 1F. Remaining queue (units 16-87 in juliett's queue)
Mostly speed-feed / cutting-physics / CAMX / dispatcher-wire micro-units. Will be picked up in subsequent /loop iters as Stage 1A/1B clear. List too long for this brief — query at pickup time:
```bash
node -e "const q=require('H:/prism/state/shared/slot-task-queues.json'); q.queues.juliett.slice(15).forEach((u,i)=>console.log(16+i, u.id||u.unit_id))"
```

---

## 2. Dependencies + blockers

| Unit | Blocked by |
|---|---|
| U-DOCKER-SCOUT-* | Operator running `docker login` + `docker scout config organization <org>` |
| U-DOCKER-HUB-PUBLISH | U-DOCKER-SCOUT-ENROLL (sign before push) + `.dockerignore` lint |
| U-CW-* wiring units | Existing engines must compile clean — run `npm run build:fast` first |
| U-CH03 (Ti kc1_1 fix) | Physics reviewer agent must verify against ISO group (KIENZLE doctrine) |
| U-GAP-SKILL-AUTO-GEN-MS0 | Needs the 4-6 sub-unit decomposition from research spec first |
| Stage 2+ | Stage 0 + Stage 1 prereqs (per V2 ordering) |

---

## 3. The /loop 5m execution contract

Every 5 min (via /loop skill, auto-resumes across /compact per [[reference_session_continuity_stack_2026_05_15]]):
1. **Pick** — first non-blocked unit from the priority ladder above whose `status:unset` and no peer-claim
2. **Dedup-preflight** ([[feedback_activate_before_build]]):
   - `node H:/prism/scripts/system-viz-query.mjs find <unit-keyword>`
   - `grep -ri <unit-keyword> mcp-server/data/docs/ENGINE_DIGEST.md`
   - `grep -ri <unit-keyword> .claude/commands/*.md .claude/hooks/*.mjs`
3. **Build** — implement per spec; never inline physics constants; obey `duplicationGuardEngine.mustCheckBeforeCreating()`
4. **Per-file scrutiny** — 2 reviewer agents in parallel per file (content-specialist + independent reviewer); fix every P0/P1 before next file (per project CLAUDE.md §PER-FILE SCRUTINY GATE)
5. **Tests** — real-behavior assertions (no `toBeDefined()` stubs)
6. **3-of-3 Stop gate** — Codex + Claude-A + Claude-B all PASS (`scrutiny-3way.mjs`)
7. **Commit** — `[JULIETT] [SCOPE]/U-ID: title` (lane discipline)
8. **Update** — chat-slots heartbeat tick; per-agent handoff append; mark task in TaskList complete
9. **Loop-state tick** — `node H:/prism/.claude/helpers/loop-state.mjs tick --session <id> --status ok --note "<unit-id> shipped"`

**Stop condition:** queue exhausted OR context >90% OR /compact fired OR operator types `/end-loop`.

---

## 4. End-of-chat handoff plan

When this chat compacts:
- /precompact hook auto-writes `HANDOFF-claude-db7a0592-juliett-work.md` with RESUME
- Next juliett chat (via /startup-juliett) picks up by re-reading: this doc + `loop-state.json` last tick + slot-task-queues juliett queue
- The DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19 sibling stays as the long-form rationale

---

## See also
- [[DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19]] — sibling docker doc
- [[JULIETT-CONSOLIDATED-WORK-PLAN-V2]] — broader 8-stage plan
- [[HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17]] — 3 GAP-HERMES units
- `state/shared/slot-task-queues.json` — runtime juliett queue (87 units)
- `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json` — envelope
