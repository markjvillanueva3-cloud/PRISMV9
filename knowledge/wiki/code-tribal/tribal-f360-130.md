---
name: tribal-f360-130
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "turning", "facing", "stock-model", "castings"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-130.md
promoted_at: 2026-06-09T22:31:16.284Z
---

# Turning Face Operation Stock Recognition

Fusion's Turning Face operation uses the stock model to calculate the number of passes needed. Define the raw stock accurately (cylinder for bar stock, from body for castings/forgings) so the facing passes only cut material that actually exists. For cast or forged blanks, import the raw shape as a separate body and assign it as the Stock in the Setup. This prevents air cuts on parts where the raw shape is non-uniform — a forging with a parting line flash only needs facing where the flash protrudes, not across the entire diameter.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:fusion360-docs
**Operations:** turning_facing

## Related
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
- [[fusion360-cam-tips-ext-f360-076|Grooving with Peck Cycle for Deep Narrow Slots]]
- [[fusion360-cam-tips-ext-f360-077|Single-Point Threading with Spring Passes]]
- [[fusion360-cam-tips-ext-f360-090|Stock Model Updates Between Operations]]
