# Auto-Registration Pipeline — Architecture Document

## Overview

The PRISM auto-registration pipeline ensures new components (engines, dispatchers, schemas, algorithms, registries, services) are automatically detected, integrated, and documented. It operates across three layers.

## Three-Layer Architecture

### Layer 1: Real-Time Detection (Hookify)

**Trigger**: PostToolUse on `Edit`/`Write` tools
**Rule**: `hookify.master-index-drift.local.md`
**Pattern**: Matches `file_path` against `mcp-server/src/(engines|tools/dispatchers|services|schemas|algorithms|registries)/[A-Z]`

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ Claude writes │───>│ PostToolUse hook  │───>│ hookify rule engine  │
│ a new engine  │    │ event: "file"     │    │ master-index-drift   │
└──────────────┘    └──────────────────┘    └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │ WARNING displayed:   │
                                            │ "Check MASTER_INDEX" │
                                            │ "Check dispatcher"   │
                                            │ "Check roadmap"      │
                                            └─────────────────────┘
```

**Fix Applied (SYS-MS3-U00)**: Original rule matched against `new_text` (file content) instead of `file_path`. Fixed to use explicit `conditions` with `field: file_path`.

### Layer 2: Completion Integration (/pick-task Checklist)

**Trigger**: Unit completion during `/pick-task` or `/autopilot` workflow
**Steps**: 11-step completion checklist (4 sections)

```
┌────────────────┐
│ Unit complete   │
└───────┬────────┘
        │
        ▼
┌─── A: Roadmap State (3 steps) ────────────────────────┐
│ 1. Unit status → "complete" in envelope                │
│ 2. completed_units++ in roadmap-index.json             │
│ 3. Milestone status → "complete" if all units done     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌─── B: Claim Release (2 steps) ────────────────────────┐
│ 4. Remove claims/{milestoneId}/{unitId}/               │
│ 5. Remove state/ACTIVE_CLAIM.json                      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌─── C: Auto-Register Products (4 steps) ───────────────┐
│ 6. MASTER_INDEX.md — add new component, update counts  │
│ 7. Dispatcher wiring — verify engine exposed via action│
│ 8. Registry registration — data files loaded           │
│ 9. Orchestration registration — roadmap_register       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌─── D: Position Update (2 steps) ──────────────────────┐
│ 10. CURRENT_POSITION.md — results summary              │
│ 11. Note any MASTER_INDEX/dispatcher changes           │
└───────────────────────────────────────────────────────┘
```

### Layer 3: Post-Hoc Audit (/audit-task)

**Trigger**: Manual invocation or `/autopilot` scrutinization loop
**Output**: `state/audits/{milestoneId}/audit-summary.json`

```
┌────────────────┐    ┌──────────────────────────────────┐
│ /audit-task     │───>│ 5-Check Audit Protocol           │
│  {milestoneId}  │    │                                  │
└────────────────┘    │ 3a. Structural integrity         │
                      │ 3b. Code quality (TS, any, TODO) │
                      │ 3c. Wiring verification          │
                      │ 3d. Functional gap check         │
                      │ 3e. Enhancement opportunities    │
                      └──────────────┬───────────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────────┐
                      │ Findings classified:              │
                      │ CRITICAL → fix immediately        │
                      │ MAJOR → fix or defer              │
                      │ MINOR/ENHANCEMENT → log           │
                      │                                   │
                      │ Saved to:                         │
                      │ state/audits/{ms}/audit-summary   │
                      └──────────────────────────────────┘
```

## Sequence Diagram — Full Pipeline

```
 Claude Session          Hookify              /pick-task            /audit-task
      │                    │                      │                     │
      │──Write engine──>   │                      │                     │
      │                    │                      │                     │
      │  <──WARNING────────│                      │                     │
      │  "Check INDEX"     │                      │                     │
      │                    │                      │                     │
      │  ... more work ... │                      │                     │
      │                    │                      │                     │
      │──unit complete────────────────────────>   │                     │
      │                    │                      │                     │
      │                    │    ┌─ A: update envelope + index           │
      │                    │    │  B: release claim                     │
      │                    │    │  C: register in MASTER_INDEX          │
      │                    │    │     wire dispatcher                   │
      │                    │    │     register in orchestration         │
      │                    │    │  D: update CURRENT_POSITION           │
      │                    │    └──────────────────┤                    │
      │                    │                      │                     │
      │  <──complete───────────────────────────   │                     │
      │                    │                      │                     │
      │── later: audit ───────────────────────────────────────────>    │
      │                    │                      │      ┌─ 5 checks   │
      │                    │                      │      │ findings    │
      │                    │                      │      │ save JSON   │
      │                    │                      │      └─────────    │
      │  <──findings──────────────────────────────────────────────     │
      │                    │                      │                     │
```

## Verification Results (SYS-MS3-U00)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | hookify master-index-drift | **FIXED** | Was matching `new_text` not `file_path`; corrected to explicit conditions |
| 1 | PostToolUse event routing | Verified | `Edit`/`Write` → `event=file` → loads file-type rules |
| 1 | Rule engine pattern matching | Verified | 6 test cases: 3 correct MATCH, 3 correct NO MATCH |
| 2 | /pick-task completion checklist | Verified | 11 steps, all reference valid paths |
| 2 | ACTIVE_CLAIM.json | Verified | File exists at expected path |
| 2 | Claims directory | Verified | `data/claims/` structure documented |
| 3 | /audit-task protocol | Verified | 5-check protocol, findings → `state/audits/` |
| 3 | Audit output schema | Verified | JSON schema with CRITICAL/MAJOR/MINOR/ENHANCEMENT |

## File Paths

| File | Purpose |
|------|---------|
| `~/.claude/hookify.master-index-drift.local.md` | Layer 1 detection rule |
| `~/.claude/commands/pick-task.md` | Layer 2 completion checklist |
| `~/.claude/commands/audit-task.md` | Layer 3 audit protocol |
| `state/ACTIVE_CLAIM.json` | Active task claim for heartbeat |
| `data/claims/{ms}/{unit}/claim.json` | Per-unit claim lock |
| `state/audits/{ms}/audit-summary.json` | Audit findings output |
| `data/docs/MASTER_INDEX.md` | Component registry |
| `data/roadmap-index.json` | Milestone/unit status |
| `state/CURRENT_POSITION.md` | Session position tracker |
