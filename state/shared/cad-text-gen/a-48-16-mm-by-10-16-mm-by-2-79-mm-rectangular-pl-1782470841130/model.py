import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to millimeters
length_mm = 48.16 / IN
width_mm = 10.16 / IN
height_mm = 2.79 / IN

# Spark gap for sinker-EDM electrode (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side_mm = 0.0015 * IN

# Adjust dimensions for spark gap
length_adjusted_mm = length_mm - 2 * spark_gap_per_side_mm
width_adjusted_mm = width_mm - 2 * spark_gap_per_side_mm
height_adjusted_mm = height_mm - 2 * spark_gap_per_side_mm

result = (cq.Workplane("XY")
          .rect(length_adjusted_mm, width_adjusted_mm)
          .extrude(height_adjusted_mm))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)