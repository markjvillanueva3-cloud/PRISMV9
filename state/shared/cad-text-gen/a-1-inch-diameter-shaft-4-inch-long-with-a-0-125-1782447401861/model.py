import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
shaft_diameter = 1 * IN
shaft_length = 4 * IN
keyway_width = 0.125 * IN - SPARK_GAP / 2
keyway_height = 0.0625 * IN - SPARK_GAP / 2

# Create the shaft
result = (cq.Workplane("XY")
          .circle(shaft_diameter / 2)
          .extrude(shaft_length))

# Create the keyway
keyway = (cq.Workplane("XY")
          .rect(keyway_width, keyway_height)
          .extrude(shaft_length))

# Position and cut the keyway into the shaft
result = result.cut(keyway.translate((0, shaft_diameter / 4, 0)))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)