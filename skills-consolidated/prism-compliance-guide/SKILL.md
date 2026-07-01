---
name: prism-compliance-guide
description: |
  Using prism_compliance for ISO 13485, AS9100, ITAR, SOC2, HIPAA, FDA 21 CFR Part 11.
  Template application, gap analysis, audit preparation, hook provisioning.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "compliance", "guide", "using", "itar", "hipaa", "template", "application"
- Hook configuration, event management, or cadence function setup needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-compliance-guide")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_hook→list/get/execute for hook operations
   - prism_skill_script→skill_content(id="prism-compliance-guide") for hook reference
   - prism_nl_hook→create for natural language hook authoring

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about compliance
→ Load skill: skill_content("prism-compliance-guide") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires guide guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Compliance Guide
## 6 Regulatory Frameworks via prism_compliance

## Framework Selection

| Framework | Industry | Key Requirements | Use When |
|-----------|----------|-----------------|----------|
| **ISO 13485** | Medical devices | Design controls, risk management, traceability | Making medical implants/instruments |
| **AS9100** | Aerospace | Process control, FOD prevention, special processes | Aerospace parts, defense subcontracts |
| **ITAR** | Defense/export | Access control, data marking, export restrictions | Controlled technical data |
| **SOC2** | SaaS/Tech | Security, availability, confidentiality | Cloud-based manufacturing systems |
| **HIPAA** | Healthcare | PHI protection, access logs, encryption | Patient-related manufacturing |
| **FDA 21 CFR 11** | Pharma/Medical | Electronic records, signatures, audit trails | FDA-regulated production |

## Action Workflow

### 1. Apply a Template
```
prism_compliance→apply_template({ framework: "AS9100" })
→ Auto-provisions hooks for: document control, process validation,
  nonconformance tracking, measurement traceability, FOD prevention
```

### 2. Run Gap Analysis
```
prism_compliance→gap_analysis({ framework: "AS9100" })
→ Returns: gaps found, severity, remediation steps
```

### 3. Check Current Compliance
```
prism_compliance→check_compliance({ framework: "AS9100" })
→ Returns: compliant/non-compliant per requirement, overall score
```

### 4. Audit Preparation
```
prism_compliance→audit_status({ framework: "AS9100" })
→ Returns: audit log, pending items, evidence status
```

### 5. Conflict Resolution (Multiple Frameworks)
```
prism_compliance→resolve_conflicts({ frameworks: ["ISO_13485", "AS9100"] })
→ Strictness lattice: takes most restrictive requirement from each
```

## Key Principle
Templates provision hooks via F6 (hook system). Once applied, compliance checks fire automatically on relevant operations — zero manual effort per transaction.
