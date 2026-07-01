import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch conversion factor
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM

# Dimensions in inches, converted to mm
HEAD_DIAMETER = (0.75 - SPARK_GAP) * IN
BODY_DIAMETER = (0.5 - SPARK_GAP) * IN
HEAD_HEIGHT = 0.25 * IN
BODY_HEIGHT = (1.0 - HEAD_HEIGHT) * IN

# Create the die button
result = (
    cq.Workplane("XY")
    .circle(HEAD_DIAMETER / 2)
    .extrude(HEAD_HEIGHT)
    .faces("<Z")
    .workplane()
    .circle(BODY_DIAMETER / 2)
    .extrude(BODY_HEIGHT)
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)