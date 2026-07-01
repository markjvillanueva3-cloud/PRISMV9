---
name: tribal-ctrl-090
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "haas", "macro", "look-ahead", "G103", "probing", "gotcha"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-090.md
promoted_at: 2026-06-09T22:31:16.153Z
---

# Haas macro look-ahead gotcha — G103 P1 for variable reads

Haas NGC look-ahead can cause macro variables to be read/evaluated before the intended motion block executes. This is critical when reading probe results or checking I/O states. The control processes macro lines ahead of actual motion. Fix: use G103 P1 to limit look-ahead to 1 block when reading macro variables that depend on completed motion (e.g., after G65 probe calls). Reset with G103 (no P) after the critical section. Also use G04 P0 (dwell zero) as a look-ahead stop before reading probe results stored in macro variables (#1-#33 or system variables).

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-091|Haas probing setup requirements and WIPS integration]]
- [[controller-knowledge-tips-ctrl-023|Haas macro variables and probing]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
