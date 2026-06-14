---
name: reference_alpha_galaxy_synthesis_claim_2026_05_30
description: rank-6 fleet-distributed synthesis-claim ledger — galaxy@sourceHash mutex so 20 parallel chats don't redo + race-write the same galaxy synthesis; precondition for amplifier #3
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.015Z
aliases: reference_alpha_galaxy_synthesis_claim_2026_05_30
---


Brain-upgrade rank 6, built 2026-05-30 (slot alpha) — the cleanest in-lane unit off the 8-agent
sweep ([[reference_alpha_brain_refresh_ms0_2026_05_30]] = rank 1,
[[reference_alpha_recall_eval_harness_2026_05_30]] = rank 3,
[[reference_alpha_embeddings_staleness_gate_2026_05_30]] = rank 21 siblings). The **precondition for
amplifier #3** (fleet-distributed synthesis, the 20-chat lever): without it, 20 slot-Claudes running
synthesis in parallel all redo the same ~34 galaxies + race-write the same
`knowledge/memories/patterns/<galaxy>_synthesis.md`.

**What:** `scripts/galaxy-synthesis-claim.mjs` — a claim ledger keyed by `galaxy@sourceHash`
(`sourceHash` = the existing `computeSourceHash(memories)` 12-hex fingerprint already stamped in each
synthesis frontmatter). Store `state/shared/galaxy-synthesis-claims.json` (main tree = shared by all
worktrees, correct for a fleet-wide mutex). A dedup-verified **sibling** of
`.claude/helpers/slot-task-claim.mjs` — cloned its proven atomic-RMW + O_EXCL-lock (stale-TTL steal)
+ schema-guard + corrupt-preserve pattern (the lock/store primitives there are hard-bound to that
store's path, so they can't be imported for a second store — the ~50 duplicated lines are the
pragmatic axis-niche choice). Wired into `galaxy-synthesis-refresh.mjs`'s `executeRegenAndCascade`
loop as a per-galaxy claim-or-skip + release-in-finally.

**Two load-bearing design properties:**
1. **Key by `galaxy@sourceHash`, not galaxy alone.** A changed source (hash X→Y) is a NEW claimable
   unit — a peer computing `galaxy@Y` while someone holds `galaxy@X` correctly synthesizes the fresh
   cluster. Keying by galaxy alone would block the legitimate re-synthesis of changed content.
   (Verified by smoke: claim mill@abc123 → peer claim mill@abc123 conflicts (exit 1), but peer claim
   mill@0011 succeeds.) Bounded residual race (source changes mid-flight → last-writer-wins, self-
   heals next refresh) documented, not silent.
2. **FAIL-OPEN.** The ledger is an optimization, never a correctness gate — synthesis works fine with
   no ledger. So `tryClaimSynthesis`/`tryReleaseSynthesis` NEVER throw and NEVER block: any error
   (lock-timeout / corrupt / readOnly) → fail-OPEN (`ok:true, failOpen:true` = proceed uncontended,
   == today's behavior). ONLY a genuine live peer claim returns `ok:false`. So a ledger outage can
   never silently drop synthesis work (R12). Default-ON; `PRISM_GALAXY_SYNTH_CLAIM_DISABLE=1` reverts
   to byte-identical legacy (no-op injected defaults).

**Scrutiny (2 reviewers per file, both PASS):** Ledger — arm A (code-analyzer) ran 13 adversarial
probes, 0 P0/P1; arm B (reviewer) mutation-tested the conflict return + verified all 34 real galaxy
slugs pass GALAXY_RE + computeSourceHash's 12-hex passes HASH_RE, 0 P0/P1. Refresher edit — arm A
0 P0/P1 (verified byte-identical legacy + release-only-on-claimed-path + all-skipped exits 0); arm B
PASS with 2 P1 test-gaps (skip/all-skipped/resolveChatId branches untested) + 1 P2 (header
over-promised "amplifier #3"). **All P1+P2 fixed before commit:** +4 fleet-gate tests + 5
resolveChatId tests (refresher 23→32), + a SCOPE paragraph disclosing that the gate coordinates L1
*generation* only — the per-chat sidecar rebuild is NOT coordinated (N chats → N rebuilds; cross-chat
rebuild-coalescing is a separate un-built lever).

**LESSON (durable):** arm B's load-bearing find was the R9 test-gap, not a correctness bug — "the
build added two behavioral branches (claim-or-skip, all-skipped) the suite doesn't exercise." A
byte-identical-legacy default path means the EXISTING suite stays green while NEW branches ship
untested. When wiring a gate behind a no-op default, the new tests must inject the non-default impl
to exercise the gate — green legacy ≠ covered new code. Wiki: [[galaxy-synthesis-claim-ledger]].
CLAUDE.md pointer deferred to golf via patch-sibling (locked surface).
