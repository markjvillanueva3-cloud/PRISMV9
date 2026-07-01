import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_diameter_in = 1.0
bore_diameter_in = 0.5
length_in = 1.25

# Convert dimensions to millimeters
outer_diameter_mm = outer_diameter_in * IN
bore_diameter_mm = bore_diameter_in * IN
length_mm = length_in * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize_mm = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter_mm / 2 - undersize_mm)
    .extrude(length_mm)
    .cut(
        cq.Workplane("XY", origin=(0, 0, length_mm / 2))
        .circle(bore_diameter_mm / 2 + undersize_mm)
        .extrude(-length_mm)
    )
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)