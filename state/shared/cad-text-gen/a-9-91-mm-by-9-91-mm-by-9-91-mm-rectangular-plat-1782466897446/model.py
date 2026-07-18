import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
plate_length_mm = 9.91
plate_width_mm = 9.91
plate_height_mm = 9.91

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(plate_length_mm, plate_width_mm)
          .extrude(plate_height_mm))

# Export the result to STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)