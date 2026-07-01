---
name: tribal-gc-090
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "automation", "batch-processing", "post-process", "unattended"]
confidence: 84
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-090.md
promoted_at: 2026-06-09T22:31:16.335Z
---

# Batch processing runs multiple parts through post processing unattended

GibbsCAM supports batch post processing where multiple part files are queued and processed sequentially without operator intervention. Set up the batch queue with each file's part, post processor, and output path. The system processes each file, generates the G-code, and reports any errors. This is ideal for shops that program during the day and batch-post in the evening. Combine with a file-naming convention that embeds the machine name and date for organized output. Batch processing can also be triggered from external scripts for integration with ERP/MRP systems.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-159|GibbsCAM COM API enables external automation of batch file processing]]
- [[solidcam-cam-tips-sc-110|Batch Processing — Post-Process Multiple Parts Unattended]]
- [[gibbscam-cam-tips-gc-068|Glue stop technique uses adhesive to hold slugs for unattended operation]]
- [[gibbscam-cam-tips-gc-069|Automatic wire threading enables multi-opening unattended production]]
- [[gibbscam-cam-tips-gc-088|GibbsCAM macros automate repetitive geometry creation and tool selection]]
