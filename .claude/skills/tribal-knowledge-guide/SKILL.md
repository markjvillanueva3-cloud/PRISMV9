---
name: tribal-knowledge-guide
description: 'Tribal knowledge capture and retrieval guide. Use when the user wants to record shop floor expertise, document machinist tips, or search for proven solutions from experienced operators.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Knowledge
---

# Tribal Knowledge Capture & Retrieval Guide

## When to Use
- Recording machinist tips and tricks for specific operations
- Documenting "what we learned" after solving a problem
- Searching for proven solutions from past jobs
- Building an institutional knowledge base for training

## How It Works
1. Capture knowledge entry with context (material, machine, operation, outcome)
2. Store via `prism_knowledge→capture` with tags and categories
3. Auto-link to related formulas, tools, and materials
4. Retrieve via `prism_knowledge→query` with semantic search
5. Surface contextually via hooks when similar operations detected

## Returns
- Tagged knowledge entries with search relevance scores
- Related entries clustered by material/operation/machine
- Contextual suggestions during CAM programming
- Training materials generated from accumulated knowledge

## Example
**Input:** "Search tribal knowledge for threading 304 stainless on a lathe"
**Output:** 5 entries found: (1) "Use G76 with 4 spring passes for 304SS external threads, eliminates burr on last pass" — J. Martinez, 2024. (2) "Thread insert grade IC908 outlasts IC9015 3:1 in 304SS, despite catalog recommendation" — Shop floor note. (3) "Reduce speed 20% for internal threads >2xD in 304SS, chip evacuation critical" — Training doc. Relevance: 94%, 87%, 82%.
