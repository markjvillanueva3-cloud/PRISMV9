---
name: mfg-apprentice-explain
description: Explain manufacturing concepts at appropriate skill level
---

# Concept Explanation Engine

## When To Use
- A machinist or trainee asks "what is chip formation?" or similar concept questions
- You need to explain a manufacturing principle at beginner, intermediate, or expert level
- Onboarding new operators who need foundational knowledge
- Translating complex metallurgy or cutting theory into plain language

## How To Use
```
prism_intelligence action=apprentice_explain params={concept: "chip formation", level: "beginner"}
```

## What It Returns
- `explanation` — level-appropriate text explaining the concept
- `level` — the skill level the explanation targets (beginner/intermediate/expert)
- `key_terms` — glossary of technical terms used in the explanation
- `related_concepts` — links to adjacent topics for further learning
- `visual_aids` — descriptions or references to diagrams when applicable

## Examples
- Explain chip formation for a beginner: `apprentice_explain params={concept: "chip formation", level: "beginner"}` — returns plain-language explanation of how chips form during cutting
- Explain work hardening for an expert: `apprentice_explain params={concept: "work hardening", level: "expert"}` — returns detailed metallurgical explanation with dislocation theory
- Explain surface finish for intermediate: `apprentice_explain params={concept: "surface roughness Ra", level: "intermediate"}` — returns explanation with Ra/Rz definitions and typical values
