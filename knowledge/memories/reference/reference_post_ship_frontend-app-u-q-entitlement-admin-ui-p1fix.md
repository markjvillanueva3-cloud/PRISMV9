---
name: reference_post_ship_frontend-app-u-q-entitlement-admin-ui-p1fix
description: Auto-distilled learnings from shipping FRONTEND-APP/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX (commit 95ac8443c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.866Z
aliases: reference_post_ship_frontend-app-u-q-entitlement-admin-ui-p1fix
---


# FRONTEND-APP/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX

[MAIN-FORCE] [FRONTEND-APP]/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX (slot:quebec): Q6 scrutiny arm-C P1 fixes -- merge server override map instead of destructive refetch (useGetCall nulls data on entry, so a refetch tore the grid down + a failed refetch wiped a successful mutation); serialize toggles (shared AbortController aborted an in-flight write on a 2nd click = silent lost-update); + nested backend error-shape extractor + a11y aria-pressed/aria-label + 3 RTL component tests + nested-error api fixture (11/11 green, tsc clean)

**Shipped:** 2026-06-21T21:29:26-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[frontend-app-u-q-entitlement-admin-ui-p1fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._