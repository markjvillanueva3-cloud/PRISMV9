# SVI Baseline Audit + Enhancement Plan — 2026-05-24

**Slot:** charlie · **/goal-10 iter4** · **Live SVI sources audited:** `SVI-compact.md`, `SVI-watch-status.json`, `.svi-session-baseline.json`, `svi-refresh.mjs`, `CLAUDE-CODEX-SVI-DIRECTIVE.md`, `SVI-daily-report.md`

## Current state (as reported)

| Metric | Reported value | Source |
|---|---|---|
| SVI (cardinality) | 1.3 × 10⁴⁵ | `SVI-compact.md` 2026-05-24T07:33Z |
| Ψ (reachability) | 100.0% | `SVI-compact.md` |
| Trend | stable (Δ=0) | `SVI-compact.md` |
| Watch | 12 targets, no errors | `SVI-watch-status.json` |

## Current Ψ formula (in `.claude/helpers/svi-refresh.mjs`)

```
Ψ = Σ_k (entities[k] × dims[k] × WIRED_PCT[k]/100) / Σ_k (entities[k] × dims[k])
```

Where `WIRED_PCT` is a **hardcoded estimate per subsystem from 2026-04-01** (e.g. tools=98, machines=95, engines=88, dispatchers=98...).

## The honest assessment — reported Ψ ≠ real Ψ

The reported 100% is **overstated**. Live drift signals from elsewhere in the system contradict it:

| Signal source | Live value | What it really says |
|---|---|---|
| AWARENESS-SNAPSHOT.md | 593 unwired engines / 3097 hubs | Ψ_wiring real = (3097−593)/3097 = **80.8%**, not 100% |
| AWARENESS-SNAPSHOT.md | 190 envelope drift cases / ~700 milestones | Ψ_envelope = **72.9%** |
| knowledge-link-audit | 4,136 broken / 97,673 wiki tokens | Ψ_wiki = **95.8%** |
| knowledge-link-audit | 23,802 / 23,992 wiki files lack tribal embedding | Ψ_tribal = **0.8%** — HUGE GAP |
| NN-EVAL.json | NN-graph DORMANT, AUROC 0.096/0.78 gate | Ψ_psn_leg10 = **12.3%** |
| SessionStart hooks | system-viz regen FAILED, build 26h stale, MCP DISCONNECTED, ollama broken | Ψ_health ≈ **25%** |
| ai-feature-recommend | 4 of 7 PRISM-AI engines lack memo coverage | Ψ_memory = **42.9%** |

**Weighted real Ψ estimate** (weights: wiring 0.25, envelope 0.15, wiki 0.10, tribal 0.10, psn_legs 0.20, health 0.15, memory 0.05):

```
Ψ_real ≈ 0.25(0.808) + 0.15(0.729) + 0.10(0.958) + 0.10(0.008) + 0.20(0.85) + 0.15(0.25) + 0.05(0.429)
       ≈ 0.202 + 0.109 + 0.096 + 0.001 + 0.170 + 0.038 + 0.021
       ≈ 0.637
```

**Real Ψ ≈ 64%** — not 100%. The current formula is missing 7 component dimensions.

## Enhanced formula

```
Ψ = w_wiring·Ψ_wiring + w_envelope·Ψ_envelope + w_wiki·Ψ_wiki
   + w_tribal·Ψ_tribal + w_psn·Ψ_psn_legs + w_health·Ψ_health
   + w_memory·Ψ_memory + w_test·Ψ_test_coverage + w_drift·Ψ_drift_freshness
```

Each Ψ_k ∈ [0, 1], computed from LIVE sources (not 2026-04-01 hardcoded constants). Weights sum to 1.0.

Per-component sources:

| Component | Source | Live read | Weight |
|---|---|---|---|
| Ψ_wiring | system-graph.json (110K nodes) | `(hubs − orphans) / hubs` | 0.20 |
| Ψ_envelope | MILESTONE_PROGRESS + atomic-roadmap | `1 − drift_count / total_milestones` | 0.12 |
| Ψ_wiki | knowledge-link-audit.json | `1 − broken / total_tokens` | 0.08 |
| Ψ_tribal | knowledge-link-audit.json | `1 − missing_tribal / total_wiki` | 0.10 |
| Ψ_psn_legs | per-leg health probes (11 legs) | `mean(leg_health[1..11])` | 0.20 |
| Ψ_health | hook-health-check.json + MCP probe + ollama probe + viz mtime + build mtime | composite, see below | 0.15 |
| Ψ_memory | prism-ai-memo-cross-ref-audit.json | `covered / total` | 0.05 |
| Ψ_test_coverage | scrutiny_ledger + test-count vs engine-count | `min(1, tests/engines) × pass_rate` | 0.05 |
| Ψ_drift_freshness | mtime of every drift detector | `1 − stale_count / total_audits` | 0.05 |

Ψ_health subcomponents (each 0/1):
- MCP server responding on :3100
- Ollama `/api/chat` responding
- system-viz regen succeeded in last 24h
- build artifact ≤ 24h old
- 5 SessionStart hooks PASS

Ψ_psn_legs — per the 11 PSN legs, each gets a [0,1] health score:
- Leg #1 Obsidian brain: feed-hook fire-rate
- Leg #2 PRISM OS: dispatcher action count vs target
- Leg #3 Wiki: link-audit pass rate
- Leg #4 Memories: memo-coverage ratio
- Leg #5 Tribal: embedding-coverage ratio
- Leg #6 System Viz: regen success + node count vs target
- Leg #7 Engines: wired ratio
- Leg #8 Algorithms: registered formula count vs catalog
- Leg #9 Formulas: registered vs catalog
- Leg #10 NN/GNN: AUROC / promotion-gate
- Leg #11 PRISM AI: autonomy-loop trainer-manifest signal-count

## PSN + /system-viz synergy

1. **Read from system-graph.json** — Ψ_wiring becomes a live graph query, not a hand-tuned constant. The /system-viz substrate IS the ground truth.
2. **Read from psn-trainer-manifest-latest.json** (the autonomy substrate we shipped 069d9ab492 + d8fcf6ef82) — every PSN-fed reward feeds back as a Ψ_psn_legs[11] signal.
3. **New /system-viz roost: `ghost.svi_components`** — render each Ψ_k as a node with current score + delta; visual Ψ accountability.
4. **PSN autonomy loop reward extension** — every action that increases Ψ gets a +reward proportional to ΔΨ; actions that decrease Ψ get a −penalty. SVI becomes self-improving via the just-built `PSNAutonomyLoopEngine`.

## Path to Ψ = 1.0 (ranked by delta-Ψ per hour of work)

| Rank | Action | Effort | ΔΨ_component | Weight | Absolute ΔΨ |
|---|---|---|---|---|---|
| 1 | Restart Ollama + reconnect MCP + regen system-viz | 1h | +0.75 on Ψ_health | 0.15 | **+0.113** |
| 2 | Tribal embedding pass (23,802 wiki files) — batch script | 8h cron | +0.99 on Ψ_tribal | 0.10 | **+0.099** |
| 3 | Wire 593 unwired engines (or mark WIRE-EXEMPT) | 40h | +0.19 on Ψ_wiring | 0.20 | **+0.038** |
| 4 | Reconcile 190 envelope drift cases | 20h | +0.27 on Ψ_envelope | 0.12 | **+0.033** |
| 5 | NN-graph training cycle + promote | cron-driven | +0.83 on Ψ_nn_leg | 0.20×(1/11) | **+0.015** |
| 6 | Fix 4,136 broken wiki links | 30h | +0.04 on Ψ_wiki | 0.08 | **+0.003** |
| 7 | Add memos for 4 missing PRISM-AI engines | 4h | +0.57 on Ψ_memory | 0.05 | **+0.029** |
| 8 | Mtime-refresh every audit script | 2h | +0.30 on Ψ_drift_freshness | 0.05 | **+0.015** |

**Total achievable in ≤120 effort-hours: ΔΨ ≈ +0.345 → Ψ ≈ 0.98**

The last 0.02 requires sustained discipline (every new engine wired on day-of-create; every envelope updated on close; tribal embedding regenerated on wiki-write). The PSN autonomy loop is the mechanism — it learns to prefer actions that increase Ψ, so the 0.98 → 1.00 close is automated, not manual.

## Doctrine references

- `feedback_svi_psi` — SVI + Ψ as standing metrics
- `CLAUDE-CODEX-SVI-DIRECTIVE.md` — long-term standing rule (until Ψ = 100%)
- `project_svi_directive_until_100.md` — the "until 100" mandate
- CLAUDE.md §SAFETY — shop_floor tier (the Ψ_health subcomponents are safety-coupled — MCP down ⇒ no real-time program-proof certs ⇒ S(x) gates can't fire ⇒ unsafe-by-default fallback)

## Out of scope (deferred)

- Live UI dashboard (the /system-viz roost + console report cover it for now).
- Per-engine Ψ contributions (would require call-graph instrumentation; future MS).
- Ψ as a hiring/grading signal (cultural, not technical).
