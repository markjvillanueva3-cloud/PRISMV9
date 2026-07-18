import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
outer_square_size = (1 - SPARK_GAP) * IN
inner_square_size = (1 - 2 * 0.1875) * IN
length = 2 * IN

# Create the outer square tube
result = (
    cq.Workplane("XY")
    .rect(outer_square_size, outer_square_size)
    .extrude(length)
)

# Create the inner square to cut out
inner_square = (
    cq.Workplane("XY", origin=(0, 0, length / 2))
    .rect(inner_square_size, inner_square_size)
    .extrude(-length)
)

# Cut out the inner square from the outer tube
result = result.cut(inner_square)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)