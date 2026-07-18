import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 203.2
width_mm = 69.85
height_mm = 48.39

# Convert dimensions to inches for spark gap adjustment
length_in = length_mm / IN
width_in = width_mm / IN
height_in = height_mm / IN

# Spark gap adjustment (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN

# Adjusted dimensions for sinker-EDM electrode
adjusted_length_mm = length_mm - 2 * spark_gap_per_side
adjusted_width_mm = width_mm - 2 * spark_gap_per_side
adjusted_height_mm = height_mm - 2 * spark_gap_per_side

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(adjusted_length_mm, adjusted_width_mm)
          .extrude(adjusted_height_mm))

# Export to STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)