import cadquery as cq

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
cube_size_in = 2.0
v_groove_depth_in = 0.75

cube_size = cube_size_in * IN - SPARK_GAP
v_groove_depth = v_groove_depth_in * IN

# Create the cube
result = (cq.Workplane("XY")
          .rect(cube_size, cube_size)
          .extrude(cube_size))

# Create the V-groove
vgroove_width = cube_size / 2 - SPARK_GAP
vgroove_height = v_groove_depth

v_groove = (cq.Workplane("XY")
            .center(0, cube_size / 2)
            .lineTo(vgroove_width, cube_size / 2 - vgroove_height)
            .lineTo(-vgroove_width, cube_size / 2 - vgroove_height)
            .close()
            .extrude(cube_size))

# Cut the V-groove into the cube
result = result.cut(v_groove)

# Export to STEP
import os
output_step = os.getenv('OUTPUT_STEP', 'out.step')
cq.exporters.export(result, output_step)