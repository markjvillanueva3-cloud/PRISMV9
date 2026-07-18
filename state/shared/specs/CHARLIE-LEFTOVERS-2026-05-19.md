# CHARLIE LEFTOVER TASKS — compiled 2026-05-19

**Compiled by:** claude-bf3268c7 (slot charlie, fresh chat after force-take from crashed claude-a614edfb)
**Sources:** 7 most-recent charlie handoffs + 3 charlie loop-states + 36h git log
**Policy:** backend-dev-first across ALL domains (not WIRE-slot-bound), per user directive
**Status:** advisory queue for `/loop [5m] /goal` — order = priority

---

## RUNNING LOOPS (NOT ENDED — should be considered live carryover)

| sid | task | iter/target | status | last note |
|-----|------|-------------|--------|-----------|
| `b27aedbd-e3dc-4ad4-8d70-302aab2a3861` | compile charlie carryover units → queue → /loop until complete | **8/30** | `running` | R6 budget halt; iter-9 prepped |
| `1aa7ad74-6ec3-4e17-806e-c73128882fb6` | ollama-expand queue: complete current + L2b/L3 + tail | **2/20** | `running` | L2b HTTP-MCP-transport blocked, L3 needs >3B model |
| `de36f7ad-89a8-4342-a894-8910f0bbc5d3` | PIVOT tasks, skip fusion | 5/20 | `ended` | (no action — closed) |

The two `running` loops should be marked `ended` (R6-pre-empted, not abandoned) once the new loop replaces them.

---

## PRIORITY 1 — fully-prepped carryover (high signal, low setup cost)

### iter-1: **U-WIRE-WASTE-DETECTOR** [backend-dev p0]
- **Engine:** `mcp-server/src/engines/WasteDetectorEngine.ts` (exists, **0 dispatcher refs** verified)
- **Target dispatcher:** `mcp-server/src/tools/dispatchers/devDispatcher.ts`
- **Pattern:** op-discriminator (1 action `waste_detector` + inner switch — avoids z.enum bloat)
- **Singleton:** `wasteDetectorEngine`, 7 methods: `record / checkRead / checkSearch / checkOutputSize / report / oneLiner / reset`
- **WasteType enum (8 values):** `unused-read | empty-search | reverted-edit | duplicate-fetch | oversized-output | abandoned-chain | wrong-tool | stale-recheck`
- **Insertion points (per b27aedbd handoff, verify at edit time):**
  - `ACTIONS` ends ~L495 (after `ccd_compare_with_discrete`) → add `waste_detector`
  - `z.enum(ACTIONS)` ~L565
  - switch ~L585, outer default ~L9489 → insert case before
- **Schema:** `devActionSchemas.ts` `ACTION_DEV_SCHEMAS` ~L55 — `type: z.enum([8 WasteType values])` NOT `z.string` (load-bearing per [[U-WIRE-SESSION-EVENT-LOG]] regression — schema enum is what makes Parameters<> cast non-no-op at runtime)
- **Test:** `WasteDetectorEngineWiring.test.ts` — case-block-scoped source-grep + fresh-instance round-trip 7 methods
- **Commit:** `[SLOT-CHARLIE] [WIRE-UNWIRED-MS0]/U-WIRE-WASTE-DETECTOR`
- **Doc reflection:** 4-surface (CLAUDE.md regression entry if any bugs found + MEMORY.md index + wiki entry + Obsidian feed via Stop hook)

### iter-2: **U-WIRE-TOOL-CALL-THROTTLE** [backend-dev p0]
- **Engine:** `mcp-server/src/engines/ToolCallThrottleEngine.ts` (exists)
- Same op-discriminator pattern as iter-1
- Verify 0 dispatcher refs before claiming
- Sibling pattern: 8 other `ToolCall*Engine.ts` files exist (Batch, BatchOptimizer, Deduplicator, Histogram, Calloutcard, Parallelization, Pipeline) — likely audit-worthy for the same wire-status

---

## PRIORITY 2 — open backend-dev p0 queue (from `/priority-queue --pick`)

| unit | milestone | summary |
|------|-----------|---------|
| **U-CK11** | COMMAND-KERNEL-MS0 | Per-category scrutiny pass over migrated corpus |
| **U-CK28** | COMMAND-KERNEL-MS0 | Close command-utilization → auto skill-tier loop |
| **U-CK29** | COMMAND-KERNEL-MS0 | outcome → memory/vault → psk recommend learns |
| **A1 / U-DOCKER-HOOK-BROKER** | OBSIDIAN-INTELLIGENCE-MS3 | persistent prism-hooks container holds 50+ hooks warm |
| **A2 / U-REREAD-SIGNAL-FINISH** | OBSIDIAN-INTELLIGENCE-MS3 | wire Write/Edit/MultiEdit matcher so recall counter sees writes |
| **B1 / U-DAILY-CONTEXT-WORKFLOW** | OBSIDIAN-INTELLIGENCE-MS3 | morning brief synthesizer |
| **B3 / U-QUEUE-PROCESSOR** | OBSIDIAN-INTELLIGENCE-MS3 | fs.watch knowledge/memories/queue/ |
| **B6 / U-KNOWLEDGE-DISTILLATION** | OBSIDIAN-INTELLIGENCE-MS3 | monthly canonical per-topic refs distill |

**Skipped (already shipped):** U-CK15 (`f3dad18253` 09:42 today), U-CK09 (DEFERRED — low priority release-process), U-CK14 (likely already shipped — verify before claim).

---

## PRIORITY 3 — ollama-expand tail (loop-1aa7ad74 deferred items)

- **U-OE-BRIDGE-L2b** — blocked on resolving `:3100/mcp` transport surface. Not actionable until that lands.
- **U-OE-BRIDGE-L3** — full agent loop, deferred for >3B model. Not actionable on this host's memory budget.
- **Other tail items** — check loop-1aa7ad74 ticks for unfinished. (Empty ticks array — none surfaced.)

---

## DISCIPLINE — for every iter

1. **Pre-claim grep** to confirm not-already-shipped (last 24h commits).
2. **Engine-existence grep** before "wire X" claim (don't wire a phantom).
3. **R8** — read dispatcher contract + engine API + 1 sibling wiring example before edit.
4. **Per-file 2-reviewer scrutiny** after each file (multi-file builds).
5. **3-of-3 Stop gate** at Stop.
6. **`[SLOT-CHARLIE]` prefix** on every commit (slot-routed via worktree if migrated, else explicit prefix).
7. **`loop-state.mjs tick`** every iter — bookend discipline per [[loop-state-tracking-discipline]].
8. **R12 honest STATE** in handoff — never claim "shipped" without `git log -S` verify ([[reference_u_p0_u02_recovery_2026_05_18.md]] lesson).

---

## NEXT — `/loop [5m] /goal` kicks off after this file lands. Iter-1 target = **U-WIRE-WASTE-DETECTOR**.
