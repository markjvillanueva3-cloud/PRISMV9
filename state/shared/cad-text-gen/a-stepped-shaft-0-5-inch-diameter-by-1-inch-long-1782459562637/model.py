import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
diameter1 = (0.5 - SPARK_GAP / 2) * IN
diameter2 = (0.75 - SPARK_GAP / 2) * IN
length1 = 1 * IN
length2 = 0.5 * IN

# Create the stepped shaft
result = (
    cq.Workplane("XY")
    .circle(diameter1 / 2)
    .extrude(length1)
    .faces(">Z")
    .workplane()
    .circle(diameter2 / 2)
    .extrude(length2)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)