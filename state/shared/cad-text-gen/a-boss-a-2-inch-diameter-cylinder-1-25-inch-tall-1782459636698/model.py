import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
boss_diameter = 2 * IN
boss_height = 1.25 * IN
bore_diameter = 0.625 * IN
counterbore_diameter = 1 * IN
counterbore_depth = 0.5 * IN

# Sinker EDM undersize (0.003 inch total spark gap, 0.0015 inch per side)
undersize = 0.0015 * IN

# Create the boss cylinder
result = (
    cq.Workplane("XY")
    .circle((boss_diameter - undersize) / 2)
    .extrude(boss_height)
)

# Create the bore hole
bore_hole = (
    cq.Workplane("XY", origin=(0, 0, (boss_height - counterbore_depth)))
    .circle((bore_diameter - undersize) / 2)
    .extrude(counterbore_depth)
)

# Create the counterbore
counterbore = (
    cq.Workplane("XY", origin=(0, 0, boss_height - counterbore_depth))
    .circle((counterbore_diameter - undersize) / 2)
    .extrude(counterbore_depth)
)

# Cut out the bore and counterbore from the boss
result = result.cut(bore_hole).cut(counterbore)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)