import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 2.95
width_mm = 2.92
height_mm = 2.6

# Spark gap for sinker-EDM electrode (0.003 total, 0.0015 per side)
spark_gap_per_side_mm = 0.0015 * IN

# Adjust dimensions for spark gap
length_adjusted_mm = length_mm - 2 * spark_gap_per_side_mm
width_adjusted_mm = width_mm - 2 * spark_gap_per_side_mm
height_adjusted_mm = height_mm - 2 * spark_gap_per_side_mm

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length_adjusted_mm, width_adjusted_mm)
          .extrude(height_adjusted_mm))

# Export to STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)