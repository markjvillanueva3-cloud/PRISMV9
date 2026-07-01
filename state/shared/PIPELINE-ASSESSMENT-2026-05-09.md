# PIPELINE ASSESSMENT — 2026-05-09

**Scope:** State of forge/rgs pipelines (v1→v6). Goal: ensure full utilization, anticipate upstream/downstream effects of every build, plan ahead for wiring/bridging, and tag features so future development pegs back to nodes that have just landed.

**Inputs:**
- 5 parallel Claude agents (Sonnet/Opus mix) — all returned
- Codex CLI: NOT INSTALLED on this machine (`codex: command not found`)
- Gemini CLI: NOT INSTALLED on this machine (`gemini: command not found`)
- BUILD_STATE.json (live), system-graph.json (390 nodes / 654 edges, 10 layers, 6 tiers)

> **Drift note:** Codex/Gemini reviews could not be obtained this pass. Single-CLI synthesis only — recommendation: install the CLIs (or wire MCP-side calls) before running this assessment again so 3-way consensus is a structural property of the assessment, not a one-time event.

---

## Verdicts (5-of-5)

| Agent | Lens | Verdict | Severity |
|------:|------|---------|---------:|
| 1 | Utilization coverage | **LOW** — 10 capabilities on disk, zero rgs/forge references | MAJOR |
| 2 | Dependency map | **MINOR-GAPS** — 5 broken deps, 5 orphan outputs | MAJOR |
| 3 | Wiring completeness | **MOSTLY-WIRED** — 1 critical (atomic-roadmap-emit.mjs missing), 3 minor | CRITICAL |
| 4 | Backward-pegging | **COMPOUNDING** — 4/5 artifacts ≥3 refs; pipeline-telemetry WEAK | MAJOR |
| 5 | Predictive layers | **ADD-1-LAYER** — Conflict Prediction is highest-leverage next | MAJOR |

---

## CRITICAL — must fix before next 6-chat run

### C1. atomic-roadmap-emit.mjs does not exist
**Found by:** Agent 3
**Symptom:** `six-chat-bootstrap.md:178` calls `node H:/prism/.claude/scripts/atomic-roadmap-emit.mjs` as the P0 step that produces the per-chat assignment lists. The file isn't on disk. **Hard-fail on next bootstrap.**
**Action:** Build it now. Reads system-graph.json + BUILD_STATE.json, emits `state/shared/atomic-roadmap.json` with units sorted by tier ASC, leverage_score DESC, then split into 6 chat lanes by domain affinity.

---

## MAJOR — gaps that erode pipeline value

### M1. Pipeline-telemetry self-citation graveyard (Agent 4)
**Symptom:** `pipeline-telemetry.mjs` is referenced only by `forge6.md` and `rgs6.md`. No hook/helper/script auto-fires it. Real coverage approaches zero — telemetry exists in name only.
**Action:** Ship `U-TELEMETRY-AUTOFIRE` — PostToolUse hook that records `tool_used` events for Edit|Write|MultiEdit|Bash; Stop hook that records `outcome` (pass/fail from build/test gates). Backfill ledger from the last 50 commits via `node scripts/telemetry-backfill.mjs`.

### M2. Top 10 capabilities sitting cold (Agent 1)
- `/simulate-change` (PredictiveWorldSimulatorEngine pre-edit gate)
- `/propose-goal` (AutonomousGoalSynthesisEngine)
- `/scout` (read-only build-queue.json populator)
- `/svi` (SVI interpretation skill)
- `/synthesize`, `/generalize`, `/trend`
- `/extract-dark-content` (auto-scan H: drive)
- `stop_on_unsafe_gcode.mjs` hook
- `signature-drift-detector.mjs` hook

**Action:** Wire each into a specific stage:
- `/simulate-change` → S0.6 (pre-edit risk gate, before S1)
- `/propose-goal` → S0 (seeds the milestone with non-obvious goals)
- `/scout` → S2 (between knowledge map + plan)
- `/svi` → S11.5 (post-build self-check before close)
- `/extract-dark-content` → background-only (autonomous)

### M3. Five broken deps in v6 stage graph (Agent 2)
1. **S11.6 audits artifacts pipeline never produces** — emission classes underspecified for non-engine milestones
2. **S11.7 telemetry assumes S0–S11.6 emitted, but no stage emits structurally** — fixed by M1 autofire
3. **S0.5 runs before S1 brief analysis** — order swap: brief → 0.5 nudge → 1 plan
4. **S9 conflict-predictor assumes clean git state** — must `git stash --include-untracked` first or fail loudly
5. **S11.7.C auto-build re-audit has no failure branch** — if re-audit still BLOCK, escalate to Agent 13 with `auto-build-failed` violation, do NOT silently pass

### M4. Conflict Prediction layer (Agent 5)
**Recommendation:** ADD-1-LAYER. Read 6 chat handoffs + active claims + planned units BEFORE Phase 1 starts. Emit `state/shared/predicted-collisions.json` with `recommendation: "fork|share|defer"` per overlap. Pipes into `six-chat-bootstrap`.

---

## NEW DOCTRINE (user directive 2026-05-09 17:00)

> **Top priority for the final master roadmap:**
> 1. **Overall system knowledge** (self-awareness, wiki, memory)
> 2. **Development tools** (engines/dispatchers/skills/hooks that accelerate the next milestone)
> 3. **Deep reasoning** (PRISMCreativeReasoningEngine, cross-disciplinary synthesis)
> 4. **Deep learning / machine learning / model training**
> 5. **AI systems** (Claude/Codex/Gemini/Ollama orchestration, full-system AI coordinator)

**How rgs6 must absorb this:** new ranking layer `ai-priority-rank.mjs` runs at S2 (knowledge mapping). It tags every candidate unit with a `aiPriorityScore ∈ [0, 100]` based on keyword + domain + dispatcher overlap with the 5 categories above. The roadmap generator orders by `(aiPriorityScore DESC, tier ASC, leverage_score DESC)` — AI/ML/system-knowledge work floats to the top while still respecting the Atomic-First Build Law (Tier 0 prereqs must ship before Tier-N consumers, even if the consumer has higher AI score).

This is documented as **AI-Priority Law** in rgs6.

---

## ACTION PLAN — this session

| # | Action | Owner | Status |
|--:|--------|-------|--------|
| 1 | Write this synthesis | Claude (this chat) | ✅ |
| 2 | Build `atomic-roadmap-emit.mjs` (C1) | Claude | in progress |
| 3 | Build `ai-priority-rank.mjs` + bake AI-Priority Law into rgs6 | Claude | in progress |
| 4 | Ship `U-TELEMETRY-AUTOFIRE` hook (M1) | Claude | in progress |
| 5 | Ship `conflict-predict.mjs` Phase-0 layer (M4) | Claude | in progress |
| 6 | Wire 10 cold capabilities (M2) | next chat | queued |
| 7 | Patch v6 stage-graph deps (M3.1–M3.5) | next chat | queued |
| 8 | Install Codex + Gemini CLIs for 3-way reviews | user | queued |

---

## SUCCESS METRICS — when is this assessment closed?

- [ ] All CRITICAL items addressed
- [ ] M1 (telemetry autofire) emitting ≥10 records per active session
- [ ] AI-Priority Law in rgs6 docs + tested with `node ai-priority-rank.mjs --dry-run`
- [ ] Conflict-predict.mjs runs in <5s and produces non-empty `predicted-collisions.json` for the current 6-chat fleet
- [ ] Next 6-chat bootstrap completes without errors

> **2nd-pass assessment** scheduled for the close of the next master-roadmap milestone (after first 6-chat run).
