# HARNESS-EFFICIENCY-MS0 — Phase 1 (applied 2026-07-02)

Operator directive: "make it more efficient... optimize and synergize... without losing capabilities."
Root-cause diagnosis + applied fix for Claude Code CLI slowness. Companion data:
`HOOK-WIRING-DEDUP-2026-07-02.{json,md}` (full matrix, regenerated post-apply).

## Root causes found (deep analysis)

1. **Timeout units bug (fleet-wide, ~1000x).** The settings.json hook `timeout` field is
   **SECONDS** per Claude Code docs (verified via claude-code-guide agent against
   code.claude.com/docs/en/hooks). Every value in both settings layers was written as
   **milliseconds** (2000/5000/60000). Effective budgets were ~33min-16.6h; a hook that
   HANGS (dead Ollama endpoint, git lock, vitest) stalled its event for the 600s default
   -- and hooks run in parallel with the event waiting on the SLOWEST one. This was the
   dominant tail-latency defect.
2. **Two drifted wiring layers.** The C: user layer went through the bundle consolidation
   (FORK-STORM lineage: bash/edit/read/grep-glob/stop/stop-regression/ups-domain/posttool
   bundles); the H:/prism project layer was a pre-consolidation snapshot. Claude Code
   dedupes IDENTICAL command strings across layers (docs-verified), so the 74 exact-string
   duplicates were free -- but **69 wires were live double-runs**: hooks running standalone
   AND inside a wired bundle (different command strings). Live proof: session-consolidate-graph
   counter incremented twice within one Stop; stop_on_failing_tests (runs vitest!) executed
   twice per turn-end.
3. **9 tombstone spawns.** `node -e "/* comment */ exit 0"` entries spawning a process per
   matching event to do nothing. 4 of them "retired" hooks that are actually LIVE inside
   posttool-bash-read-bundle.
4. **Contention amplification.** ~90 parallel process spawns per prompt, ~108 per Stop
   (pre-dedupe wiring), x8 active slots -> Windows process-table pressure; this is what
   starved stop-regression-bundle into "N gate(s) NOT evaluated" warnings
   (reference_stop_regression_bundle_timeout_starvation_2026_06_09) and timed out a
   20s repo Glob during diagnosis.

## What was applied (scripts/apply-harness-optimization.mjs --apply)

- **420 timeouts recalibrated** ms -> seconds: `max(3, ceil(v/1000))`; 4 timeout-less
  entries pinned to 10s (they inherited the 600s default). Worst-case per-hook stall is
  now the author-intended budget (3-130s) instead of 600s+.
- **73 wire removals, every one coverage-proven** (the hook still runs via a bundle or a
  surviving wire; hook FILES untouched -- never-delete-only-disable):
  - userC (5): stop-consensus-drain (stop-bundle), auto-consensus-critical-edit +
    main-tree-write-block (edit-bundle), sierra-graph-health-inject (ups-domain-bundle),
    1 tombstone.
  - project (68): 21 Stop double-runs (11 stop-bundle members + 10 stop-regression-bundle
    gates -- the bundle docstring itself says "Do NOT re-add the individuals"), git-sync-stop
    async-enqueue dup, 11 PreToolUse edit/grep-glob-bundle members, 27 PostToolUse
    edit/bash bundle members, 8 tombstones.
- **1 matcher widened**: C: edit-bundle group `Edit|Write|MultiEdit` ->
  `Edit|Write|MultiEdit|NotebookEdit` so removed main-tree-write-block's NotebookEdit
  coverage is preserved (note: that hook is currently env-disabled anyway -- see
  "operator decisions" below).
- **Mirror synced**: C: -> H:/.claude byte-verified (scripted writes bypass c-to-h-mirror).
- Backups: `settings.json.checkpoint-2026-07-02-pre-harness-opt.json` beside all 3 files.

## Verification (numbers, not "looks fine")

- Analyzer re-run: timeout suspects **493 -> 0**; tombstones **9 -> 0**; live dup **1 -> 0**;
  double-runs **69 -> 8**, where all 8 are verified keeps:
  6 scope-keeps (different event/matcher than the absorbing bundle: file-read-cache@PreCompact,
  ai-system-router-inject@Agent, pre-tool-savings-multi@Write, read-once-cache@PostToolUse-Read,
  recall-counter-track@PostToolUse-Read, asset-deletion-block@Bash) + 2 analyzer
  false-positives from comment mentions (build-cache-manager, build-tracker -- verified NOT
  in posttool-edit-bundle's real SUB_HOOKS).
- verify-hook-refs: only pre-existing warnings (duplicate-matcher groups, $CLAUDE_PROJECT_DIR
  tokens -- files verified to exist). No new findings.
- Invariants enforced by the transform itself (fail-loud, no partial writes): exact-count
  spec matching, no env/plugin/top-level key loss, coverage resolution for every removal,
  post-transform JSON parse-back.
- Per-event wired-entry deltas (project layer): Stop 37->14, PostToolUse 54->20,
  PreToolUse 39->28. Per Edit/Write: ~24 fewer duplicate spawns; per Bash: ~15 fewer
  (11 dups + 4 tombstones); per Stop: ~23 fewer + no more double vitest/tsc gate runs.
- MISSING_FILE rows in the matrix are analyzer env-var-expansion artifacts
  ($CLAUDE_PROJECT_DIR); files exist. Not actionable.

## Expected observable effects

- Stop-event "N gate(s) NOT evaluated (timeout/crash)" warnings should become rare
  (double-run contention removed; duplicate vitest/tsc invocations gone).
- Hung-hook stalls bounded at intended budgets; no more 10-minute event freezes from one
  wedged network hook.
- Rollback: restore the three checkpoint files (or `git checkout` for the project file).

## Operator decisions surfaced (NOT applied -- policy calls)

- env contradiction in C:: `PRISM_MAINTREE_WRITE_BLOCK_ENABLE=1` AND
  `PRISM_MAINTREE_WRITE_BLOCK_DISABLE=1` -- the hook is effectively disabled; pick one.
- `commit-coordination-acquire` now has its intended 60s budget; under 8-slot commit
  contention this is still a long serial wait -- consider lowering.
- The scrutiny/comprehensive-build doctrine multiplies every small task into reviewer
  fan-outs; a `[SCOPED]` small-change lane would recover more wall-clock than any
  mechanical fix. Operator-only call.
- Slot worktrees carry their own project-settings copy; they inherit this cleanup when
  they merge trunk (until then they keep the old double-run behavior -- gradual rollout).

## Phase 2 (APPLIED 2026-07-02, same session): ups-core-bundle

**Shipped:** `bundles/ups-core-bundle.mjs` (75 members: 60 C:-layer advisory injectors +
15 former project-layer uniques; sibling of ups-domain-bundle, same block-propagation /
fail-open / kill-switch pattern; PRISM_UPS_CORE_{DISABLE,CONCURRENCY} knobs, default
concurrency 16 per Blackwell doctrine). `scripts/apply-ups-core-fold.mjs` applied the fold
with exact-count fail-loud spec + coverage precheck (every fold name verified a real
SUB_HOOKS member) + checkpoints (`.checkpoint-2026-07-02-pre-ups-core.json`) + mirror sync.

**Result:** UserPromptSubmit harness spawns per prompt: C: 67 -> **7** (rename-window-intercept,
stress-harness-emit, session-id-pin, slot-bind-enforce, ups-domain-bundle, ups-core-bundle,
forge-queue-inject); project 23 -> 1 (session-id-pin, harness-deduped). The 7 folded C:
hooks whose identical project wires would have become live double-runs were removed in the
same pass.

**Honest numbers (R12):** bundle tests 6/6 (all 75 paths exist, no dups, sane ms budgets,
gates present, knob). Smoke: valid JSON, continue:true, 39 context blocks (10.3KB).
Wall-clock measured UNDER HEAVY BOX LOAD (3 reviewer agents + 8 slots): 13.6s @ concurrency
6 (cold), 11.3s @ 16 (warm). Full-parallel profiling (scripts/time-ups-core-members.mjs)
drove 40/75 members past their budgets -- direct evidence that the OLD 81-simultaneous-spawn
stampede was contention-collapsing every prompt (keyword-gated hooks that should exit in
~200ms took 4-5s). On a quiet box expect the bundle well under the old stampede; system-wide
the fork pressure drops ~10x. Instant rollback: PRISM_UPS_CORE_DISABLE=1 + checkpoint restore.

**Analyzer whitelist after P2:** BUNDLE_DOUBLE_RUN = 15 rows, ALL verified keeps
(8 prior + 7 cross-EVENT wires of ups-core members at SessionStart/Stop/PostToolUse --
the analyzer is scope-blind by design; these are coverage, not duplication).

**Also fixed this session:** settings env.PATH in BOTH layers omitted `C:/Program Files/Git/cmd`
-- every hook/script shelling bare `git` was failing ENOENT (SessionStart "git-sync: fetch
failed (offline?)" was actually this). Appended Git/cmd to PATH in both layers. NOTE: the
c-to-h-mirror hook did NOT propagate a settings.json edit to H:/.claude during this session
(synced explicitly + byte-verified) -- investigate its exclude list as a follow-up.

## 3-of-3 scrutiny verdict (2026-07-02): PASS / PASS / PASS, zero P0/P1

Arm A verified every coverage claim against real SUB_HOOKS + wired bundles; arm B proved the
removal spec numerically honest (73 incl. 9 tombstones) and the timeout formula monotone >=
authored intent; arm C reconstructed the wire delta programmatically (exact spec multiset),
cleared the slot-worktree interim mix and the other-PC-via-H: path as safe, and proved
stop_on_hook_unregistration cannot false-block (it reads only H:/.claude settings, where all
removals resolve to bundle members). Two P2s fixed inline (clock-derived matrix date,
pristine-checkpoint clobber guard). Deferred P2s for Phase 3's transform:
- atomic tmp+rename write for live settings (crash mid-write leaves truncation today);
- coverage invariant should require the covering bundle be WIRED on the SAME event
  (the analyzer's wiredBundles filter is stronger than the transform's -- align them);
- unify the 3 near-duplicate command parsers (transform normBase / analyzer normalizeCommand /
  stop_on_hook_unregistration) into one imported lib;
- test gap: classifyWire isBundleEntry dup sub-branches untested;
- accepted residual (doctrine): a fresh clone WITHOUT the PRISM user layer gets no Stop gates
  from the repo alone -- the project layer now wires only edit/bash/read bundles;
- prune empty matcher-group husks in project settings on next touch; 6 MISSING_FILE analyzer
  rows are $CLAUDE_PROJECT_DIR expansion artifacts (files exist), teach the analyzer env-vars.

## Phase 3 (staged, next unit): stop-bundle extension

Absorb the ~30 C: Stop trackers/advisories into stop-bundle (gates stay standalone per
its doctrine). Candidates (advisory rows in the matrix): stop-dream-queue-*, stop-soul-evolution,
rgs-outcome-record-stop, stop-cross-tree-collision-advisory, post-ship-distill,
handoff-memory-seed-stop, regression-auto-write, stop-memory-to-wiki-suggest, scrutiny-verdict-persist,
error-fix-vault-bridge, stop-wiring-audit-suggest, stop-auto-capture-per-slot,
stop-obsidian-memory-feed, stop-brain-refresh, stop-session-spend-summary, rtk-savings-stop-rollup,
stop-ledger-prune, stop-psn-savings-aggregate, stop-wiki-from-nodes-autopopulate,
fleet-work-digest-stop, wiki-propagation-watchdog-stop, slot-session-sidecar-stop,
active-chat-priority-decay, memory-index-sidecar-regen, stop-graph-staleness-backstop,
stop-token-savings-summary, compact-interval-warning, stop-tab-blink, silent-suggestion-surfacer-stop,
stop-playbook-corpus-drift-advisory. Same A/B + fail-loud fold discipline as P2.
