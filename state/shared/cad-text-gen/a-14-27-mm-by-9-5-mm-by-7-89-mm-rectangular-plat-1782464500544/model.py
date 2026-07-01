import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 14.27
width_mm = 9.5
height_mm = 7.89

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length_mm, width_mm)
          .extrude(height_mm))

# Export the result to STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)