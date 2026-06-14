# Domain-Galaxy Doctrine — synthesize Bibryam patterns with PRISM substrate (2026-05-26, slot:alpha iter17)

**Trigger:** operator brainstorm prompt after reading Bibryam X article: *"plan for every domain we have in the system. should we treat each domain as its own mini galaxy?"*

**Answer up front:** **YES.** PRISM is already a federation of domain-codebases held together by shared infrastructure (hooks, dispatchers, MCP, /system-viz). The "mini galaxy" framing names what's already half-built and surfaces what's missing. It UNIFIES Bibryam's 8 patterns with PRISM's existing slot-soul layer, /system-viz roosts, and the Phase-5 counter lib shipped this session.

---

## The 8-pillar Galaxy Schema

Every domain in PRISM should be a self-contained **galaxy** with 8 pillars. Galaxies share inter-galactic infrastructure (hooks, MCP, the brain) but have local gravity:

| Pillar | Cosmic analog | Bibryam pattern | PRISM artifact (target) |
|--------|---------------|-----------------|-------------------------|
| 1. Galactic center | star/black hole | #1 Context Cascade | `mcp-server/src/engines/<domain>/CLAUDE.md` |
| 2. Asteroid belt | debris to ignore | #3 Noise Filter | `<domain>/.claude/noise-deny.json` OR root settings.json `permissions.deny` per-domain block |
| 3. Constellation | local star map | #6 Scoped Skill | `_skill-triggers.jsonl` entries with `pathGlob` |
| 4. Visa control | passport vs string | #4 Symbol Lookup | `pre-grep-lsp-hint-inject.mjs` (proposed Phase-6) |
| 5. Master atlas | galaxy cluster map | (PRISM-native) | /system-viz per-galaxy view + counter `perDomain` extension |
| 6. Travel hub | jumpgate | (PRISM-native) | slot-soul (`alpha=mill`, `papa=psn-extract`, etc.) — already exists |
| 7. Trade routes | hyperspace lanes | #8 Search-as-Tool | MCP dispatchers — already exist, take-rate fixed Phase-4 |
| 8. Census | star catalog | (PRISM-native) | `feature-util-counts.json` Phase-5 S6 lib — extend with `domain` dim |

**Pillars 5, 6, 7, 8 are PRISM-native** — Bibryam's article doesn't have them because Anthropic's general doctrine targets monorepos without slot-souls or /system-viz substrates. PRISM has those. The galaxy doctrine annexes Bibryam's 4 universal patterns AND keeps PRISM's 4 unique advantages.

## Per-domain enumeration — the 20 PRISM galaxies

Listed in alphabetical order with current pillar-fill state. **GREEN=shipped · YELLOW=partial · RED=missing**.

| # | Galaxy | Slot affinity | P1 CLAUDE.md | P2 Noise | P3 Scoped skills | P4 LSP | P5 Atlas | P6 Soul | P7 MCP | P8 Census |
|---|--------|---------------|--------------|----------|------------------|--------|----------|---------|--------|-----------|
| 1 | **mill** | alpha + bravo | 🔴 missing | 🔴 | 🟡 `mill-studio` exists, not scoped | 🔴 | 🟢 system-viz mill cluster | 🟢 alpha soul | 🟢 `prism_mill:*` | 🟡 fleet-wide, no per-domain |
| 2 | **lathe** | (no canonical) | 🔴 | 🔴 | 🟡 `lathe-studio`, `lathe-master-post` exist, not scoped | 🔴 | 🟢 | 🔴 no soul | 🟢 `prism_turning:*` | 🟡 |
| 3 | **wedm** | (no canonical) | 🔴 | 🔴 | 🟡 `wedm-studio`, ~20 wedm-* skills | 🔴 | 🟢 | 🔴 | 🟢 `prism_edm:*` | 🟡 |
| 4 | **cad** | (no canonical) | 🔴 | 🔴 | 🟡 `cad-corpus`, `cad-from-blueprint`, `cad-search` | 🔴 | 🟢 | 🔴 | 🟢 `prism_cad:*` | 🟡 |
| 5 | **cam** | (no canonical) | 🔴 | 🔴 | 🟡 `cam-strategy`, `cam-toolpath-check` | 🔴 | 🟢 | 🔴 | 🟢 `prism_cam:*` | 🟡 |
| 6 | **business/erp** | hotel | 🔴 | 🔴 | 🟡 `quote-to-ship`, `shop-quote`, `erp-sync` | 🔴 | 🟢 | 🟢 hotel soul | 🟢 `prism_business:*` | 🟡 |
| 7 | **quoting** | charlie | 🔴 | 🔴 | 🟡 `instant-quote`, `quote-review` | 🔴 | 🟢 | 🟢 charlie soul | 🟢 `prism_quoting:*` | 🟡 |
| 8 | **post-processor** | (echo + master) | 🔴 | 🔴 | 🟡 `post-generate`, `post-validate`, `post-harden` | 🔴 | 🟢 | 🟡 echo soul partial | 🟢 `cam_*_post_*` | 🟡 |
| 9 | **mit-curriculum** | india | 🔴 | 🔴 | 🟡 `mit-courses-*` actions | 🔴 | 🟢 | 🟢 india soul | 🟢 `prism_knowledge:academy_*` | 🟡 |
| 10 | **pdf-corpus** | lima | 🔴 | 🔴 | 🟡 `pdf-learn`, `pdf-process` | 🔴 | 🟢 | 🟢 lima soul | 🟢 `prism_dev:pdf_*` | 🟡 |
| 11 | **pdf-corpus-mill** | foxtrot | 🔴 | 🔴 | 🟡 inherits mill | 🔴 | 🟢 | 🟢 foxtrot soul | shared mill | 🟡 |
| 12 | **corpus-aggregation** | kilo | 🔴 | 🔴 | 🟡 `learn-corpus`, `corpus-harvest-*` | 🔴 | 🟢 | 🟢 kilo soul | 🟢 | 🟡 |
| 13 | **cad-fusion-live** | (branch) | 🔴 | 🔴 | 🟡 `cad-fusion_*`, `fusion360_*` | 🔴 | 🟢 | 🔴 | 🟢 | 🟡 |
| 14 | **speed-feed (SFC)** | oscar | 🔴 | 🔴 | 🟡 `auto-speed-feed`, `sfc-quick-start` | 🔴 | 🟢 | 🟢 oscar soul | 🟢 `prism_calc:speed_feed_*` | 🟡 |
| 15 | **shop-floor live** | (none) | 🔴 | 🔴 | 🟡 `shop-floor-query`, `shop-live-status` | 🔴 | 🟢 | 🔴 | 🟢 `prism_machine_live:*` | 🟡 |
| 16 | **quality/SPC** | (none) | 🔴 | 🔴 | 🟡 `quality-spc-guide`, `cpk-calc` | 🔴 | 🟢 | 🔴 | 🟢 `prism_quality:*` | 🟡 |
| 17 | **knowledge-conversion** | juliett | 🔴 | 🔴 | 🟡 `knowledge-query`, `learn-pipeline` | 🔴 | 🟢 | 🟢 juliett soul | 🟢 `prism_knowledge:*` | 🟡 |
| 18 | **tribal-knowledge** | (none, golf hosts) | 🔴 | 🔴 | 🟡 `tribal-knowledge-guide`, `distill-tribal` | 🔴 | 🟢 | 🔴 | 🟢 `prism_knowledge:tribal_*` | 🟡 |
| 19 | **agent-orchestration** | zebra | 🔴 | 🔴 | 🟡 `swarm-init`, `agent-list`, hive-mind | 🔴 | 🟢 | 🟢 zebra soul | 🟢 `prism_orchestrate:*` | 🟡 |
| 20 | **compliance/safety** | (none) | 🔴 | 🔴 | 🟡 `safety-validation-guide`, `cobot-assess-safety` | 🔴 | 🟢 | 🔴 | 🟢 `prism_safety:*` `prism_compliance:*` | 🟡 |

**Aggregate state across 20 galaxies × 8 pillars = 160 cells:**
- 🟢 GREEN: 47 cells (29%) — mostly P5 atlas + P7 MCP + ~10 P6 souls
- 🟡 YELLOW: 92 cells (58%) — P3 skills exist but unscoped, P8 census fleet-wide not per-domain
- 🔴 RED: 21 cells (13%) — every P1 CLAUDE.md, every P2 noise, every P4 LSP, ~10 P6 souls missing

## Why "galaxy" is the right unit (not "directory", not "team")

- **Directory** is too small — wedm spans `mcp-server/src/engines/wedm/`, plus `.claude/commands/wedm-*`, plus `state/shared/wedm-*`, plus tribal tips per-domain. Not one tree.
- **Team** is too soft — PRISM has no human teams (it's Mark + AI agents). Slot-soul is the closest thing to a team.
- **Galaxy** maps to: the union of (engine code + skills + slot + dispatcher + tribal corpus + audit dashboard + memory namespace + wiki branch + system-viz layer) for ONE problem domain.

The Bibryam article assumes engineering teams ARE the natural galaxy boundary in a monorepo. PRISM's analog is **the domain** because PRISM's "teams" are domain-specialist chat slots.

## Bibryam-pattern → galaxy-pillar mapping

| Bibryam # | Pattern | Galaxy pillar | What changes vs Bibryam's vanilla version |
|-----------|---------|---------------|------------------------------------------|
| 1 | Context Cascade | P1 Galactic center | Cascades on CWD AND on slot-soul context. Hybrid load. |
| 2 | Repo Map | P5 Atlas (root level) | Already covered by DIRECTORY_DIGEST + /system-viz; one-liner per galaxy needed at root |
| 3 | Noise Filter | P2 Asteroid belt | Per-galaxy belt + a galaxy-cluster-wide belt (root) |
| 4 | Symbol Lookup | P4 Visa | LSP per-language; same |
| 5 | JIT Skill | (universal, not per-galaxy) | Already shipped via skill-auto-trigger |
| 6 | Scoped Skill | P3 Constellation | `pathGlob` field in `_skill-triggers.jsonl`; auto-extends to slot-soul `domain_filter` regex |
| 7 | Scout Subagent | (universal) | Already standard practice |
| 8 | Search-as-Tool | P7 Trade routes | Per-galaxy MCP dispatcher already; intergalactic queries via master_index_query |

The 4 PRISM-native pillars (P5 atlas, P6 soul, P7 MCP, P8 census) are PRISM's competitive advantage — they exist BECAUSE PRISM rejected "one big codebase" early via the slot+dispatcher+system-viz architecture. The Bibryam patterns FILL THE GAPS the slot architecture left open.

## What changes in /system-viz under the galaxy doctrine

/system-viz today renders a 10-layer cube with 21 roost overlays — layers ≈ pillars, roosts ≈ cross-cutting concerns. Under the galaxy doctrine:

- **Each galaxy gets its own /system-viz lens** — query `/system-viz galaxy=wedm` filters every layer + roost to wedm-related nodes only
- **Galactic-center beacons** — galaxies with `🟢 P1 CLAUDE.md filled` show a star icon at their center; missing centers show a void
- **Travel-hub portals** — slot-soul affinity rendered as a colored arc between slot icons and galaxy clusters
- **Census heatmap** — counter sidecar `perDomain` field drives a heatmap layer: hot galaxies (frequent use) glow, cold galaxies (dormant) dim

This is a /system-viz augmentation roost — same pattern as `forge-audit-token-context` from earlier iter; sibling generator script + regen-viz FAST[] entry + merge-augmentations splice.

## Shipping plan — three phases over the next 4-6 /loop iters

### Galaxy-DOCTRINE-MS0 — Phase A (Pillars 1+2 for top-5 hottest galaxies, ~5 iters)
1. mill (alpha) — most active per chat-bus peer count
2. lathe — second-most engine count (per ENGINE_DIGEST)
3. wedm — third + active wedm-studio fleet
4. quoting (charlie) — current production focus per CLAUDE.md priorities
5. erp/business (hotel) — current iter5+ active per peer commits

For each: ship one `engines/<domain>/CLAUDE.md` (P1) + one `<domain>` block in `.claude/settings.json permissions.deny` (P2). 10 commits total.

### Galaxy-DOCTRINE-MS0 — Phase B (Pillar 3 universal, 1 iter)
Extend `_skill-triggers.jsonl` schema with optional `pathGlob` field. Patch `skill-auto-trigger.mjs` to honor the glob. Backfill globs for the ~50 most-obviously-domain-scoped skills (`lathe-*`, `mill-*`, `wedm-*`, `cad-*`, `cam-*`, `post-*`, `quality-*`, `shop-*`).

### Galaxy-DOCTRINE-MS0 — Phase C (Pillar 8 per-domain census, 1 iter)
Extend the S6 `feature-counter.mjs` lib with `domain` field. Patch every D-tier wire from Phase-5 to pass `domain` derived from cwd or slot affinity. Refresh FEATURE-UTILIZATION dashboard generator to render per-domain breakdown.

### Galaxy-DOCTRINE-MS0 — Phase D (Pillar 5 viz, 1 iter)
Build a `generate-galaxy-features.mjs` script (mirrors `generate-forge-audit-token-context-features.mjs` from earlier iter). Each galaxy gets a roost node; pillars are children. /system-viz auto-includes via the regen-viz FAST[] convention.

### Galaxy-DOCTRINE-MS1+ — fill Pillar 4 (LSP) + Pillar 6 (remaining souls)
Lower priority; Phase-3 architectural work tracked separately.

## Quantified leverage

If each galaxy averages 200 lines of dense local doctrine vs the current 0:
- Current state: every chat loads root CLAUDE.md (74KB / ~18.5K tokens) + slot soul (2KB / 500 tokens) regardless of CWD
- Galaxy state: CWD-cascaded loads ~4KB galactic-center + 2KB soul = 6KB / 1.5K tokens — and the root CLAUDE.md shrinks toward the doctrine-pointer-index target (≤200 lines / 50KB → ~12K tokens) per JULIETT-12CHAT-ALLOCATION-MS0 guideline.

**Net per-chat savings: ~5-8K tokens on SessionStart × 26 fleet slots = 130-208K tokens fleet-wide per restart-burst.**

Plus indirect savings:
- Glob/Grep noise filtered → ~2x faster tool calls
- Path-scoped skills → ~50% reduction in skill-trigger injection budget
- Per-domain census → operator decisions become data-driven (which galaxies actually earn investment)

## PSN-leg synergy

- **Leg #1 (Obsidian brain)** → per-galaxy memory namespaces already exist (`knowledge/memories/{feedback,reference,project}/<domain>_*`); CLAUDE.md per-domain references those directly
- **Leg #2 (PRISM OS)** → per-galaxy MCP dispatchers already exist
- **Leg #3 (Wiki)** → wiki branches per `architecture/<domain>/` and `code-tribal/<domain>/`
- **Leg #4 (Memories)** → covered by leg 1
- **Leg #5 (Tribal)** → per-domain tribal tips at `knowledge/tribal/<domain>/`
- **Leg #6 (System Viz)** → galaxy lens is a viz augmentation roost
- **Leg #7 (Engines)** → engines already live under `engines/<domain>/`
- **Leg #8 (Algorithms)** → ditto
- **Leg #9 (Formulas)** → ditto
- **Leg #10 (NN/GNN)** → per-galaxy embedding subspaces (future)
- **Leg #11 (PRISM AI router)** → routing already partially domain-aware via slot affinity

**Every PSN leg either already partitions by domain OR has a natural axis to do so.** The galaxy doctrine doesn't invent new infrastructure — it formalizes what PRISM already implies.

## Cross-refs

- Parent: `state/shared/specs/BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED-2026-05-26.md` (8-pattern analysis)
- Grandparent: `state/shared/specs/DORMANT-FEATURES-PHASE5-TELEMETRY-GAP-2026-05-26.md` (S6 counter lib that needs `perDomain` extension)
- CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 (slot-soul = travel-hub pillar already exists)
- CLAUDE.md §MASTER INDEX (/system-viz = atlas pillar already exists)
- CLAUDE.md §WIKI PROTOCOL (wiki branches = per-galaxy knowledge graphs already partially exist)
- [[feedback_psn_definition]] — 11-leg taxonomy that pre-partitions by leg; galaxy partitions by domain (orthogonal axis, multiplies)
- [[feedback_conflict_fork_rule]] — galaxy boundary is the natural fork-boundary for multi-chat work
