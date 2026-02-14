# PRISM Priority Roadmap
> Last Updated: 2026-02-13
> Status: F1-F8 COMPLETE. Registry items below = W5 (knowledge recovery), still pending.
> Current: 31 dispatchers, 368 actions, 3.9MB build. See MASTER_INDEX.md.

## Tier 1 — High Impact, Enables Everything Else

### 1. P0-003: Formulas Registry (10→490)
- **Why first**: Every calculation tool (cutting force, tool life, speed/feed) is crippled at 2% coverage. This is the backbone of PRISM's value proposition — manufacturing physics. Most formulas already exist in extracted JSON files, just need loading/wiring.
- **Effort**: ~1 session. Data exists, needs registry population.
- **Status**: ❌ NOT STARTED

### 2. P0-002: Machines Registry (0→824)
- **Why second**: Machine data exists in extracted files but isn't loaded. Without it, `machine_get/search/capabilities` return nothing. Users can't validate parameters against actual machine limits.
- **Effort**: ~1 session. Same pattern as formulas — load existing data.
- **Status**: ❌ NOT STARTED

### 3. P3-005: Complete Material IDs (818→3,518)
- **Why third**: Materials are the most-used registry. Going from 818 to full coverage means every material lookup works. Existing generation scripts exist in `scripts/`.
- **Effort**: ~2 sessions. Scripts exist but need running and validation.
- **Status**: ❌ NOT STARTED

## Tier 2 — Architectural Debt, Prevents Session Loss

### 4. P2-001: Append-Only State
- **Why**: Every compaction loses work. This is the #1 source of wasted sessions. Immutable event log + replay = never lose progress again.
- **Effort**: ~2 sessions.
- **Status**: ❌ NOT STARTED

### 5. P0-001: Hook Bridge (Python ↔ TypeScript)
- **Why**: Two hook systems that can't talk to each other means half the hooks are dead code. Unifying them makes the 7,114 cataloged hooks actually usable.
- **Effort**: ~1 session.
- **Status**: ❌ NOT STARTED

## Tier 3 — Nice to Have, Defer

6. P1-001: Context Compression — helpful but workarounds exist
7. P3-001 to P3-004: Monolith Extractions — valuable domain knowledge but not blocking anything
8. P1-002: ILP Combination Engine — optimization layer, not critical path
9. P2-002: Tool Masking — safety improvement, not urgent
10-14. Obsidian, Excel, session 2.11/2.12 cleanup — lowest priority
