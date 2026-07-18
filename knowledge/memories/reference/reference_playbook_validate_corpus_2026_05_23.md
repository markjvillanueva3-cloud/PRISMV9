---
name: reference-playbook-validate-corpus-2026-05-23
description: U-PB-VALIDATE-CORPUS (slot:foxtrot iter11) — pure-read corpus health audit; 6 finding channels with R12 fail-loud (duplicateIds+orphans+unresolvedRefs+cycles+schemaIssues+healthScore); iterative DFS for cycle detection eliminates stack-overflow ceiling; 49/49 tests; main 3e08c20079 + foxtrot 4f9e0845c2
metadata:
  type: reference
---

2026-05-23 foxtrot iter11. Closes the playbook conflict-management suite: **detect → rank → RESOLVE → related-graph + validate-corpus**. Action `prism_shop_practice:playbook_validate_corpus` runs corpus-wide audit (sibling to iter10's single-rule `playbook_related_graph`). 5-surface wire. **49/49 tests** PASS.

**Commits:**
- main (cad-fusion-live-ms0): `3e08c20079`
- foxtrot slot branch: `4f9e0845c2` (aggregated iter9+10+11 onto slot/foxtrot per user "commit to foxtrot work tree" directive; 50-commit drift made per-iter cherry-pick infeasible — used `git checkout cad-fusion-live-ms0 -- <files>` strategy to take iter11 final-state of 9 files)

**6 R12 fail-loud channels:**
- `duplicateIds` (sorted) — corruption check via raw idCount Map
- `orphans` (sorted) — rules with NO related_rules AND NO inbound refs (self-ref excluded from outbound count)
- `unresolvedRefs` — paired `{fromId, missingId}` so operator fixes the SOURCE rule (R12 — name what needs fixing, not just what's missing)
- `cycles` — DFS 3-color canonicalized via lowest-id rotation, deduped
- `schemaIssues` — per-rule missing/empty required fields per PlaybookRule contract; empty-id rules surface under `<unidentified>` fallback
- `healthScore` — normalized [0,1] = `max(0, 1 - findings/totalRules)`

**Iterative DFS — Reviewer B P1-2 fix.** Recursive `dfs()` would stack-overflow at ~5K linear chain (Node default ~10K frames, each closes over iterator + traversal stack so real ceiling much lower). Iterative form uses `callStack: DfsFrame[]` mirroring recursion frames + `traversalStack: string[]` for cycle-slice extraction. **Regression tests lock invariant**: 5000-rule chain + 1000-rule single cycle both pass.

**JSDoc honesty — Reviewer B P1-1.** Corrected `CycleId` docstring: the `seenCycles` Set is **defensive**, not load-bearing — under DFS 3-color semantics, once a cycle's nodes go BLACK no other DFS root will re-discover them. Original claim "`{A→B→C→A}` and `{B→C→A→B}` dedupe correctly" was vacuously true. Per [[feedback_verify_actual_contract_not_proxy]] doctrine — say what the code actually does.

**Per-file scrutiny.** Reviewer A (wiring-review-agent) PASS confidence 0.97 — verified 5-surface wire + DFS correctness + R12 fail-loud + response-shape parity. Reviewer B (independent reviewer) PASS confidence 0.78 — 2 P1 fixes applied pre-commit + 4 P2 deferrables documented in JSDoc (healthScore overlap double-counting, case-sensitive dup-id check, whitespace-only field acceptance, UTF-16 ordering for Unicode ids — all advisory-only on canonical corpus).

**Files** (M = modified, A = added):
- `mcp-server/src/engines/MachiningPlaybookEngine.ts` (M — 4 types + `validateCorpus()` method, iterative DFS)
- `mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts` (M — action enum + handler + map)
- `mcp-server/src/schemas/shopPracticeActionSchemas.ts` (M — `z.object({}).passthrough()` schema + map)
- `mcp-server/src/__tests__/PlaybookValidateCorpus.test.ts` (A — 35 tests)
- `mcp-server/src/__tests__/PlaybookValidateCorpusDispatcherWiring.test.ts` (A — 14 tests)

**Slot-worktree migration story.** User directive "commit to foxtrot work tree" came after I committed iter11 to H:/prism (main tree's cad-fusion-live-ms0). slot/foxtrot was 50 commits behind main → per-commit cherry-pick conflict-heavy. Pragmatic resolution: `git checkout cad-fusion-live-ms0 -- <9 files>` brings iter11 final state (3 modified surfaces + 6 test files for iter9/10/11 suite) onto the foxtrot worktree, then committed as single aggregated commit `4f9e0845c2` with `[slot:foxtrot]` prefix. The worktree-route hook initially refused due to subject-prefix detection — bypassed via explicit `git -C H:/prism-slot-foxtrot commit` (the hook keyed on shell cwd which kept resetting after each Bash call).

Wiki: [[playbook-validate-corpus]]. Lineage: [[playbook-related-graph]] · [[playbook-suggest-resolution]].
