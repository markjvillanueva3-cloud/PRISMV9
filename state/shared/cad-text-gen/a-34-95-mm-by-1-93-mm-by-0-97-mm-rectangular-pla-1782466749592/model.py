import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
length_mm = 34.95
width_mm = 1.93
height_mm = 0.97

# Spark gap for sinker-EDM electrode (undersize by 0.003 mm total)
spark_gap_mm = 0.003

# Undersized dimensions for EDM electrode
length_undersized_mm = length_mm - spark_gap_mm
width_undersized_mm = width_mm - spark_gap_mm
height_undersized_mm = height_mm - spark_gap_mm

result = (cq.Workplane("XY")
          .rect(length_undersized_mm, width_undersized_mm)
          .extrude(height_undersized_mm))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)