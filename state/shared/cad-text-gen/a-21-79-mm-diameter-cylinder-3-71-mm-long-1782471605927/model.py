import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
cylinder_diameter = 21.79
cylinder_length = 3.71

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(cylinder_diameter / 2)
          .extrude(cylinder_length))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)