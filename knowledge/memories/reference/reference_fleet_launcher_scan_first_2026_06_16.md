---
name: reference_fleet_launcher_scan_first_2026_06_16
description: "Fleet launcher now scans for the MOST-RECENT active session per slot (slot-tab-boot.ps1 Get-MostRecentSlotSession) — fixes \"checked into charlie\" stale-binding bleed; one resolver, both Hermes+PowerShell launchers; complements golf U-DYNAMIC-CURRENT-SESSION; repo<-Tools drift found+resynced"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.574Z
aliases: reference_fleet_launcher_scan_first_2026_06_16
---


# Fleet launcher scan-first recency resolver — 2026-06-16 (slot:papa, commit 2013a5a857 on cad-fusion-live-ms0)

Operator: *"find out why you checked into charlie ... update the fleet launcher (both hermes and powershell versions) — it's not launching the most recent active chats for each chat slot; scan first to ensure it loads the most recent chats."*

## The charlie bleed — root cause
A papa-bound session surfaced **charlie** context. `slot-tab-boot.ps1` resolved each slot's session by **stale-signal priority, not recency**: the chat-slots.json binding tier pre-empted any recency scan, and the shared-dir tier attributed a session to a slot by its **first** `/checkin-<slot>` only. So a stale/transient binding **shadowed the genuinely-newest session**. Then the soul hook `slot-context-bundle-inject.mjs` `resolveSlot()` (alphabetical-first iteration + loose `startsWith` short-id match) surfaced a transient/foreign binding as the slot soul → the cross-slot bleed. The exact transient instance was already gone from the live `chat-slots.json` (unpinnable post-hoc — stated honestly, not fabricated).

## The fix — ONE chokepoint covers BOTH launchers
A SINGLE session resolver, `slot-tab-boot.ps1`, is delegated to by EVERY Claude-resuming launcher:
- `launch-fleet-bounded.ps1` (Hermes Bridge-B, repo `scripts/fleet/`)
- `Launch-PRISM-Fleet.ps1` + `Launch-PRISM-Fleet-3win.ps1` + `resume-specific.ps1` (Tools `H:/Tools/prism-fleet/`)
(`hermes-slot-tab-boot.ps1` boots Hermes TUIs, NOT Claude — not a target.)
So fixing `slot-tab-boot.ps1` satisfies the "both hermes and powershell versions" ask in one place.

New `Get-MostRecentSlotSession -SlotName` (committed file ~line 215) gathers candidates from ALL sources (shared-dir `/checkin-<slot>` head, chat-slots binding, slot-keyed dir), dedups via a `$seen` hashtable, picks the **newest mtime** whose identity is genuinely THIS slot → recency wins, stale binding can't shadow, no cross-slot bleed. Liveness guard (`Test-EntryLive`) + size guards preserved. Added an explicit **`ProjDir`** field on every tier return (fixes a latent size-guard mis-route for worktree-less slot-dir sessions). Env knobs `PRISM_FLEET_SCAN_MAX_AGE_DAYS` (default 30) + `PRISM_FLEET_SCAN_HEAD_CAP` (default 50) are `[int]::TryParse`-guarded (a bad value no longer aborts).

## Complements golf U-DYNAMIC-CURRENT-SESSION (no regression)
Golf shipped `FLEET-LAUNCHER/U-DYNAMIC-CURRENT-SESSION` (commit c6c749cd0, 2026-05-31): "each slot opens to its CURRENT session, staleness 90->99999, boot-script size guard." Verified this is COMPLEMENTARY, not duplicative: (1) golf's 99999 staleness guard is NOT in `slot-tab-boot.ps1` (grep empty) — it lives in golf's other touched file (`Launch-PRISM-Fleet.ps1` dynamic-resolve), so my edit is orthogonal. (2) My resolution chain is ADDITIVE-FIRST with full fallback (committed lines 550-585): `Get-MostRecentSlotSession` -> `Get-SlotSessionFromChatSlots` -> [LIVE-skip block] -> `SharedDirScan` -> `SlotDir`. If the 30-day scan finds nothing, every prior tier (incl. golf's behavior) runs unchanged. My scan only pre-empts toward a MORE-RECENT same-slot session = exactly the operator's "load the most recent" goal. (3) My ProjDir field IMPROVES golf's "boot-script launch-time size guard" (fixes a worktree-less mis-route). Sibling prior: [[reference_post_ship_fleet-launcher-improve-ms0-u-fli01-04]] (tango U-FLI01-04: Write-LaunchLog + liveness-skip — the Tools-ahead content I preserved during the resync below).

## TWO-COPY DRIFT (the trap) — repo was STALE vs runtime
`slot-tab-boot.ps1` exists TWICE: `H:/prism/scripts/fleet/` (git, canonical) + `H:/Tools/prism-fleet/` (runtime — what ACTUALLY runs). They had diverged 158 lines: **Tools was AHEAD** (U-FLI01 `Write-LaunchLog` + a PS-interpolation escaping fix + U-FLI02 LIVE-skip); the repo copy was behind. Naive "edit repo + cp to Tools" would have REGRESSED the runtime. Correct sequence: `cp Tools->repo` (adopt the ahead base) -> re-apply scan-first on that base -> `cp repo->Tools` (both identical, diff=0). **Lesson: when an asset has a repo copy + a runtime copy, diff them BEFORE editing — the runtime may be ahead.** H:/Tools is OUTSIDE the repo (not git-tracked); only the repo copy is committed; the runtime is deployed by manual sync.

## Verification (R12)
ParseFile 0 errors both copies; AST-extracted `Get-MostRecentSlotSession` real-data test: papa->LIVE, charlie->its own charlie session, mike->its own mike session, **no bleed**; bad-env-knob no longer aborts. 2 reviewers PASS (3 P2 -> 2 fixed: ProjDir + env hardening; liveness left as intended). Commit `2013a5a857` (MAIN-FORCE, cad-fusion-live-ms0); durable in history past xray's later commit `a2d885fcb7`. Related: [[feedback_missing_file_copy_back]] (repo<->runtime sync discipline), [[reference_post_ship_fleet-launcher-u-dynamic-current-session]] (golf prior art).
