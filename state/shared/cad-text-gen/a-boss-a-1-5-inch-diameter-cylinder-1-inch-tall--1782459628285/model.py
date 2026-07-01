import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Parametric dimensions in inches
boss_diameter = 1.5 * IN
boss_height = 1 * IN
bore_diameter = 0.5 * IN
counterbore_diameter = 0.75 * IN
counterbore_depth = 0.375 * IN

# Sinker-EDM undersize for burning surfaces (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the boss cylinder with undersized dimensions
result = (
    cq.Workplane("XY")
    .circle((boss_diameter - undersize) / 2)
    .extrude(boss_height)
)

# Create the bore hole with undersized dimensions
bore_hole = (
    cq.Workplane("XY", origin=(0, 0, (boss_height - counterbore_depth) / 2))
    .circle((bore_diameter - undersize) / 2)
    .extrude(counterbore_depth)
)

# Create the counterbore with undersized dimensions
counterbore = (
    cq.Workplane("XY", origin=(0, 0, (boss_height - counterbore_depth)))
    .circle((counterbore_diameter - undersize) / 2)
    .extrude(counterbore_depth)
)

# Cut the bore hole and counterbore from the boss
result = result.cut(bore_hole).cut(counterbore)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)