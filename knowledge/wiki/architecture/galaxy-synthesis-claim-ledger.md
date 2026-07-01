---
title: Galaxy synthesis-claim ledger (brain-upgrade rank 6)
type: architecture
status: shipped
shipped: 2026-05-30
slot: alpha
tags: [obsidian-brain, synthesis, compounding, fleet-distributed, claim-ledger, mutex]
---

# Galaxy synthesis-claim ledger (rank 6)

The **precondition for fleet-distributed synthesis** (amplifier #3, the 20-chat lever). PRISM's
compounding arm — `galaxy-reflection-synthesis.mjs` (B1) / `galaxy-synthesis-refresh.mjs` (AMP2) —
distills each galaxy DOMAIN's memories into one `knowledge/memories/patterns/<galaxy>_synthesis.md`
via an Ollama generation. When ~20 slot-Claudes run synthesis in parallel, without coordination
they ALL enumerate the same ~34 galaxies and ALL re-synthesize each one → 20× redundant generations
+ write-races on the same patterns/ file. This ledger lets a chat **claim** a `(galaxy, sourceHash)`
work-unit; peers checking the same unit skip it and move to an unclaimed galaxy.

## Work-unit key: `galaxy@sourceHash` (not galaxy alone)

`sourceHash = computeSourceHash(memories)` (the existing 12-hex fingerprint already stamped in each
synthesis's frontmatter — fingerprints the actual memory cluster). The claim is specific to the
EXACT cluster being synthesized:

- If the source memories change (hash X→Y) while a peer holds `galaxy@X`, a chat computing
  `galaxy@Y` finds NO live claim for Y → it correctly synthesizes the **fresh** cluster. Keying by
  galaxy alone would wrongly block the legitimate re-synthesis of changed content.
- **Bounded residual (R12, documented not silent):** if the source changes mid-flight, two
  syntheses at different hashes can briefly race; last-writer-wins on the file, and the next
  incremental refresh (`classifyGalaxy`: `storedHash !== currentHash → stale`) re-synthesizes. The
  ledger removes the common 20×-same-hash collision, not every theoretic race — its scope as an
  optimization.

## Fail-open contract (load-bearing)

The ledger is an **optimization, never a correctness gate** — synthesis works fine with no ledger
(today's single-chat behavior). So the consumer wrappers `tryClaimSynthesis` / `tryReleaseSynthesis`
**NEVER throw and NEVER block**: any lock-timeout / corrupt-store / readOnly / unexpected error →
fail-OPEN (`{ok:true, failOpen:true}`), i.e. "proceed as if uncontended." Worst case of fail-open is
a redundant synthesis (== today). ONLY a GENUINE live peer claim returns `{ok:false, conflict}`. A
ledger outage can therefore never silently drop synthesis work.

## Files & lineage

- `scripts/galaxy-synthesis-claim.mjs` — the ledger. Store `state/shared/galaxy-synthesis-claims.json`
  (main tree, shared by all worktrees — correct for a fleet-wide mutex), keyed `galaxy@hash`.
  Clones the proven atomic-RMW + O_EXCL-lock (stale-TTL steal) + schema-guard + corrupt-preserve
  pattern of `.claude/helpers/slot-task-claim.mjs` (PER-SLOT-CLAIM-MS0) — a dedup-verified **sibling**
  (different domain/store/key), not a duplicate; the lock/store primitives there are hard-bound to
  that store's path. Pure fns (`applyClaim`/`applyRelease`/`sweepExpired`/`checkClaim`/
  `peerClaimedKeys`) + fail-open wrappers + CLI (`claim`/`release`/`check`/`list`/`sweep`). TTL 10min
  (floor 1m, ceiling 1h). 42 node:test (incl. a real-fs tmpdir lock oracle + the fail-open contract).
- `scripts/galaxy-synthesis-refresh.mjs` — wired the gate into `executeRegenAndCascade`: per-galaxy
  claim-or-skip (the atomic claim is the real mutex; a peer's galaxy is SKIPPED, not redone),
  release in `finally` (success OR synth-failure; never on the skip path). No-op injected defaults →
  **byte-identical legacy behavior** when claims are disabled. `resolveChatId` (--chat-id /
  PRISM_CHAT_ID / synthetic `synth-<pid>`). Default-ON; `PRISM_GALAXY_SYNTH_CLAIM_DISABLE=1` reverts.

## SCOPE (honest — R12)

This gate de-duplicates the L1 **generation** only. It does NOT yet coordinate the **sidecar
rebuild** — each chat that regenerated ≥1 galaxy still runs its own index+embed+meta rebuild, so N
chats → up to N rebuilds contending on the shared sidecars. Cross-chat rebuild-coalescing (a
debounced single-flight rebuild claim) is a SEPARATE, un-built lever. Rank 6 is the
generation-coordination precondition for amplifier #3, not the whole of it.

## Tests

- `scripts/galaxy-synthesis-claim.test.mjs` — 42 cases (pure fns, schema-guard/corrupt/readOnly,
  real-fs lock oracle, fail-open: corrupt→failOpen, lock-fail→failOpen, genuine-conflict→ok:false).
- `scripts/galaxy-synthesis-refresh.test.mjs` — 32 cases (23 legacy still green = byte-identical +
  9 new: peer-claimed-skip excludes from strip, all-skipped → no rebuild, release-on-success +
  release-on-failure, and 5 `resolveChatId` branches). 2-reviewer per-file scrutiny PASS on both
  files (arm A 0 P0/P1; arm B PASS — its 2 P1 test-gaps + 1 P2 doc-honesty fix all resolved).

Memory: [[reference_alpha_galaxy_synthesis_claim_2026_05_30]]. Siblings:
[[reference_alpha_l2_meta_synthesis_2026_05_29]] (#1), [[reference_alpha_amp2_incremental_refresh_2026_05_29]]
(#2), [[reference_alpha_brain_refresh_ms0_2026_05_30]].
