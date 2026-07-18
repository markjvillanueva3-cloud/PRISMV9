---
name: feedback-jm-machine-extraction-after-pdf-exhaustion
description: "After PDF corpus exhaustion, always cover JM-related machines extensively — manuals, alarm books, parts books, kinematics — extract into wiki/tribal nodes."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_jm_machine_extraction_after_pdf_exhaustion
---


After PDF learning is exhausted, always cover JM Die's specific machines extensively.

**Why:** JM Die is PRISM's canonical test shop — every feature must work against JM Die's real data. Extracting machine-specific manuals (parts books, alarm books, operator manuals, kinematics docs) gives the AI systems the operator-level retrieval surface they need when a JM Die operator asks "alarm 1042 on the OKK CNC means what?" or "what's the part number for the Z-axis encoder on the Mazak QT-200?"

**How to apply:**
- Triggered after exhausting the general-PDF tribal-extraction pipeline (e.g. JM DIE/TRIBAL+WIKI/* coverage done)
- Find/download for each JM Die machine: (1) operator manual, (2) alarm/diagnostic book, (3) parts breakdown / exploded views, (4) maintenance kinematics specs
- Extract page-by-page into wiki + tribal knowledge nodes via [[feedback_use_lima_pypdf_page_extractor]] (canonical extractor — 76× deeper than pdf-parse)
- Tag every node with the JM Die machine ID + part-number / alarm-code so `prismSelfAwarenessEngine.searchTribalKnowledge()` retrieval surface returns operator-actionable data
- Wire to: jm-die-profile.ts (canonical JM Die machine list) + KnowledgeCurriculumBridgeEngine + system-viz L11 nodes under each machine node

Standing doctrine — apply after the primary PDF-corpus extraction sweep for any chat working tribal-knowledge.
