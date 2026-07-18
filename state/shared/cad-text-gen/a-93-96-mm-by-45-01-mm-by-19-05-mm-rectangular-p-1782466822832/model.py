import cadquery as cq
import os

IN = 25.4

# Dimensions in inches, converted to mm
length_mm = 93.96 / IN
width_mm = 45.01 / IN
height_mm = 19.05 / IN

result = (cq.Workplane("XY")
          .rect(length_mm, width_mm)
          .extrude(height_mm))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)