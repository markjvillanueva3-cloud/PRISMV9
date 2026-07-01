---
name: reference_oscar_sfc_frontend_build_plan_2026_06_18
description: "Operator authorized oscar to own the SFC frontend (web page) 2026-06-18; the Electron + iOS/Android shells DON'T EXIST yet and are quebec app-infra wrapping the same Vite build. The 3-surface build plan."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.704Z
aliases: reference_oscar_sfc_frontend_build_plan_2026_06_18
---


**Operator directive 2026-06-18:** "since sfc is your domain... change your settings so you can finish the front end build of the sfc page of the web app, electron version of the app and the ios/android app."

**SETTINGS CHANGE MADE:** `mcp-server/src/engines/speed-feed/CLAUDE.md` §1 now grants oscar the SFC frontend product surface (operator override of the default frontend->quebec deference, SFC-only). See [[reference_oscar_sfc_frontend_scope_2026_06_18]] for the page map.

**ENUMERATION TRUTH (verified 2026-06-18, R12 — do not assume otherwise):**
- **Web app** EXISTS (Vite + React, `mcp-server/web/`). SFC pages: `/calculator`=`CalculatorPage.tsx` (13.7kL, canonical full Studio), `/speed-feed-calc`=`SfcCalculatorPage.tsx` (390L, focused, cross-linked from the Studio), `/speed-feed`=`SpeedFeedPage.tsx` (882L, CONFIRMED ORPHAN — no nav link/navigate, deprecation candidate).
- **Electron version DOES NOT EXIST** — no `web/electron/`, no electron dep. Would be a NEW shell.
- **iOS/Android DOES NOT EXIST** — no `capacitor.config.*`, no `web/ios`/`web/android`, no capacitor/react-native/expo dep. Would be a NEW shell.

**ARCHITECTURE INSIGHT (load-bearing for the plan):** it is ONE Vite web build. Electron and Capacitor (the natural iOS/Android path for a Vite React app) are **wrappers around that same build** — so the finished SFC page renders in **all three form factors for free** once a shell exists. The shells are WHOLE-APP INFRASTRUCTURE (quebec's `Frontend web app AND phone app` domain), NOT SFC-specific. Therefore:

**3-PHASE PLAN:**
1. **(oscar) Finish the web SFC page** — the genuine SFC-specific deliverable. Sub-units: (a) deprecate the orphan `SpeedFeedPage`/`useSpeedFeed` (confirm no external deep-link first); (b) surface the backend accuracy signal in the UI — never publish a speed-feed without uncertainty (oscar soul): show the over-range/heat-sensitive advisory + vendor-divergence the backend now produces ([[reference_oscar_sfc_divergence_direction_2026_06_18]]); (c) verify the page is live-wired to the prism_* HTTP bridge (port 3100) end-to-end. Build with vitest + per-file 2-arm scrutiny (UI/React reviewer weighting) + 3-of-3.
2. **(quebec-coordinated) Electron shell** — scaffold `electron` (main + preload) serving the Vite build; one app-wide shell, SFC page included automatically. Quebec app-infra; surface on the chat bus, clone-don't-fork.
3. **(quebec-coordinated) Capacitor iOS/Android shell** — `@capacitor/core` + ios/android platforms wrapping the same `dist/`; SFC page included automatically. Quebec app-infra.

**HONEST CONSTRAINT:** phases 2-3 are NEW app-platform scaffolds (not "finishing the SFC page") + are quebec's domain + need fresh context. Phase 1 (web SFC page) is oscar's and is the real SFC frontend work. A multi-surface "finish all 3" is a multi-session build, NOT a one-shot. Sequence: phase 1 first (proves the page), then coordinate phases 2-3 with quebec (the shells render the same finished page).
