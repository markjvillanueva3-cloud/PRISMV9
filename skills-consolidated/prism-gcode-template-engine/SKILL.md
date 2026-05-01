# PRISM G-Code Template Engine

## Purpose
Generates controller-specific G-code for 6 CNC controller families across 13 operation types. Handles dialect differences (Fanuc G43 vs Siemens CYCLE800) automatically.

## Supported Controllers
Fanuc, Haas, Siemens (840D), Heidenhain (TNC), Mazak (Mazatrol), Okuma (OSP)

## Operations
Facing, pocketing, profiling, drilling, tapping, boring, threading, grooving, turning_rough, turning_finish, chamfering, slotting, helical_interpolation

## Actions (via prism_calc)
- `gcode_snippet` — Single operation G-code block
- `gcode_generate` — Full program with header, tool changes, safety blocks

## Usage
Provide controller type, operation, tool data, and cutting parameters. Engine generates idiomatic G-code with proper safety lines (G28, M05, M09), tool calls, and canned cycles.

## Key Parameters
- `controller` — "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma"
- `operation` — Operation type from list above
- `tool` — { number, offset, diameter_mm, description }
- `params` — { speed_rpm, feed_mmpm, depth_mm, stepover_mm }
- `options` — { coolant, work_offset, safe_z, retract_mode }
