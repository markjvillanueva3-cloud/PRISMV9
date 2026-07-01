import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
cube_size = 1 * IN
groove_depth = 0.375 * IN
groove_width = cube_size - SPARK_GAP  # Undersize for EDM spark gap

# Create the v-block
result = (
    cq.Workplane("XY")
    .rect(cube_size, cube_size)
    .extrude(cube_size)
    .faces(">Z")
    .workplane()
    .center(0, 0)
    .lineTo(groove_width / 2, -groove_depth)
    .mirrorY()
    .close()
    .cutBlind(-cube_size)
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)