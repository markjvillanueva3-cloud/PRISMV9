# REBRAND SURFACE -- customer-facing brand-string inventory (2026-06-25)

> slot:quebec. Operator 2026-06-25: "PRISM" is owned by Sandvik -> the customer-facing product is being
> renamed (Claude Design side). This is the EXACT mechanical rename surface in the web/electron/mobile
> app so the swap is instant once the operator provides the new name. Internal `prism_*` dispatchers /
> code / API type names are NOT renamed (informational rebrand, not a repo-wide sweep -- per
> [[feedback_frontend_ui_owned_by_desktop_claude_2026_06_25]]).

## INCONSISTENCY FOUND (surface to operator)
`mcp-server/web/index.html:15` already says `<title>Kienzle Academy</title>` -- NOT "PRISM". So a partial
rebrand may already be in flight (or it is a stale placeholder). It is inconsistent with
`package.json productName: "PRISM"`. The new name is an OPERATOR-ONLY decision (external brand +
trademark). If the intended brand IS "Kienzle Academy" (or "Kienzle ..."), confirm and I will align all
surfaces below to it.

## The rename surface (replace PRISM -> <NEW_NAME>; tools.prism.app -> <NEW_APP_ID>)
| # | file | line | current | what |
|---|---|---|---|---|
| 1 | `mcp-server/web/package.json` | 33 | `"productName": "PRISM"` | Electron app title / installer product name |
| 2 | `mcp-server/web/package.json` | 32 | `"appId": "tools.prism.app"` | Electron-builder app id (reverse-DNS) |
| 3 | `mcp-server/web/package.json` | 61 | `"shortcutName": "PRISM"` | NSIS Start-menu / desktop shortcut name |
| 4 | `mcp-server/web/package.json` | 7 | `"author": "PRISM"` | package author (cosmetic) |
| 5 | `mcp-server/web/capacitor.config.json` | 2 | `"appId": "tools.prism.app"` | iOS/Android bundle id (PLACEHOLDER per CAPACITOR.md) -- MUST become a real owned reverse-DNS before store submission |
| 6 | `mcp-server/web/index.html` | 15 | `<title>Kienzle Academy</title>` | browser tab / PWA title (already non-PRISM -- see inconsistency) |
| 7 | `mcp-server/web/public/apple-touch-icon.svg` | 17 | `>PRISM<` wordmark | iOS home-screen icon text |
| 8 | `mcp-server/web/public/icon-192.svg` | 33 | `>PRISM<` wordmark | PWA/Android icon text |
| 9 | `mcp-server/web/public/icon-512.svg` | 33 | `>PRISM<` wordmark | PWA/Android splash icon text |
| 10 | `mcp-server/web/public/dev-seed-apprentice.html` | 8 | `PRISM Academy -- JM Die Dev Seed` | dev-seed page title (internal, low priority) |

## Test impact (update WITH the rename, R9)
- `mcp-server/web/src/__tests__/appShell.test.ts:91,191` assert `appId === 'tools.prism.app'` and
  `productName` -- these MUST be updated to the new values in the SAME change (they pin the brand, so a
  rename without updating them fails the suite -- which is correct; they are the rename's regression guard).

## Lower priority (internal docs / comments -- not customer-facing)
`README.md:3` ("PRISM Manufacturing Intelligence Platform"), `src/api/{types,shopTypes}.ts:2` header
comments ("PRISM Dashboard API Types"), `CAPACITOR.md`. Rename opportunistically; not blocking.

## Mechanical procedure (once operator gives <NEW_NAME> + <NEW_APP_ID>)
1. Edit rows 1-10 above (visible brand only; the SVG wordmarks may also need a new glyph from Claude Design).
2. Update `appShell.test.ts` assertions to the new appId/productName.
3. `cd mcp-server/web && npx tsc --noEmit && npm run build` (must stay GREEN) + run appShell test.
4. Commit `[FRONTEND-APP]/U-Q-REBRAND`.
NOTE: do NOT touch `prism_*` dispatcher names, route paths (`/api/v1/...`), or internal identifiers --
those are not customer-facing and renaming them would break the whole backend contract.
