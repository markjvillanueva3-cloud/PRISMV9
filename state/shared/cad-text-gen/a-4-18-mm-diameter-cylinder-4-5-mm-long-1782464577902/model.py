import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
diameter = 4.18
length = 4.5

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter / 2)
          .extrude(length))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)