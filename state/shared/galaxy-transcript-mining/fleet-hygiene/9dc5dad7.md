# fleet-hygiene session 9dc5dad7 (2026-05-20, 13.1MB, spine 29KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Mode‑Switcher (H:\Tools\mode-switcher): `Switch-Mode.ps1`, `Install-Shortcuts.ps1`, `README.md`; 3 admin shortcuts; snapshot‑based task toggling.  
- Fleet‑Reaper MS3: 4 units fully wired and tested.  
  - Unit D – reaper‑self IO priority guard (`97d60775ec`).  
  - Unit C – per‑chat compact advisory (`51b2d04a10`).  
  - Unit A – live‑chat priority boost & decay hooks (peer‑absorbed commits `aad2152f7f`, `0b4d868820`).  
  - Unit B – tier‑1.5 background‑app throttle (wire commit `9baacb056e`; helper in `scripts/lib/bg-app-throttle.mjs`).  
- Doc‑reflection for MS3 (`1f71dae7c8`).  
- Close‑out audit refreshed (702 milestones scanned, 0 candidates).  

**DECISIONS**  
- Snapshot‑based task state to avoid silently re‑enabling user‑disabled PRISM tasks.  
- Four per‑mode profiles: PowerPlan, VisualFx, Transparency, GameMode, etc.  
- Reaper capacity upgrades split into four additive units (A–D) with clear knobs and regression guards.  
- Ship spec first; code only after peer‑review gates to avoid mid‑session collisions.  

**OPERATOR DIRECTIVES**  
- “do all 3” → wire Unit B, perform doc‑reflection, run close‑out audit.  
- After completion: `/goal complete` and `/handoff-charlie`.  

**FINDINGS/BUGS**  
- Unreachable return in `fleet-reaper-sweep.mjs`; fixed.  
- Wrong priority constant (`PRIORITY_BELOW_NORMAL = 10`); corrected.  
- Null handling bug in helper functions; patched to use defaults.  
- Peer absorption collisions on Unit A files; resolved by staging only the helper and re‑committing.  

**DOMAIN SPECIFICS**  
- Windows PowerShell admin scripts for scheduled‑task toggling, powercfg profiles, registry tweaks.  
- PRISM task categories: Telemetry, Updaters, Claude‑only, Gaming‑only.  
- Fleet‑Reaper modules (`fleet-reaper-sweep.mjs`, `fleet-memory-monitor.mjs`).  
- Hooks: UserPromptSubmit (boost), Stop (decay).  
- Metrics: process priority, RSS thresholds, advisory cooldowns.  
- Paths: H:\Tools\mode-switcher\, state/shared/specs/FLEET‑REAPER‑MS3‑CHAT‑CAPACITY‑DESIGN.md, etc.  

**TOOLS USED**  
- PRISM PowerShell helpers, Switch‑Mode.ps1, Install‑Shortcuts.ps1.  
- Node scripts (`fleet-reaper-sweep.mjs`, `fleet-memory-monitor.mjs`, helper libs).  
- Git (shared‑tree, peer‑absorption handling), npm for @anthropic-ai/claude-code.  
- md‑to‑html.mjs for spec rendering.  

**OPEN THREADS**  
- Run `/goal complete` to close the MS3 milestone.  
- Execute `/handoff-charlie` to write per‑slot handoff before session end.
