#!/usr/bin/env node
// Generates per-slot galaxy-buildout dispatch files at
// state/shared/per-slot-galaxy-buildout/<slot>.md
//
// Each file is a comprehensive operator-canonical brief for the slot to
// execute on launch when its galaxy doesn't exist yet (or is incomplete).
//
// Driven by:
//   - SLOT_GALAXY_MAP (.claude/hooks/slot-context-bundle-inject.mjs)
//   - H:/CHAT-SLOT-DOMAINS.md (canonical domain assignment per slot)
//   - state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md (master 8-step protocol)
//
// Operator directive 2026-05-28: each slot fully fleshes out its own galaxy
// (memory + wiki/tribal injection + custom CLAUDE.md + obsidian-brain feed +
// master graphs/index per domain across H:/ + per-slot skills/scripts/hooks +
// tool-call efficiency + soul tailored + PSN edges + master-brain sync).

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';

const OUT_DIR = 'H:/prism/state/shared/per-slot-galaxy-buildout';

// Keep in sync with .claude/hooks/slot-context-bundle-inject.mjs SLOT_GALAXY_MAP.
import { SLOT_GALAXY_MAP } from "./lib/slot-galaxy-map.mjs";

const DOMAIN_KEYWORDS = {
  alpha:   ['token', 'cache', 'budget', 'rtk', 'ollama', 'cag', 'memory-econom', 'efficiency'],
  bravo:   ['hermes', 'zebra', 'stub-hunt', 'self-reflect', 'orchestrator'],
  charlie: ['quote', 'pricing', 'margin', 'customer', 'bid-to-win'],
  delta:   ['cad', 'STEP', 'IGES', 'feature-recognition', 'BREP', 'tessellate'],
  echo:    ['post-processor', 'controller', 'dialect', 'fanuc', 'okuma', 'haas', 'siemens', 'mitsubishi'],
  foxtrot: ['mill', 'milling', 'kienzle', 'taylor', 'engagement', 'trochoidal', 'speed-feed'],
  golf:    ['fleet-reaper', 'zombie', 'mcp-server', 'orphan', 'scheduled-task'],
  hotel:   ['erp', 'accounting', 'payroll', 'hr', 'kaizen', 'sigma', 'lean', 'audit'],
  india:   ['nn', 'gnn', 'lora', 'rag', 'deep-learning', 'reasoning', 'training', 'ml'],
  juliett: ['database', 'qdrant', 'postgres', 'schema', 'migration', 'sql.js'],
  kilo:    ['cam', 'toolpath', 'fusion', 'mastercam', 'hypermill', 'esprit', 'multi-axis'],
  lima:    ['academy', 'course', 'mit-ocw', 'pdf-corpus', 'curriculum', 'lesson'],
  mike:    ['wedm', 'wire-edm', 'mitsubishi-fa', 'sodick', 'agie', 'makino'],
  oscar:   ['sfc', 'speed-feed', 'css', 'g96', 'g97', 'rpm', 'feed-rate'],
  papa:    ['backend', 'tsc', 'build', 'regression', 'test-coverage', 'dispatcher'],
  quebec:  ['frontend', 'react', 'nextjs', 'phone-app', 'web-app', 'ui'],
  romeo:   ['unwired', 'wiring', 'dispatcher', 'action-enum', 'orphan-engine'],
  sierra:  ['system-viz', 'graph', 'regen-viz', 'ghost-roost', 'master-index'],
  tango:   ['discovery', 'duplication-guard', 'engine-digest', 'pipeline-coverage', 'audit'],
  uniform: ['bug', 'silent-failure', 'r12', 'regression', 'fail-loud', 'hostile-payload'],
  victor:  ['extracted', 'extracted_modules', 'dormant', 'unused', 'unwired-data'],
  whiskey: ['lathe', 'turning', 'g50', 'g96', 'g97', 'threading', 'parting', 'chuck'],
  xray:    ['ocr', 'blueprint', 'pdf', 'cad-extract', 'feature-recognize', 'multi-print'],
  zebra:   ['hermes', 'orchestrator', 'agent-chat', 'fleet'],
};

const PATH_ROOTS = {
  alpha:   ['H:/prism/mcp-server/src/engines/token-optimization/', 'C:/Users/wompu/.claude/projects/H--prism/memory/'],
  bravo:   ['H:/prism/mcp-server/src/engines/hermes-zebra/', 'H:/prism/state/shared/slot-souls/'],
  charlie: ['H:/prism/mcp-server/src/engines/quoting/', 'H:/PRISM/JM DIE/QUOTES/', 'H:/prism/state/shared/quoting-pipeline/'],
  delta:   ['H:/prism/mcp-server/src/engines/cad/', 'H:/PRISM/JM DIE/CAD/', 'H:/PRISM/extracted/cad/'],
  echo:    ['H:/prism/mcp-server/src/engines/post-processor/', 'H:/PRISM/extracted/post-processors/'],
  foxtrot: ['H:/prism/mcp-server/src/engines/mill/', 'H:/PRISM/JM DIE/CNC MILL HAAS/', 'H:/PRISM/JM DIE/HURCO CNC PROGRAMS/', 'H:/PRISM/extracted/mill/'],
  golf:    ['H:/prism/.claude/helpers/', 'H:/Tools/prism-fleet/', 'H:/prism/mcp-server/data/state/'],
  hotel:   ['H:/prism/mcp-server/src/engines/business/', 'H:/PRISM/JM DIE/ACCOUNTING/', 'H:/PRISM/JM DIE/HR/'],
  india:   ['H:/prism/mcp-server/src/engines/ai-training/', 'H:/prism/state/shared/nn-graph/', 'H:/prism/extracted/mit-ocw/'],
  juliett: ['H:/prism/mcp-server/src/engines/database-expansion/', 'H:/prism/state/shared/'],
  kilo:    ['H:/prism/mcp-server/src/engines/cam/', 'H:/PRISM/JM DIE/CAM/', 'H:/PRISM/extracted/cam/'],
  lima:    ['H:/prism/mcp-server/src/engines/academy/', 'H:/PRISM/extracted/mit-ocw/', 'H:/prism/mcp-server/src/engines/pdf-corpus/'],
  mike:    ['H:/prism/mcp-server/src/engines/wedm/', 'H:/PRISM/JM DIE/WIRE EDM/', 'H:/PRISM/extracted/wedm/'],
  oscar:   ['H:/prism/mcp-server/src/engines/speed-feed/', 'H:/prism/mcp-server/src/physics/'],
  papa:    ['H:/prism/mcp-server/src/engines/backend-helper/', 'H:/prism/mcp-server/src/__tests__/'],
  quebec:  ['H:/prism/mcp-server/src/engines/frontend-app/', 'H:/prism/mcp-server/web/', 'H:/prism/cqask/', 'H:/prism/mcp-cadquery/'],
  romeo:   ['H:/prism/mcp-server/src/engines/wiring/', 'H:/prism/mcp-server/src/tools/dispatchers/', 'H:/prism/state/shared/AWARENESS-SNAPSHOT.md'],
  sierra:  ['H:/prism/mcp-server/src/engines/system-viz/', 'H:/prism/scripts/system-viz-query.mjs', 'H:/prism/state/shared/system-viz/'],
  tango:   ['H:/prism/mcp-server/src/engines/discovery/', 'H:/prism/mcp-server/data/docs/', 'H:/prism/mcp-server/data/state/'],
  uniform: ['H:/prism/mcp-server/src/engines/bug-hunting/', 'H:/prism/scripts/audit-*.mjs', 'H:/prism/state/shared/dormant-data-ledger.jsonl'],
  victor:  ['H:/PRISM/extracted/', 'H:/PRISM/extracted_modules/', 'H:/prism/mcp-server/src/engines/dormant-data/'],
  whiskey: ['H:/prism/mcp-server/src/engines/lathe/', 'H:/PRISM/JM DIE/LATHE/', 'H:/PRISM/extracted/lathe/'],
  xray:    ['H:/prism/mcp-server/src/engines/blueprint-vision/', 'H:/PRISM/JM DIE/PRINTS/', 'H:/prism/scripts/lima-pypdf-page-extract.mjs'],
  zebra:   ['H:/prism/mcp-server/src/engines/hermes-zebra/', 'H:/prism/state/shared/zebra-orchestrator/'],
};

function buildSlotBrief(slot, galaxy) {
  const keywords = (DOMAIN_KEYWORDS[slot] ?? [slot]).slice(0, 8);
  const roots = PATH_ROOTS[slot] ?? [`H:/prism/mcp-server/src/engines/${galaxy}/`];
  const today = '2026-05-28';
  const slotUpper = slot.toUpperCase();

  return `# Galaxy buildout — slot:${slot} (galaxy:${galaxy})

> **Auto-fire trigger:** this file is THE first prompt slot:${slot} executes on fresh-launch when \`mcp-server/src/engines/${galaxy}/\` is missing OR incomplete.
> **Master protocol:** \`state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md\`

## Your mission (per operator goal 2026-05-28)

Build slot:${slot}'s **complete galaxy** so future sessions get the fullest possible context with the lowest possible token cost. The 11 artifacts below are mandatory. Sister slots will NOT build them for you.

| # | Artifact | Path |
|---|----------|------|
| 1 | Soul (realigned) | \`state/shared/slot-souls/${slot}.md\` |
| 2 | Galaxy CLAUDE.md | \`mcp-server/src/engines/${galaxy}/CLAUDE.md\` |
| 3 | Galaxy MEMORY.md | \`mcp-server/src/engines/${galaxy}/MEMORY.md\` |
| 4 | H:/-wide PATHS.md | \`mcp-server/src/engines/${galaxy}/PATHS.md\` |
| 5 | TOOLBELT.md | \`mcp-server/src/engines/${galaxy}/TOOLBELT.md\` |
| 6 | Wiki bridges (≥3) | \`knowledge/wiki/architecture/<domain>-*.md\` |
| 7 | Tribal tips (≥5) | via \`prism_knowledge:tribal_capture\` slot=${slot} |
| 8 | Custom skills (≥1) | \`.claude/commands/<verb>-${slot}.md\` |
| 9 | Custom hooks (≥1 if domain warrants) | \`.claude/hooks/<slot>-*.mjs\` + wire in \`settings.json\` |
| 10 | Master-brain memory (≥10 entries) | \`C:/Users/wompu/.claude/projects/H--prism/memory/reference_${slot}_*.md\` |
| 11 | PSN edges declared in CLAUDE.md \`## Related galaxies\` | symmetric — peer galaxies mention you back |

## Pre-flight

\`\`\`bash
pwd                        # expect: H:/prism-slot-${slot}
git branch --show-current  # expect: slot/${slot}
\`\`\`

If you're in shared \`H:/prism\` instead, \`/checkin-${slot}\` did NOT cut over. Run \`cd H:/prism-slot-${slot} && git checkout slot/${slot}\` first.

If \`engines/${galaxy}/CLAUDE.md\` already exists AND has all 11 artifacts above, skip this brief; run \`/checkin-${slot}\` for normal work pickup.

## STEP 1 — Soul realignment (5 min)

Read \`state/shared/slot-souls/${slot}.md\`. If frontmatter is generic-stub (\`role: work\`, \`voice: direct\`, \`domain_filter: any\`), **rewrite** with domain-specific values:

\`\`\`yaml
---
slot: ${slot}
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
\`\`\`

Templates to copy from: \`state/shared/slot-souls/{romeo,uniform,victor,xray}.md\` (2026-05-28 operator-canonical).

## STEP 2 — Scaffold the 4 galaxy files (5 min)

\`\`\`bash
mkdir -p mcp-server/src/engines/${galaxy}
\`\`\`

Create these 4 files. Templates: any of \`engines/{wiring,bug-hunting,dormant-data,blueprint-vision}\`.

- **CLAUDE.md** — operational scope: domain engines + hooks + skills inventory + anti-patterns + Karpathy 5-step + related galaxies + wiki cross-refs + bridges OUT
- **MEMORY.md** — cross-session learnings. MUST open with the \`## Master-brain link\` header cloned from \`state/shared/specs/MASTER-BRAIN-TEMPLATE.md\` (alpha-owned canonical brain pattern — **clone + fine-tune for your domain, do NOT re-derive brain wiring**), then standing patterns + initial state baseline + known failure modes + cross-galaxy memory bridges
- **PATHS.md** — H:/-wide path atlas (NEW per BUILD-KIT)
- **TOOLBELT.md** — custom hooks/skills/tool-call patterns (NEW per BUILD-KIT)

Verify \`SLOT_GALAXY_MAP\` in \`.claude/hooks/slot-context-bundle-inject.mjs\` includes \`${slot}: '${galaxy}',\` — add if missing.

## STEP 3 — Domain inventory (15 min — DISPATCH PARALLEL AGENTS)

Send **one parallel \`Explore\` agent per surface** in a single message:

Keywords for slot:${slot}: ${keywords.map(k => `\`${k}\``).join(', ')}

\`\`\`
Agent({subagent_type: 'general-purpose', description: 'enumerate ${galaxy} engines+dispatchers',
  prompt: 'Find every engine + dispatcher action related to ${galaxy}. Use prism_session:master_index_query keyword=${JSON.stringify(keywords[0])} + dispatcher_map_compact. Return: engine paths + dispatcher.action pairs + 1-line role each.'})
Agent({subagent_type: 'general-purpose', description: 'enumerate ${galaxy} skills',
  prompt: 'Glob ~/.claude/commands/*.md and .claude/commands/*.md for skills matching keywords ${JSON.stringify(keywords)}. Return: skill name + 1-line description.'})
Agent({subagent_type: 'general-purpose', description: 'enumerate ${galaxy} hooks',
  prompt: 'Glob .claude/hooks/*.mjs filtered to keywords ${JSON.stringify(keywords)}. Return: hook name + event (PreToolUse/UserPromptSubmit/Stop) + purpose.'})
Agent({subagent_type: 'general-purpose', description: 'enumerate ${galaxy} memories+wiki+tribal',
  prompt: 'Run prism_memory:semantic_search query=${JSON.stringify(keywords.slice(0,3).join(' '))} topK=20 + prism_knowledge:search topic=${JSON.stringify(galaxy)} + prism_knowledge:tribal_search slot=${slot}. Return top 10 of each by relevance + recency.'})
\`\`\`

Aggregate all 4 agent returns into \`MEMORY.md\` \`## Initial state (${today} baseline)\`.

## STEP 4 — PATHS.md (10 min) — your H:/-wide path atlas

This is THE HIGHEST-ROI artifact. Converts every future Grep/Glob from O(N) → O(1) for slot:${slot}.

Seed roots (start here, walk outward):
${roots.map(r => `- \`${r}\``).join('\n')}

For each root, emit \`<absolute-path> | <purpose> | <last-modified-or-NA> | <maintainer-slot>\` per line. Cover:
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
\`\`\`
prism_memory:semantic_search query=${JSON.stringify(keywords.slice(0,3).join(' '))} topK=20
\`\`\`
Filter to top 10 by relevance × recency. Add to \`MEMORY.md\` under \`## High-ROI memories\` as bullet pointers (≤140 chars/line, with \`[[memory-name]]\` cross-link).

### 5b. Write at least 10 new domain-specific memories
For each non-obvious learning your domain knows that ISN'T already in the memory store, write \`C:/Users/wompu/.claude/projects/H--prism/memory/<type>_${slot}_<topic>.md\` where \`<type>\` is one of: \`feedback\` (standing rule), \`reference\` (point-in-time fact), \`project\` (decision/why).

These auto-feed into \`H:/prism/knowledge/memories/<type>/\` via \`stop-obsidian-memory-feed.mjs\` Stop hook → become discoverable by ALL slots via the master brain. After writing them, bump the \`Last master-sync:\` stamp in your \`## Master-brain link\` header to ${today} — that stamp is the read-back leg that keeps the brain CONNECTED (a stamp older than the galaxy dir mtime means re-pull from master before any work).

### 5c. Index entry in YOUR galaxy MEMORY.md
Add the top-10 pulled master memories under \`## High-ROI memories\` (galaxy side) so future slot:${slot} sessions find them fast.

### 5d. Master-side back-pointer (THE half that's been missing — closes the bidirectional cross-link)
The master index must learn your per-galaxy brain exists. Append ONE \`<=140-char\` row to the **master** \`MEMORY.md\` (\`C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md\`) under \`## Indexed memories\`:

\`\`\`
[galaxy:${galaxy}] mcp-server/src/engines/${galaxy}/MEMORY.md — <one-line domain summary> (slot:${slot}, ${today})
\`\`\`

Without this row the master index is **blind** to your brain — it is the master→galaxy discovery edge. See \`state/shared/specs/MASTER-BRAIN-TEMPLATE.md\` for the canonical 4-axis connection model (PULL / PUSH / master-index back-pointer / recall).

## STEP 6 — TOOLBELT.md (10 min) — tool-call efficiency for THIS slot

Document the exact Grep/Glob/Bash/Read/git patterns slot:${slot} reaches for most. Memoize the regex + path so future sessions don't re-derive them.

Format:
\`\`\`
## Grep patterns
- \`<pattern> | <path-scope> | <typical-result-count> | <when-to-use>\`

## Glob patterns
- \`<pattern> | <path-scope> | <typical-file-count>\`

## Bash one-liners (RTK-wrapped where applicable)
- \`<command> | <savings-vs-alternative>\`

## Read offset+limit cheatsheet
- \`<file> | <offset> | <limit> | <reason-not-full-file>\`

## git common commands (RTK-wrapped)
- \`rtk git <subcommand> | <savings>\`

## prism_* dispatcher actions used most
- \`<dispatcher>:<action> | <typical-input> | <why-faster-than-Grep>\`
\`\`\`

Target: 30-60 lines. Each entry must save tokens or time vs. naive alternative.

## STEP 7 — Wiki bridges + tribal tips (10 min)

### 7a. Wiki bridges (≥3 entries)
Either write new entries OR cross-link existing ones in CLAUDE.md \`## Wiki cross-refs\`. Format: \`[[architecture/<domain>-<topic>]]\` or \`[[lessons/<class>]]\`. Query existing first: \`prism_knowledge:search topic=${JSON.stringify(galaxy)}\`.

If your domain lacks a wiki entry on a load-bearing topic, write one at \`H:/prism/knowledge/wiki/architecture/${galaxy}-<topic>.md\` (or \`lessons/<class>.md\`). Standard frontmatter + sections (see \`H:/prism/WIKI_SCHEMA.md\`).

### 7b. Tribal tip injection (≥5 entries)
Capture domain-specific tribal knowledge via:
\`\`\`
prism_knowledge:tribal_capture {slot: '${slot}', tip: '<one-line tip>', context: '<when applies>', citation: '<source>'}
\`\`\`

These auto-surface via \`tribal-by-domain-inject\` hook on every UserPromptSubmit for slot:${slot}. Target: 5-15 tips covering the non-obvious wisdom only slot:${slot} knows.

## STEP 8 — Custom skills + hooks (10 min)

### 8a. Custom skill (≥1)
If slot:${slot} runs the same multi-step workflow repeatedly, capture it as \`.claude/commands/<verb>-${slot}.md\` (e.g. \`/audit-${slot}\`, \`/sweep-${slot}\`). Skill template: any short skill under \`.claude/commands/\` (e.g. \`/reap-zombies\` is 30 lines).

### 8b. Custom hook (≥1 if domain warrants)
If slot:${slot} would benefit from auto-firing on a tool-call event (e.g. inject a domain-specific reminder on every Bash), create \`.claude/hooks/${slot}-<purpose>.mjs\` and wire it in \`.claude/settings.json\` under the right event matcher.

Hooks for THIS slot's domain should be additive — NEVER disable a fleet-wide hook.

## STEP 9 — Master graphs + index (5 min)

Make slot:${slot} findable in the master indexes:
- Run \`node H:/prism/scripts/build-state-snapshot.mjs\` — surfaces new engines in \`BUILD_STATE.json\`.
- Run \`node H:/prism/mcp-server/scripts/update-engine-digest.mjs\` (if exists) or equivalent — adds your galaxy to \`ENGINE_DIGEST.md\`.
- Verify your galaxy appears in \`prism_session:master_index_query keyword=${galaxy}\` returns.
- If system-viz exists, regenerate: \`node H:/prism/scripts/regen-viz.mjs\` (sierra owns; ping sierra slot if you need help).

## STEP 10 — PSN edges + master-brain sync (5 min)

### 10a. Declare cross-galaxy edges in CLAUDE.md \`## Related galaxies\`
For each edge:
- Which galaxy CONSUMES your output? (data → schema → dispatcher action)
- Which galaxy PRODUCES your input?
- What's the bridge SHAPE?

After writing, verify each PEER galaxy's CLAUDE.md mentions YOU back. Asymmetric = misalignment; ping peer slot via chat-bus to update.

### 10b. Master-brain sync verification
The Stop hook \`stop-obsidian-memory-feed.mjs\` auto-copies your per-session memories (\`C:/Users/wompu/.claude/projects/H--prism/memory/*.md\`) → \`H:/prism/knowledge/memories/<type>/\`. Verify:
\`\`\`bash
ls H:/prism/knowledge/memories/feedback/feedback_${slot}_*.md 2>/dev/null
ls H:/prism/knowledge/memories/reference/reference_${slot}_*.md 2>/dev/null
\`\`\`

If empty, write at least one \`feedback_${slot}_<topic>.md\` in the auto-memory dir — Stop hook will feed it next session-end.

### 10c. PSN 11-leg verification (per [[feedback_psn_definition]])
Slot:${slot}'s galaxy should be discoverable on each of the 11 PSN legs:

1. **Obsidian brain** — \`grep -l "${slot}" H:/prism/knowledge/memories/**/*.md\`
2. **PRISM OS** — \`prism_operating_system\` knows your slot domain
3. **Wiki** — at least 3 wiki entries reference your galaxy
4. **Memories** — ≥10 indexed in MEMORY.md
5. **Tribal** — ≥5 tribal tips slot-tagged ${slot}
6. **System Viz** — galaxy node visible in graph
7. **Engines** — your galaxy engines registered in ENGINE_DIGEST
8. **Algorithms** — applicable algorithms cross-linked
9. **Formulas** — physics/business formulas your domain uses cited (NOT inlined)
10. **NN/GNN** — feature vectors for your engines learnable
11. **PRISM AI** — \`aiSystemRouterEngine.route()\` knows your domain

## STEP 11 — Commit + close (5 min)

\`\`\`bash
git add mcp-server/src/engines/${galaxy}/
git add state/shared/slot-souls/${slot}.md
git add .claude/hooks/slot-context-bundle-inject.mjs   # if SLOT_GALAXY_MAP entry added
git add .claude/commands/                              # if custom skill added
git add .claude/hooks/${slot}-*.mjs                    # if custom hook added
git add .claude/settings.json                          # if hook wired
git add knowledge/wiki/architecture/                   # if new wiki entry

git commit -m "[${slot}] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-${slotUpper}: full galaxy — soul + 4 galaxy files + ≥10 memories + ≥3 wiki + ≥5 tribal + skill + PSN edges"

# Append assessment doc
# Edit state/shared/specs/PER-SLOT-GALAXY-SYNERGY-ASSESSMENT-2026-05-28.md
# Add your row to the 2026-05-28 EXPANSION table.

# HTML twin (advisory)
node H:/prism/scripts/md-to-html.mjs H:/prism/state/shared/specs/PER-SLOT-GALAXY-SYNERGY-ASSESSMENT-2026-05-28.md
\`\`\`

## VERIFICATION GATE (run BEFORE commit)

All 13 artifacts must check green (the original 11 + master-brain-link connection + master-index back-pointer):

\`\`\`bash
G=mcp-server/src/engines/${galaxy}
S=state/shared/slot-souls/${slot}.md
test -f $G/CLAUDE.md     || echo "FAIL 1: CLAUDE.md missing"
test -f $G/MEMORY.md     || echo "FAIL 2: MEMORY.md missing"
test -f $G/PATHS.md      || echo "FAIL 3: PATHS.md missing"
test -f $G/TOOLBELT.md   || echo "FAIL 4: TOOLBELT.md missing"
grep -q "domain_filter: any" $S && echo "FAIL 5: soul still generic"
grep -q "^\\s*${slot}:" .claude/hooks/slot-context-bundle-inject.mjs || echo "FAIL 6: not in SLOT_GALAXY_MAP"
grep -q "## High-ROI memories" $G/MEMORY.md || echo "FAIL 7: no high-ROI memory pointers"
grep -q "## Related galaxies" $G/CLAUDE.md  || echo "FAIL 8: no PSN edges declared"
ls C:/Users/wompu/.claude/projects/H--prism/memory/*_${slot}_*.md 2>/dev/null | head -1 || echo "FAIL 9: no auto-memory entries"
grep -rl "${slot}" knowledge/wiki/architecture/ knowledge/wiki/lessons/ 2>/dev/null | head -3 | wc -l | grep -q "^[3-9]\\|^[1-9][0-9]" || echo "FAIL 10: <3 wiki refs"
ls .claude/commands/*${slot}*.md 2>/dev/null | head -1 || echo "FAIL 11: no custom skill"
grep -q "galaxy:${galaxy}" C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md || echo "FAIL 12: master MEMORY.md has no [galaxy:${galaxy}] back-pointer — master index is blind to this brain (run STEP 5d)"
grep -q "## Master-brain link" $G/MEMORY.md && grep -qiE "Last master-sync:" $G/MEMORY.md || echo "FAIL 13: MEMORY.md missing ## Master-brain link header or Last master-sync stamp (not connected / rotting birth-snapshot) — clone from state/shared/specs/MASTER-BRAIN-TEMPLATE.md"
\`\`\`

If ANY fail line prints → fix → re-verify → THEN commit. Per [[feedback_always_close_out]] — finish what you started before reporting done.

## After commit — resume normal work

\`slot-context-bundle-inject\` auto-loads your galaxy on every future UserPromptSubmit for slot:${slot}. Future sessions skip this brief automatically (galaxy-buildout-detect sees \`engines/${galaxy}/CLAUDE.md\` exists).

Run \`/checkin-${slot}\` to pick the next normal-work unit.

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

_Brief auto-generated by \`scripts/generate-per-slot-galaxy-buildout-files.mjs\`._
_Master protocol: \`state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md\`._
_Goal: each slot owns its own galaxy. No serial alpha-builds the fleet — every slot builds itself on first launch._
`;
}

let written = 0;
let skipped = 0;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const [slot, galaxy] of Object.entries(SLOT_GALAXY_MAP)) {
  const out = `${OUT_DIR}/${slot}.md`;
  const content = buildSlotBrief(slot, galaxy);
  if (existsSync(out)) {
    const existing = readFileSync(out, 'utf8');
    if (existing === content) {
      skipped++;
      continue;
    }
  }
  writeFileSync(out, content);
  written++;
  console.log(`ok ${slot} → ${out}`);
}

console.log(`\nDone: ${written} written, ${skipped} unchanged (byte-equal)`);
console.log(`Slots covered: ${Object.keys(SLOT_GALAXY_MAP).length} of 26`);
console.log(`Unallocated: november (U-DEA), yankee, zulu`);
