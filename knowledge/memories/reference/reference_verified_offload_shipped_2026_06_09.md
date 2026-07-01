---
name: reference_verified_offload_shipped_2026_06_09
description: "SHIPPED the verified-ollama-offload keystone + first live consumer (slot:alpha, 2026-06-09). scripts/lib/ollama-verified-offload.mjs (verifiedOffload: model proposes, code verifies, fail-safe fallback = 100% NET accuracy; 15 tests) + scripts/ollama-offload.mjs (offloadClassify via enumMember / offloadDigest via nonEmptyText; 8 tests + LIVE proof on gpt-oss:20b: classify VMC-facing->mill verified, digest verified). The pattern that makes auto-offload to local Ollama safe. Next consumers: /loop iteration-eval-narration, large-Read line-anchored digest. Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.251Z
aliases: reference_verified_offload_shipped_2026_06_09
---


# Verified ollama offload -- keystone + first live consumer SHIPPED (2026-06-09, slot:alpha)

Operator goal: max local-LLM utilization; auto-use Ollama for high-value tool
calls at "100% accuracy"; free Claude tokens + context.

## The principle (the whole thing rests on this)
A local LLM is NOT 100% accurate generatively. 100% NET accuracy comes from
WRAPPING the offload in CODE VERIFICATION + a fail-safe fallback. Model proposes,
code disposes. Never trust an unverified Ollama result.

## SHIPPED
1. **scripts/lib/ollama-verified-offload.mjs** (U-VERIFIED-OFFLOAD-LIB, keystone, 15/15 tests):
   `verifiedOffload({run, verify, fallback})` -> accepts the Ollama result ONLY if
   `verify(raw)` passes, else `fallback()`. Fail-safe on run-throw/run-empty/
   verify-fail/verify-throw; fallback REQUIRED + a fallback-throw propagates;
   telemetry-safe. `run` is INJECTED (zero ollama dep -> hermetic). 3 ready-made
   verifiers: `enumMember` (fixed-set pick, rejects hallucination), `jsonShape`
   (parse+predicate->validated obj), `nonEmptyText` (advisory only).
2. **scripts/ollama-offload.mjs** (U-VERIFIED-OFFLOAD-CONSUMER, first live consumer, 8/8 tests
   + R15-step-3 LIVE proof): `offloadClassify(text, allowed)` (100% via enumMember ->
   fallback null) + `offloadDigest(text)` (verified non-empty -> fallback truncated
   raw, caller always gets a string). Reuses `callOllamaOnce` from
   scripts/lib/ollama-fanout.mjs. CLI: `node scripts/ollama-offload.mjs classify|digest`.
   Knob PRISM_OLLAMA_OFFLOAD_MODEL (default gpt-oss:20b). LIVE: classify(VMC-facing,
   mill|lathe|wedm|cad)->mill verified; digest->verified summary.

## How to use it (any slot, any script)
```js
import { verifiedOffload, enumMember } from "scripts/lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "scripts/lib/ollama-fanout.mjs";
// or the ready primitives:
import { offloadClassify, offloadDigest } from "scripts/ollama-offload.mjs";
```
Offload a task ONLY when you can write a code verifier for its output. If you
can't verify it, don't auto-offload it (that's the saturated/non-converting
advisory layer -- this is verified EXECUTION).

## Consumers SHIPPED (2026-06-09 cont.)
- **commit-msg drafter** `scripts/ollama-commit-msg.mjs` (92301e5574 + 8119ab7cb6):
  draftCommitSubject(diff) via subjectShape verifier + deterministic fallbackSubject.
  14/14 tests, live gpt-oss:20b proof, 3-of-3 scrutiny PASS.
- **line-anchored file digest** `scripts/ollama-file-digest.mjs` (1175a6f26b + 8c57f02d77):
  offloadFileDigest(path) -- the headline free-token lever. lineAnchoredVerifier keeps
  ONLY claims whose snippet matches the cited SOURCE line; trust the digest + spot-check
  vs exact source instead of full Read. 16/16 tests, live proof, 3-of-3 PASS.
- **/loop iteration narrator** `scripts/ollama-loop-narrate.mjs` (e928ef5010 + 71c817c2a2):
  narrateIteration({diff,testExit,testOutput}) -- passed decided by isCleanExitZero(testExit)
  (CODE, FAIL-CLOSED), model writes advisory narration only. 18/18 tests, live proof, 3-of-3
  PASS. Scrutiny caught a fail-OPEN (Number('')===0 read as PASS) -- fixed before clear.
  PATTERN: model NARRATES, code DECIDES (when a code-decided verdict exists).
- **large-read digest advisory hook (WIRED FLEET-WIDE)** `.claude/hooks/large-read-digest-advisory.mjs`
  (0acb1dcbc9 + 31fae0eaf8): PreToolUse:Read advisory surfacing the file-digest CLI for
  large (>600-line) non-wiki source reads. Sibling of wiki-read-offload-advisory.mjs;
  fail-soft; estimates line count above 2MB. 12/12, 3-of-3 PASS, fired 16x live. The
  file-digest lever WIRED to auto-fire (R15). Wired in settings.json Read block (C->H mirror).

- **loop-narrate WIRED into loop-state** `.claude/helpers/loop-state.mjs` `narrate` subcommand
  (ca8f2ffb40): additive async command; /loop calls it after an iteration's tests; stores
  narration + flags verdictMismatch (fail-loud) on tick-status vs code-pass disagreement.
  Dependency-injected narrator (hermetic) + CLI-entry guard added (exports now importable).
  7/7 tests + live round-trip; existing commands byte-identical. Consumer #3 WIRED (R15).

- **SEARCH/navigation re-rank** `scripts/ollama-nav-rerank.mjs` (127234e940, 2026-06-10):
  the operator's #2 ollama lever (after reads). `rerankNavCandidates({query,candidates})`
  -> local model re-ranks `/system-viz find` candidate ids; `makeRerankVerifier` keeps an id
  ONLY if BOTH in the candidate set AND resolvable via `seekCard` (node-card-offset). Bad/dead
  ids dropped in model order; none survive -> trusted find-order fallback. Subset check is
  independent of resolvability (a RESOLVABLE non-candidate is still dropped -> no leak). 29/29
  hermetic (run/resolve/fallback injected) + LIVE `mill --top-k 5 --json` -> source=ollama
  verified=true. Knob PRISM_NAV_RERANK_MODEL (gpt-oss:20b). Sibling (not dup) of
  ollama-nav-enforce-inject (suggests bridge) + ollama-prism-bridge (open-ended). CLI now;
  auto-fire wiring is next. 3-of-3 PASS.

- **nav-rerank auto-fire advisory (WIRED FLEET-WIDE)** `.claude/hooks/nav-rerank-advisory.mjs`
  (0c641ef45a, 2026-06-10): PreToolUse:Bash advisory -> when a `system-viz-query ... find <q>` runs,
  surfaces `node scripts/ollama-nav-rerank.mjs "<q>"`. parseFindCommand: find-subcommand-only,
  rtk-aware, flag-strip, quote-unwrap, self-trigger guard. Fail-soft, bumps offload-stats. Sibling of
  large-read + wiki-read advisories (now cover reads/wiki/SEARCH). 16/16 + live. 3-of-3 PASS.
  KNOWN P2 (deferred): regex not start-anchored -> spurious advisory on quoted/echoed `system-viz find`
  or space-sep redirect pollutes query; advisory-only so bounded. Knobs PRISM_NAV_RERANK_ADVISORY_*.

## NEXT consumers (priority)
1. HARDEN nav-rerank-advisory parser (close 3-of-3 P2): start-anchor the find match to a real
   node/rtk invocation, strip redirect/pipe tail, add negative tests (quoted/echoed must NOT advise).
2. retrofit existing advisory hooks to verified EXECUTION where a verifier exists.
3. scrutiny pre-screen, chat-bus digest.
Coordinate model routing w/ bravo (U3-U7). Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md.
Related: [[reference_advisory_decay_2026_06_09]] (act-on-telemetry sibling),
[[agent-loop-design-rules]] (the loop discipline these serve).
