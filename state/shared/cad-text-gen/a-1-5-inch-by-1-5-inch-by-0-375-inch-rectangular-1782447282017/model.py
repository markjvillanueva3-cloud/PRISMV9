import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
length = 1.5 * IN
width = 1.5 * IN
height = 0.375 * IN

result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(height))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)