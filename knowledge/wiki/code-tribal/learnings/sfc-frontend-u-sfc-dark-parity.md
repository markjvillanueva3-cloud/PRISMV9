# SFC-FRONTEND/U-SFC-DARK-PARITY — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-DARK-PARITY (slot:oscar): render SFC result tiles + safety rows + advisory banner dark on the always-dark surface

**Commit:** `e697a8284064` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:38:56-05:00
**Tags:** sfc-frontend, u-sfc-dark-parity, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-DARK-PARITY (slot:oscar): render SFC result tiles + safety rows + advisory banner dark on the always-dark surface

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-DARK-PARITY (slot:oscar): render SFC result tiles + safety rows + advisory banner dark on the always-dark surface

The web app is ALWAYS dark: Layout.tsx:827 applies .prism-dark unconditionally (body gradient #0a1520->#0f1c28, text #e2e8f0); main.tsx forces data-theme='ios'. The forced-dark rendering is delivered by the .prism-dark !important override layer in index.css, NOT Tailwind dark: variants (darkMode is unset = OS 'media', so dark: is OS-gated/supplementary). That layer neutralized bg-{white,slate,gray,emerald-50,amber-50,rose-50,sky-50,cyan-50,violet-50} but MISSED bg-{blue-50,green-50,purple-50,red-50} -- exactly the SFC result tiles (RPM/Feed/Vc), safety pass/fail rows, the MOPSO Pareto recommended row, and the UncertaintyAdvisoryBanner panels -- so they rendered as bright light pastels on the dark surface for every user.

Keystone fix: extend the .prism-dark neutralize-bg group to cover blue-50/green-50/purple-50/red-50 (fleet-wide, R15 -- benefits every page using those pastels). Plus dark-canonical parity on SpeedFeedPage (result tiles, safety tab with stronger FAIL emphasis via ring+bold, playbook, uncertainty panels, inputs/sections) and UncertaintyAdvisoryBanner (panel + list text) via dark: variants for the OS-dark path. +2 intent tests (every advisory level carries a dark:bg variant; fails iff the dark treatment is stripped). Verified: web vitest banner 7/7 + deriveAdvisory 14/14; tsc --noEmit clean; per-file 2-arm scrutiny PASS. Note: failed-safety prominence was ALREADY delivered by UncertaintyAdvisoryBanner+deriveAdvisory (critical level) and SfcCalculatorPage safety already surfaced via ResultsDisplay -- this unit closes the remaining dark-color gap. oscar owns SFC frontend (operator 2026-06-22).
```

## Files touched (5)
- mcp-server/web/src/__tests__/UncertaintyAdvisoryBanner.test.tsx | 24 ++++++++++++++++
- mcp-server/web/src/components/sfc/UncertaintyAdvisoryBanner.tsx | 20 ++++++-------
- mcp-server/web/src/index.css                                    |  6 +++-
- mcp-server/web/src/pages/SpeedFeedPage.tsx                      | 76 ++++++++++++++++++++++++++++---------------------
- 4 files changed, 82 insertions(+), 44 deletions(-)

## Lessons surfaced in commit body
- tiles + safety rows + advisory banner dark on the always-dark surface
- tiles (RPM/Feed/Vc), safety pass/fail rows, the MOPSO Pareto recommended row, and the UncertaintyAdvisoryBanner panels -- so they rendered as bright light pastels on the dark surface for every user.
- tiles, safety tab with stronger FAIL emphasis via ring+bold, playbook, uncertainty panels, inputs/sections) and UncertaintyAdvisoryBanner (panel + list text) via dark: variants for the OS-dark path. +2 intent tests (every advisory level carries a dark:bg variant; fails iff the dark treatment is stripped). Verified: web vitest banner 7/7 + deriveAdvisory 14/14; tsc --noEmit clean; per-file 2-arm scrut
- Note: failed-safety prominence was ALREADY delivered by UncertaintyAdvisoryBanner+deriveAdvisory (critical level) and SfcCalculatorPage safety already surfaced via ResultsDisplay -- this unit closes the remaining dark-color gap. oscar owns SFC frontend (operator 2026-06-22).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e697a8284064`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._