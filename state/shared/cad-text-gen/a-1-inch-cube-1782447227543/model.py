import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
cube_size_in_inches = 1
cube_size = cube_size_in_inches * IN

result = (cq.Workplane("XY")
          .rect(cube_size, cube_size)
          .extrude(cube_size))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)