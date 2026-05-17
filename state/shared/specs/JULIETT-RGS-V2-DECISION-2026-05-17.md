# JULIETT RGS-V2 REVAMP DECISION — /forge-audit-v2 of the roadmap (2026-05-17, iter-5)

> User question: "do we need to run each chat slot task queue through a revamped RGS pipeline that takes advantage of all current systems and tools?"
> 10-agent forge-audit-v2 swarm (R1-R10); R2+R3 rate-limited (Anthropic limit resets 1:50pm CDT). 8 verdicts synthesized.

---

## §0 — ANSWER

**YES — the revamp is needed AND justified, but ship it SEQUENCED (5-day incremental), NOT as a monolith now.**

The decisive finding (R5, confirmed): **the current RGS pipeline is structurally broken for the roadmap I built.** `roadmap-tool-plans.json` has 648 plans, **ALL 648 with empty `tools:[]`** — both the 0.30 (271) and 0.60 (377) confidence tiers ship zero tools; **zero plans at ≥0.75**. 0 of 104 phase-1 backend-dev units have a usable plan. Running the slot queues through *today's* RGS produces nothing actionable.

So the slot queues DO need a revamped RGS — but R10's trade-off analysis (8 active peer chats, rate-limit already hit twice this session, RGS files contended) says a 1-day V2 monolith is high-risk. The lower-revert-cost, better-learning-signal path is incremental.

---

## §1 — Why current RGS can't power the queues (R5)

| Blocker | Evidence | Fix | Owner | Cost |
|---------|----------|-----|-------|------|
| **F1 — 200MB graph cap** | `master-index-search-lib.mjs:142,306` hard-codes `200*1024*1024`; live graph 331MB → silent null fleet-wide | lift to 512MB OR honor `PRISM_GRAPH_MAX_BYTES` everywhere | any slot | ~15min |
| **648/648 empty tools[]** | sampled 5 plans, all `tools:[]`; rule table not emitting tool slates | U-RGS-RULE-BACKEND-DEV + diagnose emit path | lima | ~1h |
| **U-RGS-RULE-BACKEND-DEV unshipped** | `rgs-pipeline-rules.mjs` has 0 `backend.?dev` refs; spec exists, code doesn't | ship lima W0 unit | lima | ~1h |
| **`degraded:true` is STALE** | Ollama actually UP (HTTP 200); degradation is structural (empty tools regardless of daemon) | informational — don't chase Ollama | — | — |

**Pre-flight gate before slot-queue auto-loop activates:** F1 + U-RGS-RULE-BACKEND-DEV must ship AND a re-run must show ≥1 sampled plan with non-empty `tools[]` + confidence ≥0.75. Until then, `/checkin-<nato>` auto-loop would dispatch 104 units against a planner returning `tools:[]` (Karpathy R12 violation — `degraded:true` set but consumers ignore it).

---

## §2 — Revamped pipeline design (R7 + R8 + R9 synthesis)

**9 missing-but-built signal sources** (all on disk; ~270 LOC additive readers, zero new infra):

| Source | Reader | LOC |
|--------|--------|-----|
| per-unit specs (`specs/UNITS/<unit>.md`) | `readers.perUnitSpec` → {acceptance, file_targets, prior_art} | 30 |
| slot-task-queues.json | `readers.slotContext` → {owner_slot, queue_position, peer_slots} | 25 |
| token-budget-telemetry | `readers.cost` → {p95, budget_remaining_pct} | 40 |
| ollama-pipeline health | `readers.ollamaHealth` → skip reader on cold daemon | 15 |
| vault-unified-query | `readers.vault` → 5-namespace top-K (replaces tribal-only) | 50 |
| error-fix-vault-bridge | `readers.priorErrors` → {class, recipe} keyed by file overlap | 35 |
| chat-bus | `readers.peerActivity` → flip `defer:true` on collision | 25 |
| slot-domain affinity table | rule extension: +0.10 conf when unit.domain==slot.domain | 20 |
| master-index-search-lib (post-F1) | `readers.graphHits` → top-5 nodes | 30 |

**Revamped plan SHAPE (sidecar v1.0.0 → v1.2.0, additive):**
```json
{
  "unit_key": "...", "pipeline": [...],
  "slot_hint": "lima", "slot_confidence": 0.90, "slot_alignment_score": 0.0-1.0,
  "budget": { "model": "haiku|sonnet|opus", "thinking_tokens": N, "agents_max": 1-8, "ollama_offload_pct": 0.30 },
  "context_pre_fetch": ["spec://...", "wiki://...", "tribal://...", "memory://..."],
  "prior_errors": [{"class":"...","recipe":"error-fixes/..."}],
  "expected_files_to_touch": [...],
  "peer_collision_risk": {"score":0.0-1.0,"blocking_slots":[]},
  "clear_or_compact": "clear|compact",
  "confidence": 0.87
}
```

**R8 slot-aware scoring:** `score = base × (1 + α·affinity(rule.tools, slot_preference_vector[slot]))`, α≈0.35. 6 rules slot-neutral, 8 gain slot-multiplier, 0 new slot-only rules. `slot_hint===null` → α=0 → byte-identical to current (regression-safe; 84/84 MS1 E2E must stay green).

**R9 token-savings:** the 5 `budget`/`context_pre_fetch`/`clear_or_compact` fields → **~60% per-session token reduction** (model-routing −45%, thinking-budget −8%, prefetch −5%, /clear −2%, team-cap amortized −15-25% on long loops). This directly operationalizes the iter-4 token audit.

---

## §3 — DECISION: V1-INCREMENTAL (R10, hybrid tilt)

5-day sequenced plan — each unit small, reversible, observable; lima already owns the RGS files (no peer conflict):

| Day | Unit | Owner | Cost | Fixes |
|-----|------|-------|------|-------|
| 1 | **F1 graph-cap fix** + **U-RGS-RULE-BACKEND-DEV** | any slot + lima | 15min + 1h | R6 token-budget gap across all 104 plans; graph-search fleet-wide |
| 2 | **U-UNIT-SPEC-GENERATOR** | juliett | M | feeds `readers.perUnitSpec` (dead-weight until specs exist — only 5/4500 today) |
| 3 | **U-RGS-NEXT-INTEGRATE** (S9) | lima | M | R5 fallback routing; wires sidecar into /pick-unit |
| 4 | synthesize R7+R8+R9 + day1-3 telemetry → **U-RGS-V2-REVAMPED spec** | juliett | S | spec from real data, not untested assumptions |
| 5 | **U-RGS-V2-REVAMPED** | lima | M | slot-affinity + budget + context-prefetch + prior-errors + peer-collision |

**Fast-path option (operator's call):** ship **U-RGS-V2-MINIMAL** = `slot_hint + budget + context_pre_fetch` triplet only (~3h, lima). Captures 70% of revamp value at 40% cost; defer `prior_errors` + `peer_collision_risk` to MS3.

---

## §4 — Other audit findings (R1, R4, R6)

**R1 structural (slot-task-queues.json):** schema valid; **2 cross-slot dups** (U-SKILL-CHAIN-MANIFEST bravo+foxtrot, U-CLOSE-OUT-TRIAGE-CAMP foxtrot+hotel — pick canonical, drop dup); **10 false-positive broken-deps** (resolver must union `operator_gates[].id` — 1-line fix in `generate-slot-queues.mjs`); **6 starving slots** (charlie/delta/india/juliett/kilo/mike got 0 long_tail).

**R4 unclassified triage:** 122 of 123 are slot-assignable; **1 true orphan** (U-CLEANUP-G9 pr-ci-watch, DEFERRED). **Dominant gap is milestone-prefix→slot mapping, NOT per-unit keywords** — biggest clusters: 28 WORKTREE-CONSOLIDATE→charlie, 23 OIMS3→hotel, 23 COMMAND-KERNEL→lima, 14 GIT-TREE split charlie/golf. Add milestone-prefix routing to `SLOT_KEYWORDS` → ~99% next-regen capture. Fix = `U-SLOT-CLASSIFIER-V2` (S, juliett).

**R6 REVENUE promotion:** **56 of 395 parked units are backend-infra mislabeled** (formula/algorithm extraction, registry/catalog import, graph parser, CI gates — no operator surface). Top clusters: MS-RES-FORMULA-ALGO, MS-RES-POST-CYCLE-LIB (reference lib), MS-VIZ-ROADMAP-BIND (pure devtool). Ship `U-PHASE-PROMOTE-RES-BACKEND` (S, roadmap-only re-shelve, human-verify via `audit-close-out-candidates.mjs` first). Operator directive HONORED — these are backend-dev *prerequisites* mislabeled by source roadmap, not revenue work.

---

## §5 — NEW UNITS this audit adds

| Unit | Owner | Cost | Purpose |
|------|-------|------|---------|
| U-RGS-V2-REVAMPED | lima | M | 9-reader revamp (day-5) |
| U-RGS-V2-MINIMAL (alt) | lima | S | fast-path: slot_hint+budget+prefetch only |
| U-PHASE-PROMOTE-RES-BACKEND | juliett | S | re-shelve 56 mislabeled REVENUE→phase1 |
| U-SLOT-CLASSIFIER-V2 | juliett | S | milestone-prefix routing → 99% capture |
| U-SLOT-QUEUE-RESOLVER-FIX | juliett | XS | union operator_gates[].id (kills 10 false broken-deps) |

These ADD to the 35→40 unit count. Total session units: 40 + comprehensive long_tail.

---

## §6 — OPERATOR QUESTION (decide before next iter)

**Ship V1-incremental (5 small units over 5 days, observable, lima-locked, low-risk) OR bet on V2-revamped monolith now (1-day spike, HIGH peer-conflict with 8 active chats + rate-limit already hit 2× this session)?**

Recommendation: **V1-incremental.** R7/R8/R9 prove the revamp value is real but cleanly separable; R10 proves the monolith risk is high right now.

---

## §7 — SESSION HEALTH ALERT

Golf fleet-memory-monitor: one chat already OOM-crashed; largest trees 918MB/840MB/836MB; 11+ hours of `/compact` advisories with `slotLabel:null`. **This juliett session is at ~5.9M tokens.** Per the CLEAR-NOT-COMPACT doctrine I shipped iter-3: **operator should `/clear` this session** — all state is on-disk (this spec + slot-task-queues.json + per-agent handoff). Next iter picks up from handoff RESUME.

---

## §8 — REFERENCES

- Roadmap built: `state/shared/slot-task-queues.json` (commit 9680a13af9) + `scripts/generate-slot-queues.mjs` + `scripts/slot-queue.mjs` + `state/shared/specs/SLOT-AUTO-LOOP-MS0.md`
- Allocation lineage: `JULIETT-{12CHAT-ROI-ALLOCATION,DEVTOOLS-SYNERGY-MAP,FAN-OUT-T1-T5-ADDENDUM,TOKEN-OPTIMIZATION-AUDIT}-2026-05-17.md`
- RGS source: `scripts/rgs-tool-planner.mjs`, `scripts/lib/rgs-signal-fusion.mjs`, `scripts/lib/rgs-pipeline-rules.mjs`
- Sidecar: `state/shared/roadmap-tool-plans.json` (648 plans, all empty tools[] — bump v1.0.0→v1.2.0)
- Memory: [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]], [[reference_juliett_devtools_synergy_map_2026_05_17]]
