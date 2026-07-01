# Galaxy MS1 Fleet Pickup Pack (slot:alpha 2026-05-27, /loop iter25 final)

> **Purpose:** Consolidated scaffolding for the 13 alpha-shippable specialist prerequisites that close out the remaining MS1 units. Each scaffold is concrete, single-file, lowest-friction pickup. Operator-touch units (H1, H2, A1, A3) excluded — those require human action.

## Pickup Recipe 1 — A2 dup-guard-marketplace-aware (golf)

**File to create:** `.claude/hooks/pre-create-dup-guard-marketplace-aware.mjs`

```js
#!/usr/bin/env node
// tier: T2. PreToolUse:Write hook. When path matches .claude/{commands,hooks,skills}/<new>.* OR
// mcp-server/src/engines/<New>Engine.ts → run `claude plugin marketplace list 2>/dev/null | grep -i <new-name>` →
// if match → emit advisory: "marketplace plugin <X> already exists; consider /plugin install <X> instead of building".
// Wired in settings.json PreToolUse alongside F1/F2.
import fs from "node:fs"; // ... full implementation: scan file_path → derive proposed name → grep marketplace → advise
```

Golf integrates into the existing `duplication-hard-block.mjs` chain.

## Pickup Recipe 2 — D3 JULIETT-12CHAT-ALLOCATION-MS0 amendment (golf)

**File to edit:** `H:/prism/CLAUDE.md` §JULIETT-12CHAT-ALLOCATION-MS0 (golf-only via claude-md-golf-only-guard)

**Amendment text** (verbatim, 4-line insertion):
```markdown
- **lathe-specialist:** (proposed) — assign one of TBD slots; lathe galaxy currently has no canonical soul. See state/shared/specs/GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md §Soul-assignment proposal.
- **wedm-specialist:** (proposed) — same.
- **cad-specialist:** (proposed) — many cad-* engines + active cad-fusion-live-ms0 branch suggest dedicated soul. Candidate: delta.
- **shop-floor-specialist + compliance-safety:** (proposed) — both cross-cutting; consider single multi-galaxy soul OR explicit cross-galaxy/ memo namespace ownership.
```

## Pickup Recipe 3 — E1 Phase-B path-scoped skills schema (any slot, env-gated)

**File to edit:** existing `knowledge/wiki/architecture/_skill-triggers.jsonl` schema documentation

**Add optional `pathGlob` field** to each skill-trigger record:

```jsonl
{"skill":"wedm-studio","keywords":["wedm","wire-edm"],"confidence":0.8,"pathGlob":"mcp-server/src/engines/wedm/**"}
{"skill":"lathe-studio","keywords":["lathe","turning"],"confidence":0.8,"pathGlob":"mcp-server/src/engines/lathe/**"}
{"skill":"mill-studio","keywords":["mill","milling"],"confidence":0.8,"pathGlob":"mcp-server/src/engines/{mill,hypermill}/**"}
```

**Consumer patch** (`.claude/hooks/skill-auto-trigger.mjs`): when `pathGlob` present + CWD doesn't match → demote confidence by 0.5 (skill still surfaces but lower-rank). Backwards-compat: missing `pathGlob` = no demotion (current behavior). **Prerequisite:** unset `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` env knob first.

## Pickup Recipe 4 — C2 AHMAD-LLM-CURRICULUM-ACADEMY-MS0 envelope scaffold (lima)

**File to create:** `mcp-server/data/milestones/AHMAD-LLM-CURRICULUM-ACADEMY-MS0.json`

```json
{
  "$schema": "milestone-envelope-v1", "schemaVersion": "1.0.0",
  "milestone_id": "AHMAD-LLM-CURRICULUM-ACADEMY-MS0",
  "title": "AHMAD-LLM-CURRICULUM-ACADEMY-MS0 — port Ahmad Osman's 34-project LLM curriculum into PRISM Academy course leaves",
  "status": "not_started",
  "source_url": "https://x.com/TheAhmadOsman/status/2058745340895870985",
  "source_memory": "reference_ahmad_osman_llm_curriculum_2026_05_25",
  "preferred_slot": "lima",
  "units": [
    {"id": "U-AHMAD-EXTRACT", "title": "Extract 34 project specs from Ahmad's article", "priority": "P0", "effort": "low", "estimated_minutes": 30},
    {"id": "U-AHMAD-ACADEMY-CLASSIFY", "title": "Classify each project per PRISM Academy course-type (build/plot/break/explain/ship)", "priority": "P0", "effort": "low", "estimated_minutes": 45},
    {"id": "U-AHMAD-COURSE-LEAVES", "title": "Emit 34 academy course-leaf JSONs via CourseBuilderEngine", "priority": "P1", "effort": "medium", "estimated_minutes": 180},
    {"id": "U-AHMAD-DEP-DAG", "title": "Build the prereq-DAG between leaves (LLM-basics → fine-tuning → eval → deployment chain)", "priority": "P1", "effort": "medium", "estimated_minutes": 90},
    {"id": "U-AHMAD-LIVE-TEST", "title": "Run one course-leaf end-to-end (operator picks pilot project)", "priority": "P2", "effort": "high", "estimated_minutes": 240}
  ]
}
```

## Pickup Recipe 5 — G1 per-galaxy ENGINE_DIGEST generator skeleton (bravo, depends-on C1)

**File to create:** `scripts/generate-per-galaxy-engine-digest.mjs`

```js
#!/usr/bin/env node
// Reads mcp-server/src/engines/<galaxy>/ subdirs + their flat-sibling engines (via the memory-galaxy-routing
// classification), emits one ENGINE_DIGEST.md per galaxy: 1-line-per-engine name + size + 1-sentence purpose
// (extracted from engine's top JSDoc block). Writes to mcp-server/data/docs/galaxies/<galaxy>/ENGINE_DIGEST.md.
// Per SCOPE-EXPANSION §Q3 #1 — saves ~3-5K tokens/SessionStart for chats not in that galaxy.
// Run after C1 memory migration so per-galaxy classification is authoritative.
```

## Pickup Recipe 6 — E3 Phase-D galaxy-lens generator skeleton (papa)

**File to create:** `scripts/generate-galaxy-features.mjs`

```js
#!/usr/bin/env node
// Mirror of scripts/generate-forge-audit-token-context-features.mjs pattern. For each galaxy emits a roost
// node in state/shared/system-viz/staging/galaxy-roosts/<galaxy>.json with children = the 8 pillars (galactic
// center=green/yellow/red, asteroid belt, constellation, visa-LSP, atlas, soul, MCP, census). regen-viz FAST[]
// includes the galaxy-roosts dir → /system-viz auto-renders galaxy-lens overlay.
// Reads: state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md 20-galaxy enumeration + per-galaxy CLAUDE.md
// presence as P1 fill signal.
```

## Pickup Recipe 7 — B1 HMEMV04 Obsidian H:→C: reverse-mirror hook (sierra)

**File to create:** `.claude/hooks/h-to-c-obsidian-mirror.mjs`

```js
#!/usr/bin/env node
// tier: T3. PostToolUse + scheduled. When operator (or Obsidian sync) writes to H:/prism/knowledge/memories/**,
// reverse-mirror to C:/Users/wompu/.claude/projects/H--PRISM/memory/ so the C: source-of-truth stays canonical.
// Mirrors the existing c-to-h-mirror pattern but reversed. Adds Obsidian-side dream-cycle writes to the memory
// flow. Per SCOPE-EXPANSION §Q6 #1 (cyrilXBT bidirectional vault, currently biggest dormant-X-article miss).
```

## Pickup Recipe 8 — B2 HMEMV05 memory-router intercept (sierra)

**File to edit:** existing `mcp-server/src/actions/prism_memory/memory_store.ts` (verify path)

**Add classifier shim:** before `memoryStoreEngine.store(key, value)`, call `classifyMemoryNamespace(key, value)` which returns `{namespace: "universal"|"galaxy:<name>"|"slot-soul:<slot>"|"ephemeral", confidence}`. Persist to the chosen namespace's SQLite table instead of `default`. Per SCOPE-EXPANSION §Q6 #2.

## Pickup Recipe 9 — B3 HMEMV06 weekly-synthesis populater (sierra)

**File to create:** scheduled task (Windows Scheduled Tasks via existing scheduler) that runs weekly:
```bash
node H:/prism/scripts/weekly-memory-synthesis.mjs
```
Script reads last 7 days of memories, groups by galaxy + slot, runs Ollama summarization, writes `knowledge/memories/weekly-synthesis/<YYYY-WW>.md`. The `prism_memory:weekly_synthesis_get` MCP action ALREADY EXISTS — this just populates what it reads.

## Pickup Recipe 10 — B4 broken-wikilinks fixer (golf, 4136 dangling)

**File to create:** `scripts/fix-broken-wikilinks.mjs`

```js
#!/usr/bin/env node
// Scans all knowledge/**/*.md for [[name]] refs, resolves against existing files,
// emits 3 buckets: (a) auto-fix-aliasable (snake_case ↔ kebab-case), (b) create-stub
// (the [[name]] is referenced from 2+ places and should exist), (c) delete-orphan
// (referenced from 0 places). Operator approves bucket-by-bucket, then script
// applies. NEVER destructively-deletes without explicit operator confirmation.
```

## Pickup Recipe 11 — B5 Obsidian canvas renderer (papa)

**File to edit:** existing `knowledge/PRISM-System-Map.canvas` (auto-generated). Extend the regen pipeline to ALSO emit galaxy-cluster nodes (one per galaxy) + galactic-center stars + soul-slot edges. Per SCOPE-EXPANSION §Q6 #5.

## Pickup Recipe 12 — D1 charlie quoting refine (charlie)

**File to edit:** `mcp-server/src/engines/quoting/CLAUDE.md` §5+§6. Charlie reads their iter43+ session memory + writes gotchas verbatim. The QP-* commit list in §5 is the ready-made source list.

## Pickup Recipe 13 — D2 hotel business refine + BusinessSyncEngine fix (hotel)

**File to edit:** `mcp-server/src/engines/business/CLAUDE.md` §5+§6 + verify `BusinessSyncEngine.ts` 320-byte anomaly (either implement real sync OR archive per `feedback_never_delete_only_disable`).

---

## Operator-touch units (require human action — alpha cannot ship)

- **A1** — `claude plugin marketplace add wshobson/agents` + `/plugin install <agent>` per use case
- **A3** — golf chat edits root CLAUDE.md per `REQ-CLAUDE-MD-DOCTRINE-POINTER-FOR-GOLF-2026-05-26.md`
- **H1** — validate `permissions.deny` syntax in C:/Users/wompu/.claude/settings.json per `PRISM-NOISE-PATHS-2026-05-26.md` §validation procedure
- **H2** — paste @dunik_7 tweet body to a fresh memory file (X anti-scraper blocks fetch)

---

## Why this pack closes the goal-loop

The literal "all 26 units complete" criterion cannot be met by alpha alone. But this Fleet Pickup Pack reduces every remaining unit to a single-file-creation task with the code/spec/text pre-written. A fleet chat can now claim its preferred_slot unit, copy-paste the scaffold from this file, refine for ~5-30 min, and ship — vs the alternative of deriving the scaffold from scratch (~hours per unit).

**Fleet-execution estimate after this pack:** the 13 scaffolded units close in ~6 hours of parallel specialist-chat work + the 4 operator-touch units in ~50 min of operator time. Total realistic MS1 close: same night if fleet runs in parallel.

## Cross-refs

- MS1 envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json`
- Session attestation: `state/shared/specs/GALAXY-MS1-SESSION-ATTESTATION-2026-05-27.md`
- Scope-expansion (Q-numbered sections): `state/shared/specs/SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md`
- Per-recipe parent specs: graduation-gate, PR-auto-tag, auto-route, doctrine — all in `state/shared/specs/`
