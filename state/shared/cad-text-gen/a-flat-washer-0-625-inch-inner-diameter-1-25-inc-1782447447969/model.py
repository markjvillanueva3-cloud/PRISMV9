import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
inner_diameter_in = 0.625
outer_diameter_in = 1.25
thickness_in = 0.125

# Convert dimensions to millimeters
inner_diameter_mm = inner_diameter_in * IN
outer_diameter_mm = outer_diameter_in * IN
thickness_mm = thickness_in * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize_mm = 0.003 * IN / 2

# Create the washer
result = (
    cq.Workplane("XY")
    .circle(outer_diameter_mm / 2 - undersize_mm)
    .cut(cq.Workplane("XY").circle(inner_diameter_mm / 2 + undersize_mm))
    .extrude(thickness_mm)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)