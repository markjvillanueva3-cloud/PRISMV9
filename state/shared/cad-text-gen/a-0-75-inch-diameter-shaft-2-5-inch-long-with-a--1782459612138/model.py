import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap for EDM electrode

# Dimensions in inches, converted to mm
shaft_diameter = 0.75 * IN
shaft_length = 2.5 * IN
groove_width = 0.0938 * IN
groove_depth = 0.0625 * IN
groove_position_from_end = 0.375 * IN

# Undersize for EDM spark gap
effective_shaft_diameter = shaft_diameter - SPARK_GAP
effective_groove_width = groove_width - 2 * (SPARK_GAP / 2)
effective_groove_depth = groove_depth - SPARK_GAP

# Create the shaft
result = cq.Workplane("XY").circle(effective_shaft_diameter / 2).extrude(shaft_length)

# Create the groove
groove_start_position = shaft_length - groove_position_from_end
groove_end_position = groove_start_position + effective_groove_depth

# Groove sketch
groove_sketch = (
    cq.Workplane("XY")
    .center(0, groove_start_position)
    .rect(effective_shaft_diameter, effective_groove_width)
)

# Cut the groove
result = result.cut(groove_sketch.extrude(-effective_groove_depth))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)