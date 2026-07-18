import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
body_diameter = 0.625 * IN
body_length = 1.5 * IN
pilot_diameter = 0.3125 * IN
pilot_length = 0.5 * IN

# Spark gap undersize for sinker-EDM electrode
spark_gap = 0.003 * IN

# Create the body of the pilot punch
body = (
    cq.Workplane("XY")
    .circle(body_diameter / 2 - spark_gap)
    .extrude(body_length - pilot_length)
)

# Create the pilot tip of the pilot punch
pilot_tip = (
    cq.Workplane("XY", origin=(0, 0, body_length - pilot_length))
    .circle(pilot_diameter / 2 - spark_gap)
    .extrude(pilot_length)
)

# Combine the body and the pilot tip
result = body.union(pilot_tip)

# Export to STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)