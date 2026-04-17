---
name: autofire-milestone
enabled: true
event: prompt
pattern: (milestone\s+(status|progress|view|check|info)|how\s+far\s+along|progress\s+report|roadmap\s+(status|progress)|what\s+milestones|which\s+milestones|next\s+milestone|unblocked\s+milestones)
action: warn
---

Use `/milestone` for quick milestone viewing. Modes: `/milestone [id]` (single), `/milestone track [name]` (by track), `/milestone progress` (progress bars), `/milestone next` (auto-detect next unblocked).
