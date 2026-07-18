import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
cube_size_in = 2.0
v_groove_depth_in = 0.75
v_groove_width_in = cube_size_in

# Convert dimensions to mm
cube_size = cube_size_in * IN
v_groove_depth = v_groove_depth_in * IN
v_groove_width = v_groove_width_in * IN - SPARK_GAP  # undersize for EDM spark gap

# Create the v-block
result = (
    cq.Workplane("XY")
    .rect(cube_size, cube_size)
    .extrude(cube_size)
    .faces(">Z")
    .workplane()
    .center(0, 0)
    .polyline([(v_groove_width / 2, 0), (0, -v_groove_depth), (-v_groove_width / 2, 0)])
    .close()
    .cutThruAll()
)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)