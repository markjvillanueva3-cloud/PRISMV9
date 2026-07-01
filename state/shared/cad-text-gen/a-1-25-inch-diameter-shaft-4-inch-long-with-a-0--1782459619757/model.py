import cadquery as cq
import os

# Conversion constant
IN = 25.4

# Dimensions in inches, converted to mm
shaft_diameter = 1.25 * IN
shaft_length = 4 * IN
groove_width = 0.1875 * IN
groove_depth = 0.0938 * IN
groove_position = 0.75 * IN

# Spark gap for sinker-EDM electrode
spark_gap = 0.003 * IN

# Create the shaft
result = (cq.Workplane("XY")
          .circle(shaft_diameter / 2 - spark_gap)
          .extrude(shaft_length))

# Create the groove
groove = (cq.Workplane("XY", origin=(0, 0, groove_position))
          .rect(groove_width - spark_gap * 2, shaft_diameter - spark_gap * 2)
          .cutThruAll()
          .workplane(offset=groove_depth - spark_gap)
          .rect(groove_width - spark_gap * 2 + 0.01 * IN, shaft_diameter - spark_gap * 2 + 0.01 * IN)
          .cutBlind(-groove_depth + spark_gap))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)