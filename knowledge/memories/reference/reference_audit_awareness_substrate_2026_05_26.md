---
name: reference-audit-awareness-substrate-2026-05-26
description: "Audit-awareness substrate — registry + UserPromptSubmit inject + Stop 24h refresh — every chat sees relevant audits for THIS prompt's domain with 48h staleness gate"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.023Z
aliases: reference_audit_awareness_substrate_2026_05_26
---


# Audit-Awareness Substrate — shipped 2026-05-26 (slot:papa)

**Commit:** `6ef81b41e4` (cad-fusion-live-ms0, BOOTSTRAP-SLOT-ENFORCE)
**Milestone:** SYSTEM-AUDIT-AWARENESS · 3 units: U-AUDIT-REG + U-AUDIT-INJECT + U-AUDIT-CADENCE
**Slot:** papa · session `claude-47501b2a` · `/checkin /goal /loop /yolo`

## What

Three-piece substrate that gives every PRISM chat automatic visibility into the existing 184-audit / 24-domain surface with a 48h staleness gate. Closes the user directive _"make all other chats auto-remember we have audits of specific domains"_ + _"audits utilized on a 2-day time frame"_.

1. **`scripts/build-audit-registry.mjs`** (268 LOC) — scans 36 `audit-*.mjs` + state sidecars + 4 audit dirs → `state/shared/AUDIT-REGISTRY.json`. First run: 184 audits / 11 fresh / 2 warn / 171 stale / 24 domains.
2. **`.claude/hooks/audit-awareness-inject.mjs`** (161 LOC, T2 UserPromptSubmit) — keyword-tokenizes the prompt against 25 domain patterns; surfaces top-K (default 3) audits with staleness tag + sidecar path + re-run hint. Silent on no-match.
3. **`.claude/hooks/stop-audit-registry-refresh.mjs`** (51 LOC, T3 Stop) — detached fire-and-forget regen on 24h throttle. Hard-fail-safe.

## Why

- PRISM had 36+ audit scripts with **no canonical inventory** — chats re-derived from scratch every session
- 171/184 audits were >48h stale at first registry generation — invisible inefficiency surface
- No cross-slot visibility: alpha/bravo/sierra/golf working independently couldn't see audit coverage for their domains

## How to apply (golf wiring, dormant until done)

Add to `C:/Users/wompu/.claude/settings.json` (c-to-h-mirror auto-replicates):

```json
// UserPromptSubmit, after master-index-precheck-inject:
{ "matcher": "*", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/audit-awareness-inject.mjs", "timeout": 4000 }] }
// Stop, T3 advisory cluster:
{ "matcher": "*", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/stop-audit-registry-refresh.mjs", "timeout": 3000 }] }
```

Verify: `echo '{"prompt":"check the hook wiring"}' | node H:/prism/.claude/hooks/audit-awareness-inject.mjs` → must emit `hookSpecificOutput.additionalContext` listing audit-hook-stack-cost + 2 sibling hook audits.

## Knobs

- `PRISM_AUDIT_REG_STALE_HRS=48` — staleness gate (default 48 = 2-day cadence)
- `PRISM_AUDIT_AWARENESS_DISABLE=1` — disable inject hook
- `PRISM_AUDIT_AWARENESS_K=N` — top-K audits per prompt (1-8, default 3)
- `PRISM_AUDIT_AWARENESS_VERBOSE=1` — include lastRunIso + ageHrs
- `PRISM_AUDIT_REG_REFRESH_DISABLE=1` — disable Stop auto-refresh
- `PRISM_AUDIT_REG_REFRESH_THROTTLE_MS=N` — refresh cadence (default 24h)

## Sister entries

- [[reference_master_index_surface]] — orthogonal (graph-side vs audit-side)
- [[reference_close_out_audit_2026_05_13]] — close-out is one of 24 covered domains
- [[reference_awareness_stack]] — per-session snapshot vs this per-prompt inject
- [[reference_psn_aggregator_shapes_2026_05_26]] — same papa session, sister substrate fix

## Known limitations + follow-up

1. **stdout-only audits don't credit freshness** — several audits don't emit JSON sidecars; the registry can only credit sidecar mtime. Follow-up unit: `U-AUDIT-SIDECAR-CONVENTION`.
2. **Domain inference is name-based** — regex over script names; can mis-classify a multi-domain audit.
3. **No semantic prompt match yet** — regex tokenizer; embedding-based match is a future upgrade.
4. **24h Stop refresh ≠ audit re-run cadence** — Stop refreshes the manifest, not the underlying audits. Genuine cadence enforcement needs `U-AUDIT-AUTO-RERUN`.
5. **No master-index cross-wire yet** — would boost any system-graph hit that has a stale audit pointing at it. Track as `U-AUDIT-MASTER-INDEX-WIRE`.

## Wiki

[[audit-awareness-substrate]] (knowledge/wiki/architecture/audit-awareness-substrate.md)

## Source

- Commit: `6ef81b41e4`
- Memo: `state/shared/RECENT-SHIPMENTS-2026-05-26-papa.md` (golf-drain inbox)
- Files: 5 (3 code + 1 generated JSON + 1 memo); 3683 lines insertions
