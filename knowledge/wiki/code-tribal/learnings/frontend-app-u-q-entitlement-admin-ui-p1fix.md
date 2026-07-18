# FRONTEND-APP/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX — [MAIN-FORCE] [FRONTEND-APP]/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX (slot:quebec): Q6 scrutiny arm-C P1 fixes -- merge server override map instead of destructive refetch (useGetCall nulls data on entry, so a refetch tore the grid down + a failed refetch wiped a successful mutation); serialize toggles (shared AbortController aborted an in-flight write on a 2nd click = silent lost-update); + nested backend error-shape extractor + a11y aria-pressed/aria-label + 3 RTL component tests + nested-error api fixture (11/11 green, tsc clean)

**Commit:** `95ac8443c049` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:29:26-05:00
**Tags:** frontend-app, u-q-entitlement-admin-ui-p1fix, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX (slot:quebec): Q6 scrutiny arm-C P1 fixes -- merge server override map instead of destructive refetch (useGetCall nulls data on entry, so a refetch tore the grid down + a failed refetch wiped a successful mutation); serialize toggles (shared AbortController aborted an in-flight write on a 2nd click = silent lost-update); + nested backend error-shape extractor + a11y aria-pressed/aria-label + 3 RTL component tests + nested-error api fixture (11/11 green, tsc clean)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-ENTITLEMENT-ADMIN-UI-P1FIX (slot:quebec): Q6 scrutiny arm-C P1 fixes -- merge server override map instead of destructive refetch (useGetCall nulls data on entry, so a refetch tore the grid down + a failed refetch wiped a successful mutation); serialize toggles (shared AbortController aborted an in-flight write on a 2nd click = silent lost-update); + nested backend error-shape extractor + a11y aria-pressed/aria-label + 3 RTL component tests + nested-error api fixture (11/11 green, tsc clean)
```

## Files touched (5)
- mcp-server/src/__tests__/FCFSyntaxValidatorEngine.test.ts | 24 ++++++++++++++++++++++++
- mcp-server/src/engines/FCFSyntaxValidatorEngine.ts        | 15 +++++++++++----
- mcp-server/src/utils/__tests__/gdtFcfValidate.test.ts     | 12 ++++++++++++
- scripts/lib/ollama-vision-extract-lib.mjs                 | 13 ++++++-------
- 4 files changed, 53 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 95ac8443c049`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._