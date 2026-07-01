import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
base_diameter = 2 * IN
base_thickness = 0.375 * IN
boss_diameter = 1 * IN
boss_height = 0.5 * IN

# Sinker-EDM spark gap offset (0.003 inch total, 0.0015 inch per side)
spark_gap_offset = 0.0015 * IN

# Create the base of the disc
result = (
    cq.Workplane("XY")
    .circle(base_diameter / 2 - spark_gap_offset)
    .extrude(base_thickness)
)

# Create the boss on top of the disc
boss = (
    cq.Workplane("XY", origin=(0, 0, base_thickness))
    .circle(boss_diameter / 2 - spark_gap_offset)
    .extrude(boss_height)
)

# Union the base and the boss to form the final shape
result = result.union(boss)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)