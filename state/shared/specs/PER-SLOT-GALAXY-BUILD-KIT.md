# Per-Slot Galaxy Build-Kit — self-bootstrap protocol

> Operator directive (2026-05-28): *"generate a detailed set of instructions for each chat slot so when I launch the fleet with the desktop icon, the very first thing each chat does is start building their own galaxy so you don't have to do it by yourself."*

## Why this exists

Building 24 slot galaxies serially in one alpha chat = 80K+ tokens, slow, single-point-of-failure. The fleet has 24 idle chats on launch. Each chat owning its own galaxy buildout is parallelism × token-economy × domain-correctness (each chat KNOWS its domain better than alpha can simulate).

## Auto-fire flow

```
LAUNCH-PRISM-FLEET.bat
  → slot-tab-boot.ps1 -Slot <name>
      → tier-3 fallback: fresh /checkin-<slot>
          → galaxy-buildout-detect: galaxy exists?
              → YES: skip → normal checkin flow
              → NO:  inject first prompt = /galaxy-buildout-<slot>
                  → slot reads state/shared/per-slot-galaxy-buildout/<slot>.md
                  → executes 8-step protocol
                  → commits in slot worktree
                  → resumes normal work
```

## The 8-step galaxy build protocol (every slot executes)

Each slot, on first launch with no galaxy dir, performs these 8 steps in order. Each step is parallelizable within itself; sequential between.

### Step 1 — Domain charter (5 min)
- Read `H:/CHAT-SLOT-DOMAINS.md` for this slot's canonical line.
- Read `state/shared/slot-souls/<slot>.md` to confirm voice/refuses align.
- If soul is still generic-stub frontmatter (`role: work`, `voice: direct`, `domain_filter: any`), realign with domain-specific frontmatter + 4-7 refuses. Use `state/shared/slot-souls/{romeo,uniform,victor,xray}.md` as the realignment pattern.

### Step 2 — Galaxy dir scaffold (5 min)
- Galaxy path = `mcp-server/src/engines/<galaxy-name>/` where `<galaxy-name>` is the entry from `SLOT_GALAXY_MAP` in `.claude/hooks/slot-context-bundle-inject.mjs`.
- If your slot isn't in `SLOT_GALAXY_MAP` yet, add it (use existing entries as the pattern; commit the wire in step 8).
- Create `engines/<galaxy>/CLAUDE.md` (scope) and `engines/<galaxy>/MEMORY.md` (cross-session learnings). Templates: any of `engines/{wiring,bug-hunting,dormant-data,blueprint-vision}/CLAUDE.md` (operator-canonical 2026-05-28 model).

### Step 3 — Domain inventory (15 min, parallel-agent friendly)
Dispatch parallel `Explore` agents (one per surface) to enumerate domain assets:
- **Engines + dispatchers** — `prism_session:master_index_query` keyword="<domain>" then `prism_session:dispatcher_map_compact`
- **Skills** — `find ~/.claude/commands .claude/commands -name "*.md"` filtered by domain keywords
- **Hooks** — `grep -l "<domain-keyword>" .claude/hooks/`
- **Memories** — `node H:/prism/scripts/memory-search.mjs "<domain>"` (or `prism_memory:semantic_search`)
- **Wiki** — `prism_knowledge:search` topic="<domain>"
- **Tribal tips** — `prism_knowledge:tribal_search` slot="<slot>"
- **State files** — `Glob state/**/<domain>*.{json,md}`
- **Scripts** — `Glob scripts/**/<domain>*.{mjs,ts,ps1}`
- **JM Die corpus pointers** (if domain has shop-floor coverage) — `JM DIE/<sub-domain>/`
- **MIT-OCW corpus** (if domain has academic coverage) — `extracted/mit-ocw/<topic>/`

Write findings to `engines/<galaxy>/MEMORY.md` under `## Initial state (YYYY-MM-DD baseline at galaxy birth)`.

### Step 4 — H:/-wide path atlas (10 min)
Build the absolute-path quick-map for THIS domain across the entire H: drive — not just `mcp-server/`:
- `H:/PRISM/extracted/<domain>/` (extraction roots)
- `H:/PRISM/extracted_modules/<domain>/`
- `H:/PRISM/JM DIE/<sub-domain>/`
- `H:/Tools/<domain-related-tools>/`
- `H:/<archive-or-corpus-roots>/`
- Any vendor / customer / dataset paths discovered in Step 3.

Output: `engines/<galaxy>/PATHS.md` — one file with `<path> | <purpose> | <maintainer-slot>` per line. This is the slot's "where everything lives" atlas. Reduces Grep/Glob across H: from O(N) to O(1).

### Step 5 — High-ROI memory population (15 min)
Pull the top 10 memories by relevance to THIS domain:
- `prism_memory:semantic_search` query="<domain>" topK=20
- Filter to top 10 by recency + relevance score
- For each: copy frontmatter + summary to `engines/<galaxy>/MEMORY.md` under `## High-ROI memories`
- Cross-link with `[[memory-name]]` so future sessions know what's already known

### Step 6 — Custom hook + skill manifest (10 min)
List the domain-specific hooks/skills this slot uses most:
- Hooks: which UserPromptSubmit/PostToolUse hooks add value for this domain?
- Skills: which `/<verb>-<domain>` skills exist (or should exist)?
- Tool calls: which Grep/Glob/Bash patterns get used repeatedly?

Output: `engines/<galaxy>/TOOLBELT.md` — `<tool-or-skill> | <when-to-use> | <typical-savings>`.

### Step 7 — PSN edges + cross-galaxy bridges (5 min)
Declare cross-galaxy synergy edges in `engines/<galaxy>/CLAUDE.md` under `## Related galaxies`:
- Which galaxies CONSUME this slot's output?
- Which galaxies PRODUCE inputs this slot needs?
- What's the SHAPE of the bridge (data, schema, dispatcher action)?

For each edge, ensure the OTHER galaxy's CLAUDE.md mentions THIS galaxy too. Symmetric edges = real synergy; asymmetric = misalignment.

### Step 8 — Commit + wire (5 min)
1. Stage: `engines/<galaxy>/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md` + `state/shared/slot-souls/<slot>.md` (if realigned) + `.claude/hooks/slot-context-bundle-inject.mjs` (if SLOT_GALAXY_MAP needed entry).
2. Commit on `slot/<slot>` worktree (NOT shared `H:/prism`) with subject:
   ```
   [<slot>] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-<slot-upper>: galaxy scaffold + inventory + paths + toolbelt + PSN edges
   ```
3. Append `state/shared/specs/PER-SLOT-GALAXY-SYNERGY-ASSESSMENT-2026-05-28.md` `## 2026-05-28 EXPANSION` table with `<slot> | engines/<galaxy>/ | ✅ | ✅ | shipped`.
4. Render HTML twin: `node H:/prism/scripts/md-to-html.mjs <assessment-md>` (HTML companion discipline).

## Surfaces each slot must populate (delivers the 4-surface model)

| Surface | Path | Purpose |
|---------|------|---------|
| Soul | `state/shared/slot-souls/<slot>.md` | Personality + refuses (already exists; realign if generic-stub) |
| CLAUDE.md | `mcp-server/src/engines/<galaxy>/CLAUDE.md` | Operational scope |
| MEMORY.md | `mcp-server/src/engines/<galaxy>/MEMORY.md` | Cross-session learnings + high-ROI memory pointers |
| PATHS.md | `mcp-server/src/engines/<galaxy>/PATHS.md` | H:/-wide path atlas for this domain (NEW per this protocol) |
| TOOLBELT.md | `mcp-server/src/engines/<galaxy>/TOOLBELT.md` | Custom hooks/skills/tool-call patterns (NEW per this protocol) |
| Wiki bridges | `knowledge/wiki/architecture/<topic>.md` | Citable doctrine (auto-linked from CLAUDE.md) |
| Tribal injection | (auto via `tribal-by-domain-inject` hook) | Top-3 tips per UserPromptSubmit |
| Master-index entry | (auto via `system-viz` regen) | Findable in graph + master-index queries |

## Master-brain sync

Obsidian-feed Stop hook (`stop-obsidian-memory-feed.mjs`) already copies `C:/.claude/projects/H--prism/memory/<type>/*.md` → `H:/prism/knowledge/memories/<type>/` every session-end. Every slot's MEMORY.md inherits from this:
- Write per-slot learnings as `feedback_<slot>_<topic>.md` or `reference_<slot>_<topic>.md` in the auto-memory dir.
- Stop hook auto-feeds the master brain.
- Next session of ANY slot can `memory_search` and find the learning.

PSN's 11-leg taxonomy ([[feedback_psn_definition]]) auto-aggregates: Obsidian + PRISM OS + Wiki + Memories + Tribal + System Viz + Engines + Algorithms + Formulas + NN/GNN + PRISM AI. Each slot's galaxy IS the per-domain interface to all 11 legs.

## Anti-patterns (every slot refuses)

- **Building someone else's galaxy** — each slot owns ONLY its own. Romeo doesn't build foxtrot's CLAUDE.md.
- **Skipping the H:/-wide PATHS atlas** — this is what makes "easy paths to resources in the H drive" actually work. Without it, slots fall back to Grep across 26K wiki files (token-disaster).
- **Generic CLAUDE.md that just copies the template** — the value is the per-domain customization. If your CLAUDE.md doesn't list YOUR domain's specific engines/hooks/skills, it's not done.
- **MEMORY.md with no high-ROI memory pointers** — Step 5 is mandatory; an empty MEMORY.md means future sessions of your slot re-derive everything.
- **Committing in shared H:/prism tree** — slot-worktree discipline is enforced by hook. Use `H:/prism-slot-<slot>` on `slot/<slot>` branch.

## Verification gate (every slot self-checks before commit)

```bash
# 1. Galaxy dir has all 4 files (CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md)
test -f mcp-server/src/engines/<galaxy>/CLAUDE.md
test -f mcp-server/src/engines/<galaxy>/MEMORY.md
test -f mcp-server/src/engines/<galaxy>/PATHS.md
test -f mcp-server/src/engines/<galaxy>/TOOLBELT.md

# 2. Soul has domain-specific frontmatter (not generic)
grep -q "domain_filter: any" state/shared/slot-souls/<slot>.md && echo "FAIL: still generic"

# 3. SLOT_GALAXY_MAP has your slot
grep -q "^\s*<slot>:" .claude/hooks/slot-context-bundle-inject.mjs

# 4. Tribal injection actually finds something for your slot
prism_knowledge:tribal_search slot=<slot>
```

If any check fails → fix → re-verify → THEN commit.

## Time budget per slot

| Step | Est. time | Cumulative |
|------|-----------|------------|
| 1. Charter | 5 min | 5 |
| 2. Scaffold | 5 min | 10 |
| 3. Inventory (parallel) | 15 min | 25 |
| 4. PATHS atlas | 10 min | 35 |
| 5. Memory population | 15 min | 50 |
| 6. Toolbelt | 10 min | 60 |
| 7. PSN edges | 5 min | 65 |
| 8. Commit + wire | 5 min | 70 |

**Total per slot: ~70 minutes wall-clock (≤15K tokens for routine domains; ≤30K for high-coverage domains like mill/cam/wedm).**

24 slots × 70 min = 28 hours serial. Parallel across 24 chats simultaneously = ~70 min wall-clock for the whole fleet.

— Established 2026-05-28 by slot:alpha (a198ff5f) as the canonical self-bootstrap protocol per operator's "so you don't have to do it by yourself" directive.
