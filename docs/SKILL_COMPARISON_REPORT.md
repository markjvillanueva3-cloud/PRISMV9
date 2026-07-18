# PRISM Skill Comparison Audit Report
## Generated: 2026-01-29T08:18:05.947014

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Container Skills | 110 |
| C:\PRISM\skills | 100 |
| Container Stubs (512B) | 56 |
| Skills Only in Container | 10 |
| Skills Only in C:\PRISM | 0 |
| Skills in Both | 100 |
| **Need Update from C:\PRISM** | **67** |
| Container Has Newer | 4 |
| Similar (Verify) | 29 |

---

## ACTION REQUIRED: Skills to Update from C:\PRISM (67)

These container stubs should be replaced with full C:\PRISM versions:

| Skill | Container | C:\PRISM | Action |
|-------|-----------|-----------|--------|
| prism-agent-selector | 512B | 3455B | REPLACE_STUB |
| prism-algorithm-selector | 512B | 11124B | REPLACE_STUB |
| prism-all-skills | 7168B | 414580B | UPDATE_FROM_CPRISM |
| prism-auditor | 512B | 2136B | REPLACE_STUB |
| prism-category-defaults | 1024B | 1798B | UPDATE_FROM_CPRISM |
| prism-claude-code-bridge | 512B | 5031B | REPLACE_STUB |
| prism-code-perfection | 512B | 28755B | REPLACE_STUB |
| prism-coding-patterns | 512B | 15163B | REPLACE_STUB |
| prism-consumer-mapper | 512B | 3037B | REPLACE_STUB |
| prism-context-dna | 512B | 10013B | REPLACE_STUB |
| prism-context-pressure | 512B | 10502B | REPLACE_STUB |
| prism-debugging | 512B | 8161B | REPLACE_STUB |
| prism-dependency-graph | 512B | 11240B | REPLACE_STUB |
| prism-derivation-helpers | 512B | 1696B | REPLACE_STUB |
| prism-development | 2048B | 6859B | UPDATE_FROM_CPRISM |
| prism-error-recovery | 512B | 7096B | REPLACE_STUB |
| prism-expert-cad-expert | 512B | 4562B | REPLACE_STUB |
| prism-expert-cam-programmer | 512B | 5079B | REPLACE_STUB |
| prism-expert-master-machinist | 512B | 6076B | REPLACE_STUB |
| prism-expert-materials-scientist | 512B | 8266B | REPLACE_STUB |
| prism-expert-mathematics | 512B | 5657B | REPLACE_STUB |
| prism-expert-mechanical-engineer | 512B | 3841B | REPLACE_STUB |
| prism-expert-post-processor | 512B | 6202B | REPLACE_STUB |
| prism-expert-quality-control | 512B | 4682B | REPLACE_STUB |
| prism-expert-quality-manager | 512B | 5120B | REPLACE_STUB |
| prism-expert-thermodynamics | 512B | 5420B | REPLACE_STUB |
| prism-extraction-index | 512B | 5989B | REPLACE_STUB |
| prism-extractor | 512B | 11199B | REPLACE_STUB |
| prism-fanuc-programming | 512B | 97998B | REPLACE_STUB |
| prism-gcode-reference | 512B | 87005B | REPLACE_STUB |
| prism-heidenhain-programming | 512B | 86460B | REPLACE_STUB |
| prism-hierarchy-manager | 512B | 3504B | REPLACE_STUB |
| prism-knowledge-base | 1024B | 8333B | UPDATE_FROM_CPRISM |
| prism-large-file-writer | 512B | 6797B | REPLACE_STUB |
| prism-master-equation | 512B | 38233B | REPLACE_STUB |
| prism-material-template | 1536B | 15989B | UPDATE_FROM_CPRISM |
| prism-material-templates | 2048B | 18334B | UPDATE_FROM_CPRISM |
| prism-material-validator | 2048B | 46724B | UPDATE_FROM_CPRISM |
| prism-monolith-navigator-sp | 2048B | 50205B | UPDATE_FROM_CPRISM |
| prism-physics-formulas | 512B | 10461B | REPLACE_STUB |
| prism-physics-reference | 512B | 6537B | REPLACE_STUB |
| prism-planning | 512B | 6050B | REPLACE_STUB |
| prism-post-processor-reference | 512B | 18061B | REPLACE_STUB |
| prism-process-optimizer | 512B | 37964B | REPLACE_STUB |
| prism-product-calculators | 512B | 128014B | REPLACE_STUB |
| prism-python-tools | 1536B | 10440B | UPDATE_FROM_CPRISM |
| prism-quality-gates | 512B | 6720B | REPLACE_STUB |
| prism-quick-start | 512B | 3510B | REPLACE_STUB |
| prism-reasoning-engine | 512B | 34581B | REPLACE_STUB |
| prism-resource-optimizer | 512B | 3691B | REPLACE_STUB |
| prism-review | 512B | 8145B | REPLACE_STUB |
| prism-safety-framework | 512B | 38716B | REPLACE_STUB |
| prism-session-buffer | 512B | 10315B | REPLACE_STUB |
| prism-session-handoff | 512B | 12896B | REPLACE_STUB |
| prism-siemens-programming | 512B | 84905B | REPLACE_STUB |
| prism-state-manager | 512B | 8619B | REPLACE_STUB |
| prism-swarm-coordinator | 2048B | 4882B | UPDATE_FROM_CPRISM |
| prism-swarm-orchestrator | 1536B | 2703B | UPDATE_FROM_CPRISM |
| prism-synergy-calculator | 512B | 3932B | REPLACE_STUB |
| prism-task-continuity | 512B | 4128B | REPLACE_STUB |
| prism-tdd | 1024B | 8194B | UPDATE_FROM_CPRISM |
| prism-tool-selector | 512B | 7335B | REPLACE_STUB |
| prism-unit-converter | 512B | 7779B | REPLACE_STUB |
| prism-universal-formulas | 512B | 14494B | REPLACE_STUB |
| prism-utilization | 512B | 2190B | REPLACE_STUB |
| prism-verification | 512B | 7612B | REPLACE_STUB |
| prism-wiring-templates | 512B | 89042B | REPLACE_STUB |


---

## Skills Only in C:\PRISM (Add to Container): 0



---

## Skills Only in Container (Keep): 10

- **prism-anti-regression** (36864B) - full
- **prism-code-complete-integration** (19456B) - full
- **prism-codebase-packaging** (17408B) - full
- **prism-formal-definitions** (512B) - stub
- **prism-life-safety-mindset** (8704B) - full
- **prism-mandatory-microsession** (5120B) - full
- **prism-maximum-completeness** (14336B) - full
- **prism-predictive-thinking** (17408B) - full
- **prism-skill-orchestrator** (13312B) - full
- **prism-tdd-enhanced** (20480B) - full


---

## Container Has Newer Version (4)

These skills have larger versions in the container - may need to sync BACK to C:\PRISM:

- **prism-formula-evolution**: Container 6144B vs C: 2790B
- **prism-mathematical-planning**: Container 11264B vs C: 5070B
- **prism-monolith-navigator**: Container 51200B vs C: 3096B
- **prism-uncertainty-propagation**: Container 6144B vs C: 2001B


---

## Similar Versions (Verify Content): 29

- **prism-api-contracts**: Container 186368B vs C: 186215B
- **prism-code-master**: Container 20480B vs C: 20237B
- **prism-combination-engine**: Container 3584B vs C: 4708B
- **prism-controller-quick-ref**: Container 9216B vs C: 9206B
- **prism-deep-learning**: Container 9728B vs C: 9433B
- **prism-dev-utilities**: Container 12288B vs C: 11546B
- **prism-error-catalog**: Container 124928B vs C: 123734B
- **prism-expert-master**: Container 12288B vs C: 12064B
- **prism-hook-system**: Container 11264B vs C: 10661B
- **prism-knowledge-master**: Container 12288B vs C: 12144B
- **prism-manufacturing-tables**: Container 142336B vs C: 141848B
- **prism-material-enhancer**: Container 36864B vs C: 36539B
- **prism-material-lookup**: Container 38912B vs C: 38619B
- **prism-material-physics**: Container 68608B vs C: 67917B
- **prism-material-schema**: Container 54272B vs C: 53311B
- **prism-monolith-extractor**: Container 74752B vs C: 74509B
- **prism-monolith-index**: Container 74752B vs C: 74237B
- **prism-quality-master**: Container 23552B vs C: 23584B
- **prism-session-master**: Container 43008B vs C: 42556B
- **prism-sp-brainstorm**: Container 45056B vs C: 45117B
- **prism-sp-debugging**: Container 109568B vs C: 109242B
- **prism-sp-execution**: Container 88064B vs C: 87108B
- **prism-sp-handoff**: Container 77824B vs C: 77179B
- **prism-sp-planning**: Container 165888B vs C: 166590B
- **prism-sp-review-quality**: Container 97280B vs C: 96497B
- **prism-sp-review-spec**: Container 60416B vs C: 59550B
- **prism-sp-verification**: Container 81920B vs C: 81212B
- **prism-tool-holder-schema**: Container 8704B vs C: 8643B
- **prism-validator**: Container 10240B vs C: 10229B
