# Upgrade `/forge-triple` — wire Obsidian brain + system-viz

## Context

`/forge-triple` is PRISM's engine+skill+hook creation pipeline. Today it loads three **static digest files** (`MASTER_INDEX_COMPACT.md`, `ENGINE_DIGEST.md`, `DISPATCHER_DIGEST.md`) for prior-art browsing, then hands off to `/forge-engines` → `/forge-skills` → `/forge-hooks`. A targeted survey confirmed that the **entire forge family** (`/forge-triple`, `/forge7`, `/forge-engines`, `/forge-audit-v2`) reads those static digests but **none consult the two live sources of truth** that exist:

- `prism_session:master_index_query` — unified search across the 372K-node system-viz graph + 23,981-entry Obsidian wiki + capability index + BUILD_STATE. Already shipped (`sessionDispatcher.ts:1430`).
- `scripts/system-viz-query.mjs find <name>` + `scripts/system-viz-add-node.mjs` — programmatic graph query + dashed-provisional node registration (CLEANUP-MS0/U-CLEANUP-C3, shipped). Already flushes new nodes into the live graph within 60s, bridging the ~8-min full regen.

Net effect today: the canonical "before creating, check what exists" gate runs against a stale digest, missing engines/skills/hooks that landed since the digest was last regenerated. After creation, `/system-viz` stays blind to the new asset until the next full regen (~8 min) or until someone manually invokes `system-viz-add-node.mjs`.

User intent: **wire the Obsidian brain (wiki) + system-viz graph into `/forge-triple` directly** so prior-art consult uses the live graph and new assets register into the graph immediately. This is the foundation other forge skills (`/forge7`, `/forge-engines`) can later inherit.

Standing rule (`feedback_dont_wire_for_wiring_sake_2026_05_16`): this is plugging an actual hole (confirmed by the survey), not a wiring-for-metric exercise.

## What changes

Single file edit: **`H:/prism/.claude/commands/forge-triple.md`**.

The user-tree copy at `H:/.claude/commands/forge-triple.md` is a 15-line thin launcher pointing at the project copy — **leave alone**.

No new dispatcher actions, no new scripts, no settings.json edits, no hook wiring. The upgrade is **prose + invocation blocks** that route to already-shipped tools.

### Four insertions into `forge-triple.md`

#### 1) Update Phase 0 — add live-search pointer alongside static digests

Static digests stay (they're still the cheap browse layer). Add a callout that **live search runs in Phase 0.5** and naming static digests as "browse-only, not authoritative for collisions."

#### 2) NEW Phase 0.5 — PRIOR-ART CONSULT GATE (between Phase 0 and Phase 1)

Three live queries before any forge work begins. **HARD STOP** if any signal returns a hit ≥0.75 similarity / exact-match:

```bash
PROPOSED="<EngineName or /skill-name or hook-name>"

# A. Unified master-index search (graph + wiki + capability + BUILD_STATE)
#    Use the dispatcher action — already shipped via prism_session:master_index_query
#    (sessionDispatcher.ts:1430 — signature: {query, limit?, layers?, sources?,
#     min_utilization?, min_confidence?, build_classes?})
#    Invoke via Skill tool: `master-index <PROPOSED>`  OR direct:
node -e "import('./mcp-server/dist/engines/MasterIndexEngine.js').then(async ({masterIndexEngine}) => {
  const r = await masterIndexEngine.query('$PROPOSED', { limit: 5, min_confidence: 0.65 });
  console.log(JSON.stringify(r, null, 2));
})"

# B. System-viz graph exact-collision check (~1.2s, case-insensitive node search)
node H:/prism/scripts/system-viz-query.mjs find "$PROPOSED" --json

# C. Wiki direct lookup (Obsidian brain — named-entry lookup via /wiki-query skill)

# D. Existing duplication guard (THROWS — final hard gate)
node -e "import('./mcp-server/dist/engines/DuplicationGuardEngine.js').then(({duplicationGuardEngine}) => {
  duplicationGuardEngine.mustCheckBeforeCreating({
    assetType: 'engine',         // 'skill' | 'hook' for those phases
    proposedName: '$PROPOSED',
    keywords: [/* derived from spec */],
    description: '<one-line summary>'
  });
})"
```

**Decision matrix** (in skill body):
- master-index hit score ≥0.75 OR system-viz exact-match → **STOP**. Extend existing, rename with justification, or mark `// WIRE-EXEMPT: <reason>` on the existing.
- 0.50 ≤ score < 0.75 → surface candidates, proceed only with explicit "EXTEND vs FORGE NEW" decision recorded in the engine docstring.
- score < 0.50 OR no hit → proceed.

This block runs **once per asset**, repeated at the head of Phase 3 (engine), Phase 4 (skill), and Phase 5 (hook).

#### 3) NEW post-Write registration step (appended to Phase 3, 4, 5)

After every Write of a new `.ts` engine / `.md` skill / `.mjs` hook, run:

```bash
# Engine — L5, subgroup=unwired (matches existing CLEANUP-MS0 pattern)
node H:/prism/scripts/system-viz-add-node.mjs --label "<EngineName>" --layer L5 --engine \
  --info "milestone:<MS-ID>/U-<UNIT>"

# Skill — L10
node H:/prism/scripts/system-viz-add-node.mjs --label "/<skill-name>" --layer L10 \
  --source "forge-triple-skill" --info "milestone:<MS-ID>"

# Hook — L11
node H:/prism/scripts/system-viz-add-node.mjs --label "<hook-name>" --layer L11 \
  --source "forge-triple-hook" --info "milestone:<MS-ID>"
```

Idempotent (the script dedupes by id/label against the live graph). Flushes within 60s (default `FLUSH_INTERVAL_MS = 60_000`). PID-guarded against concurrent flushes.

#### 4) NEW Phase 6.5 — WIKI INGEST POINTER (between Phase 6 and Phase 7)

Survey finding: wiki entries are **NOT** written directly by skills today — they're generated by the post-commit + hourly `regen-wiki-from-viz.mjs` pipeline from the graph. So the skill should **NOT** try to write `knowledge/wiki/architecture/<x>.md` itself (would race with the regen pipeline and likely get clobbered).

What goes in the skill instead:

```markdown
## Phase 6.5: Wiki Ingest (automatic via regen-wiki-from-viz)
After commit, the post-commit hook (or next hourly cron) regenerates the wiki
from the graph. Your new node — already registered via Phase 3.5 / 4.5 / 5.5 —
will land in `knowledge/wiki/architecture/{engines,skills,hooks}/<name>.md`
within ≤60 min. Verify with: `/wiki-query <name>`.

If the wiki entry hasn't materialized after the next post-commit:
- Check fingerprint: `cat knowledge/wiki/architecture/.skill-triggers-fingerprint`
- Force regen: `node H:/prism/scripts/regen-wiki-from-viz.mjs`
```

That's the full upgrade. No imperative wiki writing — leverage the existing pipeline.

## Files modified

| Path | Change |
|------|--------|
| `H:/prism/.claude/commands/forge-triple.md` | Add Phase 0 callout (+~5 lines), insert Phase 0.5 (~40 lines), append registration block to Phases 3/4/5 (~10 lines × 3), insert Phase 6.5 (~10 lines). Total addition ~85 lines. |

Net diff: skill grows from 179 lines → ~265 lines. Still well under any reasonable load-bearing-skill ceiling.

## Reused already-shipped infrastructure

| Surface | Source | What it does for us |
|---------|--------|---------------------|
| `prism_session:master_index_query` | `sessionDispatcher.ts:1430` | Unified search across system-graph + Obsidian wiki + capability index + BUILD_STATE |
| `scripts/system-viz-query.mjs find <name>` | already shipped | Case-insensitive graph node lookup |
| `scripts/system-viz-add-node.mjs` | CLEANUP-MS0/U-CLEANUP-C3 | Dashed-provisional node registration, 60s flush, PID-guarded |
| `duplicationGuardEngine.mustCheckBeforeCreating()` | `DuplicationGuardEngine.ts` | Throws on duplicates (final hard gate) |
| `scripts/regen-wiki-from-viz.mjs` | already shipped (post-commit + hourly cron) | Wiki regeneration from graph — already auto-fires |

## Verification

1. **Per-file scrutiny gate** — after the Edit, dispatch 2 parallel reviewer agents (Agent A: `reviewer` weighted on completeness/operator clarity, Agent B: independent `reviewer` for integration + naming + convention conformance) against the upgraded `forge-triple.md`. Fix every P0/P1 finding before declaring done.

2. **Dry-run the new Phase 0.5 prior-art block** against a known-existing engine and a known-non-existing name:
   ```bash
   # Known-existing — should return a hit
   node H:/prism/scripts/system-viz-query.mjs find "MillingPhysicsKernel" --json | head -20

   # Known-non-existing — should return empty
   node H:/prism/scripts/system-viz-query.mjs find "ZzzNonExistentEngineXyz" --json | head -10
   ```
   Confirm the "STOP / EXTEND / PROCEED" decision matrix applies correctly to both outputs.

3. **Dry-run the post-write registration** with a throwaway label:
   ```bash
   node H:/prism/scripts/system-viz-add-node.mjs --label "VerificationTestNode" --layer L5 --engine \
     --info "verification-only-2026-05-17"

   # Confirm it landed in the staging queue
   tail -3 H:/prism/state/shared/system-viz/staging/add-node-queue.jsonl

   # Wait 60s, then confirm flushed
   node H:/prism/scripts/system-viz-query.mjs find "VerificationTestNode" --json
   ```
   Cleanup happens on next full regen (graph dedupes provisional nodes that match no real asset).

4. **End-to-end smoke** — invoke `/forge-triple` with the upgrade in place, ask it to create one trivial new engine (or simulate by reading through the Phase 0.5 block manually). Confirm the live-search step runs without error and the registration step appends to the staging queue.

5. **No CLAUDE.md / memory / wiki doc-reflection in this unit** — the upgrade is a tool integration, not a new doctrine. (If the user wants a doctrine pointer added to CLAUDE.md in a follow-up unit, that's a separate task.)

## What this does NOT do (scope guardrails)

- **Does not change** `/forge7`, `/forge-engines`, `/forge-audit-v2`, or `/forge-skills` / `/forge-hooks`. Those inherit the pattern in a follow-up unit if it proves out.
- **Does not introduce** a new helper script. The four invocations stay inline; if they prove unwieldy in practice, a `scripts/forge-triple-priorart.mjs` wrapper is a P3 follow-up.
- **Does not write** wiki entries directly. Defers to the existing `regen-wiki-from-viz` pipeline.
- **Does not modify** dispatcher schemas, action enums, hook bundles, or settings.json. The skill body is the only artifact touched.
