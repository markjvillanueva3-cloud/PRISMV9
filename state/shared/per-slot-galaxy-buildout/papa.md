# Galaxy buildout — slot:papa (galaxy:backend-helper)

> **Auto-fire trigger:** this file is THE first prompt slot:papa executes on fresh-launch when `mcp-server/src/engines/backend-helper/` is missing OR incomplete.
> **Master protocol:** `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`

## Your mission (per operator goal 2026-05-28)

Build slot:papa's **complete galaxy** so future sessions get the fullest possible context with the lowest possible token cost. The 11 artifacts below are mandatory. Sister slots will NOT build them for you.

| # | Artifact | Path |
|---|----------|------|
| 1 | Soul (realigned) | `state/shared/slot-souls/papa.md` |
| 2 | Galaxy CLAUDE.md | `mcp-server/src/engines/backend-helper/CLAUDE.md` |
| 3 | Galaxy MEMORY.md | `mcp-server/src/engines/backend-helper/MEMORY.md` |
| 4 | H:/-wide PATHS.md | `mcp-server/src/engines/backend-helper/PATHS.md` |
| 5 | TOOLBELT.md | `mcp-server/src/engines/backend-helper/TOOLBELT.md` |
| 6 | Wiki bridges (≥3) | `knowledge/wiki/architecture/<domain>-*.md` |
| 7 | Tribal tips (≥5) | via `prism_knowledge:tribal_capture` slot=papa |
| 8 | Custom skills (≥1) | `.claude/commands/<verb>-papa.md` |
| 9 | Custom hooks (≥1 if domain warrants) | `.claude/hooks/<slot>-*.mjs` + wire in `settings.json` |
| 10 | Master-brain memory (≥10 entries) | `C:/Users/wompu/.claude/projects/H--prism/memory/reference_papa_*.md` |
| 11 | PSN edges declared in CLAUDE.md `## Related galaxies` | symmetric — peer galaxies mention you back |

## Pre-flight

```bash
pwd                        # expect: H:/prism-slot-papa
git branch --show-current  # expect: slot/papa
```

If you're in shared `H:/prism` instead, `/checkin-papa` did NOT cut over. Run `cd H:/prism-slot-papa && git checkout slot/papa` first.

If `engines/backend-helper/CLAUDE.md` already exists AND has all 11 artifacts above, skip this brief; run `/checkin-papa` for normal work pickup.

## STEP 1 — Soul realignment (5 min)

Read `state/shared/slot-souls/papa.md`. If frontmatter is generic-stub (`role: work`, `voice: direct`, `domain_filter: any`), **rewrite** with domain-specific values:

```yaml
---
slot: papa
role: <DOMAIN>-specialist
voice: <domain-rigor-word>-rigorous       # e.g. physics-rigorous, wiring-rigorous, extraction-rigorous
tone: direct
escalation_path: <route-pattern>          # e.g. "route-before-grep; canonical-constants-only"
preferred_subagent_type: <agent-type>     # reviewer, code-analyzer, physics-review-agent, etc.
domain_filter: <regex>                    # 4-8 OR-joined keywords matching this domain
hermes_role: work
refuses:                                  # 4-7 entries; doctrine-violation-classes for this domain
  - <refuse-1>
  - <refuse-2>
  ...
---
```

Templates to copy from: `state/shared/slot-souls/{romeo,uniform,victor,xray}.md` (2026-05-28 operator-canonical).

## STEP 2 — Scaffold the 4 galaxy files (5 min)

```bash
mkdir -p mcp-server/src/engines/backend-helper
```

Create these 4 files. Templates: any of `engines/{wiring,bug-hunting,dormant-data,blueprint-vision}`.

- **CLAUDE.md** — operational scope: domain engines + hooks + skills inventory + anti-patterns + Karpathy 5-step + related galaxies + wiki cross-refs + bridges OUT
- **MEMORY.md** — cross-session learnings. MUST open with the `## Master-brain link` header cloned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical brain pattern — **clone + fine-tune for your domain, do NOT re-derive brain wiring**), then standing patterns + initial state baseline + known failure modes + cross-galaxy memory bridges
- **PATHS.md** — H:/-wide path atlas (NEW per BUILD-KIT)
- **TOOLBELT.md** — custom hooks/skills/tool-call patterns (NEW per BUILD-KIT)

Verify `SLOT_GALAXY_MAP` in `.claude/hooks/slot-context-bundle-inject.mjs` includes `papa: 'backend-helper',` — add if missing.

## STEP 3 — Domain inventory (15 min — DISPATCH PARALLEL AGENTS)

Send **one parallel `Explore` agent per surface** in a single message:

Keywords for slot:papa: `backend`, `tsc`, `build`, `regression`, `test-coverage`, `dispatcher`

```
Agent({subagent_type: 'general-purpose', description: 'enumerate backend-helper engines+dispatchers',
  prompt: 'Find every engine + dispatcher action related to backend-helper. Use prism_session:master_index_query keyword="backend" + dispatcher_map_compact. Return: engine paths + dispatcher.action pairs + 1-line role each.'})
Agent({subagent_type: 'general-purpose', description: 'enumerate backend-helper skills',
  prompt: 'Glob ~/.claude/commands/*.md and .claude/commands/*.md for skills matching keywords ["backend","tsc","build","regression","test-coverage","dispatcher"]. Return: skill name + 1-line description.'})
Agent({subagent_type: 'general-purpose', description: 'enumerate backend-helper hooks',
  prompt: 'Glob .claude/hooks/*.mjs filtered to keywords ["backend","tsc","build","regression","test-coverage","dispatcher"]. Return: hook name + event (PreToolUse/UserPromptSubmit/Stop) + purpose.'})
Agent({subagent_type: 'general-purpose', description: 'enumerate backend-helper memories+wiki+tribal',
  prompt: 'Run prism_memory:semantic_search query="backend tsc build" topK=20 + prism_knowledge:search topic="backend-helper" + prism_knowledge:tribal_search slot=papa. Return top 10 of each by relevance + recency.'})
```

Aggregate all 4 agent returns into `MEMORY.md` `## Initial state (2026-05-28 baseline)`.

## STEP 4 — PATHS.md (10 min) — your H:/-wide path atlas

This is THE HIGHEST-ROI artifact. Converts every future Grep/Glob from O(N) → O(1) for slot:papa.

Seed roots (start here, walk outward):
- `H:/prism/mcp-server/src/engines/backend-helper/`
- `H:/prism/mcp-server/src/__tests__/`

For each root, emit `<absolute-path> | <purpose> | <last-modified-or-NA> | <maintainer-slot>` per line. Cover:
- Engine source files
- State JSON files (per-domain registries, ledgers)
- Scripts (audit/build/regen for this domain)
- Wiki entries (top 10 by tribal-cross-ref score)
- JM Die corpus subtrees (if applicable)
- MIT-OCW corpus subtrees (if applicable)
- Vendor/customer-specific data dirs
- Hooks + skills directories

Group by category. Target: 30-100 lines.

## STEP 5 — High-ROI memory population (15 min)

Three sub-steps:

### 5a. Pull from existing memory store
```
prism_memory:semantic_search query="backend tsc build" topK=20
```
Filter to top 10 by relevance × recency. Add to `MEMORY.md` under `## High-ROI memories` as bullet pointers (≤140 chars/line, with `[[memory-name]]` cross-link).

### 5b. Write at least 10 new domain-specific memories
For each non-obvious learning your domain knows that ISN'T already in the memory store, write `C:/Users/wompu/.claude/projects/H--prism/memory/<type>_papa_<topic>.md` where `<type>` is one of: `feedback` (standing rule), `reference` (point-in-time fact), `project` (decision/why).

These auto-feed into `H:/prism/knowledge/memories/<type>/` via `stop-obsidian-memory-feed.mjs` Stop hook → become discoverable by ALL slots via the master brain. After writing them, bump the `Last master-sync:` stamp in your `## Master-brain link` header to 2026-05-28 — that stamp is the read-back leg that keeps the brain CONNECTED (a stamp older than the galaxy dir mtime means re-pull from master before any work).

### 5c. Index entry in YOUR galaxy MEMORY.md
Add the top-10 pulled master memories under `## High-ROI memories` (galaxy side) so future slot:papa sessions find them fast.

### 5d. Master-side back-pointer (THE half that's been missing — closes the bidirectional cross-link)
The master index must learn your per-galaxy brain exists. Append ONE `<=140-char` row to the **master** `MEMORY.md` (`C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`) under `## Indexed memories`:

```
[galaxy:backend-helper] mcp-server/src/engines/backend-helper/MEMORY.md — <one-line domain summary> (slot:papa, 2026-05-28)
```

Without this row the master index is **blind** to your brain — it is the master→galaxy discovery edge. See `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` for the canonical 4-axis connection model (PULL / PUSH / master-index back-pointer / recall).

## STEP 6 — TOOLBELT.md (10 min) — tool-call efficiency for THIS slot

Document the exact Grep/Glob/Bash/Read/git patterns slot:papa reaches for most. Memoize the regex + path so future sessions don't re-derive them.

Format:
```
## Grep patterns
- `<pattern> | <path-scope> | <typical-result-count> | <when-to-use>`

## Glob patterns
- `<pattern> | <path-scope> | <typical-file-count>`

## Bash one-liners (RTK-wrapped where applicable)
- `<command> | <savings-vs-alternative>`

## Read offset+limit cheatsheet
- `<file> | <offset> | <limit> | <reason-not-full-file>`

## git common commands (RTK-wrapped)
- `rtk git <subcommand> | <savings>`

## prism_* dispatcher actions used most
- `<dispatcher>:<action> | <typical-input> | <why-faster-than-Grep>`
```

Target: 30-60 lines. Each entry must save tokens or time vs. naive alternative.

## STEP 7 — Wiki bridges + tribal tips (10 min)

### 7a. Wiki bridges (≥3 entries)
Either write new entries OR cross-link existing ones in CLAUDE.md `## Wiki cross-refs`. Format: `[[architecture/<domain>-<topic>]]` or `[[lessons/<class>]]`. Query existing first: `prism_knowledge:search topic="backend-helper"`.

If your domain lacks a wiki entry on a load-bearing topic, write one at `H:/prism/knowledge/wiki/architecture/backend-helper-<topic>.md` (or `lessons/<class>.md`). Standard frontmatter + sections (see `H:/prism/WIKI_SCHEMA.md`).

### 7b. Tribal tip injection (≥5 entries)
Capture domain-specific tribal knowledge via:
```
prism_knowledge:tribal_capture {slot: 'papa', tip: '<one-line tip>', context: '<when applies>', citation: '<source>'}
```

These auto-surface via `tribal-by-domain-inject` hook on every UserPromptSubmit for slot:papa. Target: 5-15 tips covering the non-obvious wisdom only slot:papa knows.

## STEP 8 — Custom skills + hooks (10 min)

### 8a. Custom skill (≥1)
If slot:papa runs the same multi-step workflow repeatedly, capture it as `.claude/commands/<verb>-papa.md` (e.g. `/audit-papa`, `/sweep-papa`). Skill template: any short skill under `.claude/commands/` (e.g. `/reap-zombies` is 30 lines).

### 8b. Custom hook (≥1 if domain warrants)
If slot:papa would benefit from auto-firing on a tool-call event (e.g. inject a domain-specific reminder on every Bash), create `.claude/hooks/papa-<purpose>.mjs` and wire it in `.claude/settings.json` under the right event matcher.

Hooks for THIS slot's domain should be additive — NEVER disable a fleet-wide hook.

## STEP 9 — Master graphs + index (5 min)

Make slot:papa findable in the master indexes:
- Run `node H:/prism/scripts/build-state-snapshot.mjs` — surfaces new engines in `BUILD_STATE.json`.
- Run `node H:/prism/mcp-server/scripts/update-engine-digest.mjs` (if exists) or equivalent — adds your galaxy to `ENGINE_DIGEST.md`.
- Verify your galaxy appears in `prism_session:master_index_query keyword=backend-helper` returns.
- If system-viz exists, regenerate: `node H:/prism/scripts/regen-viz.mjs` (sierra owns; ping sierra slot if you need help).

## STEP 10 — PSN edges + master-brain sync (5 min)

### 10a. Declare cross-galaxy edges in CLAUDE.md `## Related galaxies`
For each edge:
- Which galaxy CONSUMES your output? (data → schema → dispatcher action)
- Which galaxy PRODUCES your input?
- What's the bridge SHAPE?

After writing, verify each PEER galaxy's CLAUDE.md mentions YOU back. Asymmetric = misalignment; ping peer slot via chat-bus to update.

### 10b. Master-brain sync verification
The Stop hook `stop-obsidian-memory-feed.mjs` auto-copies your per-session memories (`C:/Users/wompu/.claude/projects/H--prism/memory/*.md`) → `H:/prism/knowledge/memories/<type>/`. Verify:
```bash
ls H:/prism/knowledge/memories/feedback/feedback_papa_*.md 2>/dev/null
ls H:/prism/knowledge/memories/reference/reference_papa_*.md 2>/dev/null
```

If empty, write at least one `feedback_papa_<topic>.md` in the auto-memory dir — Stop hook will feed it next session-end.

### 10c. PSN 11-leg verification (per [[feedback_psn_definition]])
Slot:papa's galaxy should be discoverable on each of the 11 PSN legs:

1. **Obsidian brain** — `grep -l "papa" H:/prism/knowledge/memories/**/*.md`
2. **PRISM OS** — `prism_operating_system` knows your slot domain
3. **Wiki** — at least 3 wiki entries reference your galaxy
4. **Memories** — ≥10 indexed in MEMORY.md
5. **Tribal** — ≥5 tribal tips slot-tagged papa
6. **System Viz** — galaxy node visible in graph
7. **Engines** — your galaxy engines registered in ENGINE_DIGEST
8. **Algorithms** — applicable algorithms cross-linked
9. **Formulas** — physics/business formulas your domain uses cited (NOT inlined)
10. **NN/GNN** — feature vectors for your engines learnable
11. **PRISM AI** — `aiSystemRouterEngine.route()` knows your domain

## STEP 11 — Commit + close (5 min)

```bash
git add mcp-server/src/engines/backend-helper/
git add state/shared/slot-souls/papa.md
git add .claude/hooks/slot-context-bundle-inject.mjs   # if SLOT_GALAXY_MAP entry added
git add .claude/commands/                              # if custom skill added
git add .claude/hooks/papa-*.mjs                    # if custom hook added
git add .claude/settings.json                          # if hook wired
git add knowledge/wiki/architecture/                   # if new wiki entry

git commit -m "[papa] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-PAPA: full galaxy — soul + 4 galaxy files + ≥10 memories + ≥3 wiki + ≥5 tribal + skill + PSN edges"

# Append assessment doc
# Edit state/shared/specs/PER-SLOT-GALAXY-SYNERGY-ASSESSMENT-2026-05-28.md
# Add your row to the 2026-05-28 EXPANSION table.

# HTML twin (advisory)
node H:/prism/scripts/md-to-html.mjs H:/prism/state/shared/specs/PER-SLOT-GALAXY-SYNERGY-ASSESSMENT-2026-05-28.md
```

## VERIFICATION GATE (run BEFORE commit)

All 13 artifacts must check green (the original 11 + master-brain-link connection + master-index back-pointer):

```bash
G=mcp-server/src/engines/backend-helper
S=state/shared/slot-souls/papa.md
test -f $G/CLAUDE.md     || echo "FAIL 1: CLAUDE.md missing"
test -f $G/MEMORY.md     || echo "FAIL 2: MEMORY.md missing"
test -f $G/PATHS.md      || echo "FAIL 3: PATHS.md missing"
test -f $G/TOOLBELT.md   || echo "FAIL 4: TOOLBELT.md missing"
grep -q "domain_filter: any" $S && echo "FAIL 5: soul still generic"
grep -q "^\s*papa:" .claude/hooks/slot-context-bundle-inject.mjs || echo "FAIL 6: not in SLOT_GALAXY_MAP"
grep -q "## High-ROI memories" $G/MEMORY.md || echo "FAIL 7: no high-ROI memory pointers"
grep -q "## Related galaxies" $G/CLAUDE.md  || echo "FAIL 8: no PSN edges declared"
ls C:/Users/wompu/.claude/projects/H--prism/memory/*_papa_*.md 2>/dev/null | head -1 || echo "FAIL 9: no auto-memory entries"
grep -rl "papa" knowledge/wiki/architecture/ knowledge/wiki/lessons/ 2>/dev/null | head -3 | wc -l | grep -q "^[3-9]\|^[1-9][0-9]" || echo "FAIL 10: <3 wiki refs"
ls .claude/commands/*papa*.md 2>/dev/null | head -1 || echo "FAIL 11: no custom skill"
grep -q "galaxy:backend-helper" C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md || echo "FAIL 12: master MEMORY.md has no [galaxy:backend-helper] back-pointer — master index is blind to this brain (run STEP 5d)"
grep -q "## Master-brain link" $G/MEMORY.md && grep -qiE "Last master-sync:" $G/MEMORY.md || echo "FAIL 13: MEMORY.md missing ## Master-brain link header or Last master-sync stamp (not connected / rotting birth-snapshot) — clone from state/shared/specs/MASTER-BRAIN-TEMPLATE.md"
```

If ANY fail line prints → fix → re-verify → THEN commit. Per [[feedback_always_close_out]] — finish what you started before reporting done.

## After commit — resume normal work

`slot-context-bundle-inject` auto-loads your galaxy on every future UserPromptSubmit for slot:papa. Future sessions skip this brief automatically (galaxy-buildout-detect sees `engines/backend-helper/CLAUDE.md` exists).

Run `/checkin-papa` to pick the next normal-work unit.

---

## Time budget

| Step | Min | Cumul |
|------|-----|-------|
| 1. Soul realign | 5 | 5 |
| 2. Scaffold | 5 | 10 |
| 3. Inventory (parallel) | 15 | 25 |
| 4. PATHS | 10 | 35 |
| 5. Memory (3 sub-steps) | 15 | 50 |
| 6. TOOLBELT | 10 | 60 |
| 7. Wiki + tribal | 10 | 70 |
| 8. Skills + hooks | 10 | 80 |
| 9. Master graphs | 5 | 85 |
| 10. PSN + master-brain | 5 | 90 |
| 11. Commit + close | 5 | 95 |

**Total: ~95 minutes wall-clock for full galaxy.** Token cost ~15-30K per slot (mostly inventory + memory writes).

24 slots simultaneously × ~95 min = **~95 min wall-clock for the whole fleet.** That's the parallelism win the operator wants.

---

_Brief auto-generated by `scripts/generate-per-slot-galaxy-buildout-files.mjs`._
_Master protocol: `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`._
_Goal: each slot owns its own galaxy. No serial alpha-builds the fleet — every slot builds itself on first launch._
