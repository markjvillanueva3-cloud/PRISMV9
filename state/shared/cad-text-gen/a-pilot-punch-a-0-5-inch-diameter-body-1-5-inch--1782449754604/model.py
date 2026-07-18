import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
body_diameter = 0.5 * IN
body_length = 1.5 * IN
pilot_tip_diameter = 0.25 * IN
pilot_tip_length = 0.375 * IN

# Undersize for sinker-EDM electrode (0.003 inch total spark gap)
spark_gap = 0.003 * IN
body_diameter -= spark_gap
pilot_tip_diameter -= spark_gap

# Create the body of the pilot punch
result = cq.Workplane("XY") \
    .circle(body_diameter / 2) \
    .extrude(body_length - pilot_tip_length)

# Create the pilot tip and combine with the body
pilot_tip = cq.Workplane("XY", origin=(0, 0, body_length - pilot_tip_length)) \
    .circle(pilot_tip_diameter / 2) \
    .extrude(pilot_tip_length)

result = result.union(pilot_tip)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)