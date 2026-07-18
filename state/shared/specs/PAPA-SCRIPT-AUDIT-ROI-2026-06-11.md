# PAPA Script-Audit + ROI — 2026-06-11 (slot:papa, session claude-1f242c82)

> **Provenance (R12 honesty).** The operator `/goal` (audit all C/H scripts keep/disable + high-ROI
> script+hook combos + Obsidian-grab feasibility) was first delegated to a background ultracode
> Workflow (`w2pihh4ul` / run `wf_e16986cf-6fe`). That Workflow **stalled after its dedup phase**
> (only 1 of 6 agents produced output before the box's memory pressure killed it — the same pressure
> that OOM'd `tsc` earlier this session) and was reaped. This spec is synthesized **directly** by papa
> from verified session orientation + prior art. The exhaustive per-script keep/disable table was NOT
> completed (the eval agents never ran) — that part is honestly **deferred**, not fabricated.
> Advisory + `mustHumanVerify`.

## 1. Scale (verified counts, `find` on H:/prism)
~**4,200 backend scripts**: `scripts/` 2,449 (.mjs/.js/.ts/.py) · `.claude/hooks/` 776 · `.claude/helpers/` 260 · `.claude/scripts/` 63 · `*.ps1` 654 · C:/.claude 3. **Per-file evaluation is infeasible** even for a Workflow (1000-agent cap); must cluster by directory/purpose.

## 2. DEDUP VERDICT — this meta-goal is ~80% already covered (the highest-value finding)
| Concern | Already covered by |
|---|---|
| skills/scripts/hooks that auto-route through Ollama/Obsidian for token savings | `OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18` |
| token-optimization audit (incl. DataChaz X article) | `JULIETT-TOKEN-OPTIMIZATION-AUDIT-2026-05-17` |
| cross-surface high-value discovery (888K-token ultracode Workflow) | `GOAL-CROSSSURFACE-QUEUE-2026-06-09` + `reference_goal_crosssurface_queue_2026_06_09` |
| dormant-features enumeration | `token-context-forge-audit-ms0-u-dormant-features-enum` |
| hook fire-rate / keep-disable data | `U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18` + `SESSIONSTART-HOOK-AUDIT-2026-05-19` |

**4 peer loops are running the overlapping halves RIGHT NOW** (do NOT duplicate):
- `97872074` — fleet **hook** audit: keep/disable all C/H hooks + ROI hook+stop combos.
- `CHEAP-NODE-ACCESS` — token-cheap node search/read tooling (skill/script/hook/engine).
- a synergy-gaps loop — high-ROI gaps across claude-code/mcp/system-viz/obsidian/wiki/memory/skills/scripts/hooks.
- `alpha` — obsidian/hermes wiring.

**Papa's unique slice = the backend SCRIPT + build-quality half only.** Hooks → 97872074; node-tooling → CHEAP-NODE-ACCESS.

## 3. Keep/disable (DEFERRED — exhaustive eval not completed; verified pointers only)
Re-run the clustered eval (a fresh Workflow off this spec, or `/forge-audit-v2`). Known archive candidates already documented elsewhere (do NOT re-derive): superseded `forge`/`rgs` skill versions + `*.fullcopy-bak-*` (see CLAUDE.md §DEV-TOOL-CONFLICT-AUDIT `U-SKILL-ARCHIVE-FORGE-RGS-BAK`); `*.archive.*` helper files; one-shot migration scripts that already ran (`migrate-stranded-obsidian-memos.mjs`, `bootstrap-h-mirror.mjs`). Disable per [[feedback_never_delete_only_disable]] (archive, never delete).

## 4. OBSIDIAN-GRAB (operator part D) — ALREADY BUILT, not a gap (R12 verified)
"Instantly grab every Obsidian file → link to master graph/masterindex" already exists:
- `scripts/generate-master-index.mjs` — builds the master index.
- `scripts/generate-vault-graph.mjs` — vault → graph.
- `scripts/build-vault-backlink-index.mjs` — backlink index.
- `scripts/obsidian-memory-sync.mjs` (+3 tests) — vault↔memory sync.
- Peer-shipped **`U-HDRIVE-EVERY-FILE`** (`reference_hdrive_every_file_index_2026_06_11`) — denylist full-drive walk indexing EVERY H: knowledge root.
**Verdict:** the capability is built. The real question is **coverage/freshness/scheduling** (the SessionStart wiki↔tribal audit shows 9,965/43,464 files lack tribal embedding = 77.1% coverage) — i.e. a re-embed/refresh cadence problem, NOT a net-new grab script. Recommend a cron freshness check, not a new grabber.

## 5. X articles — already captured
Prior audits already read the current X data: JULIETT-TOKEN-OPT (DataChaz), plus `reference_x_article_cyrilxbt_2026_05_26`, `reference_hermes_*` (leopardracer/tonysimons/dunik), `reference_zodchii_self_correcting_claude_md`. R12 note: several X fetches FAILED (anti-scrape) and are logged honestly (`reference_x_article_dunik_7`). No fresh X read needed; consume the existing memories.

## 6. TOP net-new papa combo to BUILD (genuinely not covered above)
**`tsc-changed-files heap guard`** (script + Stop/PostToolUse hook). Net-new proof: this session I hit a **silent false-green** — raw `npx tsc --noEmit` OOM'd (default ~4GB heap) under box memory pressure and a naive `grep -c "error TS"` on the truncated output returned `0`, which looks like "clean build" but is a crash. None of the 5 prior audits or 4 peers address build-result integrity.
- **Script** `scripts/tsc-changed-guard.mjs`: run `node --max-old-space-size=16384 node_modules/typescript/bin/tsc --noEmit`, assert the process **completed** (not OOM/SIGKILL — guard the exit signal, like `regen-viz-merge-guard`), parse `error TS` lines, scope to git-changed files, emit `{completed, total, changedFileErrors[]}`.
- **Hook** PostToolUse(Edit/Write on `*.ts`) advisory OR Stop-gate: surfaces changed-file tsc errors + LOUDLY flags an OOM/incomplete run as `UNKNOWN` (never `0 errors`). Knob `PRISM_TSC_GUARD_DISABLE`.
- **ROI:** build-quality + accuracy (kills the false-green class fleet-wide); papa-lane; FLEET-WIDE (every slot that edits `.ts`).
- **Galaxy:** `backend-helper`. **Auto-invocation:** PostToolUse + Stop.

Secondary candidates (verify net-new before building): a `stale-index.lock auto-sweep` extension for the deep `.git` paths papa hit (may overlap `git-lock-sweeper`); an `atomic-pathspec-commit` helper wrapping the `git reset -q && git add -- <files> && commit` pattern papa re-ran 5× this session.

## 7. Recommendation
1. Let peers finish their halves (hooks/node-tooling/synergy/obsidian) — already in flight.
2. Build the **tsc-changed-files heap guard** (#6) next loop iter in fresh context (WIRE→TEST→VALIDATE→COMMIT).
3. Do NOT re-launch the 6-agent Workflow on the memory-pressured box; if the exhaustive keep/disable table is wanted, run it as a smaller (2-agent) clustered pass or hand to a peer with headroom.
