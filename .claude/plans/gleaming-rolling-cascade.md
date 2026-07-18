# Plan — APS-FUSION-CLOUD-MS0: Autodesk Platform Services cloud connector for PRISM

## Context

The user wants PRISM to extract CAD/CAM data from their Fusion 360 Team hub via the cloud, not via the local Fusion add-in. We're on branch `cad-fusion-live-ms0`; prior attempt this branch hit "Fusion cloud unreachable (no Forge creds)" (per `reference_cad_fusion_training_2026_05_18`) and pivoted to the Inventor/STEP corpus.

This plan closes that gap by adding an **Autodesk Platform Services (APS, formerly Forge)** connector — a third mode for `FusionCloudConnectorEngine` alongside the existing `"live"` (localhost:18360 add-in) and `"mock"` modes. Phase 1 ships **geometry + metadata + thumbnails** for an entire Fusion Team hub via REST. Phase 2 (deferred, cost-gated) adds CAM extraction via Design Automation API.

The user has a Fusion Team subscription but no APS app yet — so the build is preceded by an operator runbook for registering an APS app at aps.autodesk.com.

**Why this matters:** Once shipped, PRISM nightly-crawls the Fusion Team hub, pulls every design's STEP + thumbnail + manifest + version history into the corpus, and unlocks the CAD-learning pipeline (`cad-train`, `cad-graph`, `cad-feature-recognize`) against real production parts — no operator action required after first auth.

## Scope honesty (R12)

**Phase 1 delivers:**
- OAuth (2LO + 3LO+PKCE) with disk-cached refresh token
- Hub → project → folder → item enumeration
- Per-item: STEP/IGES/OBJ extraction via Model Derivative, thumbnail, version history, manifest properties
- Drop-in adapter for `FusionCloudConnectorEngine` (no breaking changes downstream)
- Dispatcher wiring (5 new `prism_cad` actions)
- Operator runbook + sync skill

**Phase 1 explicitly does NOT deliver:**
- CAM setups/operations/tools/speeds/feeds — APS Data Management does not expose this. The APS adapter exposes `capabilities.cam = false`; `getFileMetadata` throws `CapabilityNotSupportedError` if a caller requests CAM data on the APS path. Downstream `FusionProjectCrawlerEngine` will emit `cam_coverage: 'unavailable_via_connector'` instead of lying with `total_operations: 0`.
- Design Automation jobs (deferred to Phase 2, gated on a 5-design cost benchmark — DA bills $0.20-$2.00/design, so a 500-design hub crawl is $100-$1000; the architecture decision changes at that price point).

## Architecture

Mode-agnostic plug-in via the existing `FusionCloudConnectorEngine` surface. The connector gains a `"aps"` mode and a `capabilities` descriptor; everything downstream is untouched.

```
                              ┌────────────────────────────┐
   FusionProjectCrawlerEngine │ FusionCloudConnectorEngine │── mode: "mock"  → fixtures
       (capability-aware) ────│   + capabilities: {...}    │── mode: "live"  → Fusion360LiveBridgeEngine (localhost:18360)
                              └────────────────────────────┘── mode: "aps"   → APSFusionCloudAdapterEngine
                                                                                       │
                                                                                       ├── APSDataManagementEngine (hubs/projects/folders/items)
                                                                                       │
                                                                                       └── APSModelDerivativeEngine (translate → poll → download)
                                                                                                                                    │
                                                                                                                                    └── APSOAuthEngine (2LO + 3LO+PKCE, disk cache)
                                                                                                                                                                              │
                                                                                                                                                                              └── loopbackOAuthServer (one-shot 127.0.0.1:8765 callback)
```

## Files to create

| # | File | Purpose | LOC est. |
|---|------|---------|----------|
| 1 | `mcp-server/src/utils/pollWithBackoff.ts` | Exponential-backoff async polling utility (no PRISM equivalent exists per audit) | ~60 |
| 2 | `mcp-server/src/utils/loopbackOAuthServer.ts` | One-shot `http.createServer` callback receiver, port-configurable, AbortController-bounded | ~80 |
| 3 | `mcp-server/src/utils/atomicJsonWrite.ts` | Write-tmp + fsync + rename atomic JSON writer (used for token cache) | ~40 |
| 4 | `mcp-server/src/engines/APSOAuthEngine.ts` | 2LO (client_credentials) + 3LO (auth_code + PKCE) + token cache + auto-refresh + disk persistence | ~280 |
| 5 | `mcp-server/src/engines/APSDataManagementEngine.ts` | REST wrapper for `developer.api.autodesk.com/project/v1` + `/data/v1` (hubs/projects/folders/items/versions) | ~220 |
| 6 | `mcp-server/src/engines/APSModelDerivativeEngine.ts` | POST translation job → poll manifest → download derivative (STEP/IGES/OBJ/thumbnail) | ~200 |
| 7 | `mcp-server/src/engines/APSFusionCloudAdapterEngine.ts` | Implements `FusionCloudConnectorEngine`'s 5-method surface + `capabilities` descriptor; throws `CapabilityNotSupportedError` on CAM calls | ~240 |
| 8 | `mcp-server/src/__tests__/APSOAuthEngine.test.ts` | Token parse, refresh window, atomic write, PKCE verifier shape, capability throw, corrupted-cache recovery | ~150 |
| 9 | `mcp-server/src/__tests__/APSDataManagementEngine.test.ts` | Fetch mock, hub-list mapping, folder paging, error envelopes, 401-triggers-refresh | ~130 |
| 10 | `mcp-server/src/__tests__/APSModelDerivativeEngine.test.ts` | Job submit, poll-until-success, manifest mapping, derivative download, fail-loud on `status:failed` | ~140 |
| 11 | `mcp-server/src/__tests__/APSFusionCloudAdapterEngine.test.ts` | Capability descriptor, throws on `getFileMetadata`+include_cam, type-mapping to `FolderListResult`/`FileMetadataResult` | ~120 |
| 12 | `mcp-server/src/__tests__/pollWithBackoff.test.ts` | Success on 1st/Nth try, max-attempts exit, backoff cap | ~60 |
| 13 | `mcp-server/src/__tests__/loopbackOAuthServer.test.ts` | Receives code, state-mismatch reject, timeout, port-in-use error | ~80 |
| 14 | `H:/.claude/commands/aps-setup.md` | Operator runbook: register APS app, scopes, redirect URI, Fusion Team API enablement | ~120 |
| 15 | `H:/.claude/commands/fusion-cloud-sync.md` | Operator skill to kick a hub crawl | ~60 |

## Files to modify

| File | Change |
|------|--------|
| `mcp-server/src/engines/FusionCloudConnectorEngine.ts` | Add `"aps"` to `mode` union; add `capabilities: { geometry: boolean; cam: boolean; thumbnails: boolean; metadata: boolean }` to `ConnectionStatus`; delegate to `APSFusionCloudAdapterEngine` in APS mode. **Existing live/mock paths byte-identical** (additive only). |
| `mcp-server/src/engines/FusionProjectCrawlerEngine.ts` | Check `connector.capabilities.cam` before CAM aggregation; emit `cam_coverage: 'available' \| 'unavailable_via_connector'` in `ProjectTree`. R12 honest reporting. |
| `mcp-server/src/config/api-config.ts` | Add `apsConfig` getter (clientId, clientSecret, redirectUri, loopbackPort) reading env vars |
| `mcp-server/src/tools/dispatchers/cadDispatcher.ts` | Add lazy-import `apsAdapter`, `apsOauth`; wire 5 new actions (see Dispatcher actions below) |
| `mcp-server/src/tools/cadActionSchemas.ts` | 5 new Zod schemas |
| `mcp-server/.env.example` | Add `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, `APS_CALLBACK_PORT`, `APS_TOKEN_CACHE_PATH` |
| `mcp-server/.gitignore` | Ensure `data/state/aps-tokens.json` is excluded (likely already covered by `data/state/*.json` glob — verify) |

## Existing utilities to reuse (no new wrapper needed)

| Path | What | Why reuse |
|------|------|-----------|
| `mcp-server/src/utils/apiTimeout.ts` | `apiCallWithTimeout(fn, ms, ctx)` | All APS REST calls wrap in this — house style, AbortController-bounded |
| `mcp-server/src/mcp/auth.ts` | `generateCodeVerifier(length=64)` | PRISM has RFC 7636 PKCE helper — direct reuse for 3LO challenge/verifier |
| `mcp-server/src/utils/Logger.ts` | `log` | All engines use the structured logger |
| `mcp-server/data/state/` | Existing state dir | Token cache lives here as `aps-tokens.json` |

## Dispatcher actions to add (`prism_cad`)

| Action | Engine method | Purpose |
|--------|---------------|---------|
| `aps_oauth_status` | `APSOAuthEngine.getStatus()` | Has-token? Expires-when? 2LO/3LO active? Never returns the token itself. |
| `aps_oauth_begin_3lo` | `APSOAuthEngine.begin3LO()` | Prints auth URL, spawns loopback server, waits for callback, persists tokens. Long-running (browser interaction). |
| `aps_hub_list` | `APSDataManagementEngine.listHubs()` | Lists Fusion Team hubs the authenticated user can see |
| `aps_project_crawl` | Driven through `FusionCloudConnectorEngine.listFolder()` in APS mode | Full hub crawl with file metadata, used by `/fusion-cloud-sync` skill |
| `aps_translate_item` | `APSModelDerivativeEngine.translate(urn, formats)` | Submit job, poll, return manifest + derivative URNs. Caller downloads if needed. |

All five reuse the existing dispatcher action-enum + lazy-import + Zod-schema pattern (verified in `cadDispatcher.ts` line 1157+).

## OAuth design choices (locked in from Plan-agent review)

- **Two flows:** 2LO (`client_credentials`) for Model Derivative on buckets we own; 3LO (`authorization_code` + PKCE) for accessing the user's Fusion Team hub. Both required for full hub crawl.
- **Token cache:** Plaintext JSON at `mcp-server/data/state/aps-tokens.json`, written atomically (write to `.tmp`, `fsync`, `rename`). Threat model documented in the engine JSDoc: "if a process can read user-profile state files, attacker already has full system access." Keytar/OS-keychain is P2 hardening (native build dep — skip for first ship). Corrupt JSON → log + delete + force re-auth (no recovery attempt).
- **Refresh:** Auto-refresh access token when <5 min from expiry on next API call. Refresh-token rotation handled per APS spec.
- **Loopback redirect:** `http://127.0.0.1:8765/callback` (port env-configurable). Must match exactly what the user registers in the APS app — the runbook tells them which port to enter.
- **Browser spawn:** Print URL to console; try `child_process.spawn('cmd', ['/c', 'start', url])` on Windows; fall back to print-only on spawn failure.
- **State parameter:** Cryptographic random, validated on callback, rejected on mismatch (CSRF defense).

## Capability descriptor (locked in from Plan-agent review)

`FusionCloudConnectorEngine.ConnectionStatus` gains:
```ts
capabilities: {
  geometry: boolean;     // STEP/IGES/OBJ extraction available
  cam: boolean;          // CAM setups/operations/tools available
  thumbnails: boolean;   // Preview images available
  metadata: boolean;     // File names, dates, sizes, versions
};
```

| Mode | geometry | cam | thumbnails | metadata |
|------|----------|-----|------------|----------|
| `mock` | true | true | true | true |
| `live` | true | true | true | true |
| `aps` | true | **false** | true | true |

`APSFusionCloudAdapterEngine.getFileMetadata(projectIndex, fileId, opts?)` throws `CapabilityNotSupportedError` when `opts?.include_cam === true`. Default `include_cam` defaults to `false` on the APS path (caller must explicitly request CAM to hit the error).

`FusionProjectCrawlerEngine` reads `connector.capabilities.cam`; if `false`, skips CAM aggregation and emits `cam_coverage: 'unavailable_via_connector'` in `ProjectTree` (new field). Existing live/mock paths emit `cam_coverage: 'available'`.

## Build order (sequential — no parallel work; each phase per-file scrutiny + 3-of-3 gate before next)

**Phase 0 — Operator runbook (blocking)**
- Write `H:/.claude/commands/aps-setup.md` first
- User registers APS app, captures `client_id` + `client_secret`, pastes into `mcp-server/.env`
- User confirms Fusion Team hub is accessible (some seats need admin to enable API surface)
- **Build halts here until user signals creds are in place**

**Phase 1 — Utilities (no engine yet)**
1. `pollWithBackoff.ts` + test
2. `atomicJsonWrite.ts` + test
3. `loopbackOAuthServer.ts` + test
4. `api-config.ts` apsConfig getter
5. `.env.example` update

**Phase 2 — OAuth engine (isolated, no DM/MD dependencies)**
6. `APSOAuthEngine.ts` — 2LO first (simpler), then 3LO+PKCE
7. Test suite — mock fetch, mock loopback server
8. Manual smoke: `node -e "import('./APSOAuthEngine.js').then(m => m.default.begin3LO())"` against real APS

**Phase 3 — Data Management + Model Derivative (consumes OAuth engine)**
9. `APSDataManagementEngine.ts` + test
10. `APSModelDerivativeEngine.ts` + test
11. Manual smoke: list hubs, translate one .f3d

**Phase 4 — Adapter + connector mode extension**
12. `APSFusionCloudAdapterEngine.ts` + test
13. Modify `FusionCloudConnectorEngine.ts` — additive only, mode union extension
14. Modify `FusionProjectCrawlerEngine.ts` — capability-aware aggregation

**Phase 5 — Dispatcher + operator skill**
15. `cadDispatcher.ts` + `cadActionSchemas.ts` — 5 new actions
16. `H:/.claude/commands/fusion-cloud-sync.md` — operator skill
17. End-to-end test: `/fusion-cloud-sync` → real hub → STEP files in corpus

**Phase 6 — Documentation reflection (CLAUDE.md doctrine)**
18. CLAUDE.md `## APS-FUSION-CLOUD-MS0` pointer section
19. MEMORY.md index entry
20. Wiki entry `knowledge/wiki/architecture/aps-fusion-cloud-ms0.md`
21. Obsidian memory `knowledge/memories/reference/reference_aps_fusion_cloud_ms0_<date>.md`

## Verification (end-to-end)

After Phase 5, with creds in `.env` and a Fusion Team hub populated:

```bash
# 1. OAuth bootstrap (one-time)
cd H:/prism/mcp-server
npm run build:fast
node --eval "import('./dist/engines/APSOAuthEngine.js').then(m => m.apsOAuthEngine.begin3LO())"
# Browser opens, user grants access, loopback receives callback, token cached.

# 2. Status check
node --eval "import('./dist/engines/APSOAuthEngine.js').then(m => m.apsOAuthEngine.getStatus()).then(console.log)"
# Expected: { authenticated: true, mode: '3LO', expiresIn: ~3600, capabilities: {...} }

# 3. Hub list
node --eval "import('./dist/engines/APSDataManagementEngine.js').then(m => m.apsDM.listHubs()).then(console.log)"
# Expected: array of hubs with id/name

# 4. Full crawl via the adapter (the headline)
# Via dispatcher: prism_cad action `aps_project_crawl` with projectIndex=0
# Or via skill: /fusion-cloud-sync

# 5. Test suite
npx vitest run src/__tests__/APS*.test.ts src/__tests__/pollWithBackoff.test.ts src/__tests__/loopbackOAuthServer.test.ts
# Expected: all green

# 6. Build + audit chain
npm run build
npx tsx scripts/run-dev-audit-chain.ts --edited-file src/engines/APSFusionCloudAdapterEngine.ts
```

## Risks + mitigations

| Risk | Mitigation |
|------|------------|
| User's Fusion Team seat doesn't have API access enabled | Runbook tells them how to check; manual escalation if blocked (admin must enable) |
| APS rate limits (default 200 req/min) | `pollWithBackoff` honors `Retry-After` header; batched requests where possible; `apiCallWithTimeout` ceiling |
| Refresh token revoked / 14-day expiry hit mid-cron | Log fail-loud, write empty marker to `data/state/aps-tokens.json.expired`, fail the crawl with R12 message; operator re-runs `begin3LO` |
| Loopback port 8765 in use | `loopbackOAuthServer` reports `EADDRINUSE`; user sets `APS_CALLBACK_PORT` in `.env` + re-registers app with new URI |
| Model Derivative translation fails on encrypted/old .f3d | Manifest returns `status: failed`; we log + skip the design, continue crawl; aggregate `translation_failures: N` in crawl summary |
| Disk-cached token leaks via accidental commit | `.gitignore` already covers `data/state/*.json`; pre-commit grep for `refresh_token` in staged files (add to existing pre-commit if needed) |
| User runs `/fusion-cloud-sync` before completing runbook | `apsOAuthEngine.getStatus()` returns `authenticated: false`; the sync skill emits a clear "run /aps-setup first" message |

## Phase 2 hooks (out of scope for this plan — but architecture allows)

When ready to tackle CAM extraction via Design Automation:
1. **First action: cost benchmark.** Pick 5 representative .f3d files. Manually submit a minimal CAM-extract DA job. Measure credits consumed. Multiply by hub size. If `>$200/full-sync`, switch architecture to on-demand-only (operator picks specific designs, no nightly crawl).
2. New engine `APSDesignAutomationEngine.ts` — register Fusion script-engine activity, submit per-design jobs, harvest CAM JSON.
3. Flip `APSFusionCloudAdapterEngine.capabilities.cam` to `true` and implement `getFileMetadata` CAM path.
4. `FusionProjectCrawlerEngine` capability check then sees CAM available and aggregates normally — no further changes downstream.

## What this plan is NOT

- Not a port of the local Fusion add-in to cloud. The add-in stays where it is; APS is a parallel mode.
- Not a replacement for `Fusion360LiveBridgeEngine`. Live mode remains the only way to get CAM data in Phase 1.
- Not a general Autodesk SDK. Just the APS endpoints we actually need (Data Management, Model Derivative, OAuth).
- Not a multi-tenant integration. Single-user, single-workstation, single APS app for now. Multi-user via PRISM's auth layer is a separate milestone.

## Per-file scrutiny + 3-of-3 gate

Every file in the build order gets the per-file 2-reviewer scrutiny (use `code-analyzer` arm A + `reviewer` arm B per the CLAUDE.md per-file gate). End-of-task 3-of-3 (`scrutiny-3way.mjs --session-id <id>`) clears the Stop gate before commit.

## Doctrine compliance

- **R5** (model for judgment only) — OAuth/REST/polling is deterministic code, not Claude routing
- **R6** (token budgets) — plan kept under 6k chars body; no in-band token waste during build
- **R8** (read before write) — Plan-agent + Explore-agent reports verified existing patterns; no duplicate engines
- **R9** (tests verify intent) — Each test file targets the failure mode the engine prevents (e.g. capability throw, atomic write under crash, PKCE shape)
- **R10** (checkpoint) — Per-phase scrutiny gates serve as explicit checkpoints
- **R12** (fail loud) — Capability descriptor + `CapabilityNotSupportedError` + `cam_coverage` reporting + corrupt-cache → delete + force re-auth + scope-honesty section above
- No inline physics constants (engine conventions §6 — N/A; this is REST/OAuth code, no formulas)
