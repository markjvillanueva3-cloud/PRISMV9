---
name: reference-subagent-per-task-presearch-2026-05-15
description: "Per-subagent master-index + tribal pre-search (commit d7797a6e7). Every Agent-tool spawn now gets two fresh keyword-search blocks in its context bundle: top-K system-graph hits + top-K tribal-tip hits, both queried against the subagent's OWN prompt (not just the parent's). Subagent-type→tribal-domain inferred for in-domain boost (physics-reviewer→mill, lathe-*→lathe, wedm-*→wedm, cad-*→cad, cam-*→cam). Shared lib scripts/lib/master-index-search-lib.mjs (320 LOC, 7 exports, 34 tests) replaces inlined BM25 in master-index-precheck-inject.mjs (refactored 259→110 LOC) AND powers the new spawned-agent-context-lib.mjs sections. Sync-to-system-viz: mtime cache invalidates automatically when peers regenerate graph. Settings.json untouched (both consumer hooks were already wired)."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.959Z
aliases: reference_subagent_per_task_presearch_2026_05_15
---


# Per-subagent master-index + tribal pre-search (2026-05-15)

**Commit:** `d7797a6e7` (slot bravo, claude-6eac1b66, CHECKIN-UPGRADE-MS0/P4-SUBAGENT-PRESEARCH).

**Originating user directives (chronological):**
1. "auto-hook fires checkin pipeline (no slot claim) for spawned parallel agents/helpers/reviewers — they should inherit awareness inject + master-index + BUILD_STATE + tribal knowledge + AI routing to improve output quality"
2. "make sure reviewers, handlers, agents, parallel agents auto inject relevant tribal knowledge when called"
3. "master index needs updating and should always be synced to system-viz. another chat is currently expanding the system viz to match all files in h drive"

**The discovery that shaped the work:** `subagent-start-context.mjs` + `agent-rules-inject.mjs` already existed AND were wired in settings.json (`SubagentStart` matcher `*`, `PreToolUse:Task` matcher `Task`). The 391-LOC `spawned-agent-context-lib.mjs` already built a rich context bundle (awareness, BUILD_STATE, MILESTONE_PROGRESS, system-viz headline, tribal-index stats, AI ranks, lane discipline + peer claims, doctrine pointers, per-subagent-type rules) — BUT the `taskNote` (first 240 chars of subagent prompt) was used **only for the header line**, never as a search query against the knowledge corpora. Every spawned subagent got the PARENT's awareness, never per-task hits relevant to its own work.

This commit closes the gap and refactors the duplicated BM25 search to a single shared library.

## What shipped

| File | Status | Size | Role |
|------|--------|------|------|
| `scripts/lib/master-index-search-lib.mjs` | NEW | 320 LOC, 7 exports | Shared BM25-lite search over system-graph + tribal-embed-index |
| `scripts/lib/master-index-search-lib.test.mjs` | NEW | 330 LOC, 34 cases | `node --test`; 34/34 pass in 555ms |
| `.claude/hooks/master-index-precheck-inject.mjs` | REFACTORED | 259 → 110 LOC | UserPromptSubmit hook delegates to lib; behavior preserved |
| `scripts/agents/spawned-agent-context-lib.mjs` | EXTENDED | +101 LOC | Adds 2 new bundle sections + runPerTaskSearches + inferTribalDomain |

## How it composes

Two consumers, one lib:

```
parent prompt ──┐                           ┌── master-index-precheck-inject.mjs (UserPromptSubmit)
                ├──► runMasterIndexSearch ──┤
subagent task ──┘                           └── spawned-agent-context-lib.mjs (SubagentStart)
                                                  └── ALSO runs runTribalSearch
```

Both consumer hooks were ALREADY wired before this commit — settings.json untouched. The lib's pure imports + sync API mean the existing hook invocations pick up the new code on their next firing.

## Subagent-type → tribal-domain inference

`spawned-agent-context-lib.mjs` infers the tribal domain to boost from the `subagentType` parameter so the tribal hits prioritize in-domain tips. The 2x in-domain weight matches `tribal-rerank.mjs` `IN_DOMAIN_WEIGHT` convention.

| `subagentType` | Inferred domain | Notes |
|----------------|-----------------|-------|
| `physics-reviewer` | `mill` | Physics work centers on mill cutting forces |
| `mill-reviewer` | `mill` | |
| `lathe-*` | `lathe` | Substring match |
| `wedm-*` / `edm-*` | `wedm` | |
| `cad-reviewer` / `cad-*` | `cad` | |
| `cam-reviewer` / `cam-*` / `toolpath-*` | `cam` | |
| `wiring-review-agent`, `test-review-agent` | `null` (no boost) | Their work spans all domains |
| `reviewer`, `code-analyzer`, anything else | `null` (no boost) | Generic — let raw scores rank |

## Sync-to-system-viz invariant

The lib reads `state/shared/system-viz/system-graph.json` via mtime cache. When the peer chat (`claude-b6c4b196`, slot ?) expanding system-viz to cover **all files on H: drive** (the SYSTEM-VIZ-FS-COVERAGE-MS0 milestone, adding L12 filesystem leaves) completes its work, the cache invalidates automatically on the next subagent spawn — no manual refresh required.

The same invariant applies to `tribal-embed-index.json`: when `nightly-tribal-index-rebuild` cron updates the file, the next caller's mtime check sees the new mtime, re-parses, and serves fresh hits.

## Test smoke evidence

```
subagentType: "physics-reviewer"
taskNote:     "Review Kienzle force engine for chatter prediction on thin-wall pockets — verify cutting force coefficients match canonical kc1.1 values from physics/constants.ts"

## 🧭 Master-index pre-search for THIS subagent's task
Query tokens: review, kienzle, force, chatter, prediction, thin, wall, pockets
  • [L10/built] kienzle-force
  • [L10/built] kienzle-force-model
  • [L10/built] ppg-kienzle-force-validation
  • [L10/built] prism-chatter-prediction-engine
  • [L10/built] thin-wall-deflection

## 🧠 Relevant tribal knowledge for THIS subagent's task (boosted: mill)
Query tokens: review, kienzle, force, chatter, prediction, thin, wall, pockets
  • [mill/memory] project_prism_forces_naming
  • [mill/memory] PRISM Forces naming convention
  • [mill/wiki] "hyperMILL Contour Milling: If you want through pockets to be recognised..."
  • [mill/wiki] Consensus Run `f01d0ccc`
  • [general/memory] Tribal knowledge access — JM Die test shop + 3,700+ machinist tips

Bundle total: 7.1KB
```

Without the per-task injection, a `physics-reviewer` agent reviewing a chatter prediction would receive the PARENT's context — generic awareness + roadmap + safety pointers — but would have to manually grep for Kienzle / thin-wall / chatter references. Now those references arrive pre-fetched in the spawn-context, **shaving 3-5 search-tool calls per review** and improving the agent's first-pass output quality.

## Per-file scrutiny gate verdict

- **Reviewer A** (code-analyzer, content specialist): **PASS**
- **Reviewer B** (independent second-pass reviewer): **PASS**
- P3 notes (NOT blockers, log for follow-up):
  - `_resetCachesForTests` JSDoc says "Not exported from the public API surface" but the symbol is `export function` — doc-vs-code mismatch. Code matches actual usage (test imports it directly); tighten JSDoc to "test-only".
  - Fixture comment about L11+dedup ordering in test (the L11 entries never reach dedup because layer-exclude filter runs first). Test assertion is still correct.
  - No env knob `PRISM_SUBAGENT_PER_TASK_K` exposed yet — currently hardcoded to 5. Worth a follow-up env var if the bundle starts feeling sparse for review-agents.

## Knobs (env vars)

| Knob | Default | Effect |
|------|---------|--------|
| `PRISM_MASTER_INDEX_INJECT` | `1` (enabled) | UserPromptSubmit hook injection on/off (existing, unchanged) |
| `PRISM_MASTER_INDEX_K` | `5`, clamp 1-20 | Top-K hits on parent prompt (existing, unchanged) |
| `PRISM_SUBAGENT_PER_TASK_K` | `5` (hardcoded) | **PROPOSED** but NOT in this commit — top-K hits for subagent task |

## Related

- [[reference_master_index_surface]] (the original master-index master-skill from OBSIDIAN-PRISM-OS-MS0)
- [[reference_awareness_stack]] (5 other awareness layers — this one is per-subagent)
- [[reference_session_continuity_stack_2026_05_15]] (parent feature — this is the subagent extension)
- [[reference_stop_advisory_wiring_cluster_2026_05_15]] (Stop hook wiring pattern reused for thinking about hook chain insertion)
- [[feedback_parallel_scrutiny_per_file]] (the per-file gate that approved this changeset)
- [[reference_handoff_memory_seed]] (top distillations on Stop — peer's parallel work)


## Related
[[skills/helpers|/helpers]] • [[skills/reviewers|/reviewers]] • [[skills/lib|/lib]] • [[skills/master-index-search-lib|/master-index-search-lib]] • [[skills/hooks|/hooks]] • [[skills/master-index-precheck-inject|/master-index-precheck-inject]] • [[skills/agents|/agents]] • [[skills/spawned-agent-context-lib|/spawned-agent-context-lib]] • [[skills/shared|/shared]] • [[skills/system-viz|/system-viz]]