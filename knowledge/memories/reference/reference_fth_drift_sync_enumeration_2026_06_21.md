---
name: reference_fth_drift_sync_enumeration_2026_06_21
description: "Authoritative live-verified categorization to fully green fleet-task-health test #69 (installer-drift) -- the dedicated-pass enumeration. $-phantom already fixed (ecd6defde7)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.580Z
aliases: reference_fth_drift_sync_enumeration_2026_06_21
---


# fleet-task-health #69 installer-drift -- full sync enumeration (2026-06-21, slot:golf)

Test `detectInstallerDrift: live discovery vs live KNOWN_PRISM_TASKS -- END-TO-END` (`scripts/__tests__/fleet-task-health-watch.test.mjs` ~#70) is RED. **`U-FTH-DOLLAR-SKIP` (`ecd6defde7`) fixed 1 of the items** (the `$Galaxy` phantom). The remaining sync is a 5-invariant reconciliation -- do it as a DEDICATED full-budget pass.

## Live-verified categorization (`Get-ScheduledTask`, 2026-06-21)
**REGISTERED -> add to `KNOWN_PRISM_TASKS` + `TASK_OWNER_DOMAIN`:**
- PRISM Account Switch Monitor (Ready) -> owner zulu
- PRISM CAM Tool Library Regen (Ready) -> owner kilo
- PRISM Galaxy Knowledge Iterate (Disabled) -> owner alpha (or sierra)
- PRISM Hermes Proxy (Ready) -> owner bravo
- PRISM Ollama Embed Keepalive (Disabled) -> owner india
- PRISM Zebra Orchestrator (Disabled) -> owner zulu
- PRISM Zulu Build Loop (Disabled) -> owner zulu

**NOT-REGISTERED (discovered installer, unregistered) -> add to `KNOWN_PRISM_TASKS` + `EXPECTED_UNREGISTERED_TASKS` (else aggregateHealth false-flags MISSING):**
- PRISM Daily Context Synthesis, Extraction Intake, H-Drive Vault Indexer, Index Daemon, India Transcript Mine, Knowledge Distillation, Tango Queue Reconcile, Weekly Memory Synthesis.
- NOTE: Daily Context Synthesis / India Transcript Mine / Knowledge Distillation / Weekly Memory Synthesis are ALREADY in `TASK_OWNER_DOMAIN` + `FORWARD_PROVISIONED_OWNER_TASKS`. Adding to KNOWN means REMOVING them from FORWARD_PROVISIONED (the reverse-completeness guard) -- watch that interaction. New owners: Extraction Intake->juliett, H-Drive Vault Indexer->sierra, Index Daemon->sierra, Tango Queue Reconcile->tango.

**STALE-in-KNOWN (the hard one):** `PRISM Zulu Orchestrator` is live (Ready) + crash-critical + in KNOWN, but **NO `install-*.ps1` contains the literal "PRISM Zulu Orchestrator"** (`grep -rl` = 0) -- registered dynamically/manually, so `discoverInstallerTasks` structurally cannot find it -> permanent `staleInHardcoded`. Removing it from KNOWN is WRONG (it's live crash-critical). FIX: add a documented `KNOWN_NO_INSTALLER_TASKS` allowlist that `detectInstallerDrift` excludes from `staleInHardcoded` (honest exception, NOT softening -- the task is genuinely live).

## Invariants to satisfy (run iteratively)
1. `$`-skip in discoverInstallerTasks -- DONE (ecd6defde7).
2. `missingFromHardcoded` empty: every discovered task in KNOWN.
3. `staleInHardcoded` empty: every KNOWN task discovered OR in the new no-installer allowlist.
4. owner-map completeness (forward): every KNOWN entry has a `TASK_OWNER_DOMAIN` key.
5. owner-map completeness (reverse): every `TASK_OWNER_DOMAIN` key is in KNOWN OR `FORWARD_PROVISIONED_OWNER_TASKS`.

**Why dedicated pass:** 5 interacting invariants + owner judgment + the no-installer exception need iterative test runs; attempting it at a YELLOW token budget risks a half-done multi-structure state (cut-off rule).
