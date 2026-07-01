import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
head_diameter = (1 - SPARK_GAP / head_diameter) * IN
head_height = 0.25 * IN
body_diameter = (0.625 - SPARK_GAP / body_diameter) * IN
total_height = 1.25 * IN

# Calculate the height of the body
body_height = total_height - head_height

# Create the die button
result = (
    cq.Workplane("XY")
    .circle(head_diameter / 2)
    .extrude(head_height)
    .faces("<Z")
    .workplane()
    .circle(body_diameter / 2)
    .extrude(body_height)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)