---
title: High-Value Additions Audit (2026-05-14)
kind: audit
status: shipped
date: 2026-05-14
author: claude-a2b1b5ca (alpha slot, /forge-audit-v2)
session: claude-a2b1b5ca
peer_reviewer: a8299dd3b088946a6
meta_artifact: scripts/high-value-additions-rank.mjs
baseline_json: state/shared/HIGH-VALUE-ADDITIONS-BASELINE-2026-05-14.json
spec_md: state/shared/specs/HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.md
spec_html: state/shared/specs/HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.html
loop_rerun_target: 2026-05-22T09:47Z (session-only cron 2b48d15e — operator must persist)
---

# High-Value Additions Audit — 2026-05-14

Audit run via `/forge-audit-v2` (Boris-doctrine edition) on the PRISM hook + script + dispatcher + pipeline + orchestration + OS-functionality surface. Cross-references `/system-viz` graph, Obsidian wiki, tribal knowledge, CLAUDE.md, and PRISM self-awareness.

## Headline (baseline-locked, post-review)

| Axis | Baseline | Threshold | Verdict |
|---|---:|---|---|
| Hook orphan rate (bundle-aware) | 65.9 % (311/472) | ≤ 30 % | FAIL |
| Dispatcher digest parser | BROKEN (4 mis-counted) | OK | FAIL |
| Engines NEEDS_WIRING (headline) | 870 (≥50 % false-positive on sample) | ≤ 200 | needs signal-validate first |
| Script cadence rate | 13.5 % (10/74) | ≥ 50 % | FAIL |
| Worktree drift | 27.1 % (13/48) | ≤ 10 % | FAIL |
| Coordination ghost rate | 32.4 % (127/392) | ≤ 15 % | FAIL |
| Spec HTML companion rate | 94.4 % (34/36) | — | PASS |

Re-measure baseline at any time: `node scripts/high-value-additions-rank.mjs --json`.

## Findings (10 total, leverage-ranked)

| # | ID | Severity | Leverage | Action |
|---|---|---|---|---|
| F1 | Hook orphanage (bundle-corrected) | P0 | 65.9 | `hook-orphan-wire-proposer.mjs` |
| F2 | DISPATCHER_DIGEST parser broken | P0 | 600+ hidden actions | fix regen parser + unified census |
| F3 | NEEDS_WIRING signal validation | P1 | signal trust | `validate-unwired-signal.mjs` |
| F4 | Script cadence gap | P1 | 86.5 | `cadence-orchestrator.mjs` |
| F5 | Worktree drift | P1 | 27.1 | `worktree-drain.mjs` |
| F6 | Coordination ghosts | P1 | 32.4 | `prism_session:fleet_health` action + sweeper |
| F7 | `auto_rescue_orphan` composite | P0 | doctrine | 5-step orchestration |
| F8 | Hook latency capture loop | P0 | direct | PostToolUse capture + rollup + digest |
| F9 | Parallel-5 worktree bootstrap | P1 | ergonomics | `parallel-5-bootstrap.mjs` |
| F10 | PermissionRequest Opus router | P2 | ergonomics × runs | `permission-classifier.mjs` |

## Peer-review history

- **Iter 1** (`a8299dd3b088946a6`, isolation:worktree) — FAIL on F1/F2/F3 (with F8 dependency rot-on). Reviewer evidence:
  - F1 overstated by 12.7 pp (bundle-blind walker)
  - F2 false (digest parser broken; the 4 cited dispatchers actually have 428/27/121/130 cases)
  - F3 ≥50 % false-positive (5 of 10 named "orphan" engines verified-wired)
  - F11 new finding (digest parser root cause) absorbed into F2
- **Iter 2** — META artifact rewritten (bundle expansion + direct case-count + broadened cadence partners). Audit findings rewritten per reviewer mandate. Baseline JSON regenerated.

## Files produced

- `scripts/high-value-additions-rank.mjs` (NEW META artifact, 280 LOC, v2 with bundle expansion + direct case-count)
- `state/shared/HIGH-VALUE-ADDITIONS-BASELINE-2026-05-14.json` (locked baseline, 7.8 KB)
- `state/shared/specs/HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.md` (~620 lines, peer-corrected)
- `state/shared/specs/HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.html` (Thariq companion, color-coded, SVG dep-graph)
- `state/shared/handoffs/HANDOFF-claude-a2b1b5ca-alpha-hva-audit-2026.md`
- `H:/prism/CLAUDE.md ## Recent regressions` — 3 entries appended (digest parser bug, NEEDS_WIRING signal bug, hook-orphan bundle blindness)
- `knowledge/wiki/architecture/high-value-additions-audit-2026-05-14.md` (this file)
- Chat-bus broadcast `chat-1778815147633`

## Recommended next units (in dependency order)

1. **U-HVA-DIGEST-PARSER-FIX** (S) — fix `scripts/generate-dispatcher-wiki.mjs` for spread-array enums; unblocks every downstream dispatcher audit.
2. **U-HVA-UNWIRED-SIGNAL-VALIDATE** (S) — `scripts/validate-unwired-signal.mjs`; gates future wiring milestones.
3. **U-HVA-HOOK-PROPOSER** (M) — `scripts/hook-orphan-wire-proposer.mjs` with bundle-child awareness.
4. **U-HVA-HOOK-LATENCY-LOOP** (M) — close the capture→rollup→digest loop on hook latency.
5. **U-HVA-CADENCE-ORCHESTRATOR** (M) — registry-driven re-fire for 74 generate scripts.
6. **U-HVA-AUTO-RESCUE-ORPHAN** (M) — `prism_orchestrate:auto_rescue_orphan` composite.
7. **U-HVA-FLEET-HEALTH-ACTION** (S) — `prism_session:fleet_health` aggregate.
8. **U-HVA-WIKI-INGEST-WIRE** (XS) — wire `WikiIngestRouterEngine` (only verified-orphan from sample).
9. **U-HVA-WORKTREE-DRAIN** (L) — slot-canonical pivot Phase 2.
10. **U-HVA-PARALLEL-5-BOOTSTRAP** (S) — `parallel-5-bootstrap.mjs` + skill.
11. **U-HVA-PERMISSION-ROUTER** (S) — PermissionRequest Opus classifier.

## Related memories / docs

- [[reference_skill_tier_wire_pattern]] — 5-file recipe applied to all wire-* units.
- [[reference_u_aimax10_ship]] — schema-merge spread pattern, foundational for F2's digest fix.
- [[reference_harness_hang_prevention]] — fork-storm history that F8 (hook-latency loop) prevents.
- [[reference_fleet_reaper_ms1]] — coord ghost detection at OS-process layer; F6 extends to chat-bus layer.
- [[reference_master_index_surface]] — search-first discipline; F2 fix restores its dispatcher-coverage signal.
- [[feedback_roadmap_close_out]] — close-out enforced for audit-output (CLAUDE.md + handoff + chat-bus + wiki = 4 surfaces touched).
- `H:/prism/state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` — patterns ported into this audit.

## Schedule

Audit self-schedules a 7-day re-fire (one-shot cron `2b48d15e` for 2026-05-22T09:47 local). Cron is session-only — operator should register a persistent Windows Scheduled Task or external cron to ensure true periodic re-fire. Max 4 re-runs (~28 days) per `/forge-audit-v2` doctrine.
