---
title: Code-Vault Bridge (code-to-vault.mjs)
type: architecture
status: built
created: 2026-07-02
slot: sierra
tags: [obsidian, vault, 2nd-brain, indexing, engines, recall, system-viz]
---

# Code-Vault Bridge — per-file summary notes for every code-heavy source file

**What:** `scripts/code-to-vault.mjs` connects EVERY code-heavy PRISM source file
(engines, algorithms, dispatchers, schemas) to the Obsidian vault as a per-file summary
note, the same way `databases-to-vault.mjs` connects every database. It is the CODE-file
sibling of the DATABASE-VAULT bridge and the realization of papa's
`H-DRIVE-VAULT-SYNERGY-PLAN` U-4 (per-file knowledge notes) for source code.

**Why:** before this, only 4 of ~4,000 engines had any vault note. The Obsidian brain
(what the recall hooks + master-index + frontend read) could not answer "what does
KienzleForceEngine do, where is it, what does it depend on" by MEANING — only by grepping
the tree. Operator directive (2026-07-02, slot:sierra): "max out obsidian vault indexing
with notes summaries on each file especially engines, databases, modules, tribal
knowledge, algorithms ... maximize obsidian vault capabilities and 2nd brain / OS
functionality" + "ensure vault data is on the H drive, not the C drive."

## How it works
1. `walkTs()` enumerates non-test `.ts` under each KIND root (skip-set aware).
2. `scripts/lib/code-file-facts.mjs` (pure) extracts per-file facts: primary symbol,
   exports, public methods, sibling-engine dependencies, physics-constant imports,
   galaxy, LOC, and the file's own JSDoc header.
3. Summary text is **$0 / no LLM on the default path**: the file's JSDoc header + the
   `ENGINE_DIGEST.md` one-liner. `--llm-synth` adds an Ollama (qwen2.5-coder:32b, local)
   plain-language pass only for files with a thin/absent header — the fan-out target for
   parallel sierra/hermes agents.
4. Emits `knowledge/memories/reference/reference_code_<kind>_<slug>.md` — a first-class
   brain node: `generate-memories-atomic` graphs it, `build-memory-index-sidecar` indexes
   it for recall, the Stop obsidian-memory-feed keeps H: authoritative.
5. Dependency `[[wikilinks]]` densify the Obsidian graph, resolved CROSS-KIND via a
   slug->note map over the full corpus: an engine->registry/util/lib import becomes a real
   edge to that kind's note (e.g. `[[reference_code_registry_materialregistry]]`), not a
   dangling engine-namespace phantom. An external/non-indexed dep renders as plain text
   (no phantom node). Engine-preferred on the rare cross-kind same-basename slug.

## Coverage (2026-07-03, 16 kinds, ~7,850 notes)
- **~7,850 notes** across 16 KINDS: engine 4001 (incl nested .mjs) · script 1402 ·
  hook 818 · lib 564 · schema 346 · data 254 · algorithm 124 · dispatcher 115 · route 84 ·
  util 57 · registry 29 · mcp 23 · service 18 · middleware 12 · physics 8 · db 6.
  (Grew 4->8->14->16 kinds over successive gap audits; the last pass added the whole
  top-level `scripts/` tree, `mcp-server/src/data`, and engine `.mjs`.)
- **Candidate dedup (first-kind-wins)** guards nested roots: `scripts/lib` (kind `lib`) nests
  under `scripts` (kind `script`); `lib` is ordered first so each file maps to exactly one
  kind -> one brain node (never double-indexed).

## 2nd-brain navigation -- Maps of Content (`code-vault-moc.mjs`)
Per-file notes are coverage; MOCs make the ~7,850-node pile BROWSABLE (the "2nd brain / OS"
half of the goal). `scripts/code-vault-moc.mjs` scans the generated notes' frontmatter and
emits: a per-KIND MOC (16, alpha-bucketed when large -- e.g. the engine MOC links all 4001),
a per-GALAXY MOC (for files under `engines/<galaxy>/`), a graphed master hub
(`reference_code_moc_master`), and a human entry point (`knowledge/CODE-VAULT-MOC.md`). Each
MOC is itself a vault node; its outbound `[[wikilinks]]` are kind/galaxy hub edges that
densify the Obsidian graph. Idempotent, atomic, identity-guarded (only indexes notes carrying
`kind: code-<X>`). Tests: `code-vault-moc.test.mjs` (6).
- Recall proven live: a sidecar search for "KienzleForceEngine cutting force" returns
  `reference_code_engine_cuttingforceengine`, `...stochasticcuttingforceengine`,
  `reference_code_algorithm_kienzleforcemodel`. Sidecar ~28k records.
- Collision-safe naming (`buildNoteNameMap`): same-basename twins (e.g. mill/wedm
  `PrintToProgramEngine`) each get a distinct note (first keeps bare name, rest get an
  8-hex path-hash suffix) — no silent clobber, no orphan.

## H-drive routing (operator requirement)
All writes go to `H:/prism/knowledge/memories/reference/` (`REPO_ROOT = "H:/prism"` in the
generator). The recall sidecar's `DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories"`. The
Stop `stop-obsidian-memory-feed.mjs` is copy-only (C:->H:, no unlink) so H:-only code
notes are never pruned. The vault app is `H:/OBSIDIAN/Obsidian.exe`, vault root
`H:/prism/knowledge` (`.obsidian/` present). Nothing routes to C:.

## Usage
```
node scripts/code-to-vault.mjs                 # all kinds, all files (idempotent)
node scripts/code-to-vault.mjs --kind engine   # one kind
node scripts/code-to-vault.mjs --galaxy mill   # one galaxy (engines)
node scripts/code-to-vault.mjs --offset 0 --limit 500   # a batch (agent fan-out)
node scripts/code-to-vault.mjs --llm-synth --limit 50   # Ollama prose for thin headers
node scripts/code-to-vault.mjs --dry-run       # enumerate + classify, no writes
```
Idempotent: each note carries an 8-char `sourceHash`; a re-run skips byte-identical
sources unless `--force`. Atomic writes, entrypoint-guarded, fail-soft.

## Tests
`scripts/lib/code-file-facts.test.mjs` (10) + `scripts/code-to-vault.test.mjs` (5) — real
fixtures, concrete-value asserts (R9), entrypoint-guard proof, ASCII-only note check.

## Follow-ups
- Freshness cron (papa U-2 pattern) so notes track source edits.
- Add `registry`/`hook`/`physics` KINDS to resolve dangling dep wikilinks + widen coverage.
- LLM-synth enrichment pass over thin-header files (parallel sierra/hermes + Ollama).

Related: [[databases-to-vault]] · `state/shared/specs/H-DRIVE-VAULT-SYNERGY-PLAN-2026-06-14.md`
· `state/shared/CODE-VAULT-INVENTORY.md` · [[feedback_read_full_content_not_titles]].
