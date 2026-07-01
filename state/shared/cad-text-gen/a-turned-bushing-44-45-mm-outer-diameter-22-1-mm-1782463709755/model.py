import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4

# Dimensions in inches
outer_diameter_in = 44.45 / IN
bore_diameter_in = 22.1 / IN
length_in = 6.35 / IN

# Convert to mm
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2 - undersize)
    .extrude(length)
    .cut(
        cq.Workplane("XY")
        .circle(bore_diameter / 2 + undersize)
        .extrude(length)
    )
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)