import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 82.55
width_mm = 31.42
height_mm = 19.05

# Output file path
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length_mm, width_mm)
          .extrude(height_mm))

# Export the result as a STEP file
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)