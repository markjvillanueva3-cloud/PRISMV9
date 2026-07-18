import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4

# Dimensions in inches, converted to mm
diameter_in = 18.63 / IN
length_in = 3.58 / IN

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_in)
          .extrude(length_in))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)