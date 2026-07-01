---
title: Verified Ollama offload -- 100% net accuracy via code-verification wrapping
type: lesson
tags: [lesson, ollama, token-savings, offload, local-llm, verification, slot-alpha]
last_verified: 2026-06-09
source_commits: [619a84197b, 90bc181767]
related_memory: reference_verified_offload_shipped_2026_06_09
slot: alpha
---

# Verified Ollama offload -- the pattern that makes auto-offload SAFE

## The problem it solves
PRISM has ~20 ollama hooks that SUGGEST offloading work to the local LLM. They are
saturated + non-converting (route-pretooluse fires thousands of times at ~15%
take) because a SUGGESTION costs attention but an unverified local-LLM result
can't be trusted to ACT on. Operator goal: auto-use Ollama for high-value tool
calls "at 100% accuracy." A local LLM is NOT 100% accurate generatively -- so how?

## The principle
**100% NET accuracy comes from WRAPPING the offload in CODE VERIFICATION + a
fail-safe fallback. The model proposes; code disposes.** You never trust the raw
Ollama output -- you accept it only when a pure code check passes, else you fall
back to the trusted (Claude/raw) path. The accuracy is the verifier's, not the
model's.

Corollary -- the auto-offload criterion: **offload ONLY tasks whose output is
(a) deterministic, or (b) cheaply verifiable by code.** If you can't write a
verifier for it, don't auto-offload it.

## The keystone: scripts/lib/ollama-verified-offload.mjs (commit 619a84197b)
```js
verifiedOffload({ run, verify, fallback, onResult }) -> { value, source, verified, fellBack, reason }
```
- `run()` -- the Ollama call, INJECTED (so the lib has zero ollama dep + is
  hermetically testable). Throws or returns empty -> fallback.
- `verify(raw)` -- a PURE code check. Returns `boolean` or `{ok, value}` (the
  `value` form hands back the validated/parsed object). A verify-throw is treated
  as a fail (never trust on verifier error).
- `fallback()` -- REQUIRED (no safe auto-offload without a trusted path). A
  fallback-throw PROPAGATES (the real path failing is a genuine error, not swallowed).
- Fail-safe on every path: run-throw / run-empty / verify-fail / verify-throw -> fallback.

Three ready-made verifiers (the common 100%-safe cases):
- `enumMember(allowed)` -- output must be one of a fixed set; snaps a case/space
  near-match to the canonical member; rejects ANY hallucinated value. (e.g. /loop
  next-unit pick from a fixed unit set, domain classification.)
- `jsonShape(predicate)` -- JSON.parse + predicate; returns the validated object.
  (e.g. /goal decomposition draft -> {units:[...]}.)
- `nonEmptyText(minLen)` -- the WEAKEST; use only for advisory narration the system
  doesn't act on unverified.

## First live consumer: scripts/ollama-offload.mjs (commit 90bc181767)
Reusable, fleet-callable primitives + CLI, reusing `callOllamaOnce` (ollama-fanout.mjs):
- `offloadClassify(text, allowed)` -- 100% via enumMember; hallucination -> fallback null.
- `offloadDigest(text)` -- verified non-empty; fallback = truncated raw text (the
  caller ALWAYS gets a usable string; a digest failure never blanks the field).
- CLI: `node scripts/ollama-offload.mjs classify "<text>" <opt...> | digest <@file>`.
- Knob `PRISM_OLLAMA_OFFLOAD_MODEL` (default gpt-oss:20b).

**LIVE-PROVEN (R15-step-3) on real Ollama:** classify("facing a 6061 block on a
3-axis VMC", mill|lathe|wedm|cad) -> `mill`, source=ollama, verified; digest ->
verified summary. 15 keystone tests + 8 consumer tests, all hermetic.

## How any slot uses it
```js
import { verifiedOffload, enumMember } from "scripts/lib/ollama-verified-offload.mjs";
import { callOllamaOnce } from "scripts/lib/ollama-fanout.mjs";
const r = await verifiedOffload({
  run: async () => (await callOllamaOnce(prompt, { model: "gpt-oss:20b" })).text,
  verify: enumMember(["a","b","c"]),
  fallback: async () => myTrustedPath(),
});
if (r.source === "ollama") { /* free, verified */ } else { /* trusted fallback */ }
```

## Consumers shipped (the compounding line)
- [SHIPPED] **commit-msg drafter** `scripts/ollama-commit-msg.mjs` (92301e5574 + 8119ab7cb6):
  `draftCommitSubject(diff)` -> `subjectShape` verifier (first non-empty line, 8..120,
  ASCII, no refusal-preamble) + deterministic `fallbackSubject` (parses `+++ b/<file>`).
  14/14 tests, live gpt-oss:20b proof. `git diff --cached | node scripts/ollama-commit-msg.mjs`.
- [SHIPPED] **line-anchored file digest** `scripts/ollama-file-digest.mjs` (1175a6f26b + 8c57f02d77):
  the headline free-token lever. `offloadFileDigest(path)` -> `lineAnchoredVerifier`
  keeps ONLY claims whose `{line,snippet}` matches the cited SOURCE line (drops
  hallucinations; rejects to head+tail fallback if none survive). 16/16 tests, live
  proof (100-line file -> 10 verified claims). Trust the digest, spot-check any claim
  vs exact source -- skip the full Read. `node scripts/ollama-file-digest.mjs <path>`.
  (summary is advisory prose; only claims are machine-checkable file:line citations.)

- [SHIPPED] **/loop iteration narrator** `scripts/ollama-loop-narrate.mjs` (e928ef5010 +
  71c817c2a2 fix): `narrateIteration({diff,testExit,testOutput})` -> `passed` decided
  by `isCleanExitZero(testExit)` (PURE CODE, FAIL-CLOSED -- a malformed/empty exit code
  is NOT a pass); the model only writes advisory narration (`nonEmptyText`) with a
  deterministic `fallbackNarration`. 18/18 incl 2 honesty-invariant + 5 fail-closed.
  Scrutiny caught a fail-OPEN bug (`Number("")===0` read as PASS) -- fixed before clear.
  PATTERN: when a code-decided verdict exists, the model NARRATES, code DECIDES.

- [SHIPPED + WIRED FLEET-WIDE] **large-read digest advisory hook** `.claude/hooks/large-read-digest-advisory.mjs`
  (0acb1dcbc9 + 31fae0eaf8): PreToolUse:Read advisory that surfaces the file-digest CLI
  for large (>600-line) non-wiki source reads. Sibling of wiki-read-offload-advisory.mjs;
  fail-soft/never-blocks; bumps offload-stats so advisory-decay self-governs it; above
  2MB it ESTIMATES line count (never loads the file on the hot path). 12/12 tests + live
  (fired 16x in real fleet usage). This is the file-digest lever WIRED to auto-fire (R15).

- [SHIPPED + WIRED] **loop-narrate into loop-state** `.claude/helpers/loop-state.mjs` `narrate`
  subcommand (ca8f2ffb40): additive async command; /loop calls it after an iteration's
  tests -> stores the model narration onto the iteration + flags `verdictMismatch`
  (fail-loud) when the tick's recorded status disagrees with the code-decided pass. The
  narrator is dependency-injected (hermetic); added a CLI-entry guard so the exports are
  importable. 7/7 tests + live ollama round-trip; existing commands byte-identical.
  This WIRES consumer #3 (R15). Both file-digest (reads) + loop-narrate (loop) auto-fire now.

- [SHIPPED] **SEARCH/navigation re-rank** `scripts/ollama-nav-rerank.mjs` (127234e940): the
  operator's #2 ollama lever (after reads). `rerankNavCandidates({query,candidates})` asks a
  local model (gpt-oss:20b) to re-rank `/system-viz find` candidate node-ids; `makeRerankVerifier`
  keeps an id ONLY if it is BOTH (a) in the original candidate set AND (b) resolvable via
  `seekCard` (node-card-offset existence) -- hallucinated/dead ids are dropped in model order, and
  if none survive it falls back to the trusted deterministic find order. So a bad nav target can
  never surface (the subset check is independent of resolvability -- a RESOLVABLE non-candidate is
  still dropped). run/resolve/fallback injected (hermetic). 29/29 tests (happy + hallucinated +
  unresolvable + subset-leak adversarial + reverse-order adversarial + throwing-resolve + fallback
  + CLI parse). LIVE: `node scripts/ollama-nav-rerank.mjs mill --top-k 5 --json` -> source=ollama,
  verified=true, all 5 ids resolve. Sibling (not dup) of `ollama-nav-enforce-inject.mjs` (suggests
  the agentic bridge) + `ollama-prism-bridge.mjs` (open-ended investigator): this is a BOUNDED
  verified re-rank of an existing candidate set. Knob `PRISM_NAV_RERANK_MODEL`. CLI now; the
  auto-fire wiring (surface it after a `/system-viz find`) is the next consumer.

- [SHIPPED + WIRED FLEET-WIDE] **nav-rerank auto-fire advisory** `.claude/hooks/nav-rerank-advisory.mjs`
  (0c641ef45a): PreToolUse:Bash advisory -- when a `system-viz-query ... find <query>` is about to
  run, it surfaces `node scripts/ollama-nav-rerank.mjs "<query>"` (the verified re-rank). `parseFindCommand`
  detects the find subcommand (rtk-wrapper-aware, flag-stripping, quote-unwrap, bare `system-viz find`
  form), NEVER matches other subcommands (node-card/doc-nodes) and NEVER the re-rank CLI itself (no
  self-trigger loop). Fail-soft/never-blocks; bumps offload-stats so advisory-decay self-governs it.
  Sibling of large-read (reads) + wiki-read (wiki): the verified-offload advisories now cover reads,
  wiki, AND search. 16/16 tests + live (fires on `find mill`, silent on `git status` + on the re-rank
  CLI). Wired in settings.json PreToolUse:Bash (C->H mirror). Galaxy-agnostic -> all 34 galaxies, one
  wiring. Knobs `PRISM_NAV_RERANK_ADVISORY_{DISABLE,VERBOSE}`. **KNOWN P2 (3-of-3 deferred):** the find
  regex is not start-anchored, so a quoted/echoed `system-viz find` (e.g. inside `echo`/`grep`) or a
  space-separated redirect (`find mill > out`) can emit a SPURIOUS advisory / pollute the captured
  query -- bounded (advisory-only: never blocks/mis-silences/mis-routes). HARDENED 4b299e313b (below).

- [SHIPPED] **nav-rerank-advisory P2 hardening** (4b299e313b): closed the deferred P2. `parseFindCommand`
  now (1) cuts at the first shell control/redirect operator and parses only the first segment (redirect/pipe
  tail no longer pollutes -- `find mill > out.txt` -> `mill`), and (2) is ANCHORED (Form A = real
  `system-viz-query[.mjs] find` script name; Form B = bare `system-viz find` only at segment START) so a
  MENTION in echo/grep/a quoted string never fires. 21/21 tests (+5 negatives) + live re-verify. Reviewer PASS.

- [SHIPPED] **multi-source files digest** `scripts/ollama-offload.mjs` `offloadFilesDigest(paths)` +
  `digest-files` CLI verb (U-FILES-DIGEST): consumer #9 (chat-bus / multi-handoff condense). The
  single-file `digest @file` couldn't condense the 92-unread chat-bus (many JSONL files) or a
  multi-handoff set. Reads N files (fail-soft: missing/unreadable SKIPPED), aggregates with labeled
  separators, bounds to maxChars (16000), verified-digests via offloadDigest (nonEmptyText). Fallback
  = truncated raw aggregate; nothing readable -> `{source:none, reason:no-readable-files}` (R12).
  Returns the record + `sources`. 15/15 tests (+7) hermetic via injected readImpl+runImpl; LIVE: 2 real
  alpha handoffs -> source:ollama verified:true. **PLACEMENT FINDING:** verified EXECUTION belongs in
  on-demand CLI / Stop paths, NOT a latency-critical PreToolUse hook (an in-hook Ollama call would
  block the tool + risk the 3-5s hook timeout -- the reason the read/wiki/nav advisories SUGGEST a CLI
  rather than execute). P3 (deferred, benign for small-file use): a single file >> maxChars is fully
  read into RAM before the slice (prompt is bounded; peak RAM is not).

## Next consumers (the build queue)
1. retrofit existing advisory hooks to verified EXECUTION where a verifier exists -- but per the
   PLACEMENT FINDING above, target a STOP hook (e.g. a session-end handoff/chat-bus digest that calls
   `offloadFilesDigest`), NOT a PreToolUse hook. #9's primitive is the building block.
2. scrutiny pre-screen offload (gpt-oss:120b first-pass before the Claude 3-of-3; advisory, gate stays
   authoritative) -- RISKY (touches the load-bearing 3-of-3 gate); build only when MCP is healthy.
3. (operator-gated, guard-audit wf_8aad5adf-f68) relax the "always says compact" noise: relabel
   critical-memory-compact-nudge ("reap zombies" not "/compact"); dedup the Stop advisories; collapse the
   3 redundant ctx-token compact injectors. KEEP the pressure gate. See [[reference_commit_pressure_rootfix_2026_06_10]].

Spec + per-task verifier table: `state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md`.
Sibling: [[advisory-decay-gate]] (act on the telemetry, don't just measure it);
the loop discipline these serve: [[agent-loop-design-rules]].
Memory: [[reference_verified_offload_shipped_2026_06_09]].
