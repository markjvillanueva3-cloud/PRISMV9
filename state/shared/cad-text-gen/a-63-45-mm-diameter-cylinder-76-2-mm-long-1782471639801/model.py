import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to millimeters
diameter_mm = 63.45
length_mm = 76.2

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_mm / 2)
          .extrude(length_mm))

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)