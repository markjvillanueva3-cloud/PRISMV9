import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
shaft_diameter = 1 * IN
shaft_length = 3 * IN
groove_width = 0.125 * IN
groove_depth = 0.0625 * IN
groove_position = 0.5 * IN

# Adjusting for spark gap (undersizing the groove)
adjusted_groove_width = groove_width - SPARK_GAP
adjusted_groove_depth = groove_depth - SPARK_GAP

# Create the shaft
result = cq.Workplane("XY") \
    .circle(shaft_diameter / 2) \
    .extrude(shaft_length)

# Create the groove
groove = cq.Workplane("XY") \
    .center(0, (shaft_diameter / 2) - adjusted_groove_position) \
    .rect(adjusted_groove_width, adjusted_groove_depth) \
    .revolve(360, (0, 0), (0, 1))

# Cut the groove into the shaft
result = result.cut(groove)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)