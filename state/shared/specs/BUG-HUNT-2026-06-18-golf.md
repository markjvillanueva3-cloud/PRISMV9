# Bug + Inefficiency Hunt -- 2026-06-18 (slot:golf)

> Operator directive: "look for bugs and inefficiencies." Focused inline hunt on PRISM's
> documented #1 regression class -- **non-atomic writes to fleet-shared state** (the
> tribal-brain-clobber / torn-read family) -- plus a silent-failure-on-corrupt scan.
> The exhaustive 10-dimension Workflow was authored but blocked by the `fanout-gate`
> (cost 24 > cap 12); not force-overridden (would disable a fleet-wide safety guard).
> Every candidate carries a file:line (R12). FIXED items verified + committed this session.

## Class A -- non-atomic writes to fleet-shared state (torn-read / lost-update)

A shared atomic helper EXISTS and is self-tested: `.claude/helpers/atomic-write.mjs`
(`writeAtomic` async / `writeAtomicSync` sync -- temp + rename, atomic on NTFS;
`{ fsync: false }` for regenerable data). The fix pattern is a 1-line swap + import.

### FIXED this session (verified + committed)
- **`297c04132e`** `.claude/helpers/regen-digests.mjs:186/371/491/571/574` -- the 4 canonical
  digests, written on every `/compact` (26 slots) via the new PreCompact hook. 5 writes -> `writeAtomic`.
- **`3825128f7a`** `.claude/helpers/error-learn-store.mjs:114/220/225` -- fleet-shared error-lessons
  ledger (`pruneIfNeeded` + `clearLedger` full-rewrites). 3 writes -> `writeAtomicSync`. P2
  (reader is torn-line-tolerant + ledger is lossy-by-design), hardened anyway.
- **`09b57b69f6`** `.claude/hooks/always-build-guard.mjs:303` -- the SHARED `GOAL_STACK.json` (precious
  operational state driving the goal-gate + always-build), mutated + written non-atomically at fleet-wide
  Stop. P2 (fail-open + the turns>2 guard blocks the fail-open-clobber path, but a torn concurrent write
  corrupts the goal stack -> fail-open to empty -> goals lost). 1 write -> `writeAtomicSync`.

### `.claude/hooks/` SWEEP RESULT (~50 writeFileSync scanned): 1 real fix (above), rest BENIGN
- BENIGN: `awareness-bootstrap.mjs:45` (GOAL_STACK *default* init-write, only-when-absent + identical
  content -> race is harmless); `blueprint-coverage-floor-guard.mjs:160/305` (best-effort block-count
  ledger, fail-open lenient = fresh escape-hatch budget, "not a gate"); watchdog/checkpoint/cache/PID/
  telemetry STATE_FILEs (auto-precompact-watchdog, checkpoint-auto-trigger, autonomous-loop-watchdog,
  auto-record-tool-call, agent-pid-tracker, build-cache-guard) = regenerable, fail-open-to-fresh correct;
  timestamp stamps/markers + `tmp`+rename writes (chat-bus-inject, blueprint-accuracy-guard,
  auto-fix-blackwell-doctrine-inject, bash-orphan-cleaner, autonomous-loop-defer) = already atomic.
- VERDICT: `.claude/hooks/` is well-hardened on this axis -- the ONE precious mutated shared store
  (GOAL_STACK) was the only real gap; now fixed.

### `scripts/lib/` + `scripts/` SWEEP (final coverage) -- BENIGN, pattern confirmed
- `scripts/lib/`: pervasive `tmp`+rename; the CRITICAL `claude-account-lib.mjs` (account-switch creds/
  rotation) is fully atomic everywhere (`tmp`/`credTmp`/`bkpTmp`/`liveTmp`); rest are tests. No gap.
- `scripts/`: the non-atomic shared-state writers are all ONE-OFF BATCH report/ledger/plan GENERATORS
  (audit-monolith-port-state, build-jm-document-ledger, cimco-post-proof, course-data-router, jm-die-tier-
  plan, verify-galaxy-ai-synergy, etc.) writing REGENERABLE outputs at low concurrency (P3); the ones
  touching real shared state (backfill-chat-slots-branch, export-ledger-lora, reconcile-zulu-ledger)
  already import `renameSync` (atomic). No per-turn fleet-shared precious-store gap.

### FINAL VERDICT (4 dirs swept: helpers, hooks, scripts/lib, scripts)
PRISM's atomic-write discipline is SOUND. Precious + concurrent fleet-shared stores use atomic write
(tmp+rename) or an exclusive lock; regenerable/idempotent caches correctly fail-open-to-fresh. The class
had exactly THREE genuine gaps -- all in the per-turn/per-Stop fleet-shared hot surface -- now fixed
(regen-digests, error-learn-store, GOAL_STACK). No outstanding non-atomic-write bug found in the swept scope.

## Class C -- stale-reader (hard-coded path to a moved/orphan location) -- 1 REAL FIX
- **`d3175419cf`** `.claude/hooks/master-index-search-gate.mjs:13` -- the PreToolUse dedup backstop read
  `mcp-server/MASTER_INDEX_COMPACT.md`, a DEAD ORPHAN (2026-04-26, Engines:2739 vs live 3833; nothing
  regenerates it). Repointed to the canonical `mcp-server/data/docs/MASTER_INDEX_COMPACT.md` (now kept
  fresh every /compact by the regen hook bd7d03e98e). Honest scope: both are SUMMARY docs (not per-asset
  listings) so the gate is a weak backstop regardless -- this is a correctness/freshness fix; the real
  dedup is duplicationGuardEngine. Only hard-coded stale reader (others use DOCS_DIR-relative canonical).
- SIBLINGS (routed, not golf): milestone-tree-divergence 753-vs-383 (sierra index generators).

## Class D -- perf-hotpath (per-turn hook full-reads a large file) -- CLEAN, no fix
- No per-turn `.claude/hooks` hook full-reads a multi-MB file. The 63MB find-cache.json is accessed via
  offset/lib (not full-read); node-card-prefetch is seek-only; build-state-inject reads a 192KB snapshot
  (fast); master-index-gate reads a ~1.8KB compact summary. PRISM's per-turn read surface is well-optimized
  (offset indexes, seek, compact digests). No fix.

## OVERALL BUG-HUNT VERDICT (4 classes hunted)
4 real fixes (3 non-atomic-write + 1 stale-reader); perf-hotpath clean; silent-failure benign. PRISM is
well-engineered on these axes -- the genuine gaps were a small set in the per-turn/per-Stop hot surface,
now closed. Un-hunted classes (lower priority / cross-domain): swallowed-errors (mostly benign in spot-
checks), concurrency-race (helpers lock-guarded), hook-redundancy (196-hook surface -> alpha token-opt).

## Class E -- dead-wired-hooks + hook-redundancy -- CLEAN (verified, no mechanical fix)
- DEAD-WIRED-HOOKS: all 268 wired hook files in BOTH settings.json (C:+H:) exist. Zero dead wired hooks
  (a hook whose file is missing fails silently; hook-health-check's runtime telemetry misses this case).
- HOOK-REDUNDANCY: ZERO true duplicate-wired hooks after MATCHER-AWARE dedup. The 5 apparent dups
  (session-start-auto-resume x4, stale-slot-cron-advisory x4, cag-cold-cache-anchor x3, subagent-model-
  enforce x2, agent-fanout-pressure-gate x2) are INTENTIONAL per-matcher wirings (one per session-start
  type / tool matcher), NOT redundant. The per-turn double-injections observed (slot-soul, chat-slot-
  domains, ai-synergy) are PRISM's deliberate continuous-re-injection (survive compaction) + SessionStart
  load -- by design. VERDICT: the 196-hook-surface inefficiency has NO mechanical duplicate-removal fix;
  reduction requires per-injector VALUE-JUDGMENT (which low-value injectors to retire) + usage telemetry
  -> alpha (token-opt) owns it. Golf verified there is no clean golf-mechanical trim. NOT a golf unit.

### CANDIDATES -- ALL 4 VERIFIED BENIGN (no fix needed; verification avoided false-positive churn, R12)
Each was a direct `writeFileSync` flagged by grep; reading each proved it is NOT a real bug:
- `.claude/helpers/build-tracker.mjs:54` -- BENIGN P3. STATE_FILE is a regenerable advisory edit-counter
  in `.claude/cache/`; `loadState` fail-open-to-fresh (line 42) is CORRECT by design (a corrupt counter
  should reset); a lost write only delays a build-nudge, self-healing. No fix.
- `.claude/helpers/arbitration-log.mjs:119` -- BENIGN. ALREADY lock-guarded: the writeFileSync runs inside
  a read-merge-write loop under an exclusive mkdir `.lock` ("~6 chats may append simultaneously... better
  than corrupting the log", lines 17-20). The non-atomic write is SERIALIZED -> no torn write. No fix.
- `.claude/helpers/coordination-summary-generator.mjs:88` -- BENIGN P3. SUMMARY_PATH is a regenerable <5KB
  cache derived from AGENT_COORDINATION_STATUS.json; the daemon rebuilds it. No fix.
- `.claude/helpers/autostart-coalesce.mjs:97` -- BENIGN P3. Explicitly "idempotent; fail-open" by design
  (line 17); stamps are a timing-dedup lock; a lost write re-attempts an idempotent autostart. No fix.

VERDICT for Class A in `.claude/helpers/`: the class is WELL-MANAGED. Targets are regenerable/idempotent
(fail-open-to-fresh is correct) or already lock-guarded; the precious non-regenerable stores were hardened
in prior sessions (tribal-brain clobber lessons). The 2 marginal-value unhardened stores were fixed this
session (regen-digests = canonical digests; error-learn-store = lessons ledger). No outstanding Class-A bug
in this scope.
NEXT SCOPE (not yet swept): `scripts/`, `scripts/lib/`, `.claude/hooks/` -- apply the same verify-before-fix
discipline (most shared stores there likely also lock-guarded or regenerable; confirm, do not churn).
ALREADY-ATOMIC (correctly excluded): `chat-slots.mjs` (260/388), `commit-coordinator.mjs:181`,
`fleet-reaper-host-presets.mjs:183`, `bootstrap-golf.mjs:123` (tmp+rename).

## Class B -- silent-failure-on-corrupt (fail-open catch -> empty -> clobber)
Scanned `.claude/helpers` for `catch { return [] / {} / null }` near a store read. VERDICT: the
hits are overwhelmingly BENIGN read-helpers (per-line JSONL skip, or read-then-null where the caller
handles null) -- NOT the dangerous read-empty-then-write-back-empty pattern (the tribal-clobber).
The dangerous combo to check lives with the Class-A whole-JSON stores (build-tracker / arbitration-log):
if their READER does `JSON.parse(readFileSync(whole))` with a fail-open `catch -> return {}` AND then
writes back, a torn write becomes a full clobber. Verify alongside the Class-A fix for those two files.

## Inefficiencies (routed -- not golf-fixable solo this session)
- **fanout-gate vs exhaustive Workflows**: legitimate bug/inefficiency Workflows (10 read-only sonnet
  finders) are blocked by the cost cap (24 > 12) even under Ultracode. The verbose-prompt cost model
  penalizes thorough audits. Consider an Ultracode-aware exemption or a per-prompt-KB budget. -> bravo/zulu (orchestration).
- **196-hook injection surface** (64 UserPromptSubmit + 69 Stop + 63 SessionStart): per-turn token+latency
  cost fleet-wide; suspected redundant injectors (multiple master-index/wiki/slot-context). -> alpha (token-opt).
- **stale-generator class** (now mitigated for digests via the PreCompact hook bd7d03e98e): other
  `regen-*/build-*/generate-*` writers may lack a trigger -> silent rot. Many are intentionally
  freeze-blocked (`MIGRATION-FREEZE-ACTIVE.flag`) -- distinguish before flagging. -> per-domain owners.

## Method note
Workflow `bug-and-inefficiency-hunt` script authored (10 dimensions, adversarial-verify pipeline,
all-sonnet) but fanout-gated. To run it later: lift the cap for the run (do NOT disable the guard
fleet-wide) or split into <=4-finder batches.
