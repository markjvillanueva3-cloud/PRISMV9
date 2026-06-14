---
name: reference-u-memory-compress-v2-2026-05-19
description: U-MEMORY-COMPRESS-V2 shipped 2026-05-19 (golf) — paired MEMORY.md compressor + durable PreToolUse:Edit hard-block gate; closed silent-build debt; 74/74 tests; 4-file commit 3798922e49.
aliases: reference_u_memory_compress_v2_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.003Z
---


**U-MEMORY-COMPRESS-V2 shipped** (2026-05-19, slot golf, commit `3798922e49`) — paired compressor + durable PreToolUse:Edit hard-block gate closing the fleet-wide MEMORY.md truncation regression.

**Why it mattered.** The Anthropic harness silently truncates auto-loaded `MEMORY.md` past 24576 B → fleet-wide cross-session recall loss. The 2026-05-16 one-shot `U-MEMORY-COMPRESS` had no durable mechanism; the file re-grew to 100.5% of ceiling within days. The 2026-05-17 `U-OBS-B1` watchdog only warned post-write. This unit ships the missing **hard-block** — a PreToolUse:Edit gate that refuses any write growing `MEMORY.md` past 22000 B unless the edit reduces bytes (or operator sets the documented bypass).

**Silent-build debt closed.** Both source files (`scripts/memory-compress-v2.mjs` + `.claude/hooks/pretool-memory-size-gate.mjs`) existed on disk for days but were **never committed**. The compressor had never been run; the gate had never blocked. This unit added the missing tests (27 + 47 = 74 cases), wired the hook into `C:/Users/wompu/.claude/settings.json` + `H:/.claude/settings.json` (PreToolUse arms: 23 → 24), and proved production paths via real subprocess oracles. Discovery during dup-guard: `git ls-files` against both paths returned empty.

**Pure-core API** (both files):
- `compressMemory(text, {maxLineLen})` → idempotent, preserves every `[slug](slug.md)` skeleton; refuses to write if any skeleton would drop (R12).
- `decideGate({currentBytes, resultBytes, appendOk, threshold})` → fail-OPEN matrix; blocks iff `resultBytes > threshold && resultBytes > currentBytes` AND not bypassed.

**Knobs.** `PRISM_MEMORY_GROWTH_GATE_DISABLE=1` (kill switch) · `PRISM_MEMORY_APPEND_OK=1` (deliberate-append bypass, logged) · `PRISM_MEMORY_GATE_THRESHOLD=N` (override default 22000).

**Per-file scrutiny.** Round 1: Reviewer-A PASS both files; Reviewer-B FAIL gate test on 2 P0 (boundary `+1` precision missing → could miss `>` → `>=` regression; `isMemoryFile` false-negative gaps on `.backup`/`.tmp`/`~` suffix + missing `/memory/` segment) and 3 P1 (stdout-parse fragility, `mkdtempSync` cleanup race, watchdog signal-check). All fixed in-session; round 2 both PASS. Reviewer-B also raised 2 hallucinated P1s on the compressor test (claimed inlined doctrine constants at line 9-10 — file had imports there; claimed COUNT-only pointer compare — file used `assert.deepEqual` order-preserving structural). Refuted by Reviewer-A's traced citations; added mtime-invariance hardening as the legitimate sub-claim.

**Acceptance.** Live `MEMORY.md` 13277 B (54% of ceiling, status=fresh). `node --test` 74/74. Live smoke-fire of wired hook with non-MEMORY.md path → exit 0 (correct scoping).

**Lesson — dup-guard catches silent-build.** Before claiming a unit, the duplication check found both target files already existed but as untracked. Saved building from scratch; surfaced the close-out work the unit actually needed. Same class as [[feedback_auto_close_out]] silent-close-out-debt pattern.

**See also.** Wiki [[u-memory-compress-v2]] · Spec `state/shared/specs/UNITS/U-MEMORY-COMPRESS-V2.md` · Sibling [[reference_u_memory_growth_gate]] (the PreToolUse gate half, ships in same commit) · Prior [[reference_u_obs_b1_memory_size_watchdog]] (advisory watchdog, 2026-05-17).
