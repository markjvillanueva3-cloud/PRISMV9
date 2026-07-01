import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to millimeters
length_mm = 69.98 / IN
width_mm = 57.35 / IN
height_mm = 16.05 / IN

# Spark gap for sinker-EDM electrode (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN

# Adjust dimensions for spark gap
length_mm -= 2 * spark_gap_per_side
width_mm -= 2 * spark_gap_per_side
height_mm -= 2 * spark_gap_per_side

result = (cq.Workplane("XY")
          .rect(length_mm, width_mm)
          .extrude(height_mm))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)