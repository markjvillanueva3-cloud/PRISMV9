import cadquery as cq
from cadquery import exporters
import os

IN = 25.4

# Dimensions in inches, converted to mm
cube_size = 1.0 * IN
hole_diameter = 0.25 * IN
spark_gap = 0.003 * IN
undersized_hole_diameter = hole_diameter - spark_gap

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')

result = (cq.Workplane("XY")
          .rect(cube_size, cube_size)
          .extrude(cube_size)
          .faces(">Z").workplane()
          .hole(undersized_hole_diameter))

exporters.export(result, OUTPUT_STEP)