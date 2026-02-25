---
name: Inverse Chatter Solver
description: Given chatter symptoms, find stable speed and depth combinations
---

## When To Use
- Chatter marks are visible on the workpiece surface
- Audible vibration or squealing during cutting
- You need to find a stable pocket (speed/depth combination) to eliminate chatter
- Tool life is poor due to suspected regenerative chatter

## How To Use
```
prism_intelligence action=inverse_chatter params={
  symptom: "visible chatter marks at 1.2mm spacing",
  current_speed: 3000,
  current_depth: 3.0,
  tool_diameter: 20,
  flutes: 4,
  overhang: 80,
  material: "Ti-6Al-4V"
}
```

## What It Returns
- Estimated chatter frequency from symptom analysis
- Stability lobe diagram data showing stable/unstable zones
- Recommended speed and depth combinations in nearest stable pockets
- Ranked alternatives from most productive to most conservative

## Examples
- Input: `inverse_chatter params={ symptom: "squeal at 2800 RPM, 2mm depth", tool_diameter: 12, flutes: 3, material: "4140" }`
- Output: Chatter at 4.2 kHz; stable pockets at 2650 RPM/2.5mm or 3100 RPM/1.8mm depth

- Input: `inverse_chatter params={ symptom: "surface waviness 0.8mm pitch on bore", current_speed: 800, tool_diameter: 32 }`
- Output: Regenerative chatter at 1.67 kHz; increase speed to 920 RPM or reduce depth by 30%
