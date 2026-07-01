---
name: tribal-esp-180
category: code-tribal
subdomain: workflow
domain: tribal-knowledge
tags: ["api", "erp", "mes", "integration", "automation", "lights-out"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-180.md
promoted_at: 2026-06-09T22:31:16.254Z
---

# ESPRIT API Integration with ERP and MES Systems

ESPRIT's COM/REST API enables integration with shop-floor systems: ERP (SAP, Oracle, JobBoss) sends work orders with part numbers and quantities, ESPRIT retrieves the corresponding CAD file and KB rules, generates the NC program, and returns estimated cycle time and tool requirements to the MES (Manufacturing Execution System). Configure API endpoints under Preferences → Integration → API. Key API calls: CreateProject, ImportModel, ApplyKBRules, GenerateToolpath, ExportGCode, GetCycleTime, GetToolList. This enables lights-out programming for high-runner production parts where human intervention is unnecessary.

**Category:** workflow
**Confidence:** 0.8
**Source:** web:esprit-docs

## Related
- [[cimatron-cam-tips-cim-159|Cimatron API for ERP/MES Integration]]
- [[powermill-cam-tips-pm-074|PowerMill API for External Integration]]
- [[tebis-cam-tips-teb-131|Tebis API for External System Integration]]
- [[powermill-cam-tips-pm-154|ERP/MES Integration via PowerMill API]]
- [[sprutcam-cam-tips-spr-146|ERP Integration via SprutCAM API]]
