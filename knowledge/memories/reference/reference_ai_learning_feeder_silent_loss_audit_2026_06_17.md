---
name: reference_ai_learning_feeder_silent_loss_audit_2026_06_17
description: Audit of PRISM's AI-learning feeder chain for the fail-open silent-loss bug class (catch->empty on an EXISTING corpus); 3 bugs fixed (octopus ledger + feed + CAG), 1 documented for india (vault->LoRA/GNN)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.463Z
aliases: reference_ai_learning_feeder_silent_loss_audit_2026_06_17
---


# AI-learning feeder silent-loss audit + fixes (slot:bravo, 2026-06-17)

Overnight AI-learning acceleration. After enabling the dormant octopus->weekly-synthesis consumption
(P5) + the galaxy-MEMORY->Obsidian mirror (P3), I audited the whole AI-learning FEEDER chain for the
fail-open silent-loss class -- the bug that already bit this fleet TWICE (the tribal-brain fail-open read
clobbered 33,639->1 entries [[reference_tribal_index_v8_string_cap_2026_06_08]], and the stale capability
probe silently dropped a consensus voice [[reference_consensus_single_voter_vram_probe_2026_06_17]]). The
class: a `catch { return [] / "" }` on a read of an EXISTING corpus/feed (vs a genuinely-absent file)
silently returns empty -- so the model/pipeline trains/reasons on NOTHING while everything "looks fine"
(R12 says a feed that can't load must FAIL LOUD, not return empty).

A read-only sonnet audit (the operator's "do backend tasks" fallback) found 4 real instances. The fix
pattern for all: read as a Buffer (no V8 512MiB string cap), distinguish absent (->[] legitimate) from
exists-but-unreadable (->THROW), and the consumer wraps in try/catch if it wants fail-soft.

## FIXED this session (bravo-owned + cross-cutting AI substrate)
1. **`scripts/lib/octopus-record-lib.mjs:readOctopusLedger`** (P0, U-OCTOPUS-LEDGER-V8CAP-FAILLOUD) --
   bare `readFileSync(utf8)+catch{return[]}` -> V8-cap throw silently zeroed the octopus learning arm of
   WeeklySynthesis (the P5 feed I'd just enabled). Fixed: Buffer + native `indexOf(0x0a)` line-walk +
   fail-loud. +4 R9 tests (EISDIR oracle + no-trailing-newline + CRLF). 2-arm PASS.
2. **`scripts/lib/octopus-consumption-bridge.mjs:readConsensusOutcomes`** (P0, U-OCTOPUS-FEED-READ-FAILLOUD)
   -- outer `catch{return[]}` masked a read error on an EXISTING per-galaxy feed + whole-file-utf8 V8-cap
   risk. Fixed: existsSync OUT of try, Buffer read + bounded `subarray` tail-slice + fail-loud. +2 R9
   tests. Both callers verified try/catch-wrapped. 2-arm PASS.
3. **`scripts/lib/galaxy-reasoning-bridge.mjs:callOllama`** (P1, U-CAG-EMPTY-RESPONSE-FAILLOUD) -- an empty
   200-OK returned `""`, which the fallback ladder treated as a SUCCESSFUL answer (a non-null "" breaks
   the ladder) and CACHED -> every galaxy's CAG answer poisoned with "" until the corpus fingerprint
   changed. Fixed: throw on empty 200-OK (mirrors the miner's guard) -> ladder descends -> caller degrades
   (never caches blank). +R9 fetch-mock oracle (46/46). callOllama exported as test seam. 2-arm PASS.

## DOCUMENTED for india (NOT fixed -- cross-domain, respect the standing constraint)
4. **`scripts/vault-to-lora-dataset.mjs:154` (`collectFeedbackExamples`) + `scripts/vault-to-gnn-refpool.mjs:192`
   (`collectVaultWirings`)** (P1) -- a vault memory DIRECTORY that EXISTS but is unreadable (lock/ACL/VSS)
   returns `[]`/`continue` silently, indistinguishable from an absent corpus -> the LoRA feeder emits 0
   pairs + the GNN ref-pool feeder emits 0 wirings, and a downstream `assembler-fleet-lora-corpus` run
   trains on zero examples without knowing the source was broken. SAME fix pattern (before the catch
   swallow, `existsSync(dir)` -> if it exists, surface the I/O error loud: throw in lib mode / stderr+exit
   in CLI mode). These are INDIA's LoRA/GNN learning pipeline -> deferred to india (I do not edit india's
   GNN/LoRA unattended per the standing constraint). The per-FILE read inside (one bad .md skipped) is
   fine; only the DIRECTORY-level swallow is the bug.

## Audit also CONFIRMED-CLEAN (fail-loud-correct, no fix needed)
`ai-systems-fleet-state.mjs:readJson` (caller checks null + surfaces gap), `mine-galaxy-transcripts.mjs`
(streaming reads, already throws on empty 200-OK), `cag-router.mjs`/`galaxy-mining-registry.mjs` (pure, no
I/O), the optional classify-cache (absent->{} is correct, it's a cache not a corpus).

## Lesson (transferable)
A `catch -> return empty` on a read is correct ONLY for a genuinely-absent file. On an EXISTING corpus
(exists but won't parse/load -- size cap, lock, corruption, partial write) it is silent TOTAL data loss
that masquerades as "no data". Distinguish absent (existsSync false -> [] fine) from exists-but-unreadable
(-> FAIL LOUD). For an append-only corpus, also read as a Buffer (no V8 512MiB string cap) and slice/walk
bounded. Wiki: [[consensus-drain-hardening-race-exit-voice]] (the silent-loss section). Siblings:
[[reference_tribal_index_v8_string_cap_2026_06_08]] · [[reference_consensus_single_voter_vram_probe_2026_06_17]].
