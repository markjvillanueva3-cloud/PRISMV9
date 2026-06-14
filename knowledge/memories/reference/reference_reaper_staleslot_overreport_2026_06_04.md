---
name: reaper-staleslot-overreport-2026-06-04
description: "fleet-reaper-sweep 'N slot(s) with dead PID — run reclaim' advisory OVER-REPORTS: it keys on the recorded chat-slots `pid` field, but the canonical reclaimCrashed reclaims only slots that are heartbeat-crashed (>10min) AND window-pid-dead. Running `chat-slots.mjs reclaim` on the '11 stale slots' reclaimed 0 (foxtrot correctly KEPT: window_pid_alive). Fleet-slot state is healthy; the advisory is cry-wolf. Don't re-chase it."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.915Z
aliases: reference_reaper_staleslot_overreport_2026_06_04
---


2026-06-04 (slot golf, [[feedback_golf_owns_reaper|fleet-hygiene]] discovery loop).

**Finding.** Every [[reference_fleet_reaper|fleet-reaper]] sweep emits `stale-slot hunter: 11 slot(s) with dead PID (alpha,bravo,echo,foxtrot,golf,india,juliett,oscar,romeo,sierra,xray) — run node .claude/helpers/chat-slots.mjs reclaim to clean`. This recurs every tick and reads as drift. It is NOT.

**Verified.** Ran the canonical `node .claude/helpers/chat-slots.mjs reclaim` (→ `reclaimCrashed`, chat-slots.mjs:1352) — result `{reclaimed:[], kept:[{slot:foxtrot, reason:"window_pid_alive"}]}`. **Zero reclaimable.** golf untouched (status alive). The two detectors use DIFFERENT criteria:
- **Reaper stale-slot-hunter** ([[reference_fleet_reaper|fleet-reaper]]-sweep.mjs:2088-2096): keys on the recorded `pid` field being dead. ADVISORY ONLY (the sweep deliberately does NOT reclaim — "chat-slots.mjs owns the canonical reclaim path… operator runs it deliberately"). Over-counts: a slot's recorded pid changes/dies across /compact while the chat + its window stay alive.
- **reclaimCrashed** (canonical): reclaims only `classifySlot==="crashed"` (heartbeat >10min stale, CRASH_TTL_MS) AND `!shouldKeepSlotAlive` (window-pid dead). Eviction-safe by design.

**Takeaway for future golf ticks:** "N dead-PID slots → run reclaim" is the WEAKER recorded-pid signal; the real reclaimable set is almost always 0 (live windows + fresh heartbeats protect them). Do NOT treat the advisory count as drift; if you want to confirm, run reclaim (safe, window-pid-gated) — it self-reports reclaimed vs kept.

**Clean buildable candidate (NOT yet built — moderate, R8-gated):** align the reaper's stale-slot advisory to report only ACTUALLY-reclaimable slots (cross-reference `staleSlotEntries` with `classifySlot`+`shouldKeepSlotAlive` from chat-slots.mjs) so the caveat stops crying wolf. Advisory-string only (zero kill-behavior change), but touches the reaper + its sibling pure-core `report` builder — verify `staleSlotEntries`' other consumers first (it also sets `stuckHunt.staleSlots` count). Cry-wolf class: golf has fixed this before (`re-base gate to file-mtime — dir-mtime was cry-wolf`, ae495622e). Builds on [[reference_fleet_reaper]].
