import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
shaft_diameter = 1.0 * IN
shaft_length = 4.0 * IN
keyway_width = 0.125 * IN
keyway_height = 0.0625 * IN

# Undersize for EDM spark gap
undersized_shaft_diameter = shaft_diameter - SPARK_GAP
undersized_keyway_width = keyway_width - SPARK_GAP
undersized_keyway_height = keyway_height - SPARK_GAP

# Create the shaft
result = (cq.Workplane("XY")
          .circle(undersized_shaft_diameter / 2)
          .extrude(shaft_length))

# Create the keyway and cut it into the shaft
keyway = (cq.Workplane("YZ", origin=(0, -shaft_diameter / 4, 0))
          .rect(undersized_keyway_height, undersized_keyway_width)
          .extrude(shaft_length))

result = result.cut(keyway)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)