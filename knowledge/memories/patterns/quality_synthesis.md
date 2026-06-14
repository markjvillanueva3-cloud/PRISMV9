---
name: quality_synthesis
description: "[auto-synth · verify] Compounding synthesis of the quality domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: quality
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:49:38.714Z
  sourceHash: 7c3c81aa0919
  advisoryOnly: true
  mustHumanVerify: true
---

# quality — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Post‑ship auto‑distillation** – Every major synergy release triggers an automated “learnings” audit that is committed to the wiki (e.g., GALAXY‑SYNERGY‑AUDIT/U‑ALPHA‑CLAIM‑QUALITY‑GALAXY [1], AI‑SYNERGY‑AUDIT‑MS0/U‑AISYN‑SOUL‑CLAUDE‑QUALITY‑LOCAL [3], PSN‑OCTOPUS‑FLEET‑SYNERGY‑MS0/U‑HERMES‑READINESS‑AUDIT [4]).  
- **Slot‑based domain ownership** – Slots (α, β, γ, δ…) own specific galaxies or brain templates; the owner builds the master artifact and other slots only clone/fine‑tune it (Obsidian brain → α [8]; mill galaxy → foxtrot [17]; token‑awareness surface → α [18]).  
- **Systematic gap audits** – Dedicated scripts scan for unwired engines, orphan hooks, coverage gaps, and token‑savings issues (unwired‑engines audit → 90 missing [12]; tribal‑coverage audit → 17 % true coverage [6]; hook‑wiring audit → 11 missing docs [21]; token‑awareness surface audit → custom snapshot [18]).  
- **Bug‑fix pattern for data ingestion** – When a canonical shard reader fails, fall back to monolith file read (tribal‑embed‑index.json fix [2]); multiline `import` detection bug fixed in `audit-unwired-engines.mjs` [19].  
- **Commit safety guard** – Concurrent `git add/commit` on the shared tree triggers an abort to prevent staged‑file loss [16].  
- **Daily compact memo emission** – Each slot writes a `/compact` log per day, appending “compact N” sections for traceability [5].

## Key decisions & rules
1. **Authority by slot** – The owning slot has exclusive right to run and approve audits, modify the master brain/template, and inject domain‑specific hooks (α → Obsidian brain; foxtrot → mill galaxy) [8][17][18].  
2. **Master‑brain workflow** – α must produce a finalized master‑brain; all other slots clone it unchanged and only apply domain‑fine‑tuning [8].  
3. **Audit‑first release policy** – Every shipped module must be followed by an auto‑distilled audit entry in the wiki before any downstream work proceeds [1][3][4].  
4. **Prioritize unwired engines** – The 90 built but uninvokable engines constitute the single largest fixable capability gap; they are to be wired before expanding other features [12].  
5. **True coverage metric** – Use actual file counts (6,725/39,345 ≈ 17 %) rather than stale banner numbers for tribal‑coverage reporting and improvement planning [6].  
6. **Hook integrity rule** – Any hook listed as “wired” in `.claude/settings.json` must be verifiable at runtime; missing hooks trigger an immediate re‑audit and wiring task [21][7].  
7. **Token‑awareness injection** – Each α session must load `token-awareness-snapshot.mjs` to provide domain‑level token‑optimization context for downstream agents [18][10].  
8. **Git race guard enforcement** – If a concurrent staging conflict is detected, the commit operation aborts with “every staged …” to preserve integrity [16].

## Open threads
- **Broken heuristic in `galaxy-verify.mjs`** – The current check yields false‑fails; needs redesign or replacement [9].  
- **Six critical NOT‑BUILT items from token‑savings audit** – Identified but not yet implemented; assignment and timeline pending [10].  
- **Owner routing for unwired engines** – Prioritized list exists, but explicit per‑owner responsibilities are still undefined [12].  
- **Verification of multiline import fix across codebase** – Bug fixed in `audit-unwired-engines.mjs`, but comprehensive regression testing is outstanding [19].  
- **Tribal coverage improvement plan** – Strategies to raise true coverage above 17 % have not been formalized; requires resource allocation [6].  
- **Ollama offload policy for QUOTING galaxy** – Audit concluded no high‑ROI code needed, but a standing directive on future offload decisions is unclear [23].  
- **Lathe parameter optimization** – 85.4 % feed‑mode U still sub‑optimal; further tuning and possibly new heuristics are required [24].
