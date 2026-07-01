import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
cube_size_in = 1.5
cube_size_mm = cube_size_in * IN

result = (cq.Workplane("XY")
          .rect(cube_size_mm, cube_size_mm)
          .extrude(cube_size_mm))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)