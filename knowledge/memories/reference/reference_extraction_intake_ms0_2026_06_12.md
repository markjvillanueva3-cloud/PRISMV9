---
name: reference-extraction-intake-ms0-2026-06-12
description: EXTRACTION-INTAKE-MS0 (slot:bravo) — auto-enforcement that ingests extraction wiki entries into the live tribal index (convert+galaxy-tag+embed+index) after any extraction command. Fixes the dead youtube-free-extract ingest path (ingested:0 since ship).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.572Z
aliases: reference_extraction_intake_ms0_2026_06_12
---


**EXTRACTION-INTAKE-MS0 (slot:bravo, 2026-06-12)** — operator: *"make it auto enforcement that when we
do extractions the data is automatically converted and applied to nodes and galaxies that can intake it,
automatically indexed, automatically noded and added to obsidian vault."*

**Root cause found:** `scripts/youtube-free-extract.mjs:645-678` `ingestTips()` imports
`mcp-server/dist/engines/TribalKnowledgeEngine.js` + calls `engine.ingest()`; on failure it writes a
`-tips-fallback.json`. The `:651` comment: *"fail silently into the fallback-JSON path on every run since
ship"* — the live-engine ingest has been **dead since ship** (no dist build / engine needs runtime state a
standalone script lacks). 25+ fallback jsons + 22 video-batch wiki entries sat un-indexed (not embedded, not
galaxy-tagged, not RAG-retrievable).

**The fix (3 layers, fleet-wide per `feedback_enhancements_auto_apply_all_galaxies`):**
1. **`scripts/extraction-intake.mjs`** (committed + landed `4f716f224d`): discovers un-indexed
   `knowledge/wiki/code-tribal/*.md` extraction entries + drives the EXISTING
   `.claude/scripts/tribal-embed-index.mjs --add <path>` — which already does convert + `inferDomain()`
   galaxy-tag + nomic-embed + clobber-guarded `writeTribalIndex` (the safe path; never a raw write). Pure
   exports `wikiIdFor`/`selectUnindexed`/`parseArgs`/`listCandidates` (tested 4/4). **Self-reexecs with an
   8GB heap** — the 537MB index OOMs node's default ~1GB heap (`shouldReexecForHeap`). Idempotent (--add
   hash-skips; the index-id pre-check filters). **Live-validated: tribal index 73290 -> 73292** on a bounded
   `--max 2` backfill (added=2 failed=0).
2. **`.claude/hooks/extraction-intake-trigger.mjs`** (PostToolUse[Bash], tested 3/3): fires the intake after
   any `youtube-free-extract|pdf-learn|video-learn|batch-pdf-extract|extract-*.{mjs,py}` command. Detached +
   debounced(45s) + fail-soft; runs intake against the integration tree (live index); skips if not landed.
   Clone of `obsidian-viz-edge-autosync.mjs`.
3. **`.claude/hooks/stop-extraction-intake-drain.mjs`** (Stop backstop, tested 3/3, landed `e64c97ba61`): at
   session end, a CHEAP readdir+mtime gate (no index load unless new) + 10min debounce -> detached bounded
   `--max 8` drain. Reaper-safe way to clear the backlog incrementally (the fleet-reaper orphans any >10min job
   -- that is what killed an earlier ad-hoc background backfill). Drains the ~20-entry backlog over a few Stops.
4. **settings.json** (C: + H:, validated + backed up `.bak-*`): PostToolUse trigger (groups 16->17) + Stop drain
   (groups 5->6) BOTH wired = ENFORCEMENT ACTIVE. Verified both files valid + both hooks present (PostToolUse=33, Stop=76).

**"noded" + "vault"**: the wiki entries already live under `knowledge/` (the vault) and get noded into
system-viz by sierra's next `regen-viz` via the existing `obsidian-augmentation` (wiki+memory linkage) — the
intake deliberately does NOT force `merge-augmentations` (24GB, sierra single-writer).

**Knobs:** `PRISM_EXTRACTION_INTAKE_{DISABLE,MAX,ROOT,HEAP_MB,VERBOSE}`,
`PRISM_EXTRACTION_INTAKE_TRIGGER_DISABLE`, `PRISM_EXTRACTION_INTAKE_DEBOUNCE_MS`.

**Status:** the ~20-entry backlog drains automatically via the Stop-drain backstop (next session ends) + the
PostToolUse trigger (next extraction) -- both wired. End-to-end live hook-fire needs a fresh session (hooks load
at session start); the chain itself is proven (manual backfill 73290->73292). **Component 5 (durable cron)
now BUILT + landed:** `.claude/helpers/install-extraction-intake-task.ps1` (parse-OK, clone of the fleet-reaper
install pattern) registers a `PRISM Extraction Intake` task running `extraction-intake.mjs --max 8` hourly for
extractions run while NO chat is active. The SCRIPT is complete; only the **operator-elevated register** remains
(`powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\install-extraction-intake-task.ps1 -RunNow`).
All 5 plan components delivered. The 3 coverage layers: PostToolUse trigger (chat-active) + Stop-drain (session
end) + cron (no-chat-active). Plan: `H:/.claude/plans/swirling-toasting-whistle.md`.
