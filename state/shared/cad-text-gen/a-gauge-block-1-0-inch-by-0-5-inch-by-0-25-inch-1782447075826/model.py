import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to millimeters
length = 1.0 * IN
width = 0.5 * IN
height = 0.25 * IN

# Spark gap for sinker-EDM electrode (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN

# Adjust dimensions for spark gap
length -= 2 * spark_gap_per_side
width -= 2 * spark_gap_per_side
height -= 2 * spark_gap_per_side

result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(height))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)