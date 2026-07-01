---
name: reference_ollama_autorun_build_2026_06_09
description: OLLAMA-AUTORUN-BUILD session (slot:bravo) - the 96GB box offloaded ~0% because the router AND route hook named retired models; 5 units fixed it + the U4 safety-denylist P0 lesson.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.671Z
aliases: reference_ollama_autorun_build_2026_06_09
---


# OLLAMA-AUTORUN-BUILD (slot:bravo, 2026-06-09)

Operator /goal: optimize Ollama for this PC's hardware + auto-route per task + "upgrade RTK using the LLM/hardware leap." All work isolated on slot/bravo worktree (H:/prism-slot-bravo), NOT merged (gated).

## Root cause found (the headline)
The 96GB Blackwell box was offloading **~0%** despite strong resident models, because the offload substrate was **stale-on-arrival**:
- `mcp-server/src/engines/OllamaTaskOffloaderEngine.ts` `OLLAMA_MODELS` listed 4 absent/retired models (qwen2.5-coder:7b/:14b retired 2026-06-04, codellama:7b, deepseek-coder:6.7b) -> `selectModel` could only ever match the slow 32b; the fast resident models (gpt-oss:20b/120b, qwen 1.5b) were invisible.
- `.claude/hooks/ollama-route-pretooluse.mjs` defaulted to the retired `qwen2.5-coder:7b` -> auto mode's `/api/tags` allowlist check (modelOk) always failed -> cascade-short-circuited to raw Read. 1117 fires / 0 offloads.

## "Upgrade RTK with the LLM" - honest answer
RTK (v0.40.0) is an **external Rust binary, heuristic-only summary, no LLM mode** (changelog-verified through dev-0.43.0-rc). It CANNOT be LLM-upgraded. The real lever is the Ollama substrate + a **companion LLM compressor** on RTK's unstructured residue (logs/dumps RTK's regex filter passes through). That companion is U4.

## Shipped (5 units)
- U9 `scripts/lib/ollama-coresidency.mjs` (7771ca7f86) - VRAM co-residency env (gpt-oss:120b ~65GB can't co-reside with the 32b) + hard-reason load mutex (cross-process file lock, fail-loud).
- U1 OllamaTaskOffloaderEngine roster refresh (2340a2e699) - resident roster + tier-then-latency selectModel; KEEP_ON_CLAUDE byte-identical.
- U2 ollama-route-pretooluse default -> gpt-oss:20b + ollama-route-config.json (a2756779c2).
- U3 route-savings-session-start-inject take-rate/savings over the offload-action subset (a60d7ba0bf) - excludes advisory classifiers (doctrineSurface/backendAuditChain) which DO get taken up but aren't offload actions.
- U4 `scripts/ollama-compress-output.mjs` (612418fde7) - LLM stdin compressor, 4 fail-safe guards.

## REUSABLE LESSON (U4 P0, caught by 2-arm scrutiny)
A **fail-closed safety denylist with regex bypasses is itself a softened safety threshold.** The original `SAFETY_PATTERNS` used trailing `\b` + no `/i`, so it MISSED lowercase + no-space G-code (`g01x1.5f300`, `s5000m03`, `m8`, `t01`) - a real NC stream would have been lossy-summarised by the LLM. Fix: case-INSENSITIVE + negative-digit lookahead `(?!\d)` instead of trailing `\b` (a digit->letter transition is not a word boundary). Test discipline: adversarial fixtures (lowercase/no-space) that **fail-RED against the pre-fix code** (R9), verified empirically via a node harness reconstructing the old denylist. See [[feedback_check_units_first]] (units/G-code safety) and the safety-output-never-to-local-model boundary.

## Validation note (bravo worktree)
bravo has NO vitest bin + is ~2783 commits behind with ~13980 uncommitted files. Validate: `.ts` via `node --experimental-strip-types` harness; `.mjs`/node:test via `node --test`; vitest-only tests run at go-live in main. Commits bring a file's branch-blob current (~main) + the edit, so diffs look large/all-insertion. Always grep CR count + convert CRLF->LF before commit (Edit tool can flip EOL).

## Operator-gated remainder
U5 (RTK config.toml at %APPDATA%/rtk - LIVE local change, not slot/bravo), U6 (probe-gate scheduled task - needs elevation), Kimi K2.6-free octopus voice (cloud/privacy-gated), #14 go-live (merge + single-source roster across engine+2 hooks + unify OLLAMA_URL/OLLAMA_HOST + fix runRoute test rot). Index pointer to MEMORY.md skipped (shared-tree edit) per slot-only directive.
