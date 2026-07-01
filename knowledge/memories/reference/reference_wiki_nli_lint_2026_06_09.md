---
name: reference_wiki_nli_lint_2026_06_09
description: wiki contradiction NLI lint (OLLAMA-SYNERGY #4) + 2 bug-findings (CLI isMain, GPU contention)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.264Z
aliases: reference_wiki_nli_lint_2026_06_09
---


# Wiki NLI contradiction lint + 2 findings (2026-06-09, slot:sierra, OLLAMA-SYNERGY #4)

Shipped `scripts/lint-wiki-contradictions.mjs` (+25 tests) -- an advisory pairwise-NLI lint that finds CURATED wiki page pairs whose claims CONTRADICT, judged by a local Ollama model. This is a self-improving-Obsidian accelerator: it surfaces "lesson A says X, lesson B says not-X" drift that nothing else caught. Commits `f8c183f7a5` + `c55e05cf03`. 25/25, 3-of-3 PASS.

**Design (reusable pattern for any wiki-corpus LLM pass):**
1. **Corpus scope matters.** `knowledge/wiki/` has ~39K files, almost all auto-generated field-dumps that can't meaningfully contradict. Scope to CURATED human-authored subdirs (concepts/decisions/lessons/patterns/software-engineering/ux-design/trajectories/entities = ~280 live pages; lessons 239 + software-engineering 36 dominate). `architecture/**` + `code-tribal/**` excluded (`--include-arch` opt-in).
2. **Candidates, NOT all-pairs.** O(N^2) over even 280 is wasteful and over 39K infeasible. Inverted index token->page[], emit C(k,2) per bucket, SKIP buckets > maxBucket(60) (too-generic tokens), keep pairs sharing >=2 topic tokens, sort by shared desc, `--limit` cap. Reviewer C empirically verified the 60-cap bounds `--include-arch`: the largest bucket was 18,218 pages (skipped); only ~307K pair-inserts survive.
3. **Fail-soft + circuit breaker.** callOllama per pair (gpt-oss:20b default, env PRISM_WIKI_NLI_MODEL, fail-soft model fallback via fetchInstalledModels). Any call failure -> pair `unchecked`, never throws. CIRCUIT BREAKER: abort after N(5) CONSECUTIVE failures so a down/saturated Ollama doesn't grind every pair at the full timeout for hours.
4. **Robust verdict parse.** parseNliVerdict scans the prompt-mandated FIRST line first, WORD-BOUNDARY match (so "UNRELATEDNESS" != unrelated), with a negation guard (not/n't/no/never/cannot before CONTRADICT -> dropped, so "they do not contradict" is not a false CONTRADICT). 2 reviewers independently flagged the naive substring/earliest version (P2) -> hardened in c55e05cf03.

**FINDING 1 (CLI bug, fixed):** the `isMain` guard `pathToFileURL(process.argv[1]).href === import.meta.url` SILENTLY FAILED under `node scripts/foo.mjs` invocation (main() never ran -> no output, no file, exit 0 -- looks like success). Fixed to `realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])` (compares real fs paths; handles Windows drive-letter casing/slash/symlink). Lesson: the URL-string isMain compare is fragile on Windows; use realpath compare for CLI scripts.

**FINDING 2 (operational, not code):** during live-validate the local Ollama was SATURATED -- EVERY model (gpt-oss:20b, qwen2.5-coder:32b, even the 1GB qwen2.5-coder:1.5b) timed out (45-120s) under concurrent fleet load (multiple /loop sessions + gpt-oss:120b resident via KEEP_ALIVE=-1). callOllama itself works (weekly-synth got 804ch from 120b earlier same session) -- this was contention. The lint's fail-soft handled it correctly (unchecked + honest report), and the live-validate DROVE the circuit-breaker design. Lesson: a fleet-wide GPU is a shared, saturatable resource; per-pair LLM tools MUST fail-soft + circuit-break, and live-validation of an LLM tool can be blocked by transient contention (re-run when free; the underlying call mechanism is proven separately).

**R15 status:** WIRE+TEST+VALIDATE done (pipeline/candidate/fail-soft/CLI/skip-path live-proven on real 280-page corpus); a live CONTRADICT verdict is PENDING a non-saturated GPU window (`node scripts/lint-wiki-contradictions.mjs --write --limit 5 --section`). See [[reference_weekly_synth_resolver_2026_06_09]] (gpt-oss num_predict), [[reference_ollama_synergy_audit_2026_06_09]].
