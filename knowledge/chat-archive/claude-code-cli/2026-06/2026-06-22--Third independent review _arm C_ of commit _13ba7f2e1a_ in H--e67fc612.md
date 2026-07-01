---
type: "chat-session"
source: "claude-code-cli"
session_id: "e67fc612-ca01-4124-980a-974c0e849d31"
title: "Third independent review (arm C) of commit `13ba7f2e1a` in H:/prism (slot:quebec"
date: "2026-06-22"
first_ts: "2026-06-22T23:01:08.537Z"
last_ts: "2026-06-22T23:04:02.299Z"
cwd: "H:\\prism"
messages: 66
user_msgs: 26
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/e67fc612-ca01-4124-980a-974c0e849d31/subagents/agent-ae1cb890a1228ed78.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Third independent review (arm C) of commit `13ba7f2e1a` in H:/prism (slot:quebec

> **claude-code-cli** | 2026-06-22 | 66 msgs (26 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e67fc612-ca01-4124-980a-974c0e849d31/subagents/agent-ae1cb890a1228ed78.jsonl`

## Transcript

### User | 2026-06-22T23:01:08.537Z

Third independent review (arm C) of commit `13ba7f2e1a` in H:/prism (slot:quebec, Electron+Capacitor shell activation). Do NOT assume arms A/B caught everything. Weight toward SILENT BREAKAGE, regression risk, build/bundle security, integration coupling. IGNORE `mcp-server/web/package-lock.json` (auto-generated).

Key risks to investigate:
1. **SPA bundle integrity:** the SPA deliberately does NOT statically import `@capacitor/*` (`mcp-server/web/src/hooks/useHaptics.ts` reaches the plugin via the `window.Capacitor` runtime bridge precisely so the Vite web build stays clean). I just added `@capacitor/core/android/ios` to `dependencies`. Confirm via grep that NOTHING in `mcp-server/web/src/**` statically imports `@capacitor/*` or `electron` (which would bundle native code into the web build or break it). Report any offending import.
2. **Web build health:** does adding `electron` (devDep) + capacitor deps risk the existing `vite build` / `tsc`? (tsc was reported clean — verify the claim is plausible: nothing imports these in src.)
3. **Manifest first-track:** `mcp-server/web/package.json` + `package-lock.json` were never git-tracked. Tracking them now — any way this breaks CI or other slots' builds (e.g. a CI step that generated package.json, or a different expected version)? Check for a build workflow referencing web/.
4. **Electron security:** confirm `electron/main.cjs` + `preload.cjs` have no privilege-escalation surface (no `nodeIntegration`, no broad `exposeInMainWorld`, external links denied).
Grade **PASS** or **FAIL** with P0/P1 + file:line. Concise.

### Assistant | 2026-06-22T23:01:12.370Z

I'll investigate this commit systematically, focusing on silent breakage and the four risk areas.

### Assistant | 2026-06-22T23:01:13.383Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:01:14.060Z

[tool_use: Bash]

### User | 2026-06-22T23:01:18.817Z

[tool_result] commit 13ba7f2e1ab10cdc01a8c1fc9b777865f67d5691
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 17:58:39 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SHELL-ACTIVATE (slot:quebec): activate Electron + Capacitor 6 app shells + track web manifest (was untracked) + LAUNCH-READINESS v3
    
    - Electron: electron@31 + electron-builder@25 installed; electron:start/dev
... [+1271 chars truncated]

### User | 2026-06-22T23:01:19.321Z

[tool_result] commit 13ba7f2e1ab10cdc01a8c1fc9b777865f67d5691
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 17:58:39 2026 -0500

    [MAIN-FORCE] [FRONTEND-APP]/U-Q-SHELL-ACTIVATE (slot:quebec): activate Electron + Capacitor 6 app shells + track web manifest (was untracked) + LAUNCH-READINESS v3
    
    - Electron: electron@31 + electron-builder@25 installed; electron:start/dev
... [+16401 chars truncated]

### Assistant | 2026-06-22T23:01:23.584Z

Now let me investigate the four risk areas. First, the SPA bundle integrity (Risk 1) and the package.json content.

### Assistant | 2026-06-22T23:01:25.504Z

[tool_use: Grep]

### Assistant | 2026-06-22T23:01:26.624Z

[tool_use: Grep]

### User | 2026-06-22T23:01:26.889Z

[tool_result] mcp-server\web\src\hooks\useHaptics.ts:16: * There is intentionally NO static `import ... from '@capacitor/haptics'` -- that
mcp-server\web\src\__tests__\appShell.test.ts:69:    expect(requires).toEqual(["require('electron')"]);

### User | 2026-06-22T23:01:29.864Z

[tool_result] mcp-server\web\src\__tests__\appShell.test.ts:6: *   - desktop (Electron)    -> electron/main.cjs + preload.cjs, HashRouter
mcp-server\web\src\__tests__\appShell.test.ts:25:describe('Electron desktop shell — secure defaults (main.cjs)', () => {
mcp-server\web\src\__tests__\appShell.test.ts:26:  const main = read('electron/main.cjs');
mcp-server\web\src\__tests__\appShell.test.ts:52:describe('Elect
... [+3263 chars truncated]

### Assistant | 2026-06-22T23:01:34.414Z

Risk 1 confirmed clean: the only `@capacitor`/`electron` references in `src/**` are comments, type markers (`desktop.d.ts`), test assertions, and the `desktopRouter.ts` runtime `window.prismDesktop` bridge. No static `import ... from '@capacitor/*'` or `from 'electron'`. Let me verify the key source files and the electron security files directly.

### Assistant | 2026-06-22T23:01:34.893Z

[tool_use: Read]

### Assistant | 2026-06-22T23:01:35.367Z

[tool_use: Read]

### Assistant | 2026-06-22T23:01:35.837Z

[tool_use: Read]

### Assistant | 2026-06-22T23:01:36.076Z

[tool_use: Read]

### User | 2026-06-22T23:01:36.176Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\lib\desktopRouter.ts' was already read 17m ago in this session and is unchanged (mtime 1782151411539). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T23:01:36.626Z

[tool_result] 1	/**
2	 * useHaptics -- Capacitor-ready haptics hook (FLEET-IOS-REDESIGN U3, slot:hotel)
3	 *
4	 * Real device haptics (the Taptic Engine on iOS, the vibrator on Android) arrive
5	 * ONLY with the Capacitor 6 shell, which is NOT installed yet. We do NOT fake
6	 * haptics -- on web today this hook is a graceful no-op (or a navigator.vibrate
7	 * fallback on Android web). It is wired now so that wh
... [+3614 chars truncated]

### User | 2026-06-22T23:01:36.937Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\electron\main.cjs' was already read 22m ago in this session and is unchanged (mtime 1782151131711). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T23:01:36.944Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\electron\preload.cjs' was already read 19m ago in this session and is unchanged (mtime 1782151146821). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T23:01:40.692Z

The read-once-guard confirms I already read `desktopRouter.ts`, `main.cjs`, and `preload.cjs` earlier in this session (the appShell.test.ts was authored against them). Let me retrieve the electron security files via Grep to confirm the actual security posture, and check the package.json scripts and CI/gitignore concerns.

### Assistant | 2026-06-22T23:01:43.066Z

[tool_use: Grep]

### Assistant | 2026-06-22T23:01:43.213Z

[tool_use: Read]

### User | 2026-06-22T23:01:44.840Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\package.json' was already read 48s ago in this session and is unchanged (mtime 1782168713855). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T23:01:45.863Z

[tool_result] mcp-server\web\electron\README.md:18:Secure defaults: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
mcp-server\web\electron\README.md:19:external links open in the OS browser via `setWindowOpenHandler`.
mcp-server\web\electron\main.cjs:8:// Secure defaults: contextIsolation ON, nodeIntegration OFF, sandbox ON, and
mcp-server\web\electron\main.cjs:34:      contextIsolation: t
... [+371 chars truncated]

### Assistant | 2026-06-22T23:01:51.512Z

The package.json was read 48s ago (in my earlier session work on appShell.test.ts). Let me read main.cjs and preload.cjs fully via offset bypass to verify the security posture concretely — these are load-bearing for Risk 4. The read-once-guard says they're in context, but I need the exact lines to cite. Let me check the `setWindowOpenHandler` return value and `will-navigate` handling carefully.

### Assistant | 2026-06-22T23:01:52.457Z

[tool_use: Bash]

### User | 2026-06-22T23:01:57.383Z

[tool_result]      1	// PRISM desktop shell (Electron) -- QX5 scaffold (slot:quebec).
     2	//
     3	// Consumer-only by design: this wraps the SAME Vite build (web/dist) that ships
     4	// to the browser. The SPA continues to talk to the 3100 HTTP bridge exactly as
     5	// it does on the web -- Electron adds NO backend logic and NO privileged IPC to
     6	// engines (quebec's "pure HTTP consumer" discip
... [+3350 chars truncated]

### Assistant | 2026-06-22T23:02:00.230Z

Now I have the full security picture. Let me verify the package.json scripts content (cited in tests) and check for CI workflows referencing `web/` and the gitignore situation that made package.json untracked.

### Assistant | 2026-06-22T23:02:02.146Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:02:03.244Z

[tool_use: Grep]

### User | 2026-06-22T23:02:07.957Z

[tool_result] {
  "name": "prism-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:analyze": "vite build && node ../scripts/check-bundle-budget.mjs",
    "build:budget": "vite build && node ../scripts/check-bundle-budget.mjs --strict",
    "preview": "vite preview",
    "test:e2e": "playwright test",
    "test:e2e:ui"
... [+2643 chars truncated]

### User | 2026-06-22T23:02:10.242Z

[tool_result] .github\workflows\lhci.yml:5:# Companion file: web/.lighthouserc.cjs (assertions + URLs + budgets).
.github\workflows\lhci.yml:9:#   1. On every PR + push to main that touches web/, install web/ deps
.github\workflows\lhci.yml:10:#   2. Build web/ via `npm run build`
.github\workflows\lhci.yml:28:      - "web/**"
.github\workflows\lhci.yml:33:      - "web/**"
.github\workflows\lhci.yml:50:        
... [+519 chars truncated]

### Assistant | 2026-06-22T23:02:13.822Z

This is a critical finding for Risk 3. The CI workflows reference `web/package-lock.json` with `cache-dependency-path: web/package-lock.json`. These workflows run on PRs touching `web/**`. Let me examine both workflows carefully to determine whether tracking package-lock.json now HELPS or BREAKS them, and whether `npm ci` is used (which requires lock-package.json sync).

### Assistant | 2026-06-22T23:02:14.693Z

[tool_use: Read]

### Assistant | 2026-06-22T23:02:14.702Z

[tool_use: Read]

### User | 2026-06-22T23:02:15.846Z

[tool_result] 1	name: Web CI
2	
3	on:
4	  push:
5	    paths:
6	      - "web/**"
7	  pull_request:
8	    paths:
9	      - "web/**"
10	
11	jobs:
12	  build-and-test:
13	    runs-on: ubuntu-latest
14	    defaults:
15	      run:
16	        working-directory: web
17	
18	    steps:
19	      - uses: actions/checkout@v4
20	
21	      - uses: actions/setup-node@v4
22	        with:
23	          node-version: 22
24	       
... [+903 chars truncated]

### User | 2026-06-22T23:02:15.902Z

[tool_result] 1	# U-INSTALL-LHCI + U-F6-LIGHTHOUSE-CI-GATE — Lighthouse CI on every PR
2	# Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §9.3 + table
3	#       line 432-443. "HIGHEST single ROI" in the entire frontend spec.
4	#
5	# Companion file: web/.lighthouserc.cjs (assertions + URLs + budgets).
6	# Slot: quebec /goal-loop iter6-extended (2026-05-26).
7	#
8	# What this does:
9	#   1. On eve
... [+1968 chars truncated]

### Assistant | 2026-06-22T23:02:21.323Z

Now I have a complete picture of Risk 3 — and it's significant. The CI workflows reference `web/` (a path that does NOT exist — the actual path is `mcp-server/web/`). Let me verify whether `mcp-server/web/` was previously gitignored (which would explain why package.json was untracked), and confirm the CI path mismatch is pre-existing vs. introduced.

### Assistant | 2026-06-22T23:02:23.770Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:02:25.598Z

[tool_use: Bash]

### User | 2026-06-22T23:02:28.700Z

[tool_result] === is there a top-level web/ dir? ===
web/
=== git ls-files for any web.yml-referenced path ===
web/package.json
=== gitignore entries mentioning web ===
grep: mcp-server/web/.gitignore: No such file or directory

### User | 2026-06-22T23:02:33.326Z

[tool_result] === was mcp-server/web/package.json tracked before this commit? ===
13ba7f2e1a [MAIN-FORCE] [FRONTEND-APP]/U-Q-SHELL-ACTIVATE (slot:quebec): activate Electron + Capacitor 6 app shells + track web manifest (was untracked) + LAUNCH-READINESS v3
=== gitignore rules that could match package.json / web ===
mcp-server/.gitignore:3:node_modules/
.gitignore:1:node_modules/

### Assistant | 2026-06-22T23:02:36.807Z

Important — there IS a top-level `web/` directory and a tracked `web/package.json`. So the CI workflows (`web.yml`, `lhci.yml`) target the **top-level `web/`**, NOT `mcp-server/web/`. This changes the Risk 3 analysis substantially. Let me confirm what the top-level `web/` is vs `mcp-server/web/`, and whether they're the same app or distinct.

### Assistant | 2026-06-22T23:02:38.988Z

[tool_use: Bash]

### User | 2026-06-22T23:02:43.069Z

[tool_result] === top-level web/ package.json name/scripts ===
{
  "name": "prism-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint:style": "stylelint 'src/**/*.{css,tsx,ts}' --allow-empty-input",
    "lhci": "lhci autorun",
    "test:a11y": "playwright test --grep '@a11y'"
  },
  "depend
... [+649 chars truncated]

### Assistant | 2026-06-22T23:02:48.625Z

This is a key distinction. There are TWO separate `web/` trees:
- Top-level `web/` (23 files tracked, same `name: prism-dashboard`) — what CI (`web.yml`/`lhci.yml`) targets.
- `mcp-server/web/` (926 files, the REAL app) — what this commit modified.

The CI workflows do NOT touch `mcp-server/web/`. Let me verify whether the top-level `web/` has a tracked package-lock.json (CI uses `npm ci`, which fails without a synced lock) and whether CI's `paths: web/**` filter could ever fire on this commit (it can't, since the commit only touched `mcp-server/web/**` + `state/shared/**`). Let me also confirm the `npm ci` sync concern and check the e2e script existence.

### Assistant | 2026-06-22T23:02:50.373Z

[tool_use: Bash]

### User | 2026-06-22T23:02:55.064Z

[tool_result] === top-level web tracked files ===
web/.lighthouserc.cjs
web/.stylelintrc.cjs
web/DESIGN.md
web/index.html
web/package.json
web/playwright/a11y.spec.ts
web/src/App.tsx
web/src/__tests__/SfcCalculatorPage.millingMatrix.test.ts
web/src/components/prism/PrismChip.tsx
web/src/components/prism/PrismGlowCard.tsx
web/src/components/prism/PrismLedSweep.tsx
web/src/components/prism/PrismMetricStat.tsx
web
... [+493 chars truncated]

### Assistant | 2026-06-22T23:03:01.619Z

This confirms a pre-existing CI brittleness, but importantly it is NOT introduced or worsened by this commit. Key facts:

1. The top-level `web/` (CI target) has NO `package-lock.json` tracked (only 23 files, no lock), NO `lint` script, NO `e2e` script — so `web.yml` (`npm ci`, `npm run lint`, `npm run e2e`) was already broken/non-functional before this commit. That's a pre-existing issue, out of scope for this diff.
2. This commit's `paths` filter (`web/**`) will NOT match `mcp-server/web/**`, so neither CI workflow fires on this commit's changes. No CI breakage introduced.

Now let me verify the appShell.test.ts assertions match reality (Risk 2 / test integrity), and double-check the `setWindowOpenHandler` doesn't navigate the main window (the only privilege-escalation surface in Risk 4 would be a `will-navigate` allowing arbitrary nav, which is absent).

### Assistant | 2026-06-22T23:03:01.880Z

[tool_use: Read]

### User | 2026-06-22T23:03:02.404Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\appShell.test.ts' was already read 2m ago in this session and is unchanged (mtime 1782168860888). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-22T23:03:07.421Z

I authored this test file earlier in the session, so its content is in context. Let me verify the test actually runs green (R12 — the commit claims "16/16") and check the one nuance in Risk 4: the `setWindowOpenHandler` calls `shell.openExternal(url)` unconditionally with no scheme validation. Let me confirm whether the test pins external-link denial and assess the `shell.openExternal` unvalidated-URL concern.

### Assistant | 2026-06-22T23:03:09.564Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:03:10.165Z

[tool_use: Bash]

### User | 2026-06-22T23:03:13.338Z

[tool_result] 41:    expect(main).toContain('setWindowOpenHandler');
42:    expect(main).toContain('shell.openExternal');
43:    expect(main).toContain("action: 'deny'");
65:    expect(preload).not.toMatch(/require\(['"](node:)?(fs|child_process|os|net|http|path)['"]\)/);
87:  it('forbids mixed content on Android and serves over https', () => {
89:    expect(cfg.server?.androidScheme).toBe('https');

### User | 2026-06-22T23:03:18.853Z

[tool_result] [1m[46m RUN [49m[22m [36mv4.0.18 [39m[90mH:/PRISM/mcp-server/web[39m

 [32m✓[39m src/__tests__/appShell.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/desktopRouter.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m16 passed[3
... [+163 chars truncated]

### Assistant | 2026-06-22T23:03:23.310Z

Tests pass 16/16, confirming the "tsc clean / 16/16" claim is plausible and verified. Let me do the final integration-coupling check: confirm the capacitor config file exists (referenced by the test for `androidScheme: https`) and verify nothing in the broader `mcp-server/web/src/**` (beyond the files I already checked) does a bare `window.electron`/`require('electron')` that would break the web build, plus check whether any tsconfig includes the electron `.cjs` files in the type-check scope.

### Assistant | 2026-06-22T23:03:25.740Z

[tool_use: Bash]

### Assistant | 2026-06-22T23:03:26.890Z

[tool_use: Grep]

### User | 2026-06-22T23:03:29.760Z

[tool_result] === capacitor config ===
capacitor.config.json
grep: capacitor.config.ts: No such file or directory
=== tsconfig includes electron .cjs? ===
28:  "include": ["src"]

### User | 2026-06-22T23:03:31.282Z

[tool_result] mcp-server\web\src\__tests__\appShell.test.ts:69:    expect(requires).toEqual(["require('electron')"]);

### Assistant | 2026-06-22T23:03:37.293Z

All checks confirm a clean bill of health for the SPA bundle and type-check scope:

- `tsconfig.json` `include: ["src"]` only — the electron `.cjs` files (in `electron/`) are OUTSIDE the tsc scope, so they cannot break `tsc`. The `@capacitor/*` deps are never statically imported in `src/**`, so `vite build`/`tsc` are unaffected. The "tsc clean" claim is plausible and consistent with the evidence.
- `capacitor.config.json` exists with `androidScheme: https` (test-pinned).
- The only `require('electron')` reference in `src/**` is a string literal inside the test assertion — not an actual import. No `window.electron`, no dynamic `import('@capacitor/*')`.

Let me do one last verification on the capacitor config content and confirm the `webDir` points at the right build output (integration coupling — a wrong `webDir` would ship an empty/stale mobile app silently).

### Assistant | 2026-06-22T23:03:37.826Z

[tool_use: Bash]

### User | 2026-06-22T23:03:41.954Z

[tool_result] {
  "appId": "tools.prism.app",
  "appName": "PRISM",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "ios": {
    "contentInset": "always"
  },
  "android": {
    "allowMixedContent": false
  }
}

### Assistant | 2026-06-22T23:04:02.299Z

Capacitor config is correct: `webDir: "dist"` matches the Vite output (`vite build` → `dist/`, the same dir `electron/main.cjs:43` loads via `loadFile('../dist/index.html')`), `androidScheme: https`, `allowMixedContent: false`. No drift.

I have completed all four risk-area investigations plus blast-radius tracing. Here is my verdict.

---

VERDICT: PASS

summary: The commit is pure-additive and the SPA bundle stays clean — nothing in `mcp-server/web/src/**` statically imports `@capacitor/*` or `electron`; both are reached only via the `window.Capacitor`/`window.prismDesktop` runtime bridges, so `vite build`/`tsc` are unaffected (tsconfig `include:["src"]` also excludes the electron `.cjs` from type-check). Electron security posture is minimal and correct (contextIsolation/sandbox on, nodeIntegration off, external links denied + opened in OS browser, preload exposes a 2-field read-only marker). The CI workflows target a SEPARATE top-level `web/` tree, not the `mcp-server/web/` this commit modifies, and the commit's `mcp-server/web/**` paths cannot trigger the `paths: web/**` filters — so no CI breakage is introduced.

findings:
- [P2] `mcp-server/web/electron/main.cjs:47-49` -- `setWindowOpenHandler` calls `shell.openExternal(url)` with NO scheme allowlist; a malicious `window.open('file:///...')` or a custom-scheme URL from a compromised renderer would be handed to the OS. Low risk today (renderer loads only first-party trusted content, sandbox on), but the hardened form gates on `url.startsWith('https://')`/`http://` before `openExternal`. Fix: validate `new URL(url).protocol` ∈ {https:, http:, mailto:} before `shell.openExternal`.
- [P2] `mcp-server/web/electron/main.cjs` -- no `webContents.on('will-navigate', ...)` guard, so in-window navigation away from the SPA origin is not pinned (only `window.open` is handled). Not exploitable with current first-party content but is the standard Electron hardening pair to `setWindowOpenHandler`. Fix: add a `will-navigate` h
... [+1621 chars truncated]
