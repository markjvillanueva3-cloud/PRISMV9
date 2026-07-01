---
title: U-MEMORY-COMPRESS-V2 — paired MEMORY.md compressor + durable PreToolUse gate
type: architecture
unit: U-MEMORY-COMPRESS-V2
milestone: JULIETT-12CHAT-ALLOCATION-MS0
shipped: 2026-05-19
slot: golf
commit: 3798922e49
status: shipped
---

# U-MEMORY-COMPRESS-V2 — paired MEMORY.md compressor + durable PreToolUse gate

## Problem

`MEMORY.md` is auto-loaded by the Anthropic harness into every chat's context at SessionStart.
The harness silently truncates the file past **24,576 bytes** — emitting "Only part of it was
loaded" — which breaks fleet-wide cross-session recall. The 2026-05-16 `U-MEMORY-COMPRESS`
one-shot fix dropped the file from 73 KB → 21 KB but had **no durable mechanism**, and the
`## Indexed memories` section re-grew to **100.5% of ceiling (24,688 B)** by 2026-05-16,
silently truncating again.

A Stop-hook watchdog (`stop-memory-size-watchdog.mjs`, U-OBS-B1 from 2026-05-17) warned **post**-write
— so by the time it fired, the truncation had already happened. No hook blocked the growth.

## Solution

Two paired artifacts, both pure-core + injected I/O:

| Artifact | Role |
|---|---|
| `scripts/memory-compress-v2.mjs` | Programmatic compressor — truncates over-cap index entries at word boundaries while preserving every `[name](slug.md)` skeleton pointer. Idempotent. Refuses to write if any skeleton would be dropped (R12). |
| `.claude/hooks/pretool-memory-size-gate.mjs` | **T0 PreToolUse:Edit hard-block** — simulates the proposed Edit/MultiEdit against the on-disk `MEMORY.md`, computes resulting bytes, **blocks** iff the result exceeds 22,000 B (≈90% of ceiling) AND grows the file. Allows reductions, neutral edits, and any result under the target. |

The gate is the **load-bearing piece** — without it, the watchdog only screams after the
fire. With it, every growth-edit on `MEMORY.md` is refused at PreToolUse, before the file is
written.

## Pure-core surface (both files)

`memory-compress-v2.mjs`:
- `resolveMemoryFile(env, home)` — auto-memory path resolver (env override + home-dir candidates + legacy fallback)
- `truncateEntry(skeleton, desc, maxLen)` — single-line truncate at word boundary, returns `{line, truncated, skeletonOverflow}`
- `compressMemory(text, {maxLineLen})` — full-doc compressor; returns `{compressed, originalBytes, compressedBytes, entriesSeen, entriesTruncated, skeletonOverflow, changed}`
- `extractMdLinks(text)` — every `[label](target)` markdown link, for pointer-survival oracles

`pretool-memory-size-gate.mjs`:
- `MEMORY_GATE_THRESHOLD` — env-driven default (22000)
- `isMemoryFile(filePath)` — case-insensitive Windows-path-normalizing matcher for the auto-loaded MEMORY.md
- `applyEditToContent(content, edit)` — single Edit op; returns `null` when un-simulable (missing needle)
- `simulateEdits(content, toolInput)` — handles Edit + MultiEdit shapes; returns `null` if any sub-edit not simulable
- `decideGate({currentBytes, resultBytes, appendOk, threshold})` — pure decision matrix → `{block, reason}`

## Decision matrix (decideGate)

| current | result | over-threshold? | grows? | bypass? | decision |
|---|---|---|---|---|---|
| 23000 | 23100 | yes | yes | no | **BLOCK** |
| 23000 | 22800 | yes | no  | no | allow (does-not-grow) |
| 21000 | 21500 | no  | yes | no | allow (under-ceiling) |
| 23000 | 25000 | yes | yes | **yes** | allow (PRISM_MEMORY_APPEND_OK=1, logged) |
| 23000 | null  | n/a | n/a | no | allow (not-simulable, fail-open) |
| NaN   | 23100 | n/a | n/a | no | allow (current-unknown, fail-open) |

**Fail-open by construction** — every malformed payload, missing file, un-simulable edit, or
unknown size returns `allow`. The gate blocks ONLY when it is CONFIDENT the edit grows an
already-large `MEMORY.md`. A gate that guesses-and-blocks is worse than the watchdog it backs.

## Wiring

`C:/Users/wompu/.claude/settings.json` + `H:/.claude/settings.json`:

```json
{
  "matcher": "Edit|MultiEdit",
  "hooks": [
    { "type": "command",
      "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pretool-memory-size-gate.mjs",
      "timeout": 3000 }
  ]
}
```

The hook scopes itself to `MEMORY.md` via `isMemoryFile()` — all other Edit/MultiEdit ops pass
through with exit 0. PreToolUse arm count: 23 → 24.

## Knobs

| env var | effect |
|---|---|
| `PRISM_MEMORY_GROWTH_GATE_DISABLE=1` | Operator emergency kill switch — gate always allows |
| `PRISM_MEMORY_APPEND_OK=1` | Deliberate-append bypass (logged in reason) |
| `PRISM_MEMORY_GATE_THRESHOLD=N` | Override the 22000 B target ceiling |
| `PRISM_AUTO_MEMORY_FILE=path` | Override the auto-memory path resolver (testing) |
| `PRISM_MEMORY_MAX_LINE=N` | Override the 200-char per-entry cap |

## Tests (74 cases total — 27 compressor + 47 gate)

Both suites use `node:test`. The gate suite includes a **real subprocess oracle** for every spec
scenario (block / trim / bypass / disable) — `spawnSync(node, [HOOK_PATH])` with stdin JSON
payload, asserting exit codes + JSON-on-stdout — per the U-INTEG-FIX-P0 lesson that
hermetic fakes don't prove production wiring.

Coverage:
- **Spec scenarios** — 4 of 4 hit (block / trim / bypass / disable + watchdog non-regression)
- **Failure modes** — empty input, header-only, malformed entries, missing tool_name, missing file
- **Adversarial** — NaN/Infinity result bytes, huge 10KB entry, 10,000-entry doc, cap=0 boundary
- **Variability** — 3 cap configs (200/80/300), 3 threshold configs (default/10000/50000), Edit + MultiEdit + replace_all + non-Edit
- **Boundary precision** — `resultBytes === threshold + 1` (smallest possible block), `resultBytes === currentBytes + 1 but ≤ threshold` (smallest growth under ceiling) — pins the strict-`>` operator against a `>=` regression
- **isMemoryFile invariants** — suffix-after-.md rejection (`.backup`, `.tmp`, `~`), missing-`/memory/` rejection, uppercase-dir + uppercase-ext acceptance
- **Live-file mtime invariance** — `compressMemory` must not mutate the file on disk (pins purity)
- **Watchdog non-regression** — `node --check stop-memory-size-watchdog.mjs` (side-effect-free oracle, not dynamic-import which would execute the watchdog)

## Acceptance state at ship

- `wc -c C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` → **13,277 B** (54% of ceiling, status=fresh)
- `node --test scripts/memory-compress-v2.test.mjs .claude/hooks/pretool-memory-size-gate.test.mjs` → **74/74 pass**
- Live smoke-fire: hook with non-MEMORY.md path → **exit 0** (correct scoping, no false-block)
- SessionStart in fresh chat: no "truncation" warning on `MEMORY.md` load

## Silent-build debt closed

The two source files (`memory-compress-v2.mjs` + `pretool-memory-size-gate.mjs`) were
**on disk but never committed** before this unit shipped — classic "left a copy behind"
pattern. The compressor had never been run, the gate had never blocked. This commit closes
the loop by adding the missing tests, wiring the hook, and proving production paths.

Discovery: ran `git ls-files` against the target paths during the dup-guard check and got
empty output — both files were untracked. Cross-referenced with `git log` and confirmed
no prior shipping commit existed for either path.

## Per-file scrutiny gate (multi-file build)

Round 1:
- compressor test: Reviewer-A (test-review-agent) PASS · Reviewer-B (independent reviewer) FAIL
  with 2 hallucinated P1s — claimed inlined `TRUNCATION_CEILING_BYTES = 24576` constants at
  test lines 9-10 (the file has filesystem imports there) and claimed COUNT-only pointer
  comparison (the file uses `assert.deepEqual` which is order-preserving structural).
  Refuted by Agent-A's traced line numbers; added defensive mtime-invariance hardening as the
  legitimate sub-claim from B (defense-in-depth against future non-pure refactor).
- gate test: Reviewer-A PASS · Reviewer-B FAIL with 2 valid P0 + 3 P1, all fixed in-session:
  - **P0** boundary `+1` precision (catches `>` → `>=` operator regression)
  - **P0** `isMemoryFile` false-negative coverage (`.backup` suffix, missing `/memory/`, uppercase dir)
  - **P1** subprocess stdout parse hardening (`parseHookJson` defensive brace-slice — survives a future stray `console.log` poisoning stdout)
  - **P1** `mkdtempSync` moved inside the try block (per-test cleanup race on assertion failure)
  - **P1** watchdog signal-check before status (honest timeout failure message)

Round 2 (after fixes): both reviewers PASS.

## References

- Spec: `state/shared/specs/UNITS/U-MEMORY-COMPRESS-V2.md`
- Prior one-shot: 2026-05-16 U-MEMORY-COMPRESS (compress only, no gate)
- Prior watchdog: 2026-05-17 U-OBS-B1 (advisory only, fires post-write)
- Sibling: U-MEMORY-GROWTH-GATE (the PreToolUse gate half) — ships together in this commit
- Doctrine: [[feedback_reflect_all_changes_post_update]] — index entries ≤200 chars
- Memory: [[reference_u_memory_compress_v2_2026_05_19]]
- Doctrine: CLAUDE.md §KNOWLEDGE VAULT (5-namespace schema, memory→wiki promotion path)

## Rollback

- **Compressor:** pure-additive; `git revert` the commit reverts both source + tests.
- **Hook revert:** remove the PreToolUse arm from `C:/.../settings.json` + mirror to H:; the
  `c-to-h-mirror` hook auto-replicates on the next Edit. Or set
  `PRISM_MEMORY_GROWTH_GATE_DISABLE=1` to disable without removing the wiring.
- **Per-host disable:** the hook is shared fleet-wide — no per-host knob today (intentional —
  fleet uniformity on a fleet-wide failure mode).
