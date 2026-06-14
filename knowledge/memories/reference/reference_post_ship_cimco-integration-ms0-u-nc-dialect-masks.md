---
name: reference_post_ship_cimco-integration-ms0-u-nc-dialect-masks
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-NC-DIALECT-MASKS (commit d0e5df9e1). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.960Z
aliases: reference_post_ship_cimco-integration-ms0-u-nc-dialect-masks
---


# CIMCO-INTEGRATION-MS0/U-NC-DIALECT-MASKS

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-NC-DIALECT-MASKS (slot:echo): per-dialect volatileCommentMask profiles + golden round-trip classifier (scripts/lib/nc-dialect-masks.mjs). roundTrip(golden,candidate) → byte-identical | volatile-header-only (SAFE: same program, header churn) | semantic-drift (content differs). Masks derived from JM's OWN golden headers (not vendor manuals): Mastercam DATE/TIME/MCX-FILE/NC-FILE (Haas .nc + Okuma .MIN), PRISM source-path, Mitsubishi paren-date; Hurco .hnc has none. detectDialect heuristic + maskFor + union allMask. SAFETY: masks never alter semantic G-code (10/10 tests incl over-mask probes). Validated on real AGRATI 9007405.MIN: header-churn→safe, S800→S1200→semantic-drift@L10. Workflow-roadmap #2; the only offline-provable proof arm. Agents session-limited (8:40pm CT) → parallel extraction+scrutiny deferred; session 3-of-3 holds.

**Shipped:** 2026-06-02T20:44:41-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cimco-integration-ms0-u-nc-dialect-masks]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._