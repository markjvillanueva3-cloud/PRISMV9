# FRONTEND-APP/U-Q-REBRAND — [MAIN-FORCE] [FRONTEND-APP]/U-Q-REBRAND (slot:quebec): rebrand customer-facing surfaces PRISM -> Kienzle Academy (operator decision 2026-06-25)

**Commit:** `a0d2fa2b3a5d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:09:46-05:00
**Tags:** frontend-app, u-q-rebrand, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-REBRAND (slot:quebec): rebrand customer-facing surfaces PRISM -> Kienzle Academy (operator decision 2026-06-25)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-REBRAND (slot:quebec): rebrand customer-facing surfaces PRISM -> Kienzle Academy (operator decision 2026-06-25)

Sandvik owns the PRISM trademark; operator chose 'Kienzle Academy' as the customer-facing
brand (already the in-flight direction: index.html title + manifest + capacitor appName were
already 'Kienzle'). Made every customer-VISIBLE surface consistent; LEFT internal identifiers
(operator directive: keep appId).

Renamed -> 'Kienzle Academy':
- package.json: productName, shortcutName, author, description, artifactName (KienzleAcademy-*)
- 4 PWA/app icons: wordmark PRISM -> KIENZLE (512 keeps its ACADEMY line) + aria-labels; sizes
  verified to fit each viewBox (192/512/180/maskable)
- dev-seed-apprentice.html: title + h1 + PWA-install + redirect copy
- sw.js identity comment
- electron-dist.mjs: exe gate PRISM.exe -> 'Kienzle Academy.exe' (productName-derived) + var
  PRISM_EXE->APP_EXE + zip log; appShell.test.ts toContain pin updated in the SAME change (R9/R15)

LEFT intentionally (internal, not customer-visible): appId tools.prism.app (operator), npm pkg
name prism-dashboard, sw cache keys prism-academy-*, dev-seed localStorage prism-auth-token,
the PRISMJOB QR scan-protocol token (renaming breaks existing scan codes + parser), code comments.

Verified: no residual brand-PRISM in customer-visible surfaces; web tsc GREEN; appShell 21/21;
vite build GREEN (14.77s, exit 0). NOTE: icon wordmarks are interim KIENZLE text -- Claude Design
may supply a custom glyph/logo.
```

## Files touched (10)
- mcp-server/web/package.json                    | 10 +++++-----
- mcp-server/web/public/apple-touch-icon.svg     |  4 ++--
- mcp-server/web/public/dev-seed-apprentice.html |  8 ++++----
- mcp-server/web/public/icon-192.svg             |  4 ++--
- mcp-server/web/public/icon-512.svg             |  4 ++--
- mcp-server/web/public/icon-maskable-512.svg    |  2 +-
- mcp-server/web/public/sw.js                    |  2 +-
- mcp-server/web/scripts/electron-dist.mjs       | 26 +++++++++++++-------------
- mcp-server/web/src/__tests__/appShell.test.ts  |  4 ++--
- 9 files changed, 32 insertions(+), 32 deletions(-)

## Lessons surfaced in commit body
- NOTE: icon wordmarks are interim KIENZLE text -- Claude Design

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a0d2fa2b3a5d`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._