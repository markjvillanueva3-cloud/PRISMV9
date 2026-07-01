import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SHAFT_DIAMETER = 1.0 * IN  # inches to mm
SHAFT_LENGTH = 4.0 * IN  # inches to mm
KEYWAY_WIDTH = 0.125 * IN  # inches to mm
KEYWAY_DEPTH = 0.0625 * IN  # inches to mm

# Sinker-EDM spark gap undersize
SPARK_GAP = 0.003 * IN  # total spark gap in inches
UNDERSIZE = SPARK_GAP / 2  # undersize per side in inches
KEYWAY_WIDTH -= UNDERSIZE * 2  # adjust keyway width for spark gap

# Create the shaft
result = (cq.Workplane("XY")
          .circle(SHAFT_DIAMETER / 2)
          .extrude(SHAFT_LENGTH))

# Create the keyway
keyway = (cq.Workplane("YZ", origin=(0, SHAFT_DIAMETER / 2 - KEYWAY_WIDTH / 2, 0))
          .rect(KEYWAY_DEPTH, SHAFT_LENGTH)
          .extrude(-KEYWAY_WIDTH))

# Cut the keyway into the shaft
result = result.cut(keyway)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)