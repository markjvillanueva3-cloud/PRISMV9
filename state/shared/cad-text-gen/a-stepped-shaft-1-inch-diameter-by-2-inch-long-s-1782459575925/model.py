import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
diameter1 = (1 - SPARK_GAP / 2) * IN  # undersized by spark gap
length1 = 2 * IN
diameter2 = (1.5 - SPARK_GAP / 2) * IN  # undersized by spark gap
length2 = 1 * IN

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
exporters.export(result, OUTPUT_STEP)