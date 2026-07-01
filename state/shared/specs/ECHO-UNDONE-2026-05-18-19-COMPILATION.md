---
title: ECHO-UNDONE-2026-05-18-19 — compilation of echo work outstanding from 5/18-5/19
type: audit
unit: U-ECHO-UNDONE-SURVEY
milestone: SYNERGY-AUDIT-CONTINUE
created: 2026-05-20
owner: echo (claude-4278393c)
status: advisory · mustHumanVerify · supersedable
---

# ECHO-UNDONE-2026-05-18 → 2026-05-19 — survey

Satisfies clause (1) of the standing /goal "compile all tasks from 5/18-5/19 that are still undone for echo". Built from `state/shared/handoffs/` echo-slot files. Cross-referenced against shipped commits 5/20-and-earlier.

## Sources

- 11 echo handoffs touching 5/18-5/20 (newest first):
  - `HANDOFF-claude-4278393c-echo-{cad-fusion-live,command-kernel-,zebra-orchestra}.md` (2026-05-20, THIS chat lineage)
  - `HANDOFF-Agent@...-echo-work.md` (2026-05-20)
  - `HANDOFF-claude-00a9c6dc-echo.md` · `HANDOFF-claude-5a2d6313-echo-wire-unwired-ms.md` · `HANDOFF-claude-d7f91ed3-echo-cad-fusion-live.md` · `HANDOFF-claude-ddda9e7c-echo-slot-compact-sy.md` (all 2026-05-19)
  - `HANDOFF-claude-689b3203-echo-ollama-expand-m.md` · `HANDOFF-claude-6ba685f8-echo-ollama-expand-m.md` · `HANDOFF-claude-fbf28cc9-echo-high-roi-hooks-.md` (all 2026-05-18)
- Audit doc: `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md` — Track H + Track I lists.

## Shipped on or after 5/20 (CLOSED out of this survey)

| Unit | Commit | Status |
|---|---|---|
| **H7 U-MEMORY-INDEX-SEARCH** | `2389e3365b` (mis-attributed to mike; echo built) | wired live 5/20 by sidecar |
| **H7-followup U-MEMORY-INDEX-SIDECAR** | `cab89da0a6` (this session) | shipped + wired live |
| **H8 U-STOP-HOOK-AGGREGATOR** | files in `30b7d45f1d` (mis-attributed to hotel; echo built) | shipped, hook wired |
| **U-PRECOMMIT-PATHSPEC-ONLY** | per [[reference_u_precommit_pathspec_only_closeout_2026_05_20]] | shipped 5/20 (installer + close-out) |

## Still undone — Track H synergy edges (echo / multi-slot)

Pulled from `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md` §5 Track H. Each is a synergy edge that closes one of the 60 ✗ cells in the synergy matrix.

| # | Unit | Why high-ROI |
|---|---|---|
| H1 | **U-TRIBAL-TO-WIKI-PROMOTE** | Auto-promote validated tribal tips → `knowledge/wiki/code-tribal/`. Compounding: every tribal-knowledge-extract run feeds the wiki without manual curation. |
| H2 | **U-VIZ-TRIBAL-LAYER** | Add tribal tips as `L10.5` in system-viz. Operator can SEE the tribal corpus alongside code. |
| H3 | **U-VIZ-AGENT-LAYER** | Add `L12` agents from chat-bus. Closes the "Pixel Department" gap (which agents are live + what they own). |
| H4 | **U-NEURAL-FEEDBACK-LOOP** | NN training rounds emit lessons → memory entries. Each retrain auto-captures a verifiable signal. |
| H5 | **U-HANDOFF-VIZ-LAYER** | `L11` active handoffs in system-viz. See which slot owns which topic at a glance. |
| H6 | **U-HANDOFF-PRUNE-CRON** | Monthly archive of handoffs >30d. Counters handoff sprawl across 26 slots. |

## Track I forge5/6/7 phantom-tool fix — CORRECTION 2026-05-20

**The 2026-05-09 audit was wrong.** I1, I2, I3, I4 ALL EXIST on disk under `.claude/scripts/` (built 2026-05-09, mtime confirmed). The audit checked `scripts/` (repo-root) not `.claude/scripts/`. Live verification:

| # | Unit | Actual path | Size | Smoke-tested |
|---|---|---|---|---|
| I1 | U-VIZ-COMPLETENESS-CHECK | `.claude/scripts/system-viz-completeness-check.mjs` | 10538b | ✓ exists |
| I2 | U-VIZ-PROGRESS-UPDATE | `.claude/scripts/viz-progress-update.mjs` | 10183b | ✓ exists |
| I3 | U-AUTO-WIRE-PLAN | `.claude/scripts/auto-wire-plan.mjs` | 6045b | ✓ exists |
| I4 | U-COMPOUNDING-GAINS-AUDIT | `.claude/scripts/compounding-gains-audit.mjs` | 12879b | ✓ runs, exits BLOCK on HOOK-SYNERGY-MS0 (zero-artifact detection working) |

**R12 lesson** ([[feedback_verify_actual_contract_not_proxy.md]]): when an audit claims "missing on disk", verify the exact path before re-building. The audit's `scripts/<name>.mjs` literal blinded it to `.claude/scripts/<name>.mjs` where the tools actually live.

**Net effect on pickup queue**: I-track is **CLOSED** for new work. What remains is potentially:
- Smoke-tests across each tool (verify they actually classify correctly under realistic input)
- A `--all` mode that iterates every milestone in `roadmap-index.json` (currently advisory: `--milestone <id>` only)
- Wiring into `/forge5/6/7` skill pipelines if the skill bodies don't already shell out

These are P2/P3 polish, not new builds.

## Recommended pickup order (POST-CORRECTION 2026-05-20)

Since I-track is closed (all 4 tools exist on disk), the H-track is the next-largest leverage:

1. **H1 U-TRIBAL-TO-WIKI-PROMOTE** (compounding-gains exemplar: every tribal extract feeds wiki forever)
2. **H5 U-HANDOFF-VIZ-LAYER** (operator visibility win across 26-slot fleet)
3. **H3 U-VIZ-AGENT-LAYER** (sister to H5; both extend system-viz layers)
4. **H2 U-VIZ-TRIBAL-LAYER** (rounds out the viz-layer trio)
5. **H4 U-NEURAL-FEEDBACK-LOOP** (NN training → memory entries)
6. **H6 U-HANDOFF-PRUNE-CRON** (smaller; cron polish for handoff sprawl)
7. **I-track polish** (P2/P3): smoke-tests + `--all` modes for existing tools — NOT new builds

## Honest scope (R12)

- "Undone" is inferred from handoff RESUME directives that name pending work — a unit could be silently complete via a peer's commit (the misattribution class). Verify each pickup with `git log --grep="U-<id>"` before starting.
- The `Last work` line in each handoff names the **previous** commit, not the next-action target. Use the audit doc's pending list (above) as the canonical source of truth — handoffs are noisy.
- I-track tools are referenced as phantom by `/forge5/6/7` runbooks; replacing them does NOT change the skill bodies — those treat the tool's existence as a contract. Once shipped the skills become trustworthy without further edits.

## Cross-references

- Audit: `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md` §5 Track H + Track I
- Memory: [[reference_u_memory_index_sidecar_2026_05_20]] (most recent ROI ship) · [[reference_u_memory_index_search_2026_05_20]] · [[reference_u_stop_hook_aggregator_2026_05_20]] · [[reference_h8_misattribution_2026_05_20]]
- Skills: `/forge5.md`, `/forge6.md`, `/forge7.md`, `/rgs5.md`, `/rgs6.md` (all reference phantom I-track tools)
