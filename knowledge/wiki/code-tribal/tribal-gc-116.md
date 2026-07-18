---
name: tribal-gc-116
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "probing", "tool-measurement", "length-offset", "diameter-offset"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-116.md
promoted_at: 2026-06-09T22:31:16.342Z
---

# Tool measurement probing sets length and diameter offsets automatically

Program tool measurement probing in GibbsCAM to automatically set tool length and diameter offsets using an on-machine tool setter (touch probe or laser). Output the tool measurement cycle at the start of each tool's first use. For critical operations, re-measure the tool periodically to detect wear—insert a tool measurement cycle every N parts where N depends on tool life expectations. The probe-measured offsets are stored in the control's tool offset table. For tools with known wear patterns (e.g., 0.01mm/part), program wear compensation updates as an alternative to frequent re-measuring.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-115|Part setup probing establishes datum positions automatically on the machine]]
- [[gibbscam-cam-tips-gc-117|Rotary axis alignment probing corrects angular positioning errors]]
- [[gibbscam-cam-tips-gc-118|In-process inspection catches dimensional drift before scrapping parts]]
- [[gibbscam-cam-tips-gc-119|Finished part inspection with probing documents conformance on the machine]]
- [[gibbscam-cam-tips-gc-120|Probe collision prevention with maximum deflection limits protects expensive styli]]
