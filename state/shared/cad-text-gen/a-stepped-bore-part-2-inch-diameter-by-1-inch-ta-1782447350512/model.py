import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
part_diameter = 2 * IN
part_height = 1 * IN
bore_diameter_top = 0.6 * IN
bore_diameter_bottom = 0.5 * IN
step_height = 0.3 * IN  # height of the step

# Undersize for EDM spark gap
bore_diameter_top -= SPARK_GAP
bore_diameter_bottom -= SPARK_GAP

# Create the part
result = (
    cq.Workplane("XY")
    .circle(part_diameter / 2)
    .extrude(part_height)
    .faces(">Z")
    .workplane()
    .hole(bore_diameter_top)
    .faces("<Z")
    .workplane(offset=step_height)
    .hole(bore_diameter_bottom)
)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)