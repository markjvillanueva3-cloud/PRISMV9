---
name: reference-u-bridge-status-reconcile-misattribution-2026-05-19
description: "U-BRIDGE-STATUS-RECONCILE work (bridge-synergy evidence detector + ghost→built reconciliation) shipped in commit 961221fb62 — but mislabeled [BACKEND-DEV-LOOP]/U-WIRE-LATHE-CUTTING-CHEMISTRY due to shared-tree git-add race with peer chat. Work correct on disk; only banner wrong. Same class as 2026-05-18 cross-chat commit misattribution memories."
metadata:
  type: reference
---

# U-BRIDGE-STATUS-RECONCILE shipped — commit banner is wrong

**Verified:** 2026-05-19 echo, /goal synergy /loop iteration.

## What shipped

Commit `961221fb62` carries 4 files (970 LOC added):

- `scripts/lib/bridge-evidence-detector.mjs` (NEW, 309 LOC) — pure
  evidence detector for bridge-synergy status reconciliation. Exports:
  `scanFileForPatterns`, `verdictFromScan`, `detectorFor`,
  `detectBridgeStatus`, `detectAllBridgeStatuses`, `stripComments`,
  `tokenMatch`, `EVIDENCE_TABLE` (Object.freeze'd, 2 seeded entries),
  `MAX_SOURCE_BYTES`.
- `scripts/lib/bridge-evidence-detector.test.mjs` (NEW, 437 LOC) —
  49 cases including 14 regression guards for the 3 scrutiny P1 fixes
  and a real-data E2E against live aiReasoningDispatcher.ts.
- `scripts/generate-bridge-synergy-features.mjs` (MOD, 86 LOC delta) —
  detector integration with opts.statusByBridgeId / skipDetector /
  repoRoot / fsImpl.
- `scripts/generate-bridge-synergy-features.test.mjs` (EXT, 138 LOC
  delta) — 8 new detector-integration tests.

**65/65 tests pass** including:
- Real-data E2E: live `prism_ai:xproc_route_query` + `xproc_orchestrate_full`
  references in aiReasoningDispatcher.ts classify both AI-tier bridges
  (`U-BRIDGE-AI-TIER1-TIER2`, `U-BRIDGE-AI-TIER2-TIER3`) as `built`.
- Idempotency: two consecutive `generate()` calls with the real
  detector produce byte-identical results.

## What the commit banner says

`961221fb62 [MAIN] [BACKEND-DEV-LOOP]/U-WIRE-LATHE-CUTTING-CHEMISTRY: wire LatheCuttingChemistryEngine`

That banner describes peer-chat work on a lathe engine, NOT my
bridge-synergy reconciliation. The actual unit ID this commit carries
is `[ROADMAP-CONSOLIDATION]/U-BRIDGE-STATUS-RECONCILE`. Both the lathe
engine wiring AND the bridge-synergy reconciliation landed in this
single commit — same class as [[reference_cross_chat_commit_misattribution_2026_05_18]],
[[reference_iter2_html_adopt_misattribution_2026_05_18]],
[[reference_git_index_saturation_camx11_2026_05_18]].

## Root cause

Shared `H:/prism` main tree (slot:bravo claimed but not migrated to a
slot worktree per the U-SLOT-WORKTREE-MS0 doctrine). Two chats called
`git add` + `git commit` within the same lock window; one commit
absorbed both chats' staged files; the FIRST chat's banner won.

## Decision

**Do NOT rewrite history** — `961221fb62` is on the working branch and
may already be in cron/peer state. Per the recurring-regression doctrine,
manual cross-banner mapping is the canonical remediation:

| Banner | Actual content (this work) |
|--------|---------------------------|
| `961221fb62` `[BACKEND-DEV-LOOP]/U-WIRE-LATHE-CUTTING-CHEMISTRY` | ALSO carries `[ROADMAP-CONSOLIDATION]/U-BRIDGE-STATUS-RECONCILE` |

Future commit-message audits that depend on `[SCOPE]/U-ID` discovery
should consult this memory + the file list.

## What U-BRIDGE-STATUS-RECONCILE accomplished

1. Eliminated the doctrine-drift class where the bridge-synergy roost
   showed `status: ghost` for already-shipped bridges. The next
   `regen-viz` run that picks up this generator will flip 2 of 42
   bridges from ghost → built (the AI-tier ones).
2. Established an extensible pattern (`EVIDENCE_TABLE`) so future
   bridges (SFC→CAM, Master Post→CAM, etc.) can wire their own
   one-line detector entries.
3. Closed the per-file scrutiny P1 class: substring matches no
   longer false-positive on deprecation comments, identifier-prefix
   leaks, or unfrozen-table mutation.

## Per-file scrutiny outcome

4 reviewer agents dispatched (2 per code file). Arm A: PASS. Arm B
(detector lib independent): **FAIL** — caught 3 P1s:
- Substring-in-comment false-positive (R12 violation, ghost→built leak)
- Token-boundary leak (`legacy_xproc_route_query` matches)
- `EVIDENCE_TABLE` not Object.freeze'd

All 3 fixed in-session + 14 regression guards added. Arm C: PASS-with-P1
(docstring contradiction) — fixed. Arm D: PASS-with-P2 (per-file cache
opportunity) — deferred.

## Related memory

- [[reference_3tier_ai_xproc_actual_2026_05_19]] — the source finding
  that triggered this unit (AI-tier bridges already shipped via XPROC)
- [[reference_cross_chat_commit_misattribution_2026_05_18]] — sister
  misattribution class
- [[feedback_reflect_all_changes_post_update]] — 4-surface doc
  reflection rule (this memory + Obsidian = surface 4)
