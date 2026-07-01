---
name: reference_self_compact_confirm_env_fix_2026_06_18
description: "Second of the two reasons model-invokable self-compaction wasn't activating. The DECISION layer (missing YELLOW branch) was fixed in [[reference_self_compact_yellow_branch_fix_2026_06_18]]; this is the ACTUATION layer. scripts/lib/send-keys.mjs passed `-Confirm:$true`/`$false` as a CLI arg, which PowerShell `-File` mode cannot coerce from a string into the script's [bool]$Confirm param -- it errors at param-binding BEFORE the script body and exits 1 (verified: -Confirm:$true/0/false all fail identically). Fix: drop the arg, set the PS script's own PRISM_SENDKEYS_CONFIRM env var (U-ZM2-01, the same execute seam zulu-orchestrator-sweep + fleet-wake-sequencer already use). Commit U-CONFIRM-ENV-FIX."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.151Z
aliases: reference_self_compact_confirm_env_fix_2026_06_18
---


# Self-compaction actuation: the `-Confirm` -File binding bug (2026-06-18, slot:bravo)

## Symptom
After the YELLOW-decision fix, a REAL self-compact still failed:
`self-compact.mjs ... --confirm` returned `action:"fallback", sendError:"script-exit-1"`
(the handoff wrote, but the SendKeys never fired). So the model could DECIDE to compact
but the actuation silently no-op'd.

## Root cause (NOT a reserved-name collision -- a -File string-coercion limit)
`scripts/lib/send-keys.mjs` spawned the PS helper with `-Confirm:$true`/`-Confirm:$false`
as a CLI arg. PowerShell's `-File` mode binds EVERY argv token as a literal STRING, and the
param-binder refuses to coerce the string `"$true"`/`"true"`/`"1"`/`"0"`/`"false"` into the
script's `[bool]$Confirm` param. It throws `Cannot convert value "System.String" to type
"System.Boolean"` at BIND time -- before the script body -- so the script exits 1 and never
SendInputs. (My pre-compaction hypothesis was a reserved `-Confirm` common-parameter collision;
that was WRONG -- a rename to another `[bool]` param would fail identically. The issue is the
`-File` string-coercion rule, which only a `[switch]` or the env-var path avoids.)

The PS script author had ALREADY documented this exact failure and built the fix
(`send-keys-to-window.ps1:101-108`, U-ZM2-01): it reads `$env:PRISM_SENDKEYS_CONFIRM -eq "1"`
natively (no string coercion) to upgrade dry-run -> execute. `send-keys.mjs` just never used it.

## Fix (commit U-CONFIRM-ENV-FIX)
1. Removed the `-Confirm:$X` arg from `send-keys.mjs`.
2. Set `env: { ...process.env, PRISM_SENDKEYS_CONFIRM: confirm ? "1" : "0" }` on the spawnSync.
   - Explicit `"0"` on dry-run is SAFETY-CRITICAL: a parent (e.g. a zulu sweep) may have exported
     `PRISM_SENDKEYS_CONFIRM=1`; a bare `{...process.env}` would let that inherited `"1"` turn a
     dry-run into a REAL send. Spread-then-assign forces `"0"` last. New adversarial test pins it.
3. `{...process.env}` preserves PATH (resolves powershell.exe) and the `PRISM_SENDKEYS_DISABLE`
   kill-switch.
- LIVE before/after: `self-compact.mjs --dry-run --slot bravo` now resolves hwnd 854018
  (UIA tab BRAVO) + binds `ok:true` (was `script-exit-1`). 24/24 wrapper tests; 3-of-3 PASS.
- Fleet-wide: every `send-keys.mjs` caller fixed at once. `zulu-orchestrator-sweep.mjs:242` +
  `fleet-wake-sequencer.mjs:326` build their own spawn+env directly (already env-based), so they
  were correct already and are untouched.

## Lessons
- A `[bool]` PowerShell param CANNOT be set via `powershell.exe -File -Param:$true` -- the binder
  won't coerce the string. Use a `[switch]` (presence/absence) or an env var the script reads
  natively. This is a general Node->PS spawn gotcha for the whole fleet.
- When fixing a "confirm/execute" flag, set the SAFE default explicitly in the child env -- never
  inherit it -- so an exported value from a parent process can't silently flip dry-run to execute.
- READ THE CONSUMER FIRST (R8): the PS script already had the env-var seam + a comment explaining
  the exact bug. The fix was to USE the existing design, not rename the param (my first plan).

## Follow-up (P2, scrutiny-flagged, queued)
The PS header docs (`send-keys-to-window.ps1:33-72`) + `knowledge/wiki/architecture/zulu-orchestrator.md:363`
still show `-Confirm:$true` as the execute example -- a re-introduction risk (a future caller could
copy the broken arg). Doc-only; the binding path is correct. Update to point at the env var.

Related: [[reference_self_compact_yellow_branch_fix_2026_06_18]] (the decision-layer sibling),
[[reference_zulu_selfcompaction_test_2026_06_10]] (the proven SendInput mechanism),
[[reference_self_compact_and_wt_actuation_dormant_2026_06_13]].
