# Apprentice Phone Onboarding — Print-and-Hand-Over Checklist

**Authored:** 2026-05-27 slot:lima · companion to U-PHONE-TEST-INFRA commit (this session)
**Audience (Side A):** The apprentice — what they tap on their phone
**Audience (Side B):** The admin (you) — what to do on the laptop first

---

## SIDE A — Apprentice ( ~3 minutes)

### What you need
- An iPhone or Android phone on the same Wi-Fi as the laptop running PRISM (OR an internet connection if the admin gave you a public URL)
- The URL printed at the top of the laptop's tunnel window (looks like `https://<random>.trycloudflare.com`) OR the URL the admin gave you (e.g. `https://prism-academy.vercel.app`)

### Steps
1. **Open the URL** on your phone's browser (Safari on iPhone, Chrome on Android).
2. **Add to Home Screen** (one-time install):
   - **iPhone:** Tap the share button (square with up-arrow), scroll down, tap "Add to Home Screen", then "Add".
   - **Android:** Tap the menu (three dots), tap "Install app" (or "Add to Home screen").
3. **Open "PRISM Academy"** from your home screen (looks like an app icon now).
4. **Visit the dev-seed page once** to sign in as the demo apprentice:
   - In the app, tap the address bar (or open Safari/Chrome again) and go to `<same-url>/dev-seed-apprentice.html`.
   - Tap **"Seed apprentice + go to Academy"**.
   - You're in.
5. **Start a course** — anything in the catalog. Course-0a is the recommended first one.

### Behavior you should see
- Browsing 60+ courses, including JM-fleet (LTH-01..07, VMC-01..05, EDM-01..02), tooling encyclopedias, chip-control mastery, lean/sigma/kaizen.
- After 15 minutes of no activity the app logs you out (re-seed via the dev-seed page).

### If something is wrong
- **"Add to Home Screen" not showing:** the URL must be HTTPS. If it's `http://` ask the admin for the cloudflared HTTPS URL.
- **Catalog is empty:** check that you visited the dev-seed page AFTER opening the home-screen app icon (some browsers isolate the in-app storage from the website storage).
- **Course page is blank:** tap the home screen icon to fully reload — the service worker will fetch fresh content.

---

## SIDE B — Admin (you, ~5 minutes)

### One-time prep
1. Install **cloudflared** on the laptop (one binary, no admin needed):
   - Download: https://github.com/cloudflare/cloudflared/releases (`cloudflared-windows-amd64.exe` for Windows)
   - Rename to `cloudflared.exe`, drop into `H:/Tools/cloudflared/`, add that dir to your PATH (or call by full path).
2. Verify: open a fresh PowerShell window and run `cloudflared --version` — should print a version, not "command not found".
3. (Optional) Install **Vercel CLI** if you want a permanent public URL: `npm i -g vercel`, then `cd mcp-server/web && vercel`.

### Each test session
1. From PRISM root: `pwsh mcp-server/web/scripts/phone-tunnel.ps1`
   - This opens two PowerShell windows: vite dev server + cloudflared tunnel.
   - Wait until the tunnel window prints a line like `Your quick Tunnel has been created! Visit it at: https://abc-xyz.trycloudflare.com`.
2. Hand the apprentice the printed URL (text them, AirDrop, write on a sticky note — whatever).
3. Walk through SIDE A with them once. After that, they can re-launch from their home screen without the dev-seed step (until the 15-min idle timeout, which re-seeds).

### Permanent public URL (skip cloudflared per-session)
- `cd mcp-server/web && vercel --prod` — deploys to `https://prism-academy-<your-team>.vercel.app`.
- Alternative: Netlify (`netlify deploy --prod --dir=../dist/web`).
- Both configs are committed at `mcp-server/web/{vercel.json, netlify.toml}` — pick one.

### What this seed gives the apprentice
```json
{
  "userId": "dev-apprentice-1",
  "employee": {
    "id": "dev-apprentice-1",
    "first_name": "Apprentice",
    "last_name": "Demo",
    "department": "Shop Floor",
    "role": "Apprentice Machinist",
    "clearance_level": "shop_floor"
  }
}
```
- Clearance `shop_floor` (lowest tier) — fits all academy courses + cannot reach admin pages
- 15-min idle timeout (per AuthContext.tsx EMP-MS0/U-AUTH1)
- Progress lives under localStorage key `prism_academy_progress_v3:dev-apprentice-1`

### Replacing the dev seed with a real apprentice
Once your ERP integration has a real employee record:
1. Provision the apprentice's real `id / first_name / last_name / role / clearance_level` via your ERP.
2. Have them log in via `/login` instead of `/dev-seed-apprentice.html` — real credentials authenticate against `/api/v1/auth/login`.
3. Their localStorage migrates to `prism_academy_progress_v3:<real-id>` (progress is keyed by employee id, so a clean swap).
4. (Optional, hygiene) Remove `public/dev-seed-apprentice.html` from production builds via a `.vercelignore` or build-time strip.

---

## R12 honest-stop scope

This onboarding gets the apprentice from "PRISM Academy doesn't exist on my phone" to "I can start course-0a." It does NOT:
- Provision real ERP employee records (admin task; needs ERP integration to be live).
- Replace the dev-seed with real auth in production (intentional — admin removes when ready).
- Configure offline-first sync (manifest + sw already give shell-level offline; full course-content offline is a follow-up unit).
- Push notifications (separate FCM/APNs config + service worker push hooks).
- Camera/QR-code-based login (a different MS0).

## Files this onboarding depends on (all committed this session)
- `mcp-server/web/public/dev-seed-apprentice.html` — the one-tap seed page
- `mcp-server/web/scripts/phone-tunnel.ps1` + `.sh` — cloudflared launcher
- `mcp-server/web/vercel.json` + `netlify.toml` — permanent-deploy configs
- `mcp-server/web/e2e/apprentice-smoke.spec.ts` — Playwright smoke (regression gate)
- `mcp-server/web/vite.config.ts` — LAN-host opt-in via `PRISM_PHONE_DEV=1` env
- Existing: `manifest.webmanifest` + `sw.js` + 4 icon SVGs (already shipped)
