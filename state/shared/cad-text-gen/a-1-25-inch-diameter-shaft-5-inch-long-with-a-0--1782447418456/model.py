import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
shaft_diameter = 1.25 * IN
shaft_length = 5 * IN
keyway_width = 0.125 * IN - SPARK_GAP / 2  # Undersize by half the spark gap per side
keyway_height = 0.0625 * IN - SPARK_GAP / 2  # Undersize by half the spark gap per side

# Create the shaft
result = (cq.Workplane("XY")
          .circle(shaft_diameter / 2)
          .extrude(shaft_length))

# Create the keyway
keyway = (cq.Workplane("YZ")
          .rect(keyway_width, keyway_height)
          .extrude(shaft_length)
          .translate((0, shaft_diameter / 4, 0)))

# Cut the keyway into the shaft
result = result.cut(keyway)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)