import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4

# Dimensions in inches, converted to mm
diameter_mm = 25.1
length_mm = 12.19

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_mm / 2)
          .extrude(length_mm))

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)