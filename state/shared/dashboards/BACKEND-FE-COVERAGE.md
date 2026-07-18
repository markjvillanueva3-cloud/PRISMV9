# Backend -> Frontend coverage (which dispatcher actions have NO FE consumer)

> INVERSE of the FE->BE contract audit. An action whose string appears nowhere in web/src is a
> high-confidence ORPHAN (unexposed backend capability). `referencedCeiling` is an UPPER bound
> (a common word may coincidentally match) -- the orphan list is the actionable signal.
> Regen: `node scripts/audit-backend-fe-coverage.mjs`.

**100 dispatchers, 13901 actions; 13243 orphan (no FE string), 4.7% referenced-ceiling.**

| dispatcher | total | orphan | cov-ceiling% | file |
|---|---|---|---|---|
| prism_cam | 2494 | 2456 | 1.5 | camDispatcher.ts |
| prism_calc | 1478 | 1456 | 1.5 | calcDispatcher.ts |
| prism_dev | 1056 | 1027 | 2.7 | devDispatcher.ts |
| prism_business | 1057 | 888 | 16 | businessDispatcher.ts |
| prism_pp | 804 | 791 | 1.6 | ppDispatcher.ts |
| prism_intelligence | 601 | 596 | 0.8 | intelligenceDispatcher.ts |
| prism_cad | 604 | 583 | 3.5 | cadDispatcher.ts |
| prism_mill | 446 | 432 | 3.1 | millDispatcher.ts |
| prism_session | 417 | 417 | 0 | sessionDispatcher.ts |
| prism_turning | 422 | 410 | 2.8 | turningDispatcher.ts |
| prism_edm | 399 | 386 | 3.3 | edmDispatcher.ts |
| prism_cad_automation | 370 | 362 | 2.2 | cadAutomationDispatcher.ts |
| prism_security | 413 | 356 | 13.8 | securityDispatcher.ts |
| prism_data | 256 | 249 | 2.7 | dataDispatcher.ts |
| prism_knowledge | 262 | 241 | 8 | knowledgeDispatcher.ts |
