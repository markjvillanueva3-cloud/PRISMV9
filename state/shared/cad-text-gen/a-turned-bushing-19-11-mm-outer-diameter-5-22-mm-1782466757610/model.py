import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_diameter_in = 19.11 / IN
bore_diameter_in = 5.22 / IN
length_in = 23.39 / IN

# Convert dimensions to millimeters
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2 - undersize / 2)
    .extrude(length)
    .cut(
        cq.Workplane("XY", origin=(0, 0, length / 2))
        .circle(bore_diameter / 2 + undersize / 2)
        .extrude(-length)
    )
)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)