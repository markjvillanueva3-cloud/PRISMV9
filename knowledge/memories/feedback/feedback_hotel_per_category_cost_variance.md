---
name: feedback_hotel_per_category_cost_variance
description: Cost feedback is a per-category breakdown, never a single delta
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
aliases: feedback_hotel_per_category_cost_variance
---


actual_cost_variance is a per-category breakdown (material/labor/machine-hour/overhead/freight), never a single total delta.

**Why:** a 5% total overrun can decompose into +30% material / -10% labor — collapsing to one number loses the actionable signal (commit e7a34ec022 R9-MS4).

**How to apply:** track + report variance per category; feed each into the right adaptive loop (material->purchasing, labor->scheduling, machine-hour->tool-life).
