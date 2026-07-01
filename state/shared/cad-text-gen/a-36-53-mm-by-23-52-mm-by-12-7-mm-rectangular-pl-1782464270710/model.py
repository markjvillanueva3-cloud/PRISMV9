import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
length_mm = 36.53 / IN
width_mm = 23.52 / IN
height_mm = 12.7 / IN

result = (cq.Workplane("XY")
          .rect(length_mm, width_mm)
          .extrude(height_mm))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)