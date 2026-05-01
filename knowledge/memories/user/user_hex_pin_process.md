---
name: Hex Pin Manufacturing Process Detail
description: User makes hex pins with boss using live tooling C-axis milling, manually compensates 0.001-0.003" taper for deflection
type: user
---

## Hex Pin Manufacturing Process

User makes **hex pins with a boss at the front and tapered walls** on live tooling CNC lathes.

### Process:
1. Part has a **boss** (cylindrical section) at the front
2. Behind the boss, material is milled into a **hexagonal shape**
3. Live tooling side-mills **one flat at a time**
4. **C-axis orients** 60° between each flat to generate the hex
5. 6 passes total (one per hex face)

### Deflection Compensation:
- Parts deflect away from the end mill during side milling
- Deflection is worse further from the spindle face (more stickout = more deflection)
- Operator manually programs a **0.001" to 0.003" taper** on each flat to counteract deflection
- Taper amount depends on:
  - **Diameter of the stock** (larger = stiffer = less taper needed)
  - **Stickout from spindle face** (more stickout = more taper needed)
  - Trial and error currently — should be calculable from physics

### PRISM Opportunity:
This taper compensation should be **automatic**. We have ToolDeflectionPredictionEngine (Euler-Bernoulli δ=FL³/3EI) and other physics engines. The system should:
1. Calculate cutting force from Kienzle (kc1.1 × ap × f^(1-mc))
2. Model workpiece as cantilever beam (E, I from stock diameter, stickout length)
3. Compute deflection at each Z position along the hex
4. Auto-generate compensating taper (opposite sign to deflection) per flat
5. Output the correct X depth per Z position for each C-axis orientation

**Why:** This manual 0.001-0.003" compensation is tribal knowledge. Automating it with physics would be a signature PRISM capability — the kind of thing that makes a machinist say "this thing actually knows what it's doing."
