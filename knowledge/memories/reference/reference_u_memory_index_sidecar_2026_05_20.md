---
name: reference-u-memory-index-sidecar-2026-05-20
description: "U-MEMORY-INDEX-SIDECAR (sibling to H7 of SYSTEM-SYNERGY-AUDIT) shipped 2026-05-20 by echo (claude-4278393c) — sidecar fast-path drops H7 hook cold-parse from ~8.7s → ~11ms (790× speedup), enabling H7 wiring into UserPromptSubmit chain. Builder CLI + 23 tests + Stop-hook autonomous regen + live wiring in both C:+H: settings.json."
aliases: reference_u_memory_index_sidecar_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.238Z
---


Closes the wiring gap [[reference_u_memory_index_search_2026_05_20]] left open: the H7 hook was built + tested + committed but **NOT YET WIRED** because cold-parsing all ~495 memory files took ~8.7s on the work PC — exceeded the 5s UserPromptSubmit timeout class. This unit ships the sidecar fast-path so H7 can be wired safely.

**Measured speedup**: live-fire on a real query (`"shared tree misattribution peer commits"`) — cold live-scan 8.7s → sidecar fast-path **11ms** = **790× speedup**, well inside the 5s UPS timeout (1700× headroom). Live-tested via piped stdin to the wired hook; correctly surfaced 3 top memories.

**Pattern dogfood** (R8 read-before-write): mirrored `master-index-search-lib.mjs`'s `tryLoadSidecar` shape — same rejected-on-(disable|absent|unparseable|schema|malformed|stale) gate, same R12 stderr-warns-once-per-process pattern, same staleness invariant (`sidecar.sourceMtimeMs >= max(namespace_dir.mtimeMs)`).

**Files shipped:**
- `scripts/lib/memory-index-search-lib.mjs` — added `SIDECAR_SCHEMA_VERSION="1.0.0"`, `DEFAULT_SIDECAR_PATH`, `tryLoadMemorySidecar()`, sidecar-preferred branch in `runMemoryIndexSearch` (returns `{tokens, hits, source: "sidecar"|"live"}` — `source` is the new R12 visibility signal)
- `scripts/build-memory-index-sidecar.mjs` — pure builder CLI (`buildSidecar`, `writeSidecarAtomically`), atomic `.tmp.{pid}+rename`, `--dry-run` + `--json`, deterministic record sort (namespace,name)
- `scripts/build-memory-index-sidecar.test.mjs` — 23 node:test cases (builder 7 + atomic-write 3 + sidecar 8 + lib-wired 3 + real-fs e2e 1 + constants 1); path-separator-tolerant fake-fs for Windows
- `.claude/hooks/memory-index-sidecar-regen.mjs` — Stop hook (T3 advisory); detached spawn when sidecar absent or vault-dir mtime > sidecar mtime; global throttle ≥1/hour via `state/shared/.memory-index-regen-stamp`
- `state/shared/memory-index-sidecar.json` — committed 495-record fast-path artifact

**Wiring (live in both C: + H: `.claude/settings.json`):**
- `UserPromptSubmit[0].hooks[7]` — H7 hook (`memory-index-precheck-inject.mjs`, timeout 5000ms), inserted **after** `master-index-precheck-inject` so the two memory surfaces blend predictably
- `Stop[0].hooks[50]` — regen hook (`memory-index-sidecar-regen.mjs`, timeout 3000ms), detached spawn pattern so a slow cold-rebuild never blocks the Stop chain

**Safety properties:**
- Sidecar staleness gate is *non-fatal*: stale → lib stderr-warns once + falls through to live scan + returns `source: "live"` (the H7 contract still holds)
- Atomic write via `.tmp.{pid}` rename prevents reader from observing a partial sidecar
- Regen hook honors a global stamp throttle (default 1h) so a fleet of 26 chats hitting Stop simultaneously collapses to ≤1 regen
- Detached spawn (`spawn(execPath, [BUILDER], { detached: true, stdio: "ignore" }).unref()`) so the ~47s cold-rebuild under heavy fleet load never blocks the Stop chain timeout

**Knobs:**
- `PRISM_MEMORY_INDEX_SIDECAR_DISABLE=1` — bypass sidecar (lib falls back to live scan)
- `PRISM_MEMORY_INDEX_REGEN_DISABLE=1` — disable the Stop-hook regen entirely
- `PRISM_MEMORY_INDEX_REGEN_THROTTLE_MS=N` — min gap between regen attempts (default 3600000, clamped 60000..86400000)
- `PRISM_MEMORY_INDEX_INJECT=0` / `PRISM_MEMORY_INDEX_K=N` / `PRISM_MEMORY_INDEX_MIN_TOKENS=N` — parent H7 knobs (unchanged)

**R12 honest scope:**
- Cold rebuild on the work PC under 26-chat fleet load took ~47.9s (live-measured) — the regen-hook detached spawn handles this; an operator running `node scripts/build-memory-index-sidecar.mjs` from a clean shell will see similar
- Adds zero new dependencies; same pure-core + injected-IO discipline as H7 + H8
- `source` field added to `runMemoryIndexSearch` result is a *new* contract — any existing caller treating the return as `{tokens, hits}` is unaffected (additive)

Related:
- [[reference_u_memory_index_search_2026_05_20]] — parent H7 unit; this closes its `Wiring status — DEFERRED` line
- [[reference_u_stop_hook_aggregator_2026_05_20]] — sister H8 unit (same pure-core + injected-IO pattern)
- [[reference_h8_misattribution_2026_05_20]] — the memory query "shared-tree misattribution peer commits" surfaces 3 hits including this memo — the dogfooding proof
- [[memory-index-search]] — wiki canonical doc (now reflects WIRED status)
- [[master-index-search-lib]] — sibling sidecar pattern this mirrors
- [[audit-system-synergy-2026-05-09]] — parent audit
