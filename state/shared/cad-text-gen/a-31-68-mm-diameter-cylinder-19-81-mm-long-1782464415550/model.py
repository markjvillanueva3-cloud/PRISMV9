import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
diameter_in = 31.68 / IN
length_in = 19.81 / IN

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter_in)
          .extrude(length_in))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)