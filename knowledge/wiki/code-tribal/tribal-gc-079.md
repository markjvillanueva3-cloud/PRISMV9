---
name: tribal-gc-079
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "post-processor", "machine-specific", "safety-block", "firmware"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-079.md
promoted_at: 2026-06-09T22:31:16.332Z
---

# Machine-specific posts must match exact control firmware for safety codes

Each CNC control brand and firmware version has specific requirements for safety blocks, tool change sequences, and mode cancellations. In GibbsCAM, the post must output the correct safety line at program start (e.g., G90 G80 G40 G49 for Fanuc, G17 G90 G40 G80 for Heidenhain). Tool change sequences vary—some controls require spindle stop (M05) before tool change (M06), others handle it automatically. Get the factory-supplied post for your specific machine from GibbsCAM/reseller and verify the first program with single-block mode. Never assume a generic post for a control brand works for all machines with that control.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[gibbscam-cam-tips-gc-078|Canned cycle output from post maps GibbsCAM operations to G81/G83/G84]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[gibbscam-cam-tips-gc-081|Macro variable output enables parametric programs for part families]]
