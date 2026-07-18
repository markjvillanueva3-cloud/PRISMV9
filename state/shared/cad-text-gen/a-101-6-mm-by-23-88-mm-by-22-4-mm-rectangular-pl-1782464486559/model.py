import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to millimeters
length_mm = 101.6 / IN
width_mm = 23.88 / IN
height_mm = 22.4 / IN

# Spark gap for sinker-EDM electrode (0.003 total spark gap, 0.0015 per side)
spark_gap_per_side = 0.0015 * IN

# Adjust dimensions for spark gap
length_adjusted = length_mm - 2 * spark_gap_per_side
width_adjusted = width_mm - 2 * spark_gap_per_side
height_adjusted = height_mm - 2 * spark_gap_per_side

result = (cq.Workplane("XY")
          .rect(length_adjusted, width_adjusted)
          .extrude(height_adjusted))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)