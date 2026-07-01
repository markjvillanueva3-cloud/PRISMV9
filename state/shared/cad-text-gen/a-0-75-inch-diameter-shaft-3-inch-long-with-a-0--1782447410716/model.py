import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SHAFT_DIAMETER = 0.75 * IN  # 0.75 inch diameter
SHAFT_LENGTH = 3 * IN  # 3 inch length
KEYWAY_WIDTH = 0.125 * IN  # 0.125 inch width
KEYWAY_DEPTH = 0.0625 * IN  # 0.0625 inch depth

# Spark gap for sinker-EDM electrode
SPARK_GAP = 0.003 * IN  # 0.003 inch total spark gap (0.0015/inch per side)
ELECTRODE_SHAFT_DIAMETER = SHAFT_DIAMETER - SPARK_GAP
ELECTRODE_KEYWAY_WIDTH = KEYWAY_WIDTH + SPARK_GAP

# Create the shaft
result = (
    cq.Workplane("XY")
    .circle(ELECTRODE_SHAFT_DIAMETER / 2)
    .extrude(SHAFT_LENGTH)
)

# Create the keyway
keyway = (
    cq.Workplane("YZ")
    .center(-SHAFT_LENGTH / 2, 0)  # Start from one end of the shaft
    .rect(ELECTRODE_KEYWAY_WIDTH, KEYWAY_DEPTH)
    .extrude(SHAFT_LENGTH)
)

# Cut the keyway into the shaft
result = result.cut(keyway)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)