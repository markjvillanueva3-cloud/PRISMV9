---
title: Consensus-queue drain hardening — race, hung-exit/orphan-leak, and the single-voter GPU-contention limit
type: lesson
tags: [consensus, octopus, drain, race, file-lock, orphan-leak, ollama, vram, gpu-contention, hermes-zulu, slot-bravo]
created: 2026-06-17
slot: bravo
related:
  - "[[reference_consensus_single_voter_vram_probe_2026_06_17]]"
  - "[[reference_consensus_drain_local_2026_06_09]]"
  - "[[reference_consensus_drain_scaling_2026_06_09]]"
  - "[[zulu-build-cron-git-grounded-shipped-detection]]"
---

# Consensus-queue drain hardening (slot:bravo, 2026-06-17)

The auto-consensus hooks (`auto-consensus-userprompt.mjs`, `auto-consensus-critical-edit.mjs`) enqueue
every prompt/critical-edit to `state/shared/consensus-queue.jsonl`; `consensus-queue-drain.mjs` drains
it (run on EVERY chat's Stop via `stop-consensus-drain.mjs`, across the 26-slot fleet). Hardening it
surfaced three distinct lessons.

## 1. Shared-file race: a whole-queue overwrite with no lock (U-DRAIN-LOCK-SAFE)
The drain read the WHOLE queue, processed N entries, then `writeQueue(remaining)` ONCE at the end with
NO lock. Firing on every Stop across 26 chats, two concurrent drains each read the full queue and each
overwrote it with their own stale "remaining" -> entries resurrected (re-processed) or lost + duplicate
Ollama spend. Same class as the staging-harm + parseShipped shared-file bugs.

**Fix:** claim ONE entry atomically under a SHORT exclusive lock (`scripts/lib/exclusive-file-lock.mjs`,
the canonical O_EXCL+stale-steal primitive): `read queue -> shift -> writeQueue(remaining) -> release`
(sub-second), then run the slow ~90s `engine.ask()` OUTSIDE the lock. Honors the lock module's
hold-duration contract (mtime stamped at acquire, never refreshed; 30s staleMs => never hold across a
90s call). `writeQueue` made atomic (temp+rename) since it now fires per-entry. Semantics moved from
at-least-once-WITH-RACE to **at-most-once** (claim-by-remove) — acceptable for an advisory queue the
hooks continuously re-enqueue. Proven by a 2-process interleaved concurrency test (exactly-once:
disjoint+complete partition; fails if the lock is removed).

**Transferable:** any queue/ledger drained by a hook that fires fleet-wide is a shared-file race unless
each item is claimed atomically under a lock. "Slow work outside the lock, short read-modify-write
inside" is the canonical pattern (the lock module's own contract).

## 2. Hung exit -> exit 255 + a per-Stop orphan leak (U-DRAIN-CLEAN-EXIT)
The drain recorded its consensus correctly but then exited **255**, not 0 — and `--max=20+` "died". Root
cause (verified live, not assumed): the success path was `main().catch(...)` with NO `process.exit(0)`.
`engine.ask()` opens HTTP keep-alive sockets to Ollama (:11434) that keep the node event loop alive
AFTER the consensus is fully computed + SYNCHRONOUSLY recorded. So node HANGS on exit and is externally
killed -> 255. Worse: `stop-consensus-drain.mjs` spawns the drain DETACHED on every Stop across 26 slots,
so each hung drain became a lingering node process the fleet-reaper had to reap — a chronic orphan leak.

**Fix:** `main().then(() => process.exit(0)).catch(...)`. All durable work (sync `appendProcessed` +
`writeQueue`) is complete by the time `main()` resolves, so exit(0) is safe + immediate (abandons only
the lingering sockets). Validated live: foreground `--once` now exits 0 in ~93s (was 255). This is the
real cause of the documented `--max=20+` exit-255 "scaling limit" too.

**Transferable:** a CLI that makes HTTP calls (keep-alive) needs an explicit `process.exit(0)` after its
work, or it hangs on exit. When such a CLI is spawned DETACHED by a fleet-wide hook, the hang is a
per-invocation orphan multiplied across the fleet — a clean exit is also fleet-hygiene.

## 3. Single-voter consensus is a GPU-contention limit, not a code path (U-DRAIN-PROBE-IS-RIGHT)
Every drained entry recorded `voters=[qwen2.5-coder:32b]` only, flat `agreement=0.5` — a "consensus" with
one voice. Both panel models ARE installed; the `diverseLocalPanel` capability probe drops `gpt-oss:20b`
under fleet free-VRAM contention. **Disproven fix:** pinning gpt-oss:20b via the dual-Ollama path to
FORCE a 2nd voice. Direct `engine.ask()` diagnostic: the dual-pin DID seat both voices, but
`qwen2.5-coder:32b ok=true` while `gpt-oss:20b ok=false err=TIMEOUT` — the 13GB non-resident model cannot
cold-load + generate within the 90s timeout while 8 chats hammer the GPU. So it still yields voters=1 AND
wastes ~90s/entry. **The probe's drop was correct;** `diverseLocalPanel` (fast graceful single-voter under
contention) is the right behavior. Reverted; documented inline so it is not retried.

**Transferable:** under GPU contention the bottleneck is cold-load latency, not the model-selection code.
A capability probe that drops a non-runnable model is doing the right thing; forcing it back in just
moves the failure to a timeout. Verify a "quality fix" with a direct end-to-end diagnostic (full responses
incl failures) before shipping it (R9/R12).

### RESOLVED (U-DRAIN-FORCEPROBE-2VOICE, same day) -- it was a STALE PROBE CACHE, not contention
The "single-voter is contention-bound, defer to an idle window" conclusion above was INCOMPLETE. Live
diagnosis on an IDLE GPU (~95GB free) still recorded voters=1 -- yet `engine.ask({diverseLocalPanel,
forceProbe:true})` recorded BOTH ok=true. Root cause: the drain read `ollamaCapabilityProbeEngine`'s
**5-minute cache**; a stale snapshot from an earlier contention period kept dropping gpt-oss:20b even after
the GPU went idle -> a permanent single-voter. Fix: `buildDrainVoiceBound` sets `forceProbe:true` (fresh
probe each drain). Idle -> real 2-voice (live-validated: participants=[qwen2.5-coder:32b, gpt-oss:20b], both
ok=true, disagreed agree~0.03 -> escalate); contention -> fresh probe gracefully seats 1 (no wasted timeout).
Added `consensus_participants` to the ledger (models that ANSWERED) vs `consensus_voters` (winning cluster) so
a healthy 2-voice DISAGREEMENT is distinguishable from the bug. **Meta-lesson:** a TTL-cached capability probe
can pin a WRONG decision long after the world changed -- a latency-tolerant batch job should force a fresh probe.

Commits: `U-DRAIN-LOCK-SAFE` + `U-DRAIN-CLEAN-EXIT` + `U-DRAIN-PROBE-IS-RIGHT` + `U-DRAIN-FORCEPROBE-2VOICE` (slot:bravo).

## 4. WIRED != ENABLED -- the grown corpus reached a DORMANT consumer (U-OCTOPUS-WEEKLY-CONSUME-ENABLE)
After growing the per-galaxy octopus corpus to 11 domains, R15-VALIDATE asked: does the corpus actually
FEED a learning consumer, or just sit on disk? Both consumers (`octopus-consumption-bridge.mjs`,
`octopus-weekly-synthesis-loader.mjs`) enumerate domains DYNAMICALLY (`listOutcomeDomains()`), so they
auto-pick-up all 11 -- no stale hardcoded subset (the positive). BUT the weekly-synthesis consumption was
WIRED-BUT-DORMANT: `WeeklySynthesisEngine.ts:494` composes `composeOctopusLoader(baseLoader,{outcomesDir})`,
yet the composer returns the base loader UNCHANGED unless `PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1` -- a knob that
was UNSET everywhere real. Built + wired + switched off => the corpus never reached the reflective retro.

**Fix:** set the knob in settings.json (proven live: knob=1 -> 3 sources folded incl an 11-galaxy
per-domain rollup of real 2-voice outcomes; knob unset -> base passthrough). This activates the
MCP/dispatcher path (`prism_memory:weekly_synthesis_get` -> `runWeekly()`, MCP inherits settings env),
effective next MCP launch. The RECURRING Task-Scheduler cron (`weekly-synthesis-cron.ps1`) does NOT inherit
settings env -> needs a re-register with the knob baked into its argument (attended/daytime, system
mutation -- not done unattended overnight).

**Transferable:** "wired" is not "enabled". A default-off knob (shipped for byte-identical-on-ship safety)
plus a launch-context env gap can leave a fully-built, fully-tested consumption loop silently dormant.
R15-VALIDATE means proving the producer's output actually REACHES the consumer's runtime -- and that means
checking the env propagation path (settings.json reaches hooks + the MCP subprocess + Bash tool subprocs,
but NOT a standalone Task-Scheduler/cron process, which carries its own env).

## 5. The fail-open silent-loss class across the AI-learning feeder chain (audit + 3 fixes)
After enabling the consumption knobs, a read-only audit of the whole AI-learning feeder chain found the
SAME fail-open silent-loss class that bit the tribal brain (33,639->1) and the consensus voice (stale
probe): a `catch { return [] / "" }` on a read of an EXISTING corpus/feed silently returns empty, so the
model/pipeline trains/reasons on NOTHING while "looking fine". Fixed 3 (slot:bravo):
- `octopus-record-lib.readOctopusLedger` -- `readFileSync(utf8)` -> V8-512MiB-cap throw -> silent []. Now
  Buffer + `indexOf(0x0a)` line-walk + fail-loud on exists-but-unreadable.
- `octopus-consumption-bridge.readConsensusOutcomes` -- outer `catch{return[]}` masked a read error on an
  existing per-galaxy feed. Now existsSync-outside-try + Buffer bounded `subarray` tail + fail-loud.
- `galaxy-reasoning-bridge.callOllama` -- empty 200-OK returned `""`, which the fallback ladder cached as
  a valid CAG answer (poisoning every galaxy until fingerprint change). Now throws on empty -> ladder
  descends -> caller degrades.
Deferred to india (cross-domain): `vault-to-lora-dataset` + `vault-to-gnn-refpool` have the same
directory-exists-but-unreadable -> silent-[] swallow feeding LoRA/GNN. Each fix has an EISDIR (or
fetch-mock) regression oracle that fails under the old catch-and-return-empty.

**Transferable:** `catch -> return empty` is correct ONLY for a genuinely-absent file (existsSync false).
On an EXISTING corpus that won't load (V8 string cap, lock, corruption, partial write) it is silent TOTAL
data loss. Always distinguish absent (->empty fine) from exists-but-unreadable (->FAIL LOUD); for an
append-only corpus, read as a Buffer (no 512MiB string cap) and walk/slice bounded. Detail + file:lines:
memory `reference_ai_learning_feeder_silent_loss_audit_2026_06_17`.
