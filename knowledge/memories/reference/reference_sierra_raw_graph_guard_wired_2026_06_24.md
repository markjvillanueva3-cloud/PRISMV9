---
name: reference_sierra_raw_graph_guard_wired_2026_06_24
description: "Sierra wired the raw-graph-parse regression guard as a fleet-wide PreToolUse commit gate, fixed a live landmine (dead-pixel-guard), and broadened scan coverage recursively (3 commits, 2026-06-24)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.199Z
aliases: reference_sierra_raw_graph_guard_wired_2026_06_24
---


# Raw-graph-parse guard: wired + landmine fixed + scope broadened (slot:sierra, 2026-06-24)

Continuation of the 2026-06-23 raw-graph-parse-guard work ([[reference_sierra_octopus_localonly_and_synergy_state_2026_06_23]]). The guard lib + CLI existed; this session WIRED it to auto-fire and closed its coverage gap. Three commits on `cad-fusion-live-ms0`:

1. **`0c0f7f7bfc` U-VIZ-RAW-GRAPH-PRECOMMIT-HOOK** — new PreToolUse(Bash) hook `.claude/hooks/raw-graph-parse-precommit-guard.mjs` (+ test). Blocks a `git commit` if any scanned script contains a raw `JSON.parse(readFileSync(<merged system-graph.json>,"utf8"))` (the V8 512MiB string-cap crash class). Wired into `settings.json` PreToolUse `Bash` (C: + H:, 1 ref each, valid JSON). Closes the gap that the FLEET-LOCK test only fires on its own file, so `stop_on_failing_tests` (affected-files only) could miss a raw parse reintroduced in a companion-test-less script. **Deliberately does NOT honor `[MAIN-FORCE]`** (correctness gate, not a lane gate); kill switch `PRISM_RAW_GRAPH_GUARD_DISABLE=1`; fail-OPEN on every error (the FLEET-LOCK test is the backstop). Fast path: early-exits ~0 cost on non-commit Bash.

2. **`42bf1c598c` U-VIZ-DEADPIXEL-CAPSAFE** — fixed a LIVE landmine surfaced by broadening the scan probe into `.claude/hooks/`: `dead-pixel-guard.mjs` raw-parsed the ~875MB merged graph. It is an UNWIRED orphan with a try/catch, so it soft-skipped silently rather than hard-crashing — but its dead-pixel L1-page analysis has been NON-FUNCTIONAL since the graph crossed 512MiB (always hitting the catch). Fix: cap-safe `readGraphStreaming` (off-heap Buffer-incremental) + a 150MB size-gate that soft-skips gracefully instead of OOMing under the ~384MB hook-heap cap. Now safe to wire. LIVE: soft-skips the 834MB graph (exit 0, no crash).

3. **`cb09c71d45` U-VIZ-RAW-GRAPH-GUARD-BROADEN** — the `scripts/`-only scope missed the `.claude/hooks/` landmine, so: single-sourced `SCAN_ROOTS_REL = [scripts, .claude/hooks, .claude/helpers, mcp-server/scripts]` + new recursive `scanTreeForRawGraphParse` (skips `*.test.mjs`, `node_modules`, `.git`; exempts cap-safe-reader files). The CLI, the FLEET-LOCK test, AND the PreToolUse hook now share the SAME broadened scope (no drift).

4. **`d816c76a11` U-VIZ-RAW-GRAPH-GUARD-SCRATCH-SAFE** — closed the 3-of-3 arm-C P2: the recursive scan is git-status-blind (scans disk, not the index), so a stray `.tmp-`/`__tmp` scratch file with a raw parse dropped by ANY chat (e.g. the existing untracked `scripts/.tmp-ghost-h2h-precheck.mjs`) would block EVERY commit fleet-wide. `scanTreeForRawGraphParse` now skips scratch names (dot-prefixed / `__tmp` / `.tmp-`) and never follows symlinks (cycle/escape guard; `listEntries` threads `isSymlink`). LIVE: scratch violator -> CLI clean (skipped); non-scratch control -> exit 1 (caught). Surfaced a test-probe naming collision (the E2E probe was `__tmp_*` -> now skipped -> renamed `zz_*`). scanner 19/19, hook 18/18.

## Verification (R15)
- Tests: precommit hook 18/18 (pure + spawn E2E incl. block path) · scanner lib 18/18 (+3 recursion/roots/adversarial). 0 skips.
- CLI lint `node scripts/lib/raw-graph-parse-guard.mjs` -> clean, exit 0 over broadened roots.
- LIVE E2E: clean commit allows (exit 0, no output); non-commit + non-Bash short-circuit; synthetic violation in `scripts/lib` AND in `.claude/hooks` both emit the correct `{decision:block}` JSON.
- Scrutiny: per-file 2-arm PASS (iter-1) + 3-of-3 gate PASS/PASS/PASS (arms A/B/C). No P0/P1. iter-4 (`d816c76a11`) closed arm C's only substantive P2 (git-status-blind scratch scan).

## Heap fact (R12 correction of a reviewer misread)
`portable-node` line 45 sets `--max-old-space-size=${PRISM_HOOK_HEAP_MB:-384}` -> default hook heap IS 384MB. A scrutiny arm claimed it was 4096MB but had misread the HISTORICAL comment (lines 9-13 describe the OLD "blanket 4GB" over-commit bug being fixed). The dead-pixel-guard comment citing 384MB is correct. See [[windows-commit-reservation-hook-heap]].

## Known P2 follow-ups (fail-safe, not blocking)
- Hooked `REPO_ROOT` is hardcoded `H:/prism`, so a slot-worktree commit scans the shared tree, not the worktree copy. Fails SAFE (FLEET-LOCK test in the worktree is the backstop). Optional fix: resolve from the commit cwd / `git rev-parse --show-toplevel`.
- `dead-pixel-guard` is still UNWIRED (orphan) — now safe to wire if a dead-pixel SessionStart advisory is wanted; a full-graph pass belongs in the `system-viz-dead-pixel-sweep` script, not a hook.

## Overnight extension (autonomous loop, 2026-06-24)
5. **`46ad816923` U-VIZ-KNOWLEDGEDISP-CAPSAFE** -- 2nd live landmine of the class, in a WIRED dispatcher: `knowledgeDispatcher.ts` `obsidian_viz_status` raw-parsed the 875MB graph for COUNTS only -> silent `exists:false` since 512MiB. Fixed with cap-safe `countGraphArrayStreaming` (off-heap per-key count; matches the proven `scripts/lib/*.mjs` import at WeeklySynthesisEngine.ts:66, `@ts-expect-error`). LIVE 355607/834883/11; tsc + build:fast clean. Found by a broad repo-wide sweep across `.mjs/.cjs/.js/.ts` (the `.ts` engine layer is outside the `.mjs` guard scope).
- **Hunt closure:** active main tree is CLEAN of the raw-parse class (guard CLI lint clean; main regen-viz generators are cap-safe; `mcp-server/src` `.ts` clean). Remaining sweep hits are out-of-scope only: `mcp-server/dist.bak-vclever/` (dead backup) + LOCKED `prism-test-6d0595/` worktree (stale, hands-off). Class lesson now spans file TYPES, not just dirs.

## Next (handoff)
Master-index sidecar SHARD remains the GREEN-only load-bearing item ([[windows-commit-reservation-hook-heap]] — NEVER raise the hook heap to "fix" the sidecar ceiling).
