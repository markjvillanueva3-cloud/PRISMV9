---
name: prism-apprentice-guide
version: 1.0.0
description: |
  Machinist's apprentice skill for skill gap analysis, training path generation,
  and progressive learning. Uses the ApprenticeEngine to assess operator knowledge
  and create personalized learning journeys.

  Modules Covered:
  - ApprenticeEngine (apprentice_assess, apprentice_lesson, apprentice_quiz, apprentice_progress)

  Gateway Routes: prism_intelligence → apprentice_*
  R10 Revolution: Rev 7 — Machinist's Apprentice
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "learn", "train", "explain", "teach", "why", "beginner", "apprentice", "skill gap"
- User is learning machining concepts and needs progressive explanation
- User wants to understand the physics behind a parameter recommendation
- Shop needs to assess and develop operator competencies

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-apprentice-guide")`
2. Determine user's current knowledge level
3. Use apprentice actions:
   - `prism_intelligence→apprentice_assess` — Assess operator knowledge level across domains
   - `prism_intelligence→apprentice_lesson` — Generate lesson on a machining topic at appropriate level
   - `prism_intelligence→apprentice_quiz` — Create knowledge check questions with explanations
   - `prism_intelligence→apprentice_progress` — Track learning progress and recommend next topics

### What It Returns
- **Format**: Structured JSON with assessment scores, lesson content, quiz questions, progress tracking
- **Success**: Personalized content at the right difficulty level with practical examples
- **Failure**: Topic not covered → suggests related available topics

### Examples
**Example 1**: "Why does cutting speed matter?"
→ `apprentice_lesson(topic: "cutting_speed", level: "beginner")` → Explains Vc-tool life relationship, Taylor's equation, heat generation, with shop floor analogies

**Example 2**: "Assess my milling knowledge"
→ `apprentice_assess(domain: "milling")` → 10-question diagnostic → Identifies gaps in chip thinning, engagement angle, stability concepts → Recommends lesson path

# MACHINIST'S APPRENTICE

## Knowledge Domains
| Domain | Topics | Levels |
|--------|--------|--------|
| Materials | ISO classes, properties, machinability, heat treatment | 1-5 |
| Cutting tools | Geometry, coatings, grades, selection | 1-5 |
| Speeds & feeds | Vc, fz, ap, ae, chip load, chip thinning | 1-5 |
| Milling | Face, slot, pocket, profile, 3D surface | 1-5 |
| Turning | OD, ID, facing, grooving, threading | 1-5 |
| Drilling | Twist, indexable, gun, deep hole, tapping | 1-5 |
| Workholding | Vises, fixtures, chucks, vacuum, clamping force | 1-5 |
| Quality | Tolerance, surface finish, measurement, SPC | 1-5 |
| Safety | Speeds/feeds limits, chip control, coolant, PPE | 1-5 |
| CNC programming | G-code, CAM basics, controller differences | 1-5 |

## Difficulty Levels
1. **Novice**: Basic concepts, no math, shop floor analogies
2. **Beginner**: Simple formulas, practical examples, rules of thumb
3. **Intermediate**: Full physics models, trade-off analysis, optimization
4. **Advanced**: Coupled physics, multi-variable optimization, edge cases
5. **Expert**: Research-level concepts, novel approaches, system design

## Learning Path Generation
1. Assess current knowledge across all domains
2. Identify weakest areas with largest practical impact
3. Generate progressive lesson sequence (prerequisite-aware)
4. Include hands-on exercises tied to real machining scenarios
5. Periodic re-assessment to track progress and adjust difficulty
