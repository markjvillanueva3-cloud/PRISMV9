import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
diameter_small_in = 0.75
length_small_in = 1.5
diameter_large_in = 1.0
length_large_in = 0.75

# Convert dimensions to millimeters
diameter_small_mm = diameter_small_in * IN
length_small_mm = length_small_in * IN
diameter_large_mm = diameter_large_in * IN
length_large_mm = length_large_in * IN

# Spark gap for sinker-EDM electrode (0.003 inch total, 0.0015 per side)
spark_gap_per_side_mm = 0.0015 * IN

# Create the stepped shaft
result = (
    cq.Workplane("XY")
    .circle((diameter_large_mm - spark_gap_per_side_mm) / 2)
    .extrude(length_large_mm)
    .faces("<Z")
    .workplane()
    .circle((diameter_small_mm - spark_gap_per_side_mm) / 2)
    .extrude(length_small_mm)
)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)