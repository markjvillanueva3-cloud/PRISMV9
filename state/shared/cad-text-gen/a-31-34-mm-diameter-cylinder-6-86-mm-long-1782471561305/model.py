import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
diameter = 31.34
length = 6.86

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter / 2)
          .extrude(length))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)