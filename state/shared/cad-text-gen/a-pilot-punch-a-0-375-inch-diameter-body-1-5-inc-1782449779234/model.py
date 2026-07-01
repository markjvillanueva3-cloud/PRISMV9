import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
body_diameter = 0.375 * IN
body_length = 1.5 * IN
pilot_diameter = 0.1875 * IN
pilot_length = 0.25 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN / 2

# Create the body of the pilot punch
result = (
    cq.Workplane("XY")
    .circle(body_diameter / 2 - undersize)
    .extrude(body_length - pilot_length)
)

# Create the pilot tip and union with the body
pilot_tip = (
    cq.Workplane("XY", origin=(0, 0, body_length - pilot_length))
    .circle(pilot_diameter / 2 - undersize)
    .extrude(pilot_length)
)

result = result.union(pilot_tip)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)