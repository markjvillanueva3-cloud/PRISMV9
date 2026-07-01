---
name: reference_unwired_ranker_consumer_fanin_2026_06_15
description: DISCOVERY-EFFICIENCY — fixed silently-empty dormant-engine ranker (rg resolver + git-grep fallback), added true consumer fan-in (dormant/leaf/maybe-wired buckets), quarantined 5 orphan .ts-N backups. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.231Z
aliases: reference_unwired_ranker_consumer_fanin_2026_06_15
---


**Three DISCOVERY-EFFICIENCY fixes (slot tango, 2026-06-15)** under operator "continue hunting inefficiencies and dormant or underutilized high roi builds." The dormant-engine activation pipeline (`audit-unwired-engines.mjs` → `UNWIRED-ENGINE-AUDIT-*.json` → `unwired-bridge-rank.mjs` → `romeo-wiring-triage.mjs`) was producing garbage; fixed at the ranker.

**1. U-UNWIRED-RANK-RESOLVE (commit `6fcd9222d7`)** — `scripts/unwired-bridge-rank.mjs` `findRipgrep` only probed PATH + 3 paths; on this host rg is NOT on PATH but IS vendored at `C:\Users\wompu\AppData\Local\OpenAI\Codex\bin\rg.exe`. Result: ranker returned `{ok:true, rankings:[], tierCounts all 0}` + a `ripgrep-not-found` blocker — a SILENT pipeline dead-end making every dormant-engine hunt see "0 candidates" forever. Fix: extended `findRipgrep` candidate list (incl. `%LOCALAPPDATA%/OpenAI/Codex/bin/rg.exe`) + added `hasGitGrep()` + `gitGrepFanIn()` **git-grep fallback** (rg-independent; `git grep -c -w` over tracked files, same `{count,files}` contract) so the ranker NEVER silently empties again. +6 regression tests. Same class as the recurring "META-tool schema/dep blindness" failures.

**2. U-UNWIRED-RANK-CONSUMER (commit `0e07be67ec`)** — the `fanIn` metric was `rg --count-matches` SUMMED across files (incl. the engine's own def + test + docs + barrel re-exports), so it massively OVER-STATED ROI. Proven: `RhinoCommonBridgeEngine` scored fanIn=57 with **ZERO real consumers** (only its own def + test), out-ranking genuinely-depended-on engines. Added pure `classifyConsumers(name, files)` deriving TRUE consumer fan-in (unique files EXCLUDING self/test/doc/dispatcher/barrel-`index.ts`/orphan-`.ts-N`) → splits unwired engines into 3 honest buckets: **dormant** (real consumers, no dispatcher = genuine romeo queue), **leaf** (def+test only = build-out or archive, NOT a wire candidate), **maybe-wired** (a dispatcher ref present = stale-audit FALSE POSITIVE, verify+drop). Output adds `wireCandidates`/`leafEngines`/`maybeWired`/`wireBuckets`; legacy `fanIn`/`tier` kept intact (pure-function tests untouched). +11 tests.

**THE HONEST FINDING (debunked the mirage):** the broken ranker said "38 platinum high-ROI dormant engines." Reality of the 50 audit-listed "unwired": **11 true dormant** (each only 1-2 real consumers, mostly bridge-PAIRS like CATIACAAV5Bridge↔CATIAAddinPlugin), **34 leaf** (def+test only), **5 maybe-wired false-positives** (XProcNeuralAutoFireEngine + WetRunChangeFreezeEngine are ACTUALLY wired — `aiReasoningDispatcher.ts:443-445` has 3 xproc routes). There is NO pile of high-fan-in dormant engines waiting; the codebase has leaf scaffolds + a **39-day-stale audit** (`UNWIRED-ENGINE-AUDIT-2026-05-07.json`) — the real root inefficiency.

**3. U-ORPHAN-TSN-QUARANTINE (commit `c2ac00200c`)** — 5 untracked `.ts-N` backup orphans (652KB: `index.ts-1`=252KB + `index.ts-2`=319KB + 3 engine backups) sat in `mcp-server/src/engines/`, scanned by every rg/grep/glob/tsc-glob + faking barrel re-export "consumers." All verified untracked + unreferenced (lone `index.ts-1` mention is a doc comment in businessDispatcher.ts). Quarantined (moved, reversible) to `state/shared/_orphan-quarantine/2026-06-15-ts-n-backups/` with restore MANIFEST; blobs gitignored (no history bloat), manifest tracked.

**Verify-on-disk repeatedly paid off (tango's law):** every "high-ROI dormant" claim collapsed under a real `rg -l -w` + dispatcher grep — the 38-platinum mirage, XProc-is-actually-wired, RhinoCommonBridge-has-0-consumers, index.ts-1-is-a-real-orphan-file. Wiki: [[unwired-ranker-consumer-fanin]]. Sister: [[reference_coldstart_forkstorm_2026_06_14]].
