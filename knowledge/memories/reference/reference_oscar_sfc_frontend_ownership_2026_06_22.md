---
name: reference_oscar_sfc_frontend_ownership_2026_06_22
description: "OPERATOR DIRECTIVE 2026-06-22: oscar now OWNS the SFC frontend (web + future Electron/iOS/Android shells of the SFC product), overriding the default `frontend -> quebec` slot-domain gate. Verbatim: 'change your setting and galaxy settings to bypass quebec building the front end. sfc is your specialty so you'll understand it better than quebec. once you're done building run full closed loop testing of the entire sfc app page suite to check that calculations are corrected. strong focus on jm die fleet machines first.' So: oscar builds the SFC web page suite (SpeedFeedPage /speed-feed, CalculatorPage /calculator, SfcCalculatorPage /speed-feed-calc) + then runs closed-loop calc-correctness testing of the whole page suite, JM Die fleet machines FIRST. quebec is NOT a gate for SFC-product frontend."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.704Z
aliases: reference_oscar_sfc_frontend_ownership_2026_06_22
---


**Operator de-gated oscar to own the SFC frontend (2026-06-22).** Removes the `frontend -> quebec` gate I had been deferring to for the SFC web/app pages. Recorded in the galaxy doctrine §1 (`mcp-server/src/engines/speed-feed/CLAUDE.md`).

## The directive (verbatim, via AskUserQuestion answer)
> "Do everything you can. change your setting and galaxy settings to bypass quebec building the front end. sfc is your specialty so you'll understand it better than quebec. once you're done building run full closed loop testing of the entire sfc app page suite to check that calculations are corrected. strong focus on jm die fleet machines first"

## What this authorizes (oscar's mandate now includes)
1. **Build the SFC web page suite** in `mcp-server/web/` — the 3 SFC pages (per [[reference_oscar_sfc_frontend_wiring_map_2026_06_22]]): `SpeedFeedPage` (`/speed-feed`, the richest -- full CI95/weibull uncertainty UI, was nav-orphan, nav-linked in 4e3ed0af70), `CalculatorPage` (`/calculator`), `SfcCalculatorPage` (`/speed-feed-calc`, focused). Decide the canonical page + make the suite work end-to-end.
2. **Closed-loop calc-correctness testing of the entire page suite** — page -> API (`/api/v1/speed-feed/*` -> prism_calc) -> calc -> display, verify the numbers are RIGHT. **JM Die fleet machines FIRST** (ShopConfigurationEngine, 21 machines; profile `jm-die-profile.ts`).
3. quebec is NOT a gate for SFC-product frontend. Cross-app shell infra (Electron/iOS/Android scaffolding) still coordinates with quebec, but the SFC-specific pages + their calc correctness are oscar's.

## Build-order plan (dependency-ordered; loop until done, R16)
1. ~~De-gate config~~ (this commit: galaxy CLAUDE.md §1 + this memory).
2. RECON the current SFC frontend state (pages, routing, `web/src/api`+`hooks`, dev-server :5173->/api proxy->:3000/:3100 bridge, what renders / what is broken).
3. Pick the canonical SFC page; finish/harden it (oscar-soul: every speed/feed shown WITH uncertainty/S(x); units labeled).
4. Closed-loop calc-correctness harness, JM Die machines first: drive each page's input -> assert the displayed Vc/feed/Fc/power/tool-life/Ra match the backend engine + are physically sane (units, safety clamps). Browser tools (claude-in-chrome) available for live verify once the dev server runs.

## Constraints that STILL bind (not de-gated)
- Outward-facing safety: a page that PUBLISHES a speed/feed must show uncertainty/S(x) (oscar soul refuse: `publishing-a-speed-feed-without-uncertainty`).
- Convergence enable (`PRISM_SFC_CONVERGE=1`) remains operator-gated (changes real cutting speeds) -- the frontend can PREVIEW it (sfc_convergence_preview, 3dbdad0462) but not flip it.
- Physics constants from `constants.ts`; no inlined kc1.1/Taylor.
