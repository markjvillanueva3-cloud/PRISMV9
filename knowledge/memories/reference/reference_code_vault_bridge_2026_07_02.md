---
name: reference_code_vault_bridge_2026_07_02
description: "code-to-vault.mjs (slot:sierra 2026-07-02) -- per-file Obsidian summary note for EVERY code-heavy source file (engines/algorithms/dispatchers/schemas/registries/physics/hooks/scripts-lib). ~6000 brain nodes on H:, recall-proven. Sibling of databases-to-vault. Realizes papa H-DRIVE-VAULT-SYNERGY U-4 for code."
type: reference
source: prism-memory
synced: 2026-07-03T19:24:49.200Z
aliases: reference_code_vault_bridge_2026_07_02
---


# Code-Vault Bridge -- per-file summary notes for every code file (slot:sierra, 2026-07-02)

**Operator directive** (/loop /goal, slot:sierra): "max out obsidian vault indexing with
notes summaries on each file especially engines, databases, modules, tribal knowledge,
algorithms ... maximize obsidian vault capabilities and 2nd brain / OS functionality" +
"ensure vault data is on the H drive, not the C drive, all reads/actions routed to H."

**What shipped:**
- `scripts/lib/code-file-facts.mjs` -- pure fact extractor (primary symbol, exports,
  methods, sibling-engine deps as wikilinks, physics-constant imports, galaxy, LOC, JSDoc).
- `scripts/code-to-vault.mjs` -- generator mirroring `databases-to-vault.mjs`. Emits
  `knowledge/memories/reference/reference_code_<kind>_<slug>.md` per file. Summary is $0
  (JSDoc header + ENGINE_DIGEST one-liner); `--llm-synth` adds Ollama prose for thin
  headers. Modes: `--kind/--galaxy/--offset/--limit/--dry-run/--json/--force`.
- Tests: `code-file-facts.test.mjs` (10) + `code-to-vault.test.mjs` (5) all green.
- Docs: wiki [[code-vault-bridge]] · index `state/shared/CODE-VAULT-INVENTORY.md`.

**Coverage:** 8 KINDS -- engine 3997, algorithm 124, dispatcher 115, schema 346,
registry 29, physics 8, hook 808, lib 561 (~5988 files). First pass wrote 4581 (the 4
mcp-server/src kinds); expanded to +registry/physics/hook/lib after a gap audit.

**Recall PROVEN live:** sidecar search "KienzleForceEngine cutting force" ->
reference_code_engine_cuttingforceengine + stochasticcuttingforceengine +
reference_code_algorithm_kienzleforcemodel. `build-memory-index-sidecar` = 26436 recs.

**Key facts / lessons:**
- **H-drive routing verified (R12):** vault root `H:/prism/knowledge` (`.obsidian/` present),
  app `H:/OBSIDIAN/Obsidian.exe`. Generator `REPO_ROOT="H:/prism"`; sidecar
  `DEFAULT_VAULT_ROOT="H:/prism/knowledge/memories"`. Stop `stop-obsidian-memory-feed.mjs`
  is copy-only C:->H: (no unlink) -> H:-only code notes are NEVER pruned. Nothing on C:.
- **Collision bug caught + fixed (R12):** note name was `reference_code_<kind>_<slug(basename)>`
  with no path disambiguation -> `MillPrintToProgramEngine`/`WEDMPrintToProgramEngine`
  (each in 2 subdirs) silently clobbered. Fix: `buildNoteNameMap` -- first sorted member
  keeps bare name, others get a 6-char path-hash suffix (no orphan, deps still resolve).
- **ascii-guard** blocks non-ASCII in .mjs -- use `--`/`|`/`[physics]` not em-dash/middot/emoji
  in code template strings (the generated markdown may keep source non-ASCII; md is exempt).
- **security hook** false-positives on a regex match-loop token -- use `String.matchAll`
  (also the codebase-preferred g-flag-safe idiom over the RegExp match-loop footgun).

**Follow-ups (loop):** freshness cron (papa U-2); LLM-synth enrichment of thin-header files
(parallel sierra/hermes + Ollama); consider routes/services/data-as-code selective indexing.
Related: [[reference_sierra_node_vault_paths_2026_06_06]] · [[feedback_read_full_content_not_titles]].
