import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
cube_size_in = 1.5
hole_diameter_in = 0.375

cube_size = cube_size_in * IN
hole_diameter = (hole_diameter_in - SPARK_GAP) * IN

# Create the cube and the hole
result = (
    cq.Workplane("XY")
    .rect(cube_size, cube_size)
    .extrude(cube_size)
    .faces(">Z")
    .workplane()
    .circle(hole_diameter / 2)
    .cutThruAll()
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)