---
name: reference-u-p0-u02-recovery-2026-05-18
description: "Recovered INFRA-CONSENSUS-WIRE-MS0/U-P0-U02 Ollama model-resolve — golf FLEET-PENDING-EXTRACT cross-cutting leftover (charlie 2026-05-18)"
aliases: reference_u_p0_u02_recovery_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.008Z
---


# U-P0-U02 recovery — Ollama model-resolve (2026-05-18 charlie)

Cross-cutting leftover from golf's `FLEET-PENDING-EXTRACT-2026-05-18.md`. Golf
relayed the pid-24728 chat's handoff verbatim: "vote() + 6 tests shipped,
vitest OOMed at 97% commit — just rerun + commit".

## What was actually true (R12 — verify, don't trust the handoff)

- `git log -S"pickBestOllamaModel" --all` → **empty**. The helpers were NEVER
  committed anywhere. The handoff's "shipped" was wrong.
- The stranded chat wrote ONLY a 20-case spec test
  (`MultiModelConsensusOllamaResolve.test.ts`, untracked in the main tree) and
  OOM-died before BOTH the implementation AND the `ask()` wiring.
- Filename + test count were also approximate ("6 tests" → actually 20+1;
  "MultiModelConsensus.test.ts" → actually `...OllamaResolve.test.ts`).

So "rerun + commit" was impossible. Recovery = implement the helpers from the
spec, **wire them into `ask()`**, test, commit.

## What shipped

- `pickBestOllamaModel` / `resolveOllamaModels` — pure helpers in
  `MultiModelConsensusEngine.ts`, implemented from the spec test.
- **`ask()` wiring** — the real fix: probe `ollamaClientEngine.listModels()`,
  resolve the (primary,secondary) Ollama voices via `resolveOllamaModels`.
  Fixes the observed bug: a raw `deepseek-r1:14b` default failed every Ollama
  voice "model not found" on a host with only 7b/3b models. Fail-safe — a
  failed/empty probe leaves the requested names untouched (no-op).
- 25/25 vitest (20 helper + 1 listModels producer-contract + 4 ask()-wiring
  fail-on-revert guards). Commit on `slot/charlie` for golf to integrate.

## Lessons

- **A handoff's "shipped" is a claim, not a fact.** `git log -S<symbol> --all`
  is the cheap proof. Golf's FLEET-PENDING-EXTRACT is advisory + relays source
  handoffs verbatim — `mustHumanVerify` is real.
- **A passing spec test ≠ a working feature.** The 20-case test went green the
  moment the pure helpers existed — but the helpers were an *unwired orphan*
  (`ask()` still used the hardcoded defaults). A reviewer agent caught it as
  P1. Always check the call site, not just the test. Sister lesson:
  [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]].
- Per-file scrutiny: 4 agents dispatched, 2 returned PASS (code-analyzer +
  test-review-agent), **2 blocked by an account-wide rate limit** — full
  re-review of the wiring edit deferred. Disclosed honestly in the commit.

## Sisters

[[reference_octopus_consensus_ms1_2026_05_18]] — the OCTOPUS-CONSENSUS family this unit belongs to (juliett got it working same week).
[[reference_u_offload_ratelimit_hint_2026_05_18]] — prior charlie unit this session, same /loop.
