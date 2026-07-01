# Plan — Codex per-file syntax review + auto system-viz node + ghost-wire hunt

## Context

PRISM already has a Codex 5.5 reviewer: the **advisory Codex CLI review arm**
in `.claude/scripts/scrutiny-3way.mjs` (`runCodexReview()`, added 2026-05-18).
Today it runs `codex exec review --uncommitted` once over the *whole* working
tree, parses one VERDICT line, and is **advisory only** (never marks the 3-of-3
ledger; degrades to `skipped` on any Codex quota/offline/hang failure — that
flakiness is exactly why Codex was retired as a *gate* arm 2026-05-13).

The user wants the reviewer to additionally:
1. Review **every line** of each new code file so there are no syntax errors.
2. After reviewing a new file, **generate its system-viz node**.
3. **Hunt down nodes to ghost-wire it to**, using PRISM-purpose + backend-dev
   logic (the existing keyword→sibling dispatcher-inference cascade).

Two clarified design decisions (from the user):
- **Trigger:** session end (Stop hook) — batch all session-new files once.
- **Syntax gate:** deterministic local check (`node --check` / esbuild parse)
  is the **HARD BLOCK**; Codex is layered **advisory** on top for line-by-line
  correctness. (Karpathy R5 — a compiler answers "is this valid syntax?"
  deterministically; don't gate on a flaky LLM for what a pure tool decides.)

Outcome: every new code file is syntax-verified before a session can end, gets
a staged system-viz node, and carries an inferred ghost-wire proposal — all
reusing existing PRISM machinery, no live-graph clobber.

## Approach (recommended)

A new orchestrator script + a thin Stop hook + tests + settings wiring + the
4-surface doc reflection. The orchestrator **reuses** three existing modules
rather than reimplementing — per R8 (read before write):

| Reused asset | From | Used for |
|---|---|---|
| `slugifyLabel`, `normalizeLayer`, `buildNodeEntry`, queue/flush helpers | `scripts/system-viz-add-node.mjs` | stage the L5 node (lock-safe ENQUEUE/FLUSH) |
| `inferDispatcher()` + `DISPATCHER_INFERENCE_RULES`, `buildGhostFromUnwired()` | `scripts/seed-ghost-from-unwired.mjs` | ghost-wire dispatcher inference (keyword→sibling cascade) |
| `parseVerdictLine()`, `resolveCodex()`, Codex spawn/timeout pattern | `.claude/scripts/scrutiny-3way.mjs` | advisory Codex line-by-line arm + Windows .cmd shim-noise stripping |
| Stop-hook stdin + stamp-throttle + block-decision pattern | `.claude/hooks/fleet-reaper-stop.mjs`, `goal-complete-gate.mjs` | Stop hook shell |

### File 1 — `.claude/scripts/codex-newfile-review.mjs` (new orchestrator)

Pure-core + injected-deps shell (every external = injectable seam for
hermetic tests, plus a real-subprocess E2E — the recurring CLAUDE.md lesson
that hermetic fakes don't prove wiring).

Pipeline:
1. **Detect session-new files.** `git diff --name-only --diff-filter=A`
   against the session base (same base-resolution scrutiny-3way uses) ∪
   untracked `??` from `git status --porcelain`. Filter to code extensions
   `.ts .tsx .js .jsx .mjs .cjs`; exclude `node_modules/`, `dist/`, `*.d.ts`,
   `*.test.*` optional, generated/viz dirs. Cap at 50 files (surface the cap).
   No new files → fast `{ ok:true, newFiles:[] }` (Stop fast-path approve).
2. **Step A — deterministic syntax HARD-GATE (per file).**
   - `.mjs .cjs .js`: `node --check <file>`.
   - `.ts .tsx .jsx`: esbuild parse (`npm`-resolved esbuild, already a PRISM
     build dep) `esbuild <file> --bundle=false --log-level=silent` to a
     temp/devnull — catches syntax errors fast, no project-wide tsc.
   - Checker genuinely unresolvable for an extension → **do NOT false-block**;
     emit a LOUD `could-not-verify` advisory naming the file (R12 honest).
   - Any real syntax error → collected into `syntaxBlockers[]` (the only
     thing that blocks Stop).
3. **Step B — Codex advisory line-by-line arm (per file).** Reuse
   `resolveCodex()` + the scrutiny-3way spawn/timeout/`parseVerdictLine`
   pattern. Per-file prompt: strict line-by-line correctness/logic review of
   *this file's* added lines. ADVISORY — any Codex failure → `skipped`,
   never a blocker. Batched, per-file timeout, total wall-clock cap.
4. **Step C — system-viz node (engine-class files only).** For new files
   under `mcp-server/src/engines/` (or `*Engine.ts`): build a staged L5 node
   via `buildNodeEntry` + the add-node queue (the existing lock-safe ENQUEUE;
   `--no-flush` so the regen/cron reconciles — no standalone 370 MB write).
5. **Step D — ghost-wire hunt.** For each new engine, call the reused
   `inferDispatcher(name)` (keyword cascade) → `{dispatcher,confidence,reason}`;
   attach as `proposed_wiring`/`confidence`/`reason`/`tier` onto the staged
   node. The existing `seed-ghost-from-unwired.mjs` regen post-merge stage
   materializes the L13 ghost + `proposed-wire` edge on next regen — **no
   direct graph mutation here** (honors the WIRE-NOTE clobber hazard).
6. **Output** a single JSON: `{ ok, syntaxBlockers[], codexFindings[],
   stagedNodes[], ghostWires[], skipped[], caveats[] }`.

CLI: `--once` (run), `--json`, `--dry-run`, `--session-base <ref>`.
Knobs: `PRISM_CODEX_NEWFILE_DISABLE=1`, `PRISM_CODEX_NEWFILE_MAX_FILES=N`,
`PRISM_CODEX_NEWFILE_CODEX_OFF=1` (skip Step B only), reuse
`PRISM_SCRUTINY_CODEX` semantics, `PRISM_CODEX_NEWFILE_TIMEOUT_MS`.

### File 2 — `.claude/hooks/codex-newfile-review-stop.mjs` (new Stop hook)

- Bounded stdin read → session id; stamp-throttle (≥1 expensive pass / 45 s,
  fleet-reaper-stop pattern — 12 simultaneous Stops collapse to one).
- Spawn the orchestrator. **Block decision contract:** `syntaxBlockers.length
  > 0` → emit Stop-block (`{"decision":"block","reason":<per-file punch
  list>}`) — the only block path. Codex findings + staged nodes + ghost-wire
  proposals → `systemMessage` (advisory, never block). Orchestrator/Codex
  error or disabled → approve (fail-open on the *advisory* parts; the
  deterministic gate only blocks on a *confirmed* syntax error).
- Knob: `PRISM_CODEX_NEWFILE_DISABLE=1` (whole hook no-op).

### File 3 — settings wiring

Edit **`H:\.claude\settings.json`** (the canonical authored copy per the H:
drive enforcement; the `c-to-h-mirror` keeps C: aligned). Add
`codex-newfile-review-stop.mjs` as an **individual entry** in the Stop chain
(NOT into `sessionstart-bundle`/regression-bundle — individual entries survive
multi-chat bundle churn per CLAUDE.md). Place after the 3-of-3
`scrutinize-before-stop` cluster, in the advisory/auto-wire region but as a
real blocking entry (`continueOnError:false`, timeout ~120000 ms — Codex Step
B can take minutes; the deterministic Step A is fast and runs first so a block
verdict is available quickly even if Codex is slow).

### File 4 — tests `scripts/__tests__/codex-newfile-review.test.mjs`

`node:test`. Hermetic via injected deps (git-impl, syntaxChecker, codexSpawn,
addNodeImpl, inferDispatcherImpl) + **≥1 real-subprocess E2E**: write a temp
`.mjs` with a real syntax error in a temp git repo → assert the orchestrator
returns it in `syntaxBlockers`, and a clean file does not. Fail-on-revert
guards: no-new-files fast-path, Codex-failure→skipped-not-blocker,
inferDispatcher attached to staged node, checker-absent→caveat-not-block.

### File 5 — 4-surface doc reflection (standing rule)

- **CLAUDE.md**: extend the `## SCRUTINY GATE` Codex-arm paragraph with a
  pointer to the new per-file syntax gate (≤6 lines, pointer-style).
- **MEMORY.md**: one index pointer line + new
  `reference_codex_newfile_review_2026_05_19.md` memory file (C: memory dir;
  auto-feeds Obsidian via `stop-obsidian-memory-feed.mjs`).
- **Wiki**: `knowledge/wiki/architecture/codex-newfile-review.md` (arch +
  block contract + knobs) and a cross-ref line in the existing
  `codex-review-arm` wiki entry.

## Critical files

- NEW `H:\PRISM\.claude\scripts\codex-newfile-review.mjs`
- NEW `H:\PRISM\.claude\hooks\codex-newfile-review-stop.mjs`
- NEW `H:\PRISM\scripts\__tests__\codex-newfile-review.test.mjs`
- NEW `H:\PRISM\knowledge\wiki\architecture\codex-newfile-review.md`
- NEW memory `reference_codex_newfile_review_2026_05_19.md`
- EDIT `H:\.claude\settings.json` (Stop chain; mirror keeps C: aligned)
- EDIT `H:\PRISM\CLAUDE.md` (§SCRUTINY GATE pointer)
- EDIT MEMORY.md (index line)
- READ-ONLY reuse: `scripts/system-viz-add-node.mjs`,
  `scripts/seed-ghost-from-unwired.mjs`, `.claude/scripts/scrutiny-3way.mjs`,
  `.claude/hooks/fleet-reaper-stop.mjs`

## Edge cases / failure modes handled from line 1

- No session-new files → instant approve (no Codex spawn).
- Codex quota/offline/hang → `skipped`, never blocks (only deterministic
  Step A blocks).
- esbuild/node checker unresolvable → loud `could-not-verify` caveat, NOT a
  false block.
- 12 concurrent Stops → stamp-throttle collapses to one sweep.
- Live 370 MB `system-graph.json` → never written directly; stage via
  lock-safe add-node queue; ghost edge owned by existing regen stage.
- Non-ASCII filename → `slugifyLabel` RangeError caught → skip-loud caveat.
- Huge new-file count → 50-file cap, surfaced.
- Windows `.cmd` codepage noise on Codex stdout → reuse `parseVerdictLine`
  shim-stripping (import, don't reinvent).
- Shared `H:/prism` tree, branch diverged, slot `november` worktree absent:
  commits use `[MAIN]` prefix per [[feedback_commit_prefix_main_on_shared_tree]];
  build does not require the slot worktree.

## Verification (end-to-end)

1. `node --check .claude/scripts/codex-newfile-review.mjs` and the hook.
2. `node --test scripts/__tests__/codex-newfile-review.test.mjs` → all green
   (incl. real-subprocess syntax-error E2E).
3. Hook contract smoke:
   `echo '{"session_id":"TEST"}' | "H:/.claude/bin/portable-node" .claude/hooks/codex-newfile-review-stop.mjs`
   → exit 0 + valid JSON when no new files.
4. Live dry-run in a scratch: create a temp `Foo.mjs` with `const x =`
   (syntax error) → `node .claude/scripts/codex-newfile-review.mjs --once
   --json` → `syntaxBlockers` contains it; fix it → blocker clears, a
   `stagedNodes`/`ghostWires` entry appears for an engine-path file.
5. `npm run build` (mcp-server) stays green (no src changes, but settings/hook
   touched — sanity).
6. Per-file scrutiny gate (2 reviewers/file) during the build + end-of-task
   3-of-3 Stop gate. Then close-out: commit `[MAIN]/<unit>` + 4-surface
   reflection.

## Out of scope

- Re-gating Codex (stays advisory by design — the user explicitly chose
  deterministic-hard + Codex-advisory).
- Direct L13 ghost-node/edge mutation (owned by the existing
  `seed-ghost-from-unwired` regen stage; this only stages the L5 node +
  attaches the inferred `proposed_wiring`).
- GNN tier-5 inference (data-side dormant per NN-GRAPH-MS2; the keyword→
  sibling cascade is the active hunter and is sufficient here).
