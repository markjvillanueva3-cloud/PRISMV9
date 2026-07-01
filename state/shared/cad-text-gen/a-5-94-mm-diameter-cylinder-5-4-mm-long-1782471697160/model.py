import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4

# Dimensions in inches, converted to mm
diameter_mm = 5.94
length_mm = 5.4

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_mm / 2)
          .extrude(length_mm))

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)