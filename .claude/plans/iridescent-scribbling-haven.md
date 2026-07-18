# /forge7 /forge-audit-v2 — synergy & utilization milestone

## Context

User invoked `/forge7 /forge-audit-v2` asking to assess current state of ~20 PRISM subsystems then improve synergy and utilization, with four concrete sub-asks:

1. Update `CLAUDE.md` — and the question "can we utilize our html system for md files now?"
2. Per-slot variants of `precompact` / `compact` / `session-handoff` / `startup` slash commands (mirroring `/checkin-<slot>`)
3. Commit files per slot name
4. "Everything now needs better synergy and utilization"

Prior sessions in this thread already established the user's preference: **audit first, then wrap only real gaps** — do not rebuild what already exists. The slot-worktree system (per-NATO-branch commits) was already shipped + activated last cycle, so item #3 is done.

## What the parallel audit found (3 Explore agents, ~600 words each)

**Already present (no work needed):**
- All 12 `/checkin-<slot>.md` wrappers + 12 `H:/prism-slot-<name>` worktrees + 3 default-on enforcement hooks (`worktree-commit-route`, `git-add-lane-guard`, `main-tree-write-block`)
- `/system-viz` graph (372,731 nodes, regenerated 2026-05-16) + 9 query/refresh scripts
- 17 Ollama hooks + `ollama-pipeline-injector.mjs` wired in settings (25.8% offload rate, 14,625 tokens-saved recent)
- 80 Neural/DeepLearning/ML engines registered + `PRISMCreativeReasoningEngine.explore()` + `AISystemRouterEngine.route()`
- 23,981 wiki recall-entries (0.9% orphan rate, _leaf-index.jsonl 6.64MB BM25+cosine)
- 184 project + 387 global slash commands
- 3,677 vitest test cases; RTK installed and functional
- `html-report-render.mjs` (542-line section-descriptor renderer)
- CLAUDE.md project=504 lines, global=313 lines

**Real gaps (wrappable, in-scope):**
1. **36 missing per-slot wrappers** — `/precompact-<slot>` × 12 + `/handoff-<slot>` × 12 + `/startup-<slot>` × 12. `/compact` is a Claude built-in (no wrapper possible).
2. **No generic md→html converter** — `html-report-render.mjs` is section-descriptor only; can't render MEMORY.md / CLAUDE.md / handoff files directly. The user's question "can we utilize our html system for md files now?" is answered "the lib exists but needs a `mdToHtml(filePath)` export."
3. **MEMORY.md is 73KB / 3× limit and is being truncated on load** — confirmed by this session's `<system-reminder>`: "MEMORY.md is 65.6KB (limit: 24.4KB)... Only part of it was loaded." Actively breaking cross-session recall right now.
4. **CLAUDE.md sections never updated** to reflect (a) the slot-worktree activation (§"Lane discipline + conflict-fork rule" still describes the old `work/<scope>` model — flagged as deferred last cycle), (b) the new per-slot wrapper family from U-PERSLOT-WRAP, (c) the new html-for-md capability.

**Confirmed dark — out of scope for THIS milestone:**
- Docker backends (Qdrant, Postgres, Prometheus) all unreachable. Needs operator decision on revive vs gracefully degrade.
- `tribal-by-domain-inject.mjs` may not be wired (Agent 2 found no grep match) — needs verify-then-wire follow-up.
- Doc-reflection 4-surface rule is piecemeal across 4 hooks, no unified audit. Build-not-wrap, deferred.

**Plan posture:** Forge7 P0.7 verification-channel + "audit, wrap only real gaps" doctrine. Five units total. No new engines, no new dispatchers, no schema changes. Strictly additive.

---

## Milestone: AUDIT-SYNERGY-MS0

### U-MEMORY-COMPRESS (P0 — break-fix, do first)

**Why first**: MEMORY.md is truncating on every chat load now. Other unit memory-writes would worsen it.

**Files to edit:**
- `C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY.md` — re-render the index so each entry is ≤200 chars (the system warning's stated limit). Trim verbose distillations from the index pointer; detail already lives in per-memory files.

**Approach:** read MEMORY.md, identify entries >200 chars, rewrite as short pointers (`- [Title](slug.md) — one-line hook` per global CLAUDE.md memory schema). Do NOT delete any memory file — only compact the index. Target: <24KB.

**Verification:** `wc -c MEMORY.md` < 24576 bytes; next chat's SessionStart load must not emit the "Only part of it was loaded" warning.

### U-PERSLOT-WRAP (P0 — user explicit ask)

**Why**: User explicitly asked for per-slot variants of precompact/handoff/startup matching the `/checkin-<slot>` pattern. Mechanical (force-take slot → bind topic → delegate to canonical pipeline).

**Files to create (36 total — generated from a single template per command type):**
- `H:\prism\.claude\commands\precompact-{alpha..lima}.md` (12)
- `H:\prism\.claude\commands\handoff-{alpha..lima}.md` (12)
- `H:\prism\.claude\commands\startup-{alpha..lima}.md` (12)

**Approach:** read `H:\prism\.claude\commands\checkin-alpha.md` (existing pattern) — short body that force-claims the slot via `chat-slots.mjs claim --preferSlot <name> --force true --confirmRecent true`, binds topic to `<slot>-work`, then delegates to the canonical command. Each new wrapper ~30 lines. Generate via a one-shot node script that loops `SLOT_NAMES × {precompact, handoff, startup}` and writes from a template. Note: verify `H:/.claude/commands/handoff.md` exists globally first (Agent 1 said "missing entirely"; Agent 3 disagrees implicitly — clarify before generating handoff-* wrappers).

**Verification:** `ls H:/prism/.claude/commands/{precompact,handoff,startup}-*.md | wc -l` == 36. Spot-test: `/precompact-charlie` force-claims charlie + delegates to precompact pipeline.

### U-MD2HTML (P0 — user explicit question)

**Why**: User asked "can we utilize our html system for md files now?" Today `html-report-render.mjs` only renders structured section descriptors. A `mdToHtml(filePath, options)` export turns MEMORY.md / CLAUDE.md / handoffs / wiki leaves into HTML on demand.

**Files to edit:**
- `H:\prism\scripts\lib\html-report-render.mjs` — add export `mdToHtml(filePath, { title, includeToc, theme } = {})` that reads the md file, parses headings/lists/code-blocks/links via a minimal regex parser (no new dep), wraps in `renderHtmlPage()`. Reuse existing `renderProse`, `renderList`, `renderTable` helpers so styling stays consistent.
- `H:\prism\scripts\md-to-html.mjs` (new, ~40 lines) — CLI wrapper: `node scripts/md-to-html.mjs <input.md> [--out <out.html>]`.

**Approach:** keep parser minimal — headings (`^#+ `), unordered lists (`^- `), ordered lists (`^\d+\. `), fenced code blocks, inline links, bold/italic, pipe-table syntax. Anything more exotic renders as `<pre>` fallback. Strictly additive.

**Verification:** `node H:/prism/scripts/md-to-html.mjs H:/prism/CLAUDE.md --out /tmp/claudemd.html && test -s /tmp/claudemd.html`. Then `node -e "import('H:/prism/scripts/lib/html-report-render.mjs').then(m=>console.log(m.mdToHtml('H:/prism/MEMORY.md').length))"` returns >1000. Vitest cases in `__tests__/html-report-render.test.mjs`: empty file, headings-only, code-block escaping, link rendering, malformed fallback.

### U-CLAUDEMD-REFRESH (P0 — user explicit ask)

**Why**: User asked to update CLAUDE.md. Two known drifts: (a) §"Lane discipline + conflict-fork rule" still describes the old `work/<scope>` fork model, (b) the per-slot wrapper family + html-for-md capability need pointers.

**Files to edit:**
- `H:\prism\CLAUDE.md` — append/edit (pointers only, no bulk):
  - Update §"Lane discipline + conflict-fork rule" (~line 96-105): replace `git worktree add ../prism-<scope>` example with a one-line pointer to `state/shared/SLOT-WORKTREE-ARCHITECTURE.md` + `/checkin-<slot>` family.
  - Append §"PER-SLOT WRAPPERS" (5 lines) listing the 36 new wrappers + canonical delegate.
  - Append §"HTML-FOR-MD" (3 lines) describing `mdToHtml()` + the CLI.
  - Add one entry to `## Recent regressions` documenting the MEMORY.md compression fix.

**Approach:** preserve line count budget. Net delta: ~+15 lines added, ~+10 lines edited in place. Don't exceed +20 net lines.

**Verification:** `wc -l H:/prism/CLAUDE.md` delta ≤+20. Grep for `SLOT-WORKTREE-ARCHITECTURE` finds the new pointer. Grep for `mdToHtml` finds the new section.

### U-DOC-REFLECT (P1 — completes the doc-reflection rule, lightest possible)

**Why**: Audit found the 4-surface rule (CLAUDE.md + MEMORY.md + wiki + Obsidian memory) is enforced piecemeal across 4 hooks. A unified advisory hook is a build (not a wrap), so out of scope for this milestone. **In-scope alternative**: a `scripts/doc-reflection-check.mjs` CLI the operator (or future cron) runs manually. No hook wiring (would be a build).

**Files to create:**
- `H:\prism\scripts\doc-reflection-check.mjs` (~60 lines) — given a recent commit SHA, reports whether the commit touched 0, 1, 2, 3, or 4 of: `CLAUDE.md`, any `MEMORY.md`, `knowledge/wiki/**`, `C:/Users/wompu/.claude/projects/H--prism/memory/**`. Pure read-only.

**Verification:** `node H:/prism/scripts/doc-reflection-check.mjs HEAD` returns a 4-tuple. Test against a HEAD commit known to touch all 4 surfaces.

---

## Sequencing

1. **U-MEMORY-COMPRESS** first (break-fix; other units write more memory entries).
2. **U-PERSLOT-WRAP** (mechanical, generated, no risk).
3. **U-MD2HTML** (lib addition + CLI; independent).
4. **U-CLAUDEMD-REFRESH** (last among P0s — references all the above).
5. **U-DOC-REFLECT** (P1, can ship same session if time).

Per forge7 P4.5 plan peer-review: a reviewer agent would challenge whether this milestone really is "audit, wrap real gaps." The hardest unit to defend is U-MD2HTML — is markdown→HTML really a wrap? Yes: the renderer library already exists, this adds one export. If the user disagrees, drop U-MD2HTML.

## Critical files referenced

- `H:\prism\.claude\commands\checkin-alpha.md` — template pattern for U-PERSLOT-WRAP
- `H:\prism\.claude\commands\precompact.md` / `startup.md` / (verify) `handoff.md` — canonical pipelines that wrappers delegate to
- `H:\prism\scripts\lib\html-report-render.mjs` — extend with `mdToHtml`
- `H:\prism\state\shared\SLOT-WORKTREE-ARCHITECTURE.md` — pointer target for CLAUDE.md
- `C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY.md` — compression target
- `H:\prism\mcp-server\data\docs\gsd\GSD_QUICK.md` — already fresh, DO NOT touch

## Out of scope (explicit non-goals — separate proposals if user wants them)

- **U-DOCKER-REVIVE** (Qdrant/Postgres/Prometheus down) — needs operator decision.
- **U-TRIBAL-WIRE-VERIFY** (`tribal-by-domain-inject.mjs` wiring) — verify-then-wire follow-up.
- **U-OLLAMA-OFFLOAD-TUNE** (offload rate 25.8% vs 30% target) — needs threshold A/B test.
- **U-NEURAL-INSTRUMENT** (80 neural engines lack fire-count telemetry).
- **U-DISPATCHER-PARSER-FIX** (3 dispatchers showing 0/1 actions due to known DISPATCHER_DIGEST.md parser regression).
- **U-DOC-REFLECT-HOOK** (unified Stop hook for 4-surface rule) — build, deferred.

## Verification (forge7 P0.7 channels recap)

| Unit | Channel | Re-run cost |
|------|---------|-------------|
| U-MEMORY-COMPRESS | `wc -c MEMORY.md < 24576` + next-chat SessionStart load (no truncation warning) | 1s + 1 new chat |
| U-PERSLOT-WRAP | `ls .../{precompact,handoff,startup}-*.md \| wc -l == 36` + dry-run one wrapper | 5s |
| U-MD2HTML | `node md-to-html.mjs H:/prism/CLAUDE.md` + vitest cases | 10s |
| U-CLAUDEMD-REFRESH | `wc -l CLAUDE.md` delta ≤+20 + grep new pointer sections | 1s |
| U-DOC-REFLECT | `node doc-reflection-check.mjs HEAD` returns 4-tuple | 2s |

## Doc-reflection (per session-end protocol, in addition to per-unit work)

Every shipped unit updates all four surfaces atomically:
1. CLAUDE.md (regression entry on U-MEMORY-COMPRESS; new sections on U-PERSLOT-WRAP + U-MD2HTML)
2. MEMORY.md (compressed first; each ship adds ≤200-char pointer line)
3. Wiki — `knowledge/wiki/architecture/audit-synergy-ms0.md` (one new entry)
4. Obsidian memory — at `C:\Users\wompu\.claude\projects\H--prism\memory\` (one new reference file per ship)
