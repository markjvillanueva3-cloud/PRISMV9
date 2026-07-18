---
name: feedback-svi-psi
description: SVI ≡ System Viability Index (overall PRISM quality scalar) + Ψ ≡ delta-per-hour ranking signal. Auto-injected at SessionStart via `state/shared/SVI-compact.md`. SVIRankedBacklogEngine (wired `prism_dev:svi_ranked_backlog`) ranks backlog units by Ψ-delta/hour. SVI < threshold blocks releases; Ψ-delta surfaces highest-leverage work.
aliases: [SVI, Psi-delta, system-viability-index, Psi-ranking, SVI-Psi, SVIRankedBacklog]
metadata:
  type: feedback
---

# SVI / Ψ — system viability & per-hour leverage scoring

**SVI ≡ System Viability Index** — a 0..1 scalar summarizing PRISM's overall quality across health checks (tests passing, dispatcher coverage, schema drift, hook fire-rate, orphan inventory, etc.). **Ψ (psi) ≡ delta-per-hour ranking signal** — for each backlog unit, the *expected SVI delta per hour of work*. Same orphan-pattern fix as PSN: doctrine concept named in every `/handoff` template + every SessionStart inject + every audit, but no dedicated memory entry.

## Where SVI / Ψ surface

| Surface | Path | Mechanism |
|---|---|---|
| SessionStart inject | `state/shared/SVI-compact.md` | `awareness-snapshot-inject.mjs` reads and pipes into the SessionStart additionalContext |
| Handoff template | every `/handoff` body includes `SVI: <value> \| Ψ: <pct> \| Trend: <stable\|growing\|shrinking>` | `per-agent-handoff.mjs` body template |
| Dispatcher action | `prism_dev:svi_ranked_backlog` | wired in U-WIRE03 ([[reference_wire_unwired_ms0_u_wire01_2026_05_16]]) |
| Engine | `SVIRankedBacklogEngine.ts` | the ranker; consumes backlog + emits Ψ-delta sorted list |
| Projection | `svi-projection` (L10 graph node) | forecasts SVI under candidate work orderings |
| Backlog watch | `svi-watch-refresh` | scheduled refresh of the ranked backlog |
| Audit | `prism_dev:svi_compute` / `svi_read` / `svi_summary` | computation surface |
| Wiki | `knowledge/wiki/architecture/svi*.md` | architecture notes |

## What goes into SVI

The SVI is a weighted composite — exact weights live in `SVIRankedBacklogEngine.ts`, do not hardcode. Approximate signal mix (read the engine for canonical):

- Build state (tests passing / build green / type-check clean)
- Dispatcher coverage (wired / total engines)
- Schema drift (envelope `status` vs git-reality from MILESTONE_PROGRESS)
- Hook fire-rate (zero-fire ratio across the hook fleet)
- Orphan inventory (unwired engines, untested engines, ghost roosts)
- Documentation coverage (memos per AI engine, wiki↔memory link integrity)
- Token economy (offload ratio, context-window pressure)

A low SVI doesn't mean PRISM is broken — it means the **measurable health surface** has degraded since the last snapshot. A high SVI doesn't mean perfect, but it means no regression on a tracked axis.

## What goes into Ψ (psi)

Ψ for a backlog unit ≈ `Δ(SVI) / hour-of-work`. The `SVIRankedBacklogEngine` estimates:

- Effort hours (from `roadmap-tool-plan.json` + historical close-out cadence)
- Expected SVI lift (which signals improve when this unit closes — e.g. wiring an unwired engine lifts dispatcher-coverage; adding tests lifts build-state)
- Coupling penalty (units that overlap with peer-claimed work get Ψ-discounted)

**Highest-Ψ unit is the one to pick next** — not the highest-priority by milestone order, not the alphabetically-first, not whatever's claimed by your slot. Ψ is the operator's "where do I get the most leverage per hour?" oracle.

## Why this memory exists

SVI and Ψ are referenced in:
- Every handoff body template (one line)
- SessionStart inject (`SVI-compact.md`)
- `/handoff read` output
- The `/pick-unit` flow ("pick by Ψ-delta")
- ROADMAP-CONSOLIDATED ranking
- Goal-synergy-status dashboards

…but had no canonical *definition* memory. Operators were left to infer meaning from context. Same orphan-pattern fix as [[feedback_psn_definition]] / [[feedback_psk_kernel]] / [[feedback_obsidian_brain]] / [[feedback_prism_os]].

## Standing rule

- **Always check Ψ before picking a unit.** `prism_dev:svi_ranked_backlog` → take the highest-Ψ unit that's not peer-claimed.
- **Treat SVI trend, not absolute value, as load-bearing.** A single SVI snapshot is noisy; a trend (3-snapshot moving direction) carries the signal.
- **A unit that drops SVI should be rejected (or its scope reduced) at the per-file scrutiny gate** ([[feedback_parallel_scrutiny_per_file]]) — committing degrading work is the failure mode SVI exists to surface.
- **R12 fail-loud** ([[feedback_r5_thru_r12_doctrine]]) applies: if your work passed local tests but SVI dropped, *say so* in the close-out — don't silently ship a regression.

## Operator one-liner

```bash
node -e "const r=require('H:/prism/mcp-server/dist/engines/SVIRankedBacklogEngine.js').rankBacklog({}); console.log(r.ranked.slice(0,5))"
```

## Cross-refs

- [[reference_wire_unwired_ms0_u_wire01_2026_05_16]] — SVIRankedBacklogEngine wired in U-WIRE03
- [[feedback_psn_definition]] — SVI is one of the cross-leg signals (the quality scalar)
- [[feedback_roadmap_close_out]] — the 4-surface close-out includes SVI/Ψ refresh
- [[feedback_r5_thru_r12_doctrine]] — R12 fail-loud applies to silent SVI regressions
- [[reference_awareness_readiness_2026_05_19]] — AWARENESS-READINESS surfaces SVI-adjacent ready-to-use signals
