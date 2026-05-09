# RGS Pipeline — Future-Ideas Backlog

**Source:** Three X (Twitter) posts read via Playwright on 2026-05-09 in chat
`claude-99eca613` while finishing the forge/RGS pipeline upgrade plan
(`H:/.claude/plans/stateless-weaving-beacon.md`). User directed: "finish
original plan first, file ideas as backlog."

This file is a **proposal log only** — none of these ideas have been built.
Each item names the X post it came from, the concrete adaptation for PRISM,
and the smallest first slice that would test whether the idea earns its
keep. Keep this file additive: append, do not edit prior items in place.

---

## 1. Daily 3-phase cadence (Cowork → RGS pass rhythm)

**Source:** https://x.com/eng_khairallah1/status/2052684086414852546
**Pattern:** 7AM brief / midday production / 5PM wrap / Friday refinement.

**For PRISM RGS:** Today the `rgs6` pipeline runs ad-hoc whenever a chat
chooses. A daily-cadence wrapper would shape a much tighter feedback loop:
- **Morning brief** (per-chat cron, 07:00) — one chat reads
  `state/shared/MILESTONE_PROGRESS.json` + `BUILD_STATE.json` + per-chat
  handoffs and emits a `morning-brief.md` for each lane. Lanes know what
  shipped overnight, what other chats claim, what the day's slice is.
- **Midday production block** (09:00 – 15:00) — chats execute the slice.
  No new RGS passes during this window; it's pure ship-time.
- **5PM wrap** (17:00) — single chat regenerates atomic-roadmap with
  Track C retrieval hint, runs subagent fan-out (S2.6) on the day's
  drift, writes `evening-wrap.md` listing what shipped, what slipped,
  what next-day's lanes own.
- **Friday refinement** (Fri 17:00 + Sat morning) — full XML roadmap
  rebuild, weight-override review, embedding catch-up via
  `roadmap-pass-record.mjs --embed`, prune stale envelopes.

**First slice:** add `cron-roadmap-cadence.mjs` that emits the
morning-brief.md for one chat's lane, scheduled at 07:00 local. Defer
midday/wrap/Friday tiers until that single brief proves useful.

**Why it earns its keep:** PRISM today wastes context on every fresh
chat re-deriving "what shipped overnight." A pre-baked brief shaves
thousands of tokens off SessionStart and locks in handoff continuity.

---

## 2. Per-unit decision_trace (Sentra Company Brain)

**Source:** https://x.com/ashwingop/status/2052777467732283817
**Pattern:** Operational state ≠ knowledge base — Sentra layers
provenance, ontology, and permissions on top of stored facts.

**For PRISM RGS:** Atomic-roadmap units today carry `enrichment` (evidence
score, blast radius, AI priority) but no audit trail of *why* a unit
landed in its tier or how its weights were chosen. A `decision_trace`
field per unit would record:
- which retrieval-hint pass surfaced (similarity, units used)
- which weight overrides were active and why (`shipped_boost = 5.25`
  because mean hit-rate was 47%)
- which subagent batch flagged the unit (per-domain conflict /
  per-chat slice / per-unit tribal)
- which evidence files contributed to the score (ranked by weight)

**First slice:** extend `enrichWithEvidence()` in `atomic-roadmap-emit.mjs`
to attach `decisionTrace: { retrievalSim, weightSource, evidenceCites }`
to each unit. Schema-versioned; opt-in via `--with-decision-trace`.

**Why it earns its keep:** When a unit ships and underperforms (or
overperforms), today we cannot retroactively diagnose *why the planner
ranked it*. Trace closes the loop on Track C's hit-rate measurement.

---

## 3. Subagent Department surface (Teamly Pixel Department)

**Source:** https://x.com/zodchiii/status/2052368125480354000
**Pattern:** Narrow agent job-specs + Pixel Department for fleet
observability.

**For PRISM RGS:** Track B fans subagents out via S2.6 but produces no
fleet-level observability. Today we know "batch1 ran, mean confidence
0.81" but not:
- which subagent took longest
- which prompt template returned the lowest confidence
- which `subagent_type` (`code-analyzer` vs `reviewer` vs
  `general-purpose`) actually correlates with verdict accuracy
- whether the same subagent has been called >3× this hour (rate-limit
  hint)

**First slice:** `state/shared/subagent-department.json` — per-subagent
record with `{ id, type, batch, prompt_hash, started_at, ended_at,
confidence, verdict_class, tokens_in, tokens_out }`. Append-only.
Surface it via a new `/subagent-dept` skill that prints fleet table.

**Why it earns its keep:** The fan-out pattern only scales if we can
profile which subagent shapes are productive. Otherwise we're spawning
opus-priced agents for tasks haiku could solve — pure cost waste.

---

## 4. Cost + token telemetry per pass

**Source:** Synthesized from all 3 posts (Sentra cost-aware, Teamly
billing-aware, Cowork rhythm-aware).

**For PRISM RGS:** Every roadmap pass today is opaque on cost. Track C
records hit-rate, drift, weights — but not:
- model used per stage (some stages run via Ollama, some via Claude)
- prompt tokens / completion tokens / cache hit rate
- wall-clock duration per stage (S0..S2.6.C)
- $ cost projection (per-1k-token pricing × actual tokens)

**First slice:** wrap `atomic-roadmap-emit.mjs` stages with a
`telemetry-stage-wrap.mjs` helper that emits `state/shared/
roadmap-pass-cost-<passId>.json`. Track C's `pass-record.mjs` already
hooks at the right place; add cost fields to its record schema (additive,
back-compat).

**Why it earns its keep:** Without this, Track C's "weights bumped 5%"
advice can never be traded against cost — we might be paying 20× more
to gain 5% hit-rate, and not know it.

---

## 5. Schema-validate every emit output (catch drift early)

**Source:** Sentra's permissions/ontology layer implies type safety on
operational state.

**For PRISM RGS:** Atomic-roadmap-emit, pass-record, scrutiny-merge all
write JSON without schema validation. A field rename in any one of them
silently breaks downstream consumers. PRISM has zod schemas for engine
inputs but not for these inter-pipeline state files.

**First slice:** add `state/shared/schemas/roadmap-pass.schema.json`,
`subagent-scrutiny.schema.json`, `update-points-report.schema.json`
(JSON Schema draft 2020-12). Each emitter validates before
`writeJSONAtomic()` and refuses to write on validation fail. CI hook
re-validates all emitted files on PR.

**Why it earns its keep:** Today an emit-shape change is detected only
when a consumer crashes. Validation moves the failure to write-time,
where a single chat fixes it; without it, every consumer chat pays the
debugging tax in parallel.

---

## 6. Narrow job-spec subagents (Teamly job-spec rigor)

**Source:** https://x.com/zodchiii/status/2052368125480354000
**Pattern:** Each Teamly agent has a tight job spec. Vague agents
produce vague output.

**For PRISM RGS:** S2.6 today uses three generic
`subagent_type`s (`code-analyzer`, `reviewer`, `general-purpose`) with
ad-hoc prompts. A library of named, narrow subagent specs would lift
verdict quality:
- `roadmap-conflict-auditor` — only checks per-domain conflict, owns
  exact format for `predicted-collisions.json` patches
- `lane-slice-scrutineer` — only verifies a chat's lane slice against
  `lanes_locked` and emits confidence
- `tribal-precedent-classifier` — only classifies units against
  tribal-density tiers (cheap/escalate/blanket)
- `pillar-telemetry-rotter` — only checks `feedback_pillar_telemetry_rot`
  against MILESTONE_PROGRESS

Each spec gets its own markdown file with strict input/output schema and
a single-sentence success criterion.

**First slice:** create `H:/.claude/agents/roadmap-conflict-auditor.md`
with input schema `{ domain_category, dispatcher_paths }`, output schema
`{ conflicts: Conflict[], confidence: number, rationale: string }`, and
wire S2.6.A to use it instead of generic `code-analyzer`.

**Why it earns its keep:** Today S2.6 subagents return inconsistent
shapes — some include confidence, some don't; some include rationale,
some return raw text. Narrow specs make merge-time deterministic and
unlock cost-tier downgrades (most of these can run on haiku, not opus).

---

## Backlog discipline

- Order is **not** priority. The order tracks the original synthesis
  pass; rank by leverage at planning time, not insertion time.
- Each item has a "first slice" so it can land independently. No item
  should require all others to have shipped first.
- Reference these in commits as `[BACKLOG-RGS-FUTURE-IDEAS#N]` so search
  finds the lineage. Append `(SHIPPED <sha>)` next to an item's heading
  when its first slice merges.
- If an item gets rejected after deeper analysis, do **not** delete it
  — append `**Rejected:** <reason>` so future chats don't re-propose.
