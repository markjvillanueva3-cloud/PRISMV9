---
name: mfg-thread-mill
description: Calculate helical interpolation parameters for thread milling operations
---

## When To Use
- Programming thread milling with helical interpolation
- Need entry arc, pitch, and pass count for thread mill cutter
- Single-point or multi-form thread milling parameter calculation
- NOT for rigid tapping parameters (use mfg-thread-gcode)
- NOT for tap drill sizing (use mfg-tap-drill)

## How To Use
### Multi-Form Thread Mill Parameters
```
prism_thread action=calculate_thread_mill_params params={
  thread: "M12x1.75",
  tool_diameter: 8,
  single_point: false
}
```

### Single-Point Thread Mill
```
prism_thread action=calculate_thread_mill_params params={
  thread: "M20x2.5",
  tool_diameter: 16,
  single_point: true,
  climb_milling: true
}
```

### Large Bore Internal Thread Mill
```
prism_thread action=calculate_thread_mill_params params={
  thread: "M48x3.0",
  tool_diameter: 25,
  single_point: false,
  internal: true
}
```

## What It Returns
```json
{
  "thread": "M12x1.75",
  "tool_diameter": 8,
  "single_point": false,
  "helical_diameter": 10.863,
  "pitch_mm": 1.75,
  "entry_arc_radius": 1.432,
  "number_of_passes": 1,
  "total_helical_rotations": 3.5,
  "z_per_revolution": 1.75,
  "direction": "climb",
  "cutter_compensation": "G41",
  "entry_method": "arc_entry",
  "notes": "Multi-form cutter covers full thread depth in single pass"
}
```

## Examples
### Standard Internal Thread Mill
- Input: `prism_thread action=calculate_thread_mill_params params={thread: "M12x1.75", tool_diameter: 8, single_point: false}`
- Output: Helical diameter 10.863mm, single pass with multi-form cutter, arc entry
- Edge case: Tool diameter must be less than minor diameter minus clearance

### Single-Point for Large Thread
- Input: `prism_thread action=calculate_thread_mill_params params={thread: "M30x3.5", tool_diameter: 20, single_point: true}`
- Output: Multiple spring passes required, 3-4 radial passes at increasing depth
- Edge case: Single-point in hardened steel may need 6+ passes to control deflection

### Small Thread with Limited Clearance
- Input: `prism_thread action=calculate_thread_mill_params params={thread: "M6x1.0", tool_diameter: 4, single_point: false}`
- Output: Tight helical path, reduced feed on entry arc to prevent tool deflection
- Edge case: Below M6, thread milling becomes unreliable — consider form tapping instead
