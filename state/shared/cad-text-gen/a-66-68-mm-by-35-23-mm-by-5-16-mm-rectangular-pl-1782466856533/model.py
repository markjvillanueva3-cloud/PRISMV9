import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
length = 66.68 / IN
width = 35.23 / IN
height = 5.16 / IN

result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(height))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)