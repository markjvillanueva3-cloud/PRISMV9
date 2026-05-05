---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-025
title: hyperMILL Python API job type codes for CAM automation
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 88
source: document:hypermill-py-cadcam-api@p304-306
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "python-api", "automation", "job-type", "cam-core", "v33", "operation:roughing"]
material_groups: []
operation_types: ["roughing"]
content_hash: 4a51c8353e5d588fc60c8f9943c76d5836ab8c606ce90b0c01092a93131bed57
mirror_ts: 2026-05-05T13:36:02.120Z
mirror_engine: TribalVaultPopulatorEngine
---

# hyperMILL Python API job type codes for CAM automation

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypermill-py-cadcam-api@p304-306`

## Tip

hyperMILL v33 Python API (om.cam.core) uses job type codes: Slr3=3D Optimized Roughing. Access via GetCamEntities(CamEntityFilter.ALL_CYCLE_JOBS), filter by job.JobType. Object model: CamModel→JobListSet→JobList→Job. Tools via CamEntityFilter.ALL_TOOLS. Each job has ID, Name, JobType, UUID, JobList reference. Use for automated toolpath analysis and parameter extraction.

## Applies to

- Operation types: `roughing`

## Related tips

- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(category+op:1+tag:2)_
- [[tk-dl-hm-106|Six core turning operations in hyperMILL mill-turn]] _(category+op:1+tag:2)_
- [[tk-dl-hm-103|3D Arbitrary Stock Roughing handles irregular stock shapes]] _(category+op:1+tag:2)_
- [[tk-dl-cnc-014|SINUMERIK CYCLE832: set tolerance, smoothing, and jerk for HSM]] _(category+op:1+tag:1)_
- [[sc2-130|SURFCAM 2023 Operation Manager Replaces Traditional Operation List]] _(category+op:1+tag:1)_

## Tags

#hypermill #python-api #automation #job-type #cam-core #v33 #operation-roughing
