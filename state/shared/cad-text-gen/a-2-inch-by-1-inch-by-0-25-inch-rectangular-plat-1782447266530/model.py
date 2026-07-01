import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
length = 2 * IN
width = 1 * IN
thickness = 0.25 * IN

result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(thickness))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)