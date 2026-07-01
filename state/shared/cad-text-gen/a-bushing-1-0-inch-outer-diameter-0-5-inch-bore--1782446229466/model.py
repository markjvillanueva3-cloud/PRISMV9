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

# Sinker-EDM undersize (0.003 inch total spark gap)
spark_gap_total = 0.003 * IN
undersize_per_side = spark_gap_total / 2

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter_mm / 2 - undersize_per_side)
    .extrude(length_mm)
    .cut(
        cq.Workplane("XY")
        .circle(bore_diameter_mm / 2 + undersize_per_side)
        .extrude(length_mm)
    )
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)