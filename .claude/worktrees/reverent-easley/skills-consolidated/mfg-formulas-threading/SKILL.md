---
name: mfg-formulas-threading
description: Thread geometry and calculation formulas for UN, Metric, and specialty threads
---

# Thread Geometry & Calculation Formulas

## When To Use
- Need thread dimension calculations (pitch diameter, minor diameter, tap drill)
- Thread engagement percentage and pull-out strength
- Thread profile geometry for UN, Metric ISO, ACME, Buttress threads
- Go/No-Go gauge dimensions and tolerance classes
- NOT for thread milling parameters — use mfg-thread-mill
- NOT for G-code generation — use mfg-thread-gcode

## How To Use
```
prism_thread action=get_thread_specifications params={
  thread: "M10x1.5",
  class: "6H/6g"
}
prism_thread action=calculate_pitch_diameter params={
  thread: "M10x1.5"
}
prism_thread action=calculate_tap_drill params={
  thread: "M10x1.5",
  engagement_percent: 75
}
```

## What It Returns
- `formulas`: ~25 formulas covering pitch diameter, minor/major, engagement, strength
- `pitch_diameter`: d2 = d - 0.6495 * P (metric), d2 = d - 0.6495/TPI (UN)
- `tap_drill`: Drill size for desired thread engagement percentage
- `engagement_percent`: % = (tap_drill - minor_dia) / (pitch_dia - minor_dia) * 100
- `gauge_limits`: Go/No-Go plug and ring gauge dimensions

## Examples
- **M10x1.5 pitch diameter**: d2 = 10 - 0.6495*1.5 = 9.026mm
- **75% engagement tap drill**: M10x1.5 needs 8.5mm drill
- **1/2-13 UNC minor diameter**: 0.4056 inches
- **Thread strength**: Stripping area = pi * n * Le * Dp * (1/(2n) + 0.57735*(Dp_min - En_max))
