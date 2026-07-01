import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 145.22
width_mm = 15.88
height_mm = 15.77

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length_mm, width_mm)
          .extrude(height_mm))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)