import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_diameter_in = 1.0
inner_diameter_in = 0.75
height_in = 0.375

# Convert dimensions to millimeters
outer_diameter_mm = outer_diameter_in * IN
inner_diameter_mm = inner_diameter_in * IN
height_mm = height_in * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize_mm = 0.003 * IN / 2

# Create the spacer ring
result = (
    cq.Workplane("XY")
    .circle((outer_diameter_mm - undersize_mm) / 2)
    .cut(
        cq.Workplane("XY")
        .circle((inner_diameter_mm + undersize_mm) / 2)
    )
    .extrude(height_mm)
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)