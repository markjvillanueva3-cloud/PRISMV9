import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
length = 3 * IN
width = 2 * IN
height = 0.5 * IN

result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(height))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)