---
name: project-alpha-owns-obsidian-brain
description: Operator made alpha the domain owner of the Obsidian brain — alpha builds the finalized master-brain + per-domain brain TEMPLATE; all other slots clone it and fine-tune for their domain.
type: project
source: prism-memory
synced: 2026-06-18T04:19:52.412Z
aliases: project_alpha_owns_obsidian_brain_2026_05_28
---


Operator decision 2026-05-28 (slot:alpha session a198ff5f): the per-galaxy Obsidian brain is **not fully functional / synergized** with the system, so **alpha is now the domain owner of the Obsidian brain** (elevated from "Obsidian + memory governance" to OWNER of the master-brain architecture).

Alpha's charge:
1. Build the **finalized master brain** — the canonical, working version of the cross-session brain (`C:/Users/wompu/.claude/projects/H--prism/memory/` → `H:/knowledge/memories/` feed + recall + index).
2. Build the **per-domain brain TEMPLATE** — the connection pattern every galaxy MEMORY.md must follow to be "connected to master": a `## Master-brain link` header, the per-galaxy feed dir, the documented recall command, the backflow tag, resolving `[[ ]]` cross-links.
3. Every other slot's galaxy-buildout brain step becomes **"clone alpha's master-brain template + fine-tune for your domain keywords"** — NOT "figure out brain wiring from scratch."

**Confirmed gaps that triggered this (file-system facts, 2026-05-28):**
- `scripts/migrate-memories-to-galaxies.mjs` is MISSING (only `classify-memories-by-galaxy.mjs` + `memory-galaxy-routing.json` shipped).
- `knowledge/memories/` has NO per-galaxy subdirs — feed is type-routed (`feedback/reference/project`), never reaches a domain node.
- The buildout generator's VERIFICATION GATE checks presence (file exists, has `## High-ROI memories`) not connection (no test that master reaches domain, no recall proof).

**Why:** 24 slots independently wiring their brains produced inconsistent partial brains (token-optimization populated, mill a stub). A single alpha-owned canonical template that others clone is one source of truth, fanned out — matches the operator's "template" language exactly.

**How to apply:** when amending `scripts/generate-per-slot-galaxy-buildout-files.mjs` + `PER-SLOT-GALAXY-BUILD-KIT.md`, point the brain step at the alpha-owned master-brain template (canonical reference: `mcp-server/src/engines/token-optimization/MEMORY.md` as the worked example + a new `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` alpha maintains). Other slots copy + tune, never re-derive. See [[feedback-obsidian-brain]] · [[reference-domain-galaxy-doctrine-2026-05-26]] · the audit workflow wf_ff92b952-169.

**Kernel also assigned to alpha (same directive, 2026-05-28):** COMMAND-KERNEL-MS0 (the PSK syscall kernel at `.claude/kernel/psk.mjs`, wired `prism_session:psk`) is the brain/OS substrate `/startup /checkin /handoff /pick` compose through. 28/29 units complete; only **U-CK11** ("per-category scrutiny pass over migrated corpus") open → milestone stuck `in_progress` on close-out debt. Alpha's queue (APPEND-only, does not preempt current work): resolve U-CK11 + close-out the milestone. The kernel + the Obsidian brain are one substrate under alpha now.

