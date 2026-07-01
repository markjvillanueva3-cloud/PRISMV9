---
source: project
section: FLEET-REAPER (MS0+MS1+MS2+Tier-1..3) — slot-aware orphan reaper for the 26-chat fleet
slug: fleet-reaper-ms0-ms1-ms2-tier-1-3-slot-aware-orphan-reaper-f
indexed_at: 2026-06-06T05:19:21.284Z
---

## FLEET-REAPER (MS0+MS1+MS2+Tier-1..3) — slot-aware orphan reaper for the 26-chat fleet

Maps PID→slot via ancestry + chat-slots.json; reaps orphans gated by confirm-after-N-ticks (2×300s default). Three runners: in-session Monitor (`/fleet-reaper`), durable `PRISM Fleet Reaper` scheduled task (5-min, +210s phase), Stop hook (45s global throttle). **MS1** added Tier-1 graduated pressure gate + critical-memory ballast + Tier-2 service-restart (Docker daemon NEVER auto-restart) + Tier-3 GPU/Ollama coordinator. **MS2** added enumeration cache sidecar + cross-PC host filter. **Tier-3 SYSTEM principal**: scheduled task default `NT AUTHORITY\SYSTEM`; `--hunt` CLI surfaces operator orphan list. **Golf owns the reaper** (moved from alpha 2026-05-16); `/checkin-golf` carries the non-skippable section. Re-register elevated: `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`. Knobs: `PRISM_FLEET_REAPER_*` + `PRISM_GOLF_GUARDIAN_DISABLE`. Wiki: [[fleet-reaper]] · [[alpha-slot-reaper-guardian]] · [[ollama-routing-hint]]. Memory: [[reference_fleet_reaper]] · [[reference_fleet_reaper_ms1]] · [[reference_fleet_reaper_ms2_2026_05_18]] · [[reference_fleet_reaper_tier1_2026_05_17]] · [[reference_fleet_reaper_autonomy_robust_2026_05_16]] · [[reference_fleet_reaper_system_principal_2026_05_18]] · [[feedback_golf_owns_reaper]].

<!-- merged into ## FLEET-REAPER (MS0+MS1+MS2+Tier-1..3) above -->
