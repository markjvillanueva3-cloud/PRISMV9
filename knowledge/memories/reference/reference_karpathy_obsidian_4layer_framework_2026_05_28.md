---
name: karpathy-obsidian-4layer-framework
description: "Karpathy's 4-layer second-brain framework (Knowledge/Connection/Synthesis/Intelligence) + 6 Claude integrations + Cyril's vault architecture, mapped against PRISM's per-slot-galaxy work. Source — cyrilXBT x.com/cyrilXBT/status/2059817560988676179 dated 2026-05-27. Use this to upgrade the per-slot galaxy dispatch briefs and the PER-SLOT-GALAXY-BUILD-KIT."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.177Z
aliases: reference_karpathy_obsidian_4layer_framework_2026_05_28
---


## The framework (Karpathy via Cyril, 2026-05-27)

**Core insight:** Obsidian + Claude isn't a note-taking app — it's a **thinking partner**. Value is in what comes OUT (synthesis), not what goes IN (capture). The vault compounds because the CONTEXT compounds.

### The 4 layers

| Layer | Question it answers | PRISM equivalent | Gap |
|-------|--------------------|--------------------|-----|
| **L1: Knowledge** | "What do I know?" | MEMORY.md + extracted corpus + handoffs | No INBOX-processing convention |
| **L2: Connection** | "How does it fit together?" | wiki [[wikilinks]] + [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] | Connection finder runs ad-hoc, not weekly |
| **L3: Synthesis** | "What does it mean?" | assessment docs + galaxy CLAUDE.md | No per-slot Maps of Content |
| **L4: Intelligence** | "What can I do with it?" | master-index + system-viz + MCP dispatchers | Per-slot Question-Answerer not auto-gated |

### The 6 Claude integrations (Karpathy-canonical)

PRISM has 1-2 of these formalized per slot. The rest are ad-hoc. Per-slot galaxy buildout should adopt all 6 as standing capabilities:

1. **Inbox Processor** (every evening) — process raw captures into structured notes. PRISM has DocuRead inbox + `memory_import_claude` but no per-slot evening cron. **Action:** add `prism inbox-process --slot <slot>` daily cron per galaxy.

2. **Connection Finder** (weekly) — find non-obvious links between recent notes and the historic vault. PRISM has `wiki-precheck-inject` (top-3 per prompt) but no batch sweep. **Action:** weekly `/connection-finder-<slot>` skill that runs `memory_search` over last-7-day notes × full vault, surfaces unlinked overlaps.

3. **Question Answerer** (anytime) — answer from VAULT FIRST, external knowledge only after. PRISM has `master_index_query` + `memory_search` but no enforced "search vault first" gate before generic answers. **Action:** UserPromptSubmit hook that auto-injects top-5 vault hits BEFORE Claude reasons.

4. **Writing Assistant** (when writing) — find vault notes that support/contradict the piece, identify gaps. PRISM uses slot CLAUDE.md context but doesn't formalize this. **Action:** `/writing-assist-<slot>` skill that pulls relevant permanent notes + counterarguments.

5. **Contradiction Detector** (monthly) — find notes where the user holds conflicting positions. PRISM has scrutiny gate but for diff-review, not cross-note contradiction. **Action:** monthly `/contradiction-detect-<slot>` skill.

6. **Synthesis Generator** (when N notes accumulate on a topic) — generate cross-note synthesis beyond any individual note. PRISM has wiki Maps of Content idea but not auto-fired. **Action:** threshold-fired `/synthesize-<slot> --topic <T>` skill when ≥10 notes tagged with topic.

### The vault architecture (Cyril/Karpathy)

```
00 - INBOX/          [raw captures before processing]
01 - LITERATURE/     [what a source said — author/title.md]
02 - PERMANENT/      [what I think — atomic, my own words, linked]
03 - PROJECTS/       [active work per-project]
04 - DAILY/          [YYYY-MM-DD.md]
05 - MAPS/           [topic-map.md syntheses]
06 - OUTPUTS/        [essays / analyses / frameworks]
07 - SYSTEM/         [CLAUDE.md + skills + templates]
```

**The Literature → Permanent distinction is the load-bearing one** — literature notes capture WHAT THE SOURCE SAID, permanent notes capture WHAT I THINK. Karpathy: "you do not own knowledge until you can express it in your own words in a way that connects it to what you already know."

PRISM's auto-memory dir is mostly literature-class (captures + references). The synthesis-class permanent notes are sparse.

### CLAUDE.md "How to Help Me Think" pattern

Cyril's per-vault CLAUDE.md template includes **explicit How-to-Help + What-I-Do-Not-Want sections** — sharper than PRISM's current per-galaxy CLAUDE.md which describes scope but not Claude-interaction discipline.

Per-slot CLAUDE.md should add:
```markdown
## How to Help Me Think (slot:<slot>)
When I ask a question:
- Draw on relevant permanent notes from MY galaxy first
- Surface connections to other galaxies I haven't made explicitly
- Challenge my assumptions using evidence from my own MEMORY.md
- Tell me when my thinking contradicts something I've written

When I'm writing:
- Find relevant permanent notes from MY galaxy
- Identify gaps in my argument
- Suggest connections to other galaxies' assets

## What I Do Not Want
- Generic information not grounded in my slot's specific context
- Summaries of what I already know
- Answers that don't draw on my accumulated memory
```

### The daily practice (15 min)

- **Morning (5 min):** open daily note, check CLAUDE.md questions, set ONE intellectual intention
- **During day (0 min):** capture friction-free to INBOX
- **Evening (10 min):** Inbox Processor + review + add ONE link

**Per-slot mapping:** the existing PRISM `/checkin-<slot>` is the morning intention setter. The Inbox Processor is the missing evening cron. The "add one link" is what `tribal-by-domain-inject` partially does but per-prompt instead of per-day.

### What changes after 90 days (per Karpathy)

- Day 30: Connection Finder starts surfacing surprise links between week-1 and week-4 notes.
- Day 60: Question Answerer surfaces forgotten prior thinking.
- Day 90: Synthesis Generator produces output that surprises the user.

**PRISM's per-slot galaxies are at Day 0.** With the 6 integrations wired per-slot, expect equivalent compounding cadence per chat slot.

## How to apply to PRISM per-slot-galaxy-buildout (action items)

The per-slot dispatch briefs at `state/shared/per-slot-galaxy-buildout/<slot>.md` should be upgraded to add:

1. **Step-12 Karpathy-4-layer sub-structure** inside `engines/<galaxy>/` — 4-7 subdirs mirroring the vault architecture.
2. **Step-13 6-integration setup** — each slot wires its own Inbox-Processor, Connection-Finder, Question-Answerer, Writing-Assistant, Contradiction-Detector, Synthesis-Generator skills (parameterized per slot).
3. **CLAUDE.md template** — add `## How to Help Me Think` and `## What I Do Not Want` sections per slot.
4. **Daily practice cron** — per-slot morning + evening hooks.

Source: Cyril CyrilXBT post 2026-05-27 (`https://x.com/cyrilXBT/status/2059817560988676179`) summarizing Karpathy framework. 67K views, 412 bookmarks.

Related:
- [[feedback_psn_definition]] — PRISM's 11-leg PSN map; Karpathy's 4 layers are a subset rolled up
- [[reference_u_vault01_knowledge_vault_schema]] — PRISM's existing 5-namespace knowledge vault
- [[feedback_obsidian_brain]] — Obsidian as cross-session brain (PSN leg #1)
- [[feedback_master_index_system_viz_first]] — the trio that powers L4 Intelligence

Operator-flagged 2026-05-28 via slot:alpha session a198ff5f.
