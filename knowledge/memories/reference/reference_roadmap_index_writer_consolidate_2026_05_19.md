---
name: reference-roadmap-index-writer-consolidate-2026-05-19
description: U-ROADMAP-INDEX-WRITER-CONSOLIDATE — 5 roadmap-index.json writers unified onto scripts/lib/atomic-json.mjs
aliases: reference_roadmap_index_writer_consolidate_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.146Z
---


2026-05-19 slot bravo (claude-df944902), unit `U-ROADMAP-INDEX-WRITER-CONSOLIDATE` (DEV-TOOL-CONFLICT-AUDIT F4).

`mcp-server/data/roadmap-index.json` had 5 writer scripts each with its own copy of the write primitive — 4 used a FIXED `${path}.tmp` suffix, so two concurrent runs targeting the same file clobbered each other's temp (silent wrong data + ENOENT on the loser's rename).

**Fix:** new shared helper `scripts/lib/atomic-json.mjs` → `atomicWriteJson(filePath, obj, {trailingNewline=true, fsImpl})`: per-PID temp sibling (kills the collision), intra-fs atomic rename, orphan-temp unlink + rethrow on rename failure (R12), throws-before-write on non-serializable input. All 5 writers (`reconcile-milestones`, `register-devtools/revenue-roadmap-envelopes`, `reconcile-roadmap-drift`, `close-out-milestone`) now import it; close-out dropped its private copy and re-exports the import. 3 writers converged onto a trailing `\n` (was inconsistent).

**Verify:** `node --test scripts/lib/atomic-json.test.mjs` → 15/15; `node scripts/close-out-milestone.mjs --self-test` → 25/25.

**Stale-doc lesson (R8):** the CLAUDE.md regression entry's `grep -L "atomicWriteJson"` verify command was a false-positive — it greps the helper *name* but the scripts had already achieved atomicity *inline*; read the code, not the proxy. The genuine residual was the fixed-`.tmp` collision + DRY consolidation.

**Follow-ups (out of scope):** `extract-domain-pipeline-units.mjs:342` carries a 6th private copy (writes envelopes); register-* envelope writes still raw. CLAUDE.md update is a patch-sibling (`state/shared/dashboards/patches/CLAUDE-MD-PATCH-U-ROADMAP-INDEX-WRITER-CONSOLIDATE.md`) — CLAUDE.md was peer-dirty.

Related: [[feedback_prioritize_devtools_backend]] · [[feedback_verify_actual_contract_not_proxy]]
