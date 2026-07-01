import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = -0.003 * IN  # Total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
diameter = (1.5 + SPARK_GAP / 2) * IN
height = 2 * IN

# Create the cylinder
result = (cq.Workplane("XY")
          .circle(diameter / 2)
          .extrude(height))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)