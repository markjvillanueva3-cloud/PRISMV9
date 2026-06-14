# ZEBRA-OMNISCIENT — make Zebra act as the operator with full PRISM substrate context

**Date:** 2026-05-21 · **Slot:** bravo (`claude-eca6e8bb`) · **Origin:** user directive immediately following
`ZEBRA-HERMES-GAP-AUDIT-2026-05-20` close-out — *"zebra essentially needs to act as me with the full
knowledge of the entire system and the goal of prism app so it can properly orchestrate the other chats."*

This spec is the durable plan for graduating Zebra from a 4-input window-actuator (`chat-slots` PID/HWND +
git dirty + handoff freshness + per-slot awareness `queueLength`) into a goal-aware, substrate-aware fleet
orchestrator. The 13-gap campaign that just shipped closed *integration leaks* in the existing 4-input
decider; it did **not** widen Zebra's read context. This spec measures that wider gap and proposes phasing.

Advisory plan; no code in this file. Status flips when each unit lands a commit.

## 1. What Zebra reads + acts on TODAY (post-13-gap)

| Read input | Source | How |
|------------|--------|-----|
| Slot identity | `chat-slots.json[slot]` | `claimedBy`, `topic`, `branch`, `activity`, `terminalWindowId` |
| Window target | resolver chain | `resolveHwndByTitle(slot.topic)` (G1b — title-based, never PID) |
| Git state | `git status --porcelain` | `readGitDirty()` (G2 — saturates true on shared tree) |
| Handoff freshness | `state/shared/handoffs/HANDOFF-*-<slot>-*.md` | `readHandoffFresh(slot)` (G9 — 6h window) |
| Per-slot awareness | `state/shared/zebra-awareness/<slot>.json` | `queueLength` only (G13 — folded into `hasUnresolvedHandoff`) |
| Pressure level | sweep-computed | `level: "critical" | "high" | "moderate" | "low"` |

| Action emitted | Surface | Trigger |
|----------------|---------|---------|
| `/clear` | SendKeys to slot window | low-pressure idle slot |
| `/compact` | SendKeys to slot window | high-pressure or stale-handoff slot |
| (advisory only) | `zebra-advisory-inject` UserPromptSubmit hook | G11 — hint, not actuation |

That's the **entire** decider domain today. Two actions, six inputs, one personality (the operator-gated loop
documented in §G4 of the gap audit). Everything below is what Zebra does **not** read or do.

## 2. The omniscience gap — full read-context assessment

Live-chat substrate surfaces (auto-injected on every UserPromptSubmit / SessionStart for normal Claude chats)
that the Zebra sweep does **not** consume:

| # | Surface | Live chats | Zebra | Decision-value |
|---|---------|-----------|-------|----------------|
| 1 | **Master-index pre-search** — `system-graph.json` BM25-lite over 110K nodes | ✅ UserPromptSubmit | ❌ | HIGH — "is the unit I'm about to assign already built?" |
| 2 | **Wiki precheck** — top-3 `knowledge/wiki/` hits by keyword | ✅ UserPromptSubmit | ❌ | HIGH — doctrine recall |
| 3 | **Memory vault top-K** — `knowledge/memories/{feedback,reference,project,user,patterns,mistakes}/` | ✅ UserPromptSubmit | ❌ | HIGH — past decisions, rules |
| 4 | **Tribal-by-domain** — 3,919-tip corpus filtered by slot domain | ✅ UserPromptSubmit | ❌ | MEDIUM — domain-specific guidance |
| 5 | **Auto-memory feed** — Stop-hook propagated `knowledge/memories/<type>/*.md` | ✅ Stop feed | ❌ | HIGH — cross-session brain |
| 6 | **CLAUDE.md doctrine** — global laws + §FAIL-LOUD + §SCRUTINY GATE + 16 feedback rules | ✅ always-loaded | ❌ | CRITICAL — operating rules |
| 7 | **CLAUDE-BRIEF / BUILD-CONTEXT / BUILD-VISION** — 3 auto-regen brief files | ✅ SessionStart | ❌ | CRITICAL — PRISM identity + goal |
| 8 | **/system-viz graph** — ghost roosts, priority queue, bridge synergy, misc-task layer | ✅ on-demand | ❌ | HIGH — "what's the next-best unit for slot X?" |
| 9 | **ROADMAP-CONSOLIDATED** — 5,826 pending units sorted by bridge-priority | ✅ /pick-unit | ❌ partial | CRITICAL — work source |
| 10 | **MILESTONE_PROGRESS + envelope drift** — shipped vs claimed, silent close-out debt (51 ms / 329 units) | ✅ injected | ❌ | HIGH — pick-validity gate |
| 11 | **BUILD_STATE** — built / NEEDS_WIRING / NEEDS_BUILDING / NEEDS_FRONTEND | ✅ SessionStart | ❌ | HIGH — wiring-readiness gate |
| 12 | **CLOSE-OUT-CANDIDATES + MISC-TASKS-INVENTORY** — silent debt + 318 orphan tasks | ✅ advisory | ❌ | MEDIUM — close-out prompts |
| 13 | **chat-bus** — recent peer broadcasts, foreign claims, unread messages | ✅ injected | ❌ partial | HIGH — fleet coordination |
| 14 | **slot-task-claims.json** — who's building which `MILESTONE::U-ID` | ✅ /pick-unit filter | ❌ | HIGH — avoid double-assignment |
| 15 | **AGENT_CHAT / AGENT_WORKBOARD / AGENT_COORDINATION_STATUS** | ✅ injected | ❌ | MEDIUM — coordination state |
| 16 | **HOOK_REGISTRY / STOP_HOOK_REGISTRY** — what fires on which event | ✅ implicit | ❌ | LOW — diagnostic |
| 17 | **MCP dispatcher map** — 80+ dispatchers with action enums | ✅ in tool descriptions | ❌ | MEDIUM — capability awareness |
| 18 | **ENGINE_DIGEST / DISPATCHER_DIGEST / DIRECTORY_DIGEST** | ✅ pre-Read injection | ❌ | MEDIUM — dedup check |
| 19 | **Slot souls (Hermes personality)** — refuse_list, voice, domain_filter, escalation | ✅ slot-soul-inject T2 | ❌ | CRITICAL — per-slot doctrine |
| 20 | **omega-thresholds.json (safety tiers)** — shop_floor Ω≥0.95, S(x)≥0.98 | ✅ doctrine | ❌ | CRITICAL — safety gate before actuation |
| 21 | **TOKEN-AWARENESS-MS0 sidecar** — per-slot ctx%, zone (G/Y/R), bottleneck, offload% | ✅ UserPromptSubmit | ❌ partial | HIGH — already partially folded via 13-gap G3 /compact wait, but Zebra doesn't see token-zone directly |
| 22 | **scrutiny ledger** — 3-of-3 PASS/FAIL per session, escalation history | ✅ Stop hook gate | ❌ | MEDIUM — quality signal |
| 23 | **error ledger** — unified `error-ledger-append`, recall-similar, error patterns | ✅ pre-warn injection | ❌ | MEDIUM — mistake-avoidance |
| 24 | **RGS outcomes + transfer priors + calibration** — per-pipeline learning | ✅ on-demand | ❌ | LOW — too deep for orchestrator |
| 25 | **NN-GRAPH classifier** — GraphSAGE tier-5 for UNKNOWN→domain | ✅ wiring inference | ❌ | LOW — orphan rescue niche |
| 26 | **aiSystemRouterEngine** — task→backend routing (Claude / Ollama / NIM / vLLM) | ✅ on-demand | ❌ | LOW — Zebra's tasks are tiny |
| 27 | **DOMAIN-PIPELINE-MS0 stage per slot** — 18-stage print-to-part | ✅ on-demand | ❌ | MEDIUM — pipeline-aware suggestions |
| 28 | **Hermes closed-learning-loop verdicts** — `state/shared/skill-loop-verdicts.jsonl` + auto-pass staging dir (G5/G6) | ✅ Hermes runtime | ❌ | LOW — Zebra IS Hermes' actuator, doesn't need to read its verdicts |
| 29 | **Per-slot loop state** — `state/shared/loop-state/loop-<sid>.json` (running, iter, target) | ✅ implicit | ❌ partial | HIGH — Zebra would `/compact` an active loop's window today; misses the loop signal |
| 30 | **Conflict-fork rule + cross-tree-collision advisory** — when slot worktree migration is the right action | ✅ Stop advisory | ❌ | MEDIUM — pickup-failure mode |

Subtotal: **30 substrate surfaces** the live chats see and Zebra doesn't. CRITICAL: 5. HIGH: 11. MEDIUM: 9. LOW: 5.

## 3. The action-domain gap — user-replacement decisions Zebra can't make

Today's `decideClearOrCompact` is a 2-action picker. What the **user** does that Zebra would need to emit:

| User action | Today Zebra | Why blocked |
|-------------|-------------|-------------|
| Assign a unit to a slot — `/checkin-<slot> /loop <task>` | ❌ | no work-source read (#9 ROADMAP-CONSOLIDATED) |
| Pick the next best unit — `/pick-unit --slot S` | ❌ | no priority-queue read (#8 /system-viz) |
| Set a goal — `/goal <description>` | ❌ | no goal-state read (#7 BUILD-VISION) |
| Force a handoff write — `/handoff` | ❌ | no scrutiny ledger read (#22) |
| Surface a relevant skill — auto-trigger `/forge-triple` etc. | ❌ | no skill-trigger ledger read |
| Pivot a chat — kill `/loop`, start new directive | ❌ | no loop-state read (#29) |
| Pattern-spot across slots — "alpha + bravo + charlie all stuck on wiring" | ❌ | no fleet-aggregate read (#13/14/15) |
| Recognize hallucination / drift in a slot | ❌ | no scrutiny + error-ledger fusion (#22/23) |
| Pick between conflicting approaches (R7 surface-conflicts-don't-average) | ❌ | no doctrine inference (#6 CLAUDE.md) |
| Override safety threshold for explicit reason | ❌ | no safety-tier read (#20) — and rightly so without operator approval |
| Halt a runaway /loop | ❌ | no loop-state + token-zone fusion (#29 + #21) |
| Force conflict-fork to sibling worktree | ❌ | no cross-tree advisory read (#30) |

Of these, **two are operator-only by design** (set goal, override safety) — the other 10 are mechanically
achievable once Zebra reads the right surfaces. The G4 spec note ("operator-gated loop is the design") stays
intact: Zebra emits SUGGESTIONS via the advisory hook (#19 G11 wired); the human approves before keystrokes
land. ZEBRA-OMNISCIENT does NOT lift the operator gate — it makes the suggestions richer.

## 4. What the user may have missed in their listing

The user named: zebra · hermes agent · obsidian brain · system-viz · neural network · ai systems · learning
systems · wiki injection · tribal knowledge inject · memories · claude.md · pipelines · orchestrators · prism
awareness. The full assessment surfaces **16 additional categories** the operator listing didn't name:

1. **CLAUDE-BRIEF / BUILD-CONTEXT / BUILD-VISION** (#7) — the 3 auto-regen brief files; this is *where PRISM's
   goal lives in disk form*. Without these, Zebra can't tell "what is PRISM trying to be?"
2. **omega-thresholds.json + safety tiers** (#20) — shop_floor Ω≥0.95 — a hard gate Zebra MUST honor before
   any actuation suggestion that could land in a real G-code program.
3. **Slot souls** (#19) — per-slot Hermes personality with `refuse_list` — Zebra needs to NOT suggest a slot
   do something the soul refuses (e.g., suggesting bravo inline a physics constant).
4. **ROADMAP-CONSOLIDATED + bridge-priority** (#9) — the 5,826 pending-units inventory + 26 wiring + 16
   deep-integration bridge units. This is the work-source.
5. **MILESTONE_PROGRESS + envelope drift + silent close-out debt** (#10) — 51 ms / 329 hidden-shipped units.
   Without this, Zebra would suggest a chat work on something already shipped.
6. **BUILD_STATE** (#11) — built / NEEDS_WIRING / NEEDS_BUILDING / NEEDS_FRONTEND classification.
7. **chat-bus + foreign claims + slot-task-claims** (#13/14) — fleet-wide coordination state. Without these,
   Zebra would suggest two slots take the same unit.
8. **Loop-state** (#29) — per-slot active-/loop register. Without this Zebra would `/compact` mid-loop and
   break the autonomous run.
9. **TOKEN-AWARENESS-MS0 zone direct read** (#21) — partial today via the G3 /compact wait; Zebra should see
   the per-slot zone explicitly.
10. **CLOSE-OUT-CANDIDATES + MISC-TASKS-INVENTORY** (#12) — operator-debt surfaces.
11. **AGENT_CHAT / AGENT_WORKBOARD / AGENT_COORDINATION_STATUS** (#15).
12. **Conflict-fork rule + cross-tree-collision advisory** (#30) — the working response to multi-chat
    contention; Zebra should suggest fork rather than retry-clear.
13. **scrutiny ledger** (#22) — has this session passed the 3-of-3 gate?
14. **Skill-trigger ledger** (#26-adjacent) — when to surface relevant skills mid-loop.
15. **Engine / dispatcher / directory digests** (#18) — dedup-aware suggestions.
16. **`_skill-triggers.jsonl` recency** — see lima `reference_skill_trigger_ledger_revive_2026_05_20`; the
    ledger went to 0 lines on 2026-05-19 fleet-wide; Zebra needs to surface ledger-health, not just consume it.

## 5. Proposed phasing

### MS0 — Read-side (5 surfaces, no new actions)

Goal: Zebra's `planSlotAction` reads 5 highest-leverage surfaces. Decider stays 2-action; only the *inputs*
widen. Backward-compatible — every surface fail-soft, omitted surface → original boolean path.

| Unit | Surface | Why first |
|------|---------|-----------|
| U-ZO-MS0-01 | CLAUDE-BRIEF + BUILD-VISION (#7) | the goal-anchor; cached single-read per sweep |
| U-ZO-MS0-02 | ROADMAP-CONSOLIDATED bridge_units (#9) | the work-source for future MS1 actions |
| U-ZO-MS0-03 | Slot souls refuse_list (#19) | hard-constraint on any future Zebra suggestion |
| U-ZO-MS0-04 | Loop-state per slot (#29) | stop mid-loop /compact bug |
| U-ZO-MS0-05 | TOKEN-AWARENESS zone read (#21) | replace G3's coarse `/compact wait` with zone-aware decide |
| U-ZO-MS0-06 | Sweep context-bundle composition + cache layer | the integration unit; tests for cache-hit + fail-soft + sweep-time bound (<2s per slot at p95) |

### MS1 — Action-side (richer decider, still operator-gated)

Goal: `decideClearOrCompact` → `decideSlotAction` returning a richer ADT
(`{kind: "clear" | "compact" | "suggest-pick" | "suggest-handoff" | "suggest-fork" | "suggest-skill", payload}`).
Zebra still emits SUGGESTIONS only; advisory inject hook renders them; operator approves keystroke. Adds 10
substrate reads.

### MS2 — Goal-aware planner (full omniscience for SUGGESTION quality)

Goal: planner reads BUILD-VISION goal-state + cross-fleet bottleneck + scrutiny+error ledger fusion + skill
auto-trigger ledger health. Outputs ranked next-action SUGGESTIONS per slot with confidence. Backed by an
NN-GRAPH-like prior + RGS outcomes if available; degrades to rule-based when models aren't loaded.

## 6. Risk register

| Risk | Class | Mitigation |
|------|-------|-----------|
| Sweep I/O cost — reading 30 surfaces × 26 slots × 5min cadence → I/O-bound orchestrator | P0 | Lazy-load + mtime-keyed cache + per-surface TTL; sweep-time budget 2s/slot p95 |
| Stale surface poisoning decisions (e.g., 6h-old ROADMAP-CONSOLIDATED) | P1 | Per-surface freshness threshold; degrade-gracefully when stale; surface staleness back to operator via advisory |
| Action expansion lifts operator gate by accident | P0 | MS1 ADT never returns `{kind: "execute"}`; all richer actions are SUGGESTIONS only; G4 design doc updated |
| Cross-tree contention reading shared files | P1 | Read-only opens; never write; treat ENOENT as fail-soft empty |
| Soul refuse_list mis-applied → Zebra refuses to suggest valid work | P2 | Soul check is post-filter only, never pre-filter; logs rejected suggestions to advisory |
| Token-zone misread → Zebra `/compact`s a YELLOW slot that's mid-write | P2 | Zone read + active-write check (`git status` mtime within 30s) ANDed before /compact |
| 30-surface read explodes Zebra LOC and breaks the sub-200-line discipline | P1 | New lib `zebra-context-bundle.mjs` (read side) — orchestrator-lib stays slim |
| Operator surprised by richer suggestions | P2 | Advisory hook renders suggestions with `[ZEBRA-MS1 suggest]:` prefix; operator can disable category via `PRISM_ZEBRA_SUGGEST_<KIND>=0` knob |

## 7. Acceptance criteria

**MS0 ships when:**
- `zebra-context-bundle.mjs` exists with pure `loadSlotContext(slot, opts)` reader returning the 5-surface
  bundle; tests pin fail-soft + cache-hit + ttl-expiry + stale-mark behavior.
- `planSlotAction` accepts the bundle via opts; backward-compat preserved when omitted (existing 60/60 tests
  still PASS).
- New tests pin: loop-state-running suppresses `/compact`; soul refuse_list filters; token-zone overrides G3
  wait length.
- Sweep wall-time under load test (26 slots, all surfaces present, warm cache) ≤ 30s p95.
- Per-file scrutiny gate cleared on every file. End-of-task 3-of-3 PASS.

**MS1 ships when:**
- `decideSlotAction` ADT lands; all 6 suggestion-kinds have render paths in `zebra-advisory-inject`.
- Operator-side disable knobs honored for each suggestion-kind.
- E2E test: scripted slot in 5 states (idle / loop-running / pre-handoff-stale / token-RED / claim-collision)
  produces the right suggestion shape for each.

**MS2 ships when:**
- Planner reads goal-state from BUILD-VISION.
- Cross-fleet bottleneck identified from chat-bus + slot-task-claims + scrutiny ledger fusion.
- Output ranked top-3 SUGGESTIONS per slot with confidence + 1-sentence rationale.
- Soak test: 24h continuous sweep, no decision-correctness drift vs operator baseline (sampled).

## 8. Out of scope (deliberate, recorded for traceability)

- **Lifting the operator gate** — G4 said operator-gated is the design and stays. ZEBRA-OMNISCIENT enriches
  suggestions; does NOT execute autonomously.
- **NN-GRAPH integration into Zebra** — research-only model today (AUROC 0.096); revisit when stratified
  retrain promotes it.
- **AGI orchestrator composition** — Zebra calling MillMasterOrchestrator etc. is not in scope; Zebra
  remains a fleet-level orchestrator, not a domain orchestrator.
- **Multi-host coordination** — Zebra stays single-host; cross-machine slot lock files (per-host) already
  prevent contention per CLAUDE.md §GOLF SLOT R8.
- **Acting as the user for goal-setting** — `/goal` stays operator-only by design (R6 token-budget +
  operator-final-call principle).

## 9. See also

- `state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md` — the 13-gap predecessor that closed the
  integration-leak layer.
- `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` — companion deep-research deliverable;
  §6 "operator-gated loops are the design" is the doctrinal anchor for keeping MS0/MS1/MS2 suggestion-only.
- `state/shared/specs/ZEBRA-ORCHESTRATOR-DESIGN.md` — predecessor MS0 backbone (window-actuator).
- `state/shared/PRISM-BUILD-VISION.md` · `state/shared/CLAUDE-BRIEF.md` · `state/shared/PRISM-BUILD-CONTEXT.md`
  — the 3 surfaces U-ZO-MS0-01 reads.
- `knowledge/wiki/architecture/zebra-hermes-gap-audit-campaign.md` — the campaign close-out wiki entry.
- `knowledge/memories/reference/reference_zebra_awareness_ms0_2026_05_20.md` — the awareness MS0 backbone
  this spec builds on.
- `H:/prism/CLAUDE.md` §SESSION CONTINUITY STACK · §`/checkin-<nato> /loop` contract · §SCRUTINY GATE —
  doctrinal anchors for MS0 read-side discipline.
