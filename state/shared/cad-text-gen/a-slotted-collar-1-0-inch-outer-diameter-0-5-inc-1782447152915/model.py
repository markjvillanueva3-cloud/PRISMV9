import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_diameter_in = 1.0
bore_diameter_in = 0.5
length_in = 0.75
slot_width_in = 0.125

# Convert dimensions to millimeters
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN
slot_width = slot_width_in * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the slotted collar
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2 - undersize)
    .cut(
        cq.Workplane("XY")
        .circle(bore_diameter / 2 + undersize)
        .extrude(length)
    )
    .faces(">Z")
    .workplane()
    .slot2D(slot_width, outer_diameter - 2 * undersize)
    .cutBlind(-length)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)