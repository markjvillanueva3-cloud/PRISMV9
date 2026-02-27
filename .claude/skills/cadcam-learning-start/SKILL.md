---
name: cadcam-learning-start
description: 'CAD/CAM learning and interactive education. Use when the user wants to learn machining concepts, understand toolpath strategies, or get training on CNC manufacturing fundamentals.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Learning
---

# CAD/CAM Learning — Interactive Manufacturing Education

## When to Use
- User asks "teach me about [machining concept]"
- Learning toolpath strategies (adaptive, trochoidal, HSM)
- Understanding material properties and machinability
- CNC programming fundamentals and G-code education

## How It Works
1. Classify learning topic via knowledge bundles (6 domains)
2. Retrieve relevant content from `prism_knowledge→query`
3. Provide interactive examples with real parameters
4. Link to related formulas via FormulaRegistry (109 formulas)
5. Offer decision tree navigation for guided exploration

## Returns
- Structured lesson with theory, formulas, and practical examples
- Interactive decision tree for tool/material/strategy selection
- Real-world parameter ranges from registry data
- Cross-references to related topics and deeper dives

## Example
**Input:** "Explain trochoidal milling and when to use it"
**Output:** Trochoidal milling uses a circular tool path with small radial engagement (8-12% Ae) at high axial depth (2-3xD). Best for slotting in stainless steel and titanium where conventional slotting generates excessive heat. Typical: 12mm endmill in 316SS, Ae=1.2mm, Ap=24mm, Vc=120 m/min → 70% lower cutting force vs conventional slot.
