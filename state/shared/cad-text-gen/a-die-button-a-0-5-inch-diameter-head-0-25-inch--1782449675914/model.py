import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
HEAD_DIAMETER = (0.5 - SPARK_GAP / 2) * IN
HEAD_HEIGHT = 0.25 * IN
BODY_DIAMETER = (0.375 - SPARK_GAP / 2) * IN
BODY_HEIGHT = (0.75 - HEAD_HEIGHT) * IN

# Create the head of the die button
head = (
    cq.Workplane("XY")
    .circle(HEAD_DIAMETER / 2)
    .extrude(HEAD_HEIGHT)
)

# Create the body of the die button
body = (
    cq.Workplane("XY")
    .circle(BODY_DIAMETER / 2)
    .extrude(BODY_HEIGHT)
)

# Combine head and body
result = (
    head.union(body.translate((0, 0, HEAD_HEIGHT)))
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)