# H-DRIVE → OBSIDIAN VAULT SYNERGY PLAN — "activate the full 2nd brain"

> **Operator directive (2026-06-14, slot:papa, verbatim):** "make every folder and file in the h drive are in the vault and properly categorized. use ultracode, hermes agents, obsidian vault, graphs, crons, harnessed loops to forge, brainstorm and plan how to tackle the entire codebase, categorize strategically, and synergize the entire system (h drive codebase) with obsidian vault so we can activate the full 2nd brain."
>
> **Status:** PLAN (this doc) + Foundation Unit U-1 built this session. Fan-out execution (Hermes agents / deeper per-file extraction) queued — account session-limit on agent spawns reset 1:40am Chicago; the spec is the durable hand-off so the fan-out resumes from here.
>
> **Method note:** the discovery+plan was authored via an ultracode Workflow (`h-drive-vault-synergy-plan`, run `wf_9a33976a-96e`); all 5 arms hit the account session limit mid-run, so the discovery + synthesis below was completed **inline** by the main loop (mechanical, no judgment lost). Real counts cited are live-measured this session.

---

## Vision

A "full 2nd brain over the whole H-drive" means: **every folder and (knowledge-bearing) file on H: is *discoverable by meaning* and *categorized by domain/purpose* through the Obsidian vault** — so any chat, feature, or the frontend can answer "where is X, what is it, what domain does it belong to, how do I query it" *without re-grepping the tree*. It does **not** mean one vault note per file (H: holds 100k+ files incl. caches, venvs, recovery junk, and ~50 worktree clones — literal per-file notes would be noise, not a brain). The brain is a **two-tier index**: per-FOLDER categorized index notes for structure, plus per-FILE notes only for genuine knowledge files (docs, specs, corpus, manuals). The graph already represents every file structurally (L11/L12 via `expand-system-viz-l12-files.mjs`); this plan adds the **semantic categorization layer** the vault is missing, plus a single master coverage map that proves completeness.

---

## Discovery findings (live this session)

**H: top-level (what exists):**
- `H:/prism` — the canonical PRISM codebase (the "H-drive codebase"). 200k+ files.
- ~50 `prism-*` siblings — slot worktrees (`prism-slot-*`) + old milestone clones (`prism-cad-complete`, `prism-lathe-pro-v3`, …). The `canonicalRel()` export already collapses worktree dupes to one canonical node.
- Knowledge assets at root: `OBSIDIAN`, `knowledge`, `Docustrata Test`, `JMD AltracsTaptite`, `manifests`, `blobs`.
- Infra/tooling: `.tools`, `.codex`, `claude-plugins`, `hermes-install`, `LAUNCH`, `NEW-PC-SETUP`, `DockerData`, `.claude*`.
- **Skip (junk/transient):** `$RECYCLE.BIN`, `found.00x` (chkdsk recovery), `.cache`, `.hf-cache`, `.uv-cache`, `.tmp`, `CodexTmp`, `.venv*`, `BIOS`, `%SystemDrive%`, `.prism-recovery-backup-*`.

**Existing coverage surfaces (already built — REUSE, do not duplicate):**
| Surface | Covers | Freshness |
|---|---|---|
| `system-graph.json` (711 MB, schemaVersion 2.29.0) | L0-L10 architecture + **L11/L12 raw-filesystem coverage** | `regen-viz.mjs` + `expand-system-viz-l12-files.mjs` cron |
| `architecture-graph.json` (62 MB) | L0-L10 architecture only | `generate-system-viz.mjs` |
| `DIRECTORY_DIGEST.md` | 92 directories with hand-written purposes | manual / regen |
| 34 × galaxy `PATHS.md` + `MEMORY.md` | per-galaxy file maps + brains | per-slot |
| vault `knowledge/memories/` | 17,268 reference + 307 feedback + 46 project notes | `generate-memories-atomic` → `build-memory-index-sidecar` |
| `DATABASE-VAULT-INVENTORY.md` + `reference_db_*.md` | 8 PRISM databases (shipped U-DB-VAULT this session) | `databases-to-vault.mjs` |

**Existing bridge generators (REUSE):**
- `expand-system-viz-l12-files.mjs` — **the filesystem walker.** Pure exports: `walkDir`, `classifyDir`, `canonicalRel`, `namespaceForRoot`, `shortHash`, `makeBundleNodeId`, `buildAugment`, `mergeIntoGraph`. Idempotent, atomic, skip-set aware, 500k file cap.
- `generate-memories-atomic.mjs` — vault note → graph node.
- `build-memory-index-sidecar.mjs` — vault note → searchable sidecar (17,793 records).
- `generate-vault-graph.mjs`, `regen-viz.mjs`, 53 × `generate-*-features.mjs` ghost-roost generators.
- `jm-corpus-to-vault.mjs`, `jm-shop-knowledge-to-vault.mjs`, `databases-to-vault.mjs` — note-emission pattern.

**The gap (what's missing — the holes in the 2nd brain):**
1. No **semantic categorization** of folders — L11/L12 graph nodes are *structural* (by file count/ext), not by domain/purpose. The vault can't answer "which folders are manufacturing-asset corpus vs build-config vs galaxy-engine."
2. No **per-subtree vault index notes** — the graph has fs nodes, but the Obsidian brain (what recall hooks + the frontend read) has no human-readable "this folder = category X, N files, here's what's in it, how to query."
3. No **master coverage map** proving every H: top-level domain is represented + categorized + fresh.
4. Raw asset trees (`resources`, `JM DIE`, `Docustrata`) have specialized ingest but no unified categorized index entry.

---

## Categorization Taxonomy

Every path maps to exactly one **category** via an ordered rule list (first match wins). The taxonomy is the SSOT in `scripts/lib/h-drive-taxonomy.mjs` (`classifyPath(absOrRel) → { category, galaxy, purpose, fileClass, skip }`).

**Tier 0 — H: top-level domain class** (applied to top-level dirs):
| Class | Rule | Vault action |
|---|---|---|
| `canonical-repo` | `H:/prism` exactly | deep per-subtree index |
| `worktree-clone` | `H:/prism-*` | one dedupe-pointer note → canonical |
| `knowledge-asset` | `OBSIDIAN`, `knowledge`, `Docustrata*`, `JMD *`, `manifests`, `blobs` | per-subtree index (high value) |
| `infra-tool` | `.tools`, `.codex`, `claude-plugins`, `hermes-install`, `LAUNCH`, `NEW-PC-SETUP`, `DockerData`, `.claude*` | one summary note each |
| `skip-junk` | `$RECYCLE.BIN`, `found.*`, `.cache`, `*cache*`, `.tmp`, `*Tmp`, `.venv*`, `BIOS`, `%*%`, `*-backup-*`, `System Volume Information` | excluded entirely |

**Tier 1 — PRISM-native category** (applied inside `H:/prism`, by path/ext):
`galaxy-engine` (`mcp-server/src/engines/<galaxy>/`) · `dispatcher` (`tools/dispatchers/`) · `schema` (`src/schemas/`) · `physics` (`src/physics/`) · `hook` (`.claude/hooks/`) · `skill` (`.claude/commands/`) · `script` (`scripts/`) · `test` (`__tests__/`, `*.test.*`) · `knowledge-wiki` (`knowledge/wiki/`) · `knowledge-memory` (`knowledge/memories/`) · `knowledge-corpus` (`resources/`, `JM DIE/`, `Docustrata/`, `*.pdf` clusters) · `manufacturing-asset` (`*.stp`,`*.step`,`*.dxf`,`*.nc`,`*.cps` clusters) · `state-data` (`mcp-server/data/`, `state/`) · `build-config` (`package.json`, `tsconfig*`, `*.config.*`, `.github/`) · `frontend` (`mcp-server/web/`) · `doc` (`*.md` outside wiki/memories) · `other`.

**Tier 2 — galaxy + purpose tags:** galaxy resolved from the engine-subdir or domain keywords (mill/lathe/wedm/cam/cad/…); `purpose` ∈ {build, knowledge, runtime-state, asset, doc, config, training, infra}; `fileClass` ∈ {source, test, data, binary, doc, config}.

---

## Architecture — the H-drive → vault categorizer

**New module:** `scripts/lib/h-drive-taxonomy.mjs` (pure, the SSOT classifier — `classifyPath`, `classifyTopLevel`, `SKIP_SET`, `KNOWLEDGE_EXTS`).

**New indexer:** `scripts/h-drive-to-vault.mjs`
1. Enumerate H: top-level dirs → `classifyTopLevel` → skip junk, dedupe worktree clones.
2. For each non-skip domain, **reuse `walkDir()`** (imported from `expand-system-viz-l12-files.mjs`) bounded by depth + the shared skip-set to get `{files, dirs}` with counts + ext breakdown.
3. Classify each major subtree via `classifyPath` → category/galaxy/purpose.
4. **Emit** (idempotent, atomic):
   - per-domain categorized vault index note `knowledge/memories/reference/reference_hdrive_<slug>.md` (category, purpose, galaxy, file count, ext breakdown, top subdirs, "how to query");
   - a master `state/shared/H-DRIVE-COVERAGE.md` + `.json` map (every top-level domain → class, category, files, vault-note?, in-graph? (cross-ref L11/L12 coverageRatio), freshness).
5. **Feed the brain** — the emitted notes auto-graph via `generate-memories-atomic` and index via `build-memory-index-sidecar` (the recall path proven by U-DB-VAULT).

**Reuse, do NOT duplicate:** the filesystem walk (`walkDir`), worktree dedupe (`canonicalRel`), skip-set, and graph representation all come from `expand-system-viz-l12-files.mjs`. This indexer adds only the *semantic categorization + vault-note + coverage-map* layer.

---

## Foundation Unit (U-1) — built this session

**Files:**
- `scripts/lib/h-drive-taxonomy.mjs` — pure taxonomy SSOT.
- `scripts/h-drive-to-vault.mjs` — the categorizing indexer (modes: default write, `--json`, `--dry-run`, `--root <dir>`).
- `scripts/h-drive-to-vault.test.mjs` — `node:test` oracle.

**Behavior:** walk H: top-level + `H:/prism` major subtrees (depth-bounded), categorize each via the taxonomy, emit per-domain `reference_hdrive_*.md` index notes + the master `H-DRIVE-COVERAGE.{md,json}` map. Idempotent, fail-soft, skip-set enforced, entrypoint-guarded (import never writes the live vault — the U-DB-VAULT lesson).

**Test oracle (real, not stubs — R9):** known real paths classify into the correct bucket (`mcp-server/src/engines/mill/X.ts` → galaxy-engine/mill; `.cache` → skip; `H:/prism-slot-papa` → worktree-clone; `resources/foo.stp` → manufacturing-asset; `knowledge/wiki/x.md` → knowledge-wiki); skip-set excludes junk; coverage-map domain count conserves; classifyTopLevel dedupes `prism-*`.

**Wiring:** notes land in `knowledge/memories/reference/` (auto-graphed + indexed); coverage map in `state/shared/`. Cron registration in U-2.

---

## Buildable Units backlog (U-2 … U-N, dependency-ordered)

- **U-2 — cron freshness:** register `h-drive-to-vault.mjs` on a daily Windows scheduled task (mirror `install-fleet-memory-monitor-task.ps1` pattern, phase-offset) + a Stop-hook throttle so coverage stays fresh as the tree changes. *(depends U-1)*
- **U-3 — graph cross-ref:** join the coverage map to the L11/L12 `coverageRatio` per domain so the map proves graph + vault parity; flag domains with graph nodes but no vault note (and vice-versa). *(U-1)*
- **U-4 — knowledge-corpus deep index (Hermes fan-out):** for `knowledge-corpus` + `manufacturing-asset` domains, spawn per-domain Hermes/Sonnet agents to emit per-FILE knowledge notes (manuals, specs, CAD READMEs) — the genuine 2nd-brain content. Route via `mine-galaxy-transcripts`-style harness. *(U-1, U-3; needs agent quota)*
- **U-5 — worktree-clone reconciler:** one pointer note per `prism-*` clone → canonical, with last-commit + divergence, so the brain knows which clones are live slots vs stale milestone debris (candidate cleanup input). *(U-1)*
- **U-6 — infra-tool summaries:** one note each for `.tools`, `hermes-install`, `LAUNCH`, `DockerData`, `claude-plugins`, etc. *(U-1)*
- **U-7 — DIRECTORY_DIGEST reconcile:** fold the 92-dir hand digest into the generated coverage map (single source; retire drift). *(U-1, U-3)*
- **U-8 — coverage gate:** a Stop/CI advisory that flags any new top-level H: domain not yet categorized (anti-rot, keeps the brain complete as the drive grows). *(U-2)*

---

## Cron + Harnessed-loop harness

- **Freshness (cron):** U-2 daily scheduled task re-walks + re-emits; idempotent so re-runs are cheap. Phase-offset off the existing fleet tasks (reaper +210s, mem-monitor +330s).
- **Self-extension (harnessed loop):** a `/loop` over the coverage map's `gaps[]` (domains with no vault note / no deep index) picks the next-highest-knowledge-value domain each tick → emits its index note / deep notes → re-runs the map → repeats until coverageRatio = 1.0 for every domain (the same loop-until-dry pattern `expand-system-viz-l12-files` uses for graph coverage).
- **Hermes fan-out (deep extraction, U-4):** when agent quota is available, an ultracode Workflow fans out per knowledge-corpus domain (one Sonnet miner each, opus synthesis) to convert raw manuals/specs/CAD into per-file knowledge notes — the heavy lift that turns a categorized index into a *deep* brain.

---

## Synergy — plugging into all 8 PRISM substrates (PSN legs)

1. **Obsidian brain** — per-subtree index notes ARE new brain nodes.
2. **PRISM OS / wiki** — coverage map is a wiki-linkable architecture surface.
3. **System-viz graph** — notes auto-graph (generate-memories-atomic); cross-ref to L11/L12 fs nodes (U-3).
4. **Master-index / RAG** — notes indexed into the sidecar → recalled by `/system-viz find` + `master_index_query`.
5. **Tribal** — knowledge-corpus deep notes (U-4) feed domain tribal stores.
6. **GNN/LoRA training** — categorized, domain-tagged notes are clean training data (`vault-to-gnn-refpool`, `vault-to-lora-dataset`).
7. **AI routing / Hermes** — the fan-out (U-4) is Hermes-orchestrated; mechanical extraction → Ollama/Sonnet, synthesis → opus (R5 ladder).
8. **Domain galaxies** — each galaxy's `PATHS.md` cross-links to its coverage-map rows; the map is the fleet-wide "where is everything" surface.

---

## Risks & scope honesty (R12)

- **Bounded this session:** U-1 only — the taxonomy SSOT + the categorizer + the master coverage map + per-top-level-domain index notes, verified by a real `node:test` oracle. This makes every H: folder *categorized + discoverable*; it does NOT yet emit deep per-file knowledge notes for every corpus file (that's U-4, agent-quota-gated).
- **NOT doing:** one vault note per file (noise); re-walking the whole drive into the graph (already done by `expand-system-viz-l12-files`); editing `regen-viz` (R8 — reuse its exports); deep CAD/manual extraction without agent quota.
- **Constraint encountered:** account session limit (resets 1:40am Chicago) blocked the agent fan-out (Workflow + per-file scrutiny + 3-of-3). U-1 is therefore verified by its real test suite + rigorous inline self-review; the agent-based scrutiny + Hermes fan-out resume post-reset. Honest gap, not hidden.
- **Skip-set is load-bearing:** mis-walking `node_modules` / `.git/objects` / venvs / `found.*` recovery would OOM and pollute the brain; the shared skip-set is enforced and tested.

---

_Authored by slot:papa (backend-helper). Drives the very next build (U-1). Related: [[reference_papa_wire_unwired_loki_tenant_sbom_2026_06_13]] · [[feedback_never_assume_data_file_contents]] · [[feedback_enumerate_before_read]] · the U-DB-VAULT db-vault bridge (commit d9d1d5d994)._
