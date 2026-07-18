---
name: "dedup"
description: "Check for duplicates before creating engines/algorithms/formulas/actions"
policy:
  tier: 0
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "create engine"
      - "new engine"
      - "build engine"
      - "add algorithm"
      - "new formula"
      - "new hook"
  mode: "block"
  priority: 95
  timeout_ms: 5000
  token_budget: 300
---

# Engine Deduplication Scanner

Scan the engine registry for duplicate or overlapping engines that should be consolidated.

## Usage
- `/dedup` — Full scan of all engines for overlap groups
- `/dedup CuttingForceEngine` — Check a specific engine name for duplicates

## Procedure

### 1. Load ENGINE_DIGEST.md
Read `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` to get the full engine list.

### 2. Run Overlap Scan
If a candidate engine name was provided:
- Call `prism_dev:engine_overlap_scan` with `candidate_name` set to the argument
- Report overlapping engines and whether the candidate is safe to create

If no argument:
- Call `prism_dev:engine_overlap_scan` with no candidate (full scan mode)
- Report all duplicate groups found

### 3. For Each Duplicate Group Found
- Read the description of each engine in the group from ENGINE_DIGEST.md
- Determine which engine is canonical (most complete, most wired, most tested)
- Report recommended consolidation action:
  - **MERGE**: Features from engine B should be merged into engine A
  - **DEPRECATE**: Engine B is a strict subset of engine A, deprecate B
  - **KEEP**: Engines serve genuinely different purposes despite similar names

### 4. Output Report
```
Engine Deduplication Report
===========================
Total engines scanned: [N]
Duplicate groups found: [N]

Group 1: [EngineA, EngineB]
  Canonical: EngineA (reason)
  Action: MERGE/DEPRECATE/KEEP

Group 2: ...
```

### 5. Suggest Next Steps
If duplicates found:
- "Run Session 5-7 pattern: merge unique features into canonical engine, add @deprecated to duplicates, update dispatcher routing"
- Reference the U-CONSOL1/U-CONSOL2 consolidation pattern in ShopSchedulerEngine.ts
