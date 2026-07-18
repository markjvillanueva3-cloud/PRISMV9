import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 20.4
width_mm = 20.19
height_mm = 14.56

# Spark gap for sinker-EDM electrode (undersize by 0.003 mm per side)
spark_gap_mm = 0.003 * IN

# Adjust dimensions for spark gap
length_adjusted = length_mm - spark_gap_mm
width_adjusted = width_mm - spark_gap_mm
height_adjusted = height_mm - spark_gap_mm

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length_adjusted, width_adjusted)
          .extrude(height_adjusted))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)