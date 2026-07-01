import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
diameter_mm = 15.46
length_mm = 28.6

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_mm / 2)
          .extrude(length_mm))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)