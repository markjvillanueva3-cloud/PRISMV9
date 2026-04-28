---
id: "sc2-105"
title: "Batch Processing Multiple Parts Overnight"
source: "web:surfcam-batch"
confidence: 86
category: "automation"
tags: ["batch-processing", "unattended", "queue", "overnight", "productivity"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.112Z
---

# Batch Processing Multiple Parts Overnight

SURFCAM batch processing queues multiple part files for unattended toolpath computation. Set up each part file with its operations, then add all files to the batch queue. The system processes them sequentially, generating toolpaths and optionally posting NC code for each file. Use batch processing for overnight toolpath generation on complex mold parts that take 30-60 minutes per operation to compute. Review the batch log the next morning for any failures.

**Category:** automation
**Confidence:** 86
**Source:** web:surfcam-batch
**Operations:** setup

## Related
- [[mastercam-cam-tips-mc-106|Batch Processing queues multi-file operations for overnight unattended runs]]
- [[worknc-cam-tips-wnc-106|Batch Processing Runs Multiple Jobs Unattended]]
- [[edgecam-cam-tips-ec-058|Batch Processing Multiple Parts Overnight]]
- [[esprit-cam-tips-esp-088|Batch Processing for Multi-Part Production]]
- [[gibbscam-cam-tips-gc-090|Batch processing runs multiple parts through post processing unattended]]
