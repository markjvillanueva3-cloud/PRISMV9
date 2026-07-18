import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
length = (2.0 - SPARK_GAP) * IN
width = (1.0 - SPARK_GAP) * IN
height = 0.5 * IN

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(height))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)