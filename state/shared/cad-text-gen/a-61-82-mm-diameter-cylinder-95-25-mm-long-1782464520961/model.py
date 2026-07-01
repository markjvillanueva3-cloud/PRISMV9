import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4

# Dimensions in inches, converted to mm
diameter_in = 61.82 / IN
length_in = 95.25 / IN

# Convert to mm
diameter_mm = diameter_in * IN
length_mm = length_in * IN

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_mm / 2)
          .extrude(length_mm))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)