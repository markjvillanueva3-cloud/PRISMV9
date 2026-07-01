import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for sinker-EDM

# Dimensions in inches, converted to mm
cube_size_in = 1.0
hole_diameter_in = 0.25

cube_size = cube_size_in * IN
hole_diameter = hole_diameter_in * IN - SPARK_GAP

# Create the cube and the hole
result = (cq.Workplane("XY")
          .rect(cube_size, cube_size)
          .extrude(cube_size)
          .faces(">Z").workplane(centerOption="CenterOfMass", originOffset=cube_size/2)
          .hole(hole_diameter))

# Export to STEP
output_step = os.getenv('OUTPUT_STEP', 'out.step')
cq.exporters.export(result, output_step)