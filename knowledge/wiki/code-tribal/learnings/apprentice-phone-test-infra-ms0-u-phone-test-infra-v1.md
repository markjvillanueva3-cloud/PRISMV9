# APPRENTICE-PHONE-TEST-INFRA-MS0/U-PHONE-TEST-INFRA-V1 — [MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-PHONE-TEST-INFRA-V1: 8-file infra so apprentice can install + test PRISM Academy PWA on phone TODAY.

**Commit:** `4ec78cc98750` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T14:11:39-05:00
**Tags:** apprentice-phone-test-infra-ms0, u-phone-test-infra-v1, auto-distilled

## Subject
[MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-PHONE-TEST-INFRA-V1: 8-file infra so apprentice can install + test PRISM Academy PWA on phone TODAY.

## Body
```
[MAIN] [APPRENTICE-PHONE-TEST-INFRA-MS0]/U-PHONE-TEST-INFRA-V1: 8-file infra so apprentice can install + test PRISM Academy PWA on phone TODAY.

Per /goal 2026-05-27: "lets build everything we need so we can start testing on phones".

Closes the install-on-phone gap identified in the readiness assessment. Author lima
session 92ef25c0; written to H:/prism (main tree) because PWA + deploy infra is
[MAIN]-level by nature (not slot-specific academy content).

Eight assets (744 lines):

1. mcp-server/web/public/dev-seed-apprentice.html
   - One-tap seed page writing canonical prism-auth-token payload to localStorage
   - Safe DOM API only (no innerHTML, per security-reminder gate)
   - Apprentice payload: { id:'dev-apprentice-1', role:'Apprentice Machinist',
     clearance_level:'shop_floor' } — matches AuthContext.AuthEmployee shape EXACTLY

2. mcp-server/web/scripts/phone-tunnel.ps1
   - Windows launcher: starts vite (PRISM_PHONE_DEV=1) + cloudflared tunnel
   - Returns public HTTPS URL the phone can install from
   - cloudflared binary lookup with hard fail if not on PATH

3. mcp-server/web/scripts/phone-tunnel.sh
   - POSIX companion (Linux/macOS) for the same flow

4. mcp-server/web/vite.config.ts (EDIT)
   - Conditional server.host '0.0.0.0' when PRISM_PHONE_DEV=1
   - strictPort to fail loud if 3100 is taken
   - Default behavior (localhost-only) preserved

5. mcp-server/web/vercel.json
   - Vercel deploy config with SPA rewrite + sw.js no-cache headers
   - manifest content-type override
   - 1-year cache on hashed /assets/* (immutable)

6. mcp-server/web/netlify.toml
   - Netlify equivalent (admin picks one; the other is a backup)

7. mcp-server/web/e2e/apprentice-smoke.spec.ts
   - 7 Playwright tests, every assertion is value/count/string-explicit
   - Tests: seed write, session restore, manifest content-type+icons,
     SW activated state, >=60 courses, corrupted-storage recovery,
     idle-timeout listener wired
   - Avoids toBeTruthy/toBeDefined (test-legitimacy gate)

8. state/shared/apprentice-phone-onboarding-2026-05-27.md
   - Print-and-hand-over checklist with Side A (apprentice, ~3min) +
     Side B (admin, ~5min)
   - One-time cloudflared install, per-session tunnel launch, Vercel
     fallback, replacing dev-seed with real ERP login when ready

Phone test recipe (admin laptop):
  pwsh mcp-server/web/scripts/phone-tunnel.ps1
  → copy *.trycloudflare.com URL to phone
  → phone: open URL, Add to Home Screen, then /dev-seed-apprentice.html
  → phone: tap "Seed apprentice", lands in Academy with all 60 courses

R12 honest-stop scope:
  ✓ PWA installable + service worker active + 60-course catalog reachable
  ✓ Dev login w/o ERP provision (cleanly removable once real ERP exists)
  ✓ Two deploy options (Vercel + Netlify) + ad-hoc tunnel option
  ✓ Regression gate via Playwright smoke
  ✗ Real ERP employee provisioning (separate unit — needs ERP integration)
  ✗ Offline-first course content sync (shell-cached only; lesson content needs follow-up)
  ✗ Push notifications (separate FCM/APNs config + SW push hooks)
  ✗ Camera/QR login (different MS0)

Wiring discipline (lima soul):
  - dev-seed payload citations every field against AuthContext.AuthEmployee
  - Playwright spec asserts AGAINST the canonical fields, not against itself
  - Onboarding doc cites: AuthContext.tsx EMP-MS0/U-AUTH1, manifest, sw.js
  - vercel.json + netlify.toml cite the canonical PWA cache-control patterns
    (sw.js no-cache, manifest 5-min, /assets/* immutable)

Next units the apprentice unblocks:
  - U-APPRENTICE-FIRST-LESSON (apprentice completes course-0a M1, you watch)
  - U-LESSON-OFFLINE-CACHE (cache course content in SW for shop-floor wifi gaps)
  - U-REAL-ERP-LOGIN (replace dev-seed with /api/v1/auth/login real flow)
```

## Files touched (9)
- mcp-server/web/e2e/apprentice-smoke.spec.ts        | 157 ++++++++++++++
- mcp-server/web/netlify.toml                        |  36 ++++
- mcp-server/web/public/dev-seed-apprentice.html     |  89 ++++++++
- mcp-server/web/scripts/phone-tunnel.ps1            |  56 +++++
- mcp-server/web/scripts/phone-tunnel.sh             |  43 ++++
- mcp-server/web/vercel.json                         |  34 +++
- mcp-server/web/vite.config.ts                      | 228 +++++++++++++++++++++
- .../apprentice-phone-onboarding-2026-05-27.md      | 101 +++++++++
- 8 files changed, 744 insertions(+)

## Lessons surfaced in commit body
- lesson content needs follow-up)
- LESSON (apprentice completes course-0a M1, you watch)
- LESSON-OFFLINE-CACHE (cache course content in SW for shop-floor wifi gaps)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ec78cc98750`
- Milestone envelope: `mcp-server/data/milestones/APPRENTICE-PHONE-TEST-INFRA-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._