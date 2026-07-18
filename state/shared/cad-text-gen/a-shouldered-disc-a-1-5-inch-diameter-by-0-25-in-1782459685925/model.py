import cadquery as cq
import os

# Conversion constant from inches to mm
IN = 25.4

# Dimensions in inches, converted to mm
base_diameter = 1.5 * IN
base_thickness = 0.25 * IN
boss_diameter = 0.75 * IN
boss_height = 0.375 * IN

# Sinker-EDM spark gap (0.003 inch total, 0.0015 inch per side)
spark_gap = 0.003 * IN / 2

# Create the base disc
result = cq.Workplane("XY") \
    .circle(base_diameter / 2) \
    .extrude(base_thickness)

# Create the boss with spark gap undersize
boss = cq.Workplane("XY") \
    .circle((boss_diameter - spark_gap * 2) / 2) \
    .extrude(boss_height)

# Position and combine the boss on top of the base
result = result.union(
    boss.translate((0, 0, base_thickness))
)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)