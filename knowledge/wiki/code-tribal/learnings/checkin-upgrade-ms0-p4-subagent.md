# CHECKIN-UPGRADE-MS0/P4-SUBAGENT — [MAIN] [CHECKIN-UPGRADE-MS0]/P4-SUBAGENT-PRESEARCH: per-task master-index + tribal injection

**Commit:** `d7797a6e700b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T12:56:31-05:00
**Tags:** checkin-upgrade-ms0, p4-subagent, auto-distilled

## Subject
[MAIN] [CHECKIN-UPGRADE-MS0]/P4-SUBAGENT-PRESEARCH: per-task master-index + tribal injection

## Body
```
[MAIN] [CHECKIN-UPGRADE-MS0]/P4-SUBAGENT-PRESEARCH: per-task master-index + tribal injection

User directives (2026-05-15 session, slot bravo, claude-6eac1b66):
  1. "auto-hook fires checkin pipeline for spawned parallel agents/helpers/
     reviewers — they should inherit awareness inject + master-index +
     BUILD_STATE + tribal knowledge + AI routing to improve output quality"
  2. "make sure reviewers, handlers, agents, parallel agents auto inject
     relevant tribal knowledge when called"
  3. "master index needs updating and should always be synced to system-viz.
     another chat is currently expanding the system viz to match all files
     in h drive"

DISCOVERY: subagent-start-context.mjs + agent-rules-inject.mjs already
existed AND were wired in settings.json (SubagentStart matcher "*"). The
shipped spawned-agent-context-lib.mjs (391 LOC) injected awareness, BUILD_
STATE, MILESTONE_PROGRESS, system-viz, tribal-index stats, AI ranks, lane
discipline, doctrine pointers, per-subagent-type rules — BUT had a high-
value gap: the `taskNote` (first 240 chars of subagent prompt) was used
only for the header line, never as a search query against the knowledge
corpora. Every spawned subagent got the PARENT's awareness, never per-task
hits relevant to its own work.

THIS COMMIT closes that gap and refactors the duplicated BM25 search.

Files:

1. scripts/lib/master-index-search-lib.mjs (NEW, 320 LOC, 7 exports)
   Shared keyword search lib. BM25-lite weighted scoring matching the
   in-hook constants verbatim. Two corpora:
   - system-graph.json (mtime-cached, layer-excluded, label-deduped)
   - tribal-embed-index.json (keyword path; embeddings stripped during
     load — keyword-only, network-free; Ollama nomic-cosine path stays
     in tribal-rerank.mjs CLI for the deeper recall)
   Process-lifetime mtime cache: subsequent calls with same path+mtime
   return the SAME wrapper object (reference-stable per scrutiny). Cache
   auto-invalidates when peers regenerate the graph (e.g., SYSTEM-VIZ-
   FS-COVERAGE-MS0 expanding L12 filesystem leaves) — no manual sync.
   Pure (no I/O on import). Failures return [] (never throw).

2. scripts/lib/master-index-search-lib.test.mjs (NEW, 330 LOC, 34 cases)
   Real-value coverage: tokenize stopwords/dedup/floor/cap/unicode/null,
   loadGraph mtime-cache stability + invalidation + null-on-malformed,
   searchGraphHits weighted scoring + L9/L11 exclusion + label dedup,
   loadTribalIndex embedding-strip + cache, searchTribalHits prefDomain
   2x boost, end-to-end runMasterIndexSearch / runTribalSearch with
   sub-2-token + missing-file short-circuits. 34/34 pass in 555ms via
   `node --test` (matches helpers/ test pattern).

3. .claude/hooks/master-index-precheck-inject.mjs (REFACTORED, 259→110 LOC)
   UserPromptSubmit hook delegates to the new lib. Behavior preserved:
   same weights (W_LABEL/W_ID/W_INFO/W_VAULT), same STOPWORDS, same
   DEFAULT_EXCLUDED_LAYERS, same dedup. Smoke-test verified: 5 hits for
   "kienzle cutting force model" matches pre-refactor output.

4. scripts/agents/spawned-agent-context-lib.mjs (EXTENDED, +101 LOC)
   buildSpawnedAgentAdditionalContext() now adds two new sections AFTER
   "## Knowledge surfaces you can query" and BEFORE "## Doctrine & memory":
     - "## 🧭 Master-index pre-search for THIS subagent's task"
     - "## 🧠 Relevant tribal knowledge for THIS subagent's task"
   Both use the subagent's prompt (full 1200 chars, not the 200-char header)
   as the query. Subagent-type → tribal-domain inferred via explicit table
   (physics-reviewer→mill, lathe-*→lathe, wedm-*→wedm, cad-*→cad, cam-*→cam,
   wiring/test-review-agent→null/no-boost) + fuzzy substring fallback.
   Smoke-test verified: physics-reviewer task on "Kienzle force engine
   chatter thin-wall" returns 5 master-index hits (kienzle-force, prism-
   chatter-prediction-engine, thin-wall-deflection) + 5 tribal tips (mill-
   boosted: PRISM Forces naming convention, hyperMILL contour milling).
   Bundle 7.1KB total — within harness context budget.

Per-file scrutiny gate (per CLAUDE.md PER-FILE SCRUTINY GATE):
  - Reviewer A (code-analyzer, content specialist) — VERDICT: PASS
  - Reviewer B (independent second-pass) — VERDICT: PASS
  - 3 P3 notes (not blockers): _resetCachesForTests JSDoc mismatch,
    fixture comment about L11+dedup ordering, no PRISM_SUBAGENT_PER_TASK_K
    env knob exposed.

Sync-to-system-viz: the lib reads system-graph.json via mtime cache.
When the peer chat (claude-b6c4b196) expanding system-viz to cover all
H: drive files completes its work, the cache invalidates automatically
on the next subagent spawn — no manual refresh needed.

Settings.json: NO EDIT REQUIRED. subagent-start-context.mjs is already
wired (SubagentStart matcher "*", timeout 5000ms). master-index-precheck-
inject.mjs is already wired (UserPromptSubmit). Both hooks pick up the
new lib via import path on their next invocation.

Wire targets:
  - master-index-precheck-inject.mjs (UserPromptSubmit, parent chat)
  - spawned-agent-context-lib.mjs → subagent-start-context.mjs
    (SubagentStart, every spawned subagent)

Knobs: PRISM_MASTER_INDEX_INJECT=0, PRISM_MASTER_INDEX_K=N (existing,
unchanged). PRISM_SUBAGENT_PER_TASK_K (proposed follow-up, not in this
commit).
```

## Files touched (5)
- .claude/hooks/master-index-precheck-inject.mjs | 175 +---------
- scripts/agents/spawned-agent-context-lib.mjs   | 101 ++++++
- scripts/lib/master-index-search-lib.mjs        | 381 ++++++++++++++++++++++
- scripts/lib/master-index-search-lib.test.mjs   | 423 +++++++++++++++++++++++++
- 4 files changed, 919 insertions(+), 161 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d7797a6e700b`
- Milestone envelope: `mcp-server/data/milestones/CHECKIN-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._