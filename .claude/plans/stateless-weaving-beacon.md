# Plan: Forge / Audit / RGS Final-Roadmap Pipeline Upgrade

## Context

PRISM has a working but feedforward roadmap-generation pipeline (`ai-priority-rank → atomic-roadmap-emit → conflict-predict → six-chat-ready bundle`). It produces a roadmap, but four pieces of evidence the system already has on disk never make it into the sort decision, and no closed loop measures whether the prior emit was right. The user wants the FINAL ROADMAP generation pass to extract maximum value from what's built — not a rebuild, just full activation of dormant data flows + parallel subagent leverage now that the SubagentStart hook is wired.

This plan is informed by:
- Read-only audit of forge/audit/rgs skills + 10 specific gaps (Phase 1 Agent A — note: Agent A claimed `atomic-roadmap-emit.mjs` was missing; that's wrong, Agent B confirmed it exists and is operational)
- Data-flow analysis confirming what feeds the emit and what doesn't (Phase 1 Agent B)
- External best-practices research from FrugalGPT, SWE-agent, MetaGPT, Tree-of-Thoughts, Reflexion, Voyager, Outlines (Phase 1 Agent C, with arXiv citations)

## Recommended Approach: Surgical Wiring + Parallel Subagent Activation + Closed Loop

Three execution tracks, all incremental on existing infrastructure. **No rebuild.**

### Track A — Wire the 4 dormant data sources into the emit sort

The atomic-roadmap-emit sort currently keys on `(tier ASC, aiPriorityScore DESC, leverage DESC, alpha)`. Add four signals already on disk:

1. **MILESTONE_PROGRESS shipped fraction** — pre-filter so `shipped:true` units never appear in pending output, and weight near-complete milestones higher (`shipped/total ≥ 0.6 → boost`). Closes Agent B Gap A. Reuse: `scripts/build-milestone-progress.mjs:80-95`.
2. **Tribal-density verdict per domain** — units in `escalate` domains (<5 entries) get a flag for human review; `cheap` domains (≥20 entries) get a small priority boost (lower execution risk). Closes orphaned `tribal-density-router-bridge.mjs`. Reuse: `H:/prism/.claude/scripts/tribal-density-router-bridge.mjs`.
3. **System-viz blast-radius** — for each candidate unit, query `system-viz-query blast-radius <node>` and add `blastRadiusBoost = log2(downstreamCount+1) * 5` to the score. Closes Agent B Gap C. Reuse: `H:/prism/scripts/system-viz-query.mjs`.
4. **Envelope drift evidence** — for milestones whose claimed status doesn't match git reality (3 currently: `MF-MS1`, `MF-MS2`, `XPROC-NEURAL-OPTIMIZE-MS0`), surface as planner-update findings before emit, not as build findings. Reuse: `state/shared/MILESTONE_PROGRESS.json`.

Files to modify:
- `H:/prism/.claude/scripts/atomic-roadmap-emit.mjs` — add `enrichWithEvidence()` step between candidate load and sort
- `H:/prism/.claude/scripts/ai-priority-rank.mjs` — accept `--with-shipped-evidence` flag

### Track B — Move 3 stages to parallel subagent execution

The SubagentStart hook (just shipped, `H:/prism/.claude/hooks/subagent-start-context.mjs`) auto-injects ~4KB of PRISM context (live counts, BUILD_STATE, MILESTONE_PROGRESS, system-viz headline, tribal index, AI-priority top-5, lane discipline, operating rules) into every spawned subagent. Three stages currently sequential should fan out:

1. **Per-domain conflict audit** — fork conflict-predict into N subagents (one per dispatcher category: manufacturing/ai_intel/system/business/knowledge/other). Each gets domain slice via `tribal-rerank --domain`. Primary merges verdicts.
2. **Per-chat slice scrutiny** — after emit produces 6-chat splits, spawn 6 reviewer subagents (one per slice) asking "given THIS chat's lane + tribal coverage, is this slice achievable?" Confidence <0.7 triggers re-weight.
3. **Per-unit tribal classification** — spawn N=ceil(units/50) subagents to call `tribal-rerank --domain <d>` for each unit, attaching top-3 tips as `precedent` on the unit envelope. Future implementer chats start warm.

Files to modify:
- `C:/Users/wompu/.claude/commands/rgs6.md` (and mirror to `H:/.claude/commands/rgs6.md`) — add S2.6 "PARALLEL SUBAGENT FAN-OUT" stage between S2.5 (AI-priority) and S3 (six-chat-ready)
- `H:/prism/.claude/scripts/atomic-roadmap-emit.mjs` — add `--with-subagent-scrutiny` flag

### Track C — Closed loop via Reflexion-style telemetry retrieval

After every roadmap pass, write a `state/shared/roadmap-pass-history.jsonl` record with `{ts, passId, units_emitted, units_shipped_30d_later, drift_count, conflict_count, mean_aiPriorityScore, weights_used}`. Build a small embed-index over `(query=passId+top-domains, embedding=outcome-fingerprint)` so the NEXT pass retrieves the 3 most-similar prior passes and surfaces their hit-rate before locking weights.

This implements Voyager-pattern skill library + Reflexion verbalized self-critique on the roadmap-emit task itself. Reuses the existing nomic-embed-text Ollama infrastructure (just-shipped this session via tribal-embed-index.mjs).

Files to add:
- `H:/prism/.claude/scripts/roadmap-pass-record.mjs` — appender, called at end of atomic-roadmap-emit
- `H:/prism/.claude/scripts/roadmap-pass-retrieve.mjs` — reads top-k similar passes, emits hint block for NEXT emit
- `H:/prism/state/shared/roadmap-pass-history.jsonl` — log surface

### Track D — Output format upgrade (XML for Claude, JSON validated emit)

Per Anthropic docs: 8% higher field-completion when Claude emits hierarchical structures as XML vs JSON. Switch the master roadmap markdown emission to XML-tagged hierarchical (`<milestone><unit><scope>`). Downstream JSON (atomic-roadmap.json, six-chat-*.json) stays JSON, schema-validated. Add a free-text `<rationale>` per unit so models can verbalize without breaking schema (Outlines §6 schema-rigidity escape hatch).

Files to modify:
- `H:/prism/.claude/scripts/atomic-roadmap-emit.mjs` — split markdown emitter into XML-tagged + plain
- `C:/Users/wompu/.claude/commands/rgs6.md` (mirrored) — update S6 to specify XML output

### LLM cascade architecture (LOCKED: hybrid)

User confirmed "Hybrid: blanket on critical paths, router everywhere else."

**Critical paths (full blanket cascade — Ollama 7b → Ollama 14b → Gemini Pro 3 → Codex 5.5 → Opus 4.7 → loop → 3-CLI scrutiny → loop):**
- Final-roadmap emission pass
- Safety physics review (engines touching `physics/constants.ts` or S(x))
- Engine wiring to dispatchers (the 898 unwired engines work)
- Schema breaking changes (`mcp-server/src/schemas/*`)

**Everywhere else** (~95% of work): smart router with confidence-gated escalation. Triage task class → cheap Ollama 7b → confidence gate (τ=0.65 per FrugalGPT/RouteLLM ablations) → escalate Ollama 14b/deepseek → Opus only if `confidence < τ` OR safety-critical class.

Codex + Gemini CLIs are NOT installed; cascade silently skips those tiers (effectively reducing 3-CLI scrutiny to 1-of-1 today). Plan ships an `H:/prism/scripts/install-external-cli-stubs.md` documenting the install path; cascade-step gracefully degrades and continues.

## Critical files to modify

| File | Change |
|------|--------|
| `H:/prism/.claude/scripts/atomic-roadmap-emit.mjs` | enrichWithEvidence, blast-radius, tribal-density, XML output, history record |
| `H:/prism/.claude/scripts/ai-priority-rank.mjs` | --with-shipped-evidence flag |
| `C:/Users/wompu/.claude/commands/rgs6.md` (mirrored to H:) | S2.6 subagent fan-out, S6 XML output, history retrieve |
| `C:/Users/wompu/.claude/commands/forge-audit.md` (mirrored) | Postflight apply-update-points call |
| `H:/prism/.claude/scripts/roadmap-pass-record.mjs` | NEW — append outcome to history.jsonl |
| `H:/prism/.claude/scripts/roadmap-pass-retrieve.mjs` | NEW — top-k similar prior passes |
| `H:/prism/.claude/scripts/apply-update-points.mjs` | NEW — runs canonical-surface refresh (started earlier, interrupted) |

## Reuse (existing utilities, do NOT recreate)

- `H:/prism/scripts/system-viz-query.mjs` — blast-radius / find / headline (read-only adapter, lane-safe)
- `H:/prism/.claude/scripts/tribal-rerank.mjs` — domain-aware semantic query, citation log built-in
- `H:/prism/.claude/scripts/tribal-density-router-bridge.mjs` — per-domain coverage verdict
- `H:/prism/scripts/build-milestone-progress.mjs` — git-grounded shipped delta
- `H:/prism/scripts/build-state-snapshot.mjs` — BUILT/NEEDS_WIRING/PENDING/FE
- `H:/prism/scripts/audit-roadmap-drift.mjs` + `reconcile-roadmap-drift.mjs` — drift detection + auto-patch
- `H:/prism/scripts/agents/spawned-agent-context-lib.mjs` — subagent context bundle (upgraded this session)
- `H:/prism/.claude/hooks/subagent-start-context.mjs` — bundle injection hook (shipped + wired this session)

## Verification (end-to-end)

After implementation:

1. **Unit test the enrichWithEvidence step**:
   ```bash
   node H:/prism/.claude/scripts/atomic-roadmap-emit.mjs --dry-run --json | jq '.enriched[0]'
   ```
   Expect each unit to have `shippedFraction`, `tribalVerdict`, `blastRadius`, `driftFlag` fields.

2. **Test parallel subagent fan-out** via simulated rgs6 S2.6:
   ```bash
   node H:/prism/.claude/scripts/atomic-roadmap-emit.mjs --with-subagent-scrutiny --dry-run
   ```
   Expect ≥3 subagent confidence reports merged into output.

3. **Test closed loop**:
   ```bash
   node H:/prism/.claude/scripts/roadmap-pass-record.mjs   # writes 1 record
   node H:/prism/.claude/scripts/roadmap-pass-retrieve.mjs --query "tier-0 mill domain"
   # expect top-3 prior passes returned with hit-rate
   ```

4. **Test XML output well-formed**:
   ```bash
   node H:/prism/.claude/scripts/atomic-roadmap-emit.mjs --xml | xmllint --noout -
   # exit 0 = valid
   ```

5. **End-to-end**: run `/rgs6` against a small milestone slice, check that output roadmap (a) excludes already-shipped units, (b) flags tribal-thin domains, (c) sorts blast-radius-rich units higher, (d) emits XML, (e) appends history record.

## Out of scope

- Installing Codex / Gemini CLIs (documented as follow-up; cascade silent-skips today)
- Rebuilding the tribal embed-index (operational, 381 entries; just-shipped)
- Touching the system-viz lane (locked to `claude-0413eca6`)
- Refactoring the existing ai-priority-rank scoring weights (use as-is for first pass; closed-loop telemetry will inform tuning over passes 2-N)

## Estimated effort

~4-6 hours of focused implementation across the 4 tracks. Track A is highest leverage — single-day land. Track C (closed loop) requires one full pass to start collecting data; benefit compounds over passes 2-N.

## Locked decisions (user-confirmed)

1. **Cascade architecture: Hybrid.** Blanket cascade on critical paths (final-roadmap emission, safety physics, engine wiring, schema breaking changes). Smart router with τ=0.65 confidence gate everywhere else.
2. **Scope: Full system rebuild plan.** Single emission pass produces `PRISM-FINAL-ROADMAP-v3.md` covering ~2,735 pending units across 613 milestones, tier-0-first ordered, AI-priority weighted, conflict-predicted, blast-radius boosted, plus 6 chat-lane splits.
3. **Closed loop: Auto-tune weights** with first-3-passes manual override file. After each emit, record `{weights_used, units_emitted, units_shipped_30d}`. Pass N+1 retrieves top-3 similar prior passes via embed-retrieve; if hit-rate <60% on similar pass, adjusts ai-priority-rank weights by ±5% (clamped to [0.5, 1.5] of base). The override file `H:/prism/state/shared/roadmap-weight-overrides.json` lets a human pin weights for the first 3 passes while the embed-retrieve corpus is small.

## Final emission spec

Single `/rgs6` invocation produces:
- `H:/prism/state/shared/PRISM-FINAL-ROADMAP-v3.md` — full plan, ~2,735 units, XML-tagged hierarchy
- `H:/prism/state/shared/atomic-roadmap.json` — machine-readable, schema-validated
- `H:/prism/state/shared/atomic-roadmap-chat-{1..6}.md` — per-chat lane splits (already supported by existing emit)
- `H:/prism/state/shared/PRISM-NEXT-QUARTER-CUTOUT.md` — top-100 working slice extracted from full roadmap (zero extra cost; same data, different filter)
- `H:/prism/state/shared/predicted-collisions.json` — fork/share/defer per overlap
- `H:/prism/state/shared/roadmap-pass-history.jsonl` — appended pass record (first entry kicks off the closed loop)
