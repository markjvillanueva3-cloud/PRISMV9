import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
length = (4 - SPARK_GAP) * IN
width = (3 - SPARK_GAP) * IN
thickness = 0.75 * IN

# Create the rectangular plate
result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(thickness))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)