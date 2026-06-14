---
name: reference_obsidian_backend_audit_session_gate_2026_06_09
description: "Token-savings win (clause-2): session-gated the static backendAudit route-suggest nudge in mcp-route-suggest.mjs — was pushed on EVERY backend-file edit (4052 fires / 3 takeups = 0.07%, byte-identical text), now fires once/session via a _BACKEND_AUDIT_SESSION_KEY sentinel mirroring the doctrineSurface gate. 3-of-3 PASS. Twin of the same-day doctrineSurface per-session fix."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.230Z
aliases: reference_obsidian_backend_audit_session_gate_2026_06_09
---


# backendAudit route-suggest session-gate (2026-06-09, slot:alpha)

Commit `a9052f63b0` ([OBSIDIAN-VAULT-SYNERGY]/U-OBS-BACKEND-AUDIT-SESSION-GATE).
The verified token-savings win surfaced by a fresh ultracode/hermes/system-viz/PSN
discovery Workflow (`wj93a7mu3`) — clause-2 of the standing /goal. Twin of the
same-day doctrineSurface per-session fix ([[reference_route_suggest_per_session_gate_2026_06_09]]).

## The waste
`mcp-route-suggest.mjs` pushed a "Backend audit:" nudge on EVERY edit of a
`mcp-server/src/{engines,tools/dispatchers,schemas}/*.{ts,js}` file. The message is
STATIC — `AUDIT_CHAIN_CMD` (:350) ends in a literal `<path>`, never interpolated — so
a /loop editing N backend files re-injected the byte-identical block N times.
Telemetry: **4052 fires / 3 takeups (0.07%)**. ~315 genuine tok/session of pure repeat.

## The fix (~6 lines, mirror an already-shipped sibling)
Add `const _BACKEND_AUDIT_SESSION_KEY = "__backend_audit_session__";` next to the
doctrine sentinel; wrap the `isBackendFile(filePath)` push in
`if (!_doctrineRecentlySeen(sessionId, _BACKEND_AUDIT_SESSION_KEY)) { push; _markDoctrineSeen(...) }`
— the exact pattern proven by the doctrineSurface gate at the bottom of the same fn.
Reuses the same `_doctrineRecentlySeen`/`_markDoctrineSeen` helpers + the same
per-session `PRISM_DOCTRINE_RATE_FILE` store (R11 — no new dependency). Keyspace is
`${sessionId}:${key}`, so the two sentinels (`__backend_audit_session__` vs
`__doctrine_session__`) are independent map entries — no cross-suppression.

## Zero info lost (reviewer-verified, not asserted)
First fire still pushes the message → `_classifierFromMessage` maps it to
`backendAuditChain` → enqueued to the Stop defer-queue (`backendAuditChain` IS in
`DEFERRABLE_CLASSIFIERS`, defer-queue.mjs:28-29) → `stop-defer-queue-drain` surfaces it
once at session-end. Gated fires don't re-defer, but the first already did →
exactly-once in the queue. The gate even REDUCES defer-queue bloat (N near-dup
entries distinguished only by filePath → 1). Fail-OPEN: a corrupt/failed sentinel
store re-fires (degrades to old behavior, never permanently suppresses).

## Tests (R9, mutation-proven by reviewer B)
New `mcp-route-suggest-backend-audit-gate.test.mjs` — 4 subprocess-integration tests:
first-fire emits · 2nd-same-session gated · fresh-session re-fires · DISTINCT-sentinel
independence (doctrine Read does NOT consume the backend sentinel). Removing the gate
makes #2+#4 FAIL (verified live). Hermetic: per-process `PRISM_DOCTRINE_RATE_FILE` +
pid+counter sessionId (no Date.now/random). Sibling doctrine-gate 4/4 unregressed.

## RESIDUAL (honest, R12)
P3 cosmetic only: the in-code comment cites the doctrine gate at `:679` but insertion
shifted it to ~`:688` — stale line-ref, not load-bearing. Deferred under R6 budget
ceiling (not worth an edit+commit+rescrutiny cycle for a cosmetic).
