---
title: Unwired-engine ranker — resolver fix + true consumer fan-in
type: architecture
status: shipped
slot: tango
created: 2026-06-15
commits: [6fcd9222d7, 0e07be67ec, c2ac00200c]
tags: [discovery, dormant-engines, unwired, ranker, ripgrep, consumer-fan-in, orphan-files, efficiency]
---

# Unwired-engine ranker — resolver fix + true consumer fan-in

The dormant-engine activation pipeline — `audit-unwired-engines.mjs` →
`state/shared/UNWIRED-ENGINE-AUDIT-<date>.json` → `scripts/unwired-bridge-rank.mjs`
→ `romeo-wiring-triage.mjs` — was producing garbage rankings. Three fixes at the
ranker (slot tango, 2026-06-15) restored it AND made its ROI signal honest.

## 1. Resolver fix — the silent dead-end (`6fcd9222d7`)

`findRipgrep()` probed PATH + 3 fixed paths. On a PRISM host ripgrep is frequently
**not on PATH** but **is vendored** at `%LOCALAPPDATA%/OpenAI/Codex/bin/rg.exe`
(Codex/Claude Code both ship rg). The miss made `computeBridgeRankings` return
`{ok:true, rankings:[], tierCounts: all 0, blockers:["ripgrep-not-found"]}` — a
**silent pipeline dead-end**: every dormant-engine hunt saw "0 candidates" forever.

Fix:
- Extended the `findRipgrep` candidate list (incl. the vendored bundle path).
- Added `hasGitGrep(prismRoot, timeoutMs)` + `gitGrepFanIn(name, srcRoot, prismRoot, timeoutMs, ignoreGlobs)` — a **git-grep fallback** (`git grep -c -w` over tracked files; rg `!glob` → git `:(exclude,glob)`; same `{count, files}` contract; status 1 = no matches). The ranker is now rg-independent and NEVER silently empties.

## 2. True consumer fan-in — the inflated ROI metric (`0e07be67ec`)

`fanIn` was `rg --count-matches` SUMMED over files, so it counted an engine's name
inside its OWN definition + test + docs + barrel re-exports. It massively
over-stated ROI: **`RhinoCommonBridgeEngine` scored fanIn=57 with ZERO real
consumers** (only its own def + test), out-ranking genuinely-depended-on engines.

Added pure `classifyConsumers(name, files)` → `{consumerFiles, consumerFanIn,
dispatcherFiles, wireClass}`. A consumer is a file that USES the engine —
excluding: self (`<Name>.ts`), tests (`__tests__/`, `.test.`, `.spec.`), docs
(`.md`), dispatchers (`/dispatchers/`), **barrel re-exports** (`/index.ts` — a
re-export is not a consumer), and **orphan `.ts-N` variants**. Three honest buckets:

| bucket | meaning | action |
|---|---|---|
| **dormant** | real consumers, no dispatcher | genuine romeo wire queue |
| **leaf** | def+test only (0 consumers) | build-out or archive — NOT a wire candidate |
| **maybe-wired** | a dispatcher ref present | likely stale-audit false positive — verify + drop |

Output gains `wireCandidates` / `leafEngines` / `maybeWired` / `wireBuckets`.
Legacy `fanIn` / `tier` (match-count) kept intact so the existing pure-function
tests stay green; the new fields are what `romeo-wiring-triage` should rank on.

### The mirage, debunked

The broken ranker reported **"38 platinum high-ROI dormant engines."** Reality of
the 50 audit-listed "unwired":

- **11 true dormant** — each only 1-2 real consumers, mostly bridge-PAIRS
  (`CATIACAAV5BridgeEngine` ← only `CATIAAddinPluginEngine`, etc.).
- **34 leaf** — def+test only.
- **5 maybe-wired false positives** — `XProcNeuralAutoFireEngine` +
  `WetRunChangeFreezeEngine` are ACTUALLY wired (`aiReasoningDispatcher.ts:443-445`
  has 3 `xproc_autofire_*` routes). The audit is **39 days stale**
  (`UNWIRED-ENGINE-AUDIT-2026-05-07.json`) — the real root inefficiency.

There is no pile of high-fan-in dormant engines awaiting wiring; the codebase has
leaf scaffolds + a stale audit.

## 3. Orphan `.ts-N` quarantine (`c2ac00200c`)

5 untracked `.ts-N` backup orphans (652 KB: `index.ts-1` 252 KB + `index.ts-2`
319 KB + 3 engine backups) sat in `mcp-server/src/engines/`, scanned by every
rg/grep/glob/tsc-glob AND faking barrel-re-export "consumers." All verified
untracked + unreferenced (the lone `index.ts-1` mention is a doc comment in
`businessDispatcher.ts`). Quarantined (moved, reversible) to
`state/shared/_orphan-quarantine/2026-06-15-ts-n-backups/` with a restore
MANIFEST; blobs gitignored (no history bloat), manifest tracked.

## Lesson

Verify-on-disk (tango's law) collapsed every "high-ROI dormant" claim: the
38-platinum mirage, XProc-is-actually-wired, RhinoCommonBridge-has-0-consumers,
`index.ts-1`-is-a-real-orphan-file. A discovery meta-tool that ranks against a
stale snapshot with an inflated metric will confidently surface noise — fix the
resolver AND the metric AND regenerate the input.

Memory: [[reference_unwired_ranker_consumer_fanin_2026_06_15]].

## Follow-on — discovery sweep + meta-tool fail-loud layer (2026-06-15)

A 6-class parallel discovery-sweep **Workflow** (`wf_471937e7-027`, 58 agents,
adversarial verify-on-disk) returned **52 findings / 32 confirmed / 4 correctly
refuted**. It independently confirmed a deeper root cause behind the stale audit:
`audit-unwired-engines.mjs` **hardcoded its OUTPUT filename** to
`UNWIRED-ENGINE-AUDIT-2026-05-07.json`. Because those audit files are
**untracked-by-convention** (per-machine local artifacts), every worktree LACKING
the file regenerated it on EVERY SessionStart — a 180s `spawnRegen` waste
fleet-wide — and `resolveAuditPath` (newest-by-filename) read the audit as 39 days
stale forever.

Five meta-tool fixes (fail-loud + date-stamp), all in tango's lane:

| commit | tool | fix |
|---|---|---|
| `f004aa153d` | audit-unwired-engines.mjs | date-stamp OUTPUT (`PRISM_UNWIRED_AUDIT_DATE` override) + fail-loud on unreadable consumer (was silent false-UNWIRED) |
| `529e5d65eb` | build-state-snapshot.mjs | fail-loud on unwired-audit refresh failure (was `catch{}` "no problem") |
| `81f47be059` | node-staleness-rank.mjs | no false "fresh" when no settings parse; `null` not `undefined` history fields |
| `50d65c4c93` | reconcile-roadmap-drift.mjs | fail-loud on corrupt-but-present envelope (was silent close-out debt) |
| `502b811ecf` | mcp-server/scripts/unwired-audit.mjs | derive REPO_ROOT from script location (was hardcoded `H:/prism`) + date-stamp |

Fresh regen → `UNWIRED-ENGINE-AUDIT-2026-06-15.json` (**45 UNWIRED**, was 50 stale).
**Highest-ROI dormant find surfaced to romeo** (not wired — romeo's lane): 3
dispatchers (`mlDispatcher`/`localDispatcher`/`resourceExtractionDispatcher`) present
but with ZERO `index.ts` registration (~115+ dead MCP actions) + 13 dormant engines +
Engine-vs-Adapter dedup pairs. Report:
`state/shared/specs/TANGO-DISCOVERY-SWEEP-2026-06-15.md`. **Lesson: verify-on-disk in
the CURRENT tree** — the sweep agents ran in the stale slot-tango worktree (~1900
commits behind); several findings (e.g. "prism_pp commented out") were stale-branch
artifacts, corrected by tango's current-tree re-verification.

Memory: [[reference_tango_discovery_sweep_2026_06_15]].

## Follow-on 2 — dispatcher registration + ghost build (2026-06-15)

Operator: "wire all unwired nodes, build ghost nodes and ghost wirings." papa was
already wiring the engine set (`[WIRE-UNWIRED-PAPA]`), so tango took the **disjoint**
parts (coordinated on chat bus): whole-dispatcher registration + ghosts.

**5 dormant dispatchers registered in `index.ts` -> 153 dead MCP actions activated**
(commit `4734d6bd85`): `prism_ml` (100), `prism_local` (20),
`prism_resource_extraction` (14) were pure omissions; `prism_agent` (11) +
`prism_resource_harvesting` (8) had stale `// NOT ON THIS BRANCH` comments (files
since restored). A 5-agent [SCOPED] Workflow verified each SAFE (export exists,
schemas resolve, unique tool name, why-unregistered = omission not deliberate-disable).
**Validated: `build:fast` PASS + `tsc --noEmit` 0 errors.** Live on next MCP server
restart (running server uses pre-edit build). Lesson: the verify agents ran in
slot-tango (~1900 commits behind) -> re-find exact index.ts anchors in the current
tree before editing (export NAMES are branch-stable, line numbers are not).

**Ghost nodes + wirings built** via one `regen-viz` (seed-ghost-from-unwired is a
4th direct writer of the 727MB graph, safe ONLY under regen-viz's lock -- never run
standalone). Graph rewritten + stream-verified intact (valid JSON, not truncated;
ghost.unwired refs 1162->1172 from the fresh audit). Caveat: the post-write
`detect-system-viz-drift` gate V8-OOM'd on the 727MB graph -> could not certify
integrity (tango certified independently by streaming; surfaced the OOM to sierra).
Lesson: graphs >512MB fail `JSON.parse` (V8 string cap) -- stream-verify, don't parse.

Memory: [[reference_tango_dispatcher_register_ghost_2026_06_15]].

## Follow-on 3 — test-assertion-quality dimensions + stripCode FP guard (2026-06-15, `e2292fdee1`)

Autonomous high-ROI build. Dedup law correctly blocked a planned parallel
"test-assertion scanner" -- `scripts/stub-class-audit-tobedefined.mjs` already
covered the strict `toBeDefined()`-only case. **Extended it** (anti-sprawl) with
three R9/R12 dimensions + a `stripCode()` preprocessor:

- **skipped** (`.skip`/`.todo`/`xit`) -- LIVE: 5 files / ~17 silently-unrun tests,
  biggest `lathe-orchestration.test.ts` (11 `describe.skip`). Routed to whiskey.
- **focused** (`.only` -- disables siblings) + **assertion-free** (active test, 0 asserts).
- `--quality`/`--json` CLI; `scanQuality()` walks the FULL `mcp-server/src` tree.

Two false-positive classes were found **on live data** and fixed before ship (R12):
(1) Jasmine `fit()`/`fdescribe()` collided with curve-`fit()`/`model.fit()` -> dropped;
(2) focus/skip markers inside test-FIXTURE strings + comments -> `stripCode()` blanks
string/comment contents (delimiters kept). **Lesson: a code-pattern auditor must strip
strings+comments or it fires on its own fixtures.** 34/34 node:test PASS; `scan()` +
`isStubTest()` untouched. Memory: [[reference_tango_test_quality_audit_2026_06_15]].

### Follow-up -- wired into the standing sweep (2026-06-15, U-WIRE-TEST-QUALITY-DIMS)

A later ULTRACODE `Workflow` discovery-saturation sweep (5 angles on sonnet, adversarial
verify) caught that the `scanQuality`/skipped/focused/assertion-free exports above had
**ZERO production callers** -- they ran only via the on-demand `--quality` CLI flag, never
in a standing pipeline = dead code = an R15 violation (built, not wired). Fix:
`stub-sweep-full.mjs` (the canonical full-codebase auditor) `run()` now calls
`scanQuality(mcp-server/src)` and reports a Test-quality (R9/R12) section -- giving those
exports their first standing consumer. Additive (stub counts unchanged; 26/26 tests).
**Lesson: a multi-agent completeness-critic catches your OWN unwired builds that solo
fires miss.** Memory: [[reference_tango_wire_test_quality_dims_2026_06_15]].

### Follow-up 2 -- 6th dormant dispatcher registered: prism_algorithm (2026-06-15, `39c1d501dc`)

The same Workflow sweep's verify-agent flagged `algorithmDispatcher` unregistered; verified on
the current `cad-fusion-live-ms0` tree: `registerAlgorithmDispatcher` (`server.tool("prism_algorithm",
35 actions`, lazy-loads algorithmGatewayEngine + algorithmRegistry) existed but index.ts never
called it -- the ALGO-SYNERGY wiring landed on slot/tango but its index.ts registration never
reached the integration branch. Registered (same safe pattern as the earlier 5): no
deliberate-disable comment, unique tool name, lazy deps on disk. build:fast PASS, ZERO new tsc
errors (infra/knowledge errors pre-existing), synergy test 56/56 round-trip. **Unblocks the
operator's repeated dormant-algorithm wiring ask** (the algos route through prism_algorithm).
**Lesson: a dispatcher can pass its own synergy test + have wired algorithms yet be invisible
because index.ts never registers it.** Memory: [[reference_tango_register_algorithm_dispatcher_2026_06_15]].

## Follow-on 4 -- inline kc1.1 matches-canonical vs non-group split (2026-06-15, `f1f13896f4`)

`assess-engine-algo-improvements.mjs`'s inline-constant regex matched ONLY the 6
canonical ISO-group kc1.1 values, so it flagged the harmless matches-canonical subset
and was blind to any other value. Extracted to a pure unit-tested lib
`scripts/lib/inline-const-classify.mjs` (`classifyInlineKc -> {values, matchesCanonical,
divergent}`, 11/11 tests); broadened to ANY value. inlineConstant 70 -> 73; new
`inlineDivergent` = 36.

**R12 / verify-on-disk -- the key lesson:** `inlineDivergent` is NOT 36 safety bugs. The
6 canonical values are per-ISO-GROUP representatives; engines legitimately carry
per-MATERIAL tables (`KienzleForceModelEngine:260` AISI 1045 = 1780 by design;
`CryogenicCuttingEngine` aluminium = 750). Divergent = a physics-reviewer triage signal
("should this reference `MATERIAL_DB`?"), occasionally real drift, mostly legitimate.
Reworded all prose to that honest framing BEFORE committing. **A heuristic detector's
count is not a confirmed-defect count -- the scanned population (per-material physics
tables) decides whether a "divergence" is a bug or by-design; verify a sample on disk
before assigning severity.** Memory: [[reference_tango_inline_const_classify_2026_06_15]].

## Follow-on 5 -- forge-queue producer-side dedup pre-filter (2026-06-15, `44c314c404`)

Autonomous cron-loop iteration. The forge-queue hook surfaced candidates to drain;
verify-on-disk found 22/22 were already-built or cross-lane vendor tutorials. Root cause:
`scripts/extraction-forge-detect.mjs` scored worthiness but did NO dedup against existing
engines -- it deferred all dedup to `/forge-triple` at drain time, so the queue filled
with built concepts.

Built the missing guard at the SOURCE (tango's mandate): pure lib
`scripts/lib/forge-dedup-prefilter.mjs` (`conceptAlreadyBuilt` -- a significant stemmed
bigram is a substring of an engine FILENAME; vendor names are stopwords). HIGH-PRECISION
+ CONSERVATIVE: ambiguous concepts still queue (DuplicationGuard stays the real gate at
drain) so a genuine capability is never silently dropped. 10/10 node:test; live --dry-run
caught 41 already-built concepts across 4388 entries, all high-precision. Drained the 25
existing entries. **Lesson: a worthiness classifier without a producer-side dedup pre-filter
fills its queue with already-built concepts; the guard belongs at the source.** Memory:
[[reference_tango_forge_dedup_prefilter_2026_06_15]].
