import cadquery as cq
import os

# Constants for unit conversion
IN = 25.4

# Dimensions in inches, converted to mm
outer_diameter = 1.25 * IN
bore_diameter = 0.625 * IN
length = 1.25 * IN
keyway_width = 0.125 * IN
keyway_depth = 0.0625 * IN

# Sinker-EDM spark gap undersize (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN
bore_diameter_undersized = bore_diameter - 2 * spark_gap_per_side

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2)
    .extrude(length)
    .faces("<Z")
    .workplane()
    .circle(bore_diameter_undersized / 2)
    .cutThruAll()
    .faces(">Z")
    .workplane(centerOption="CenterOfMass", centerPoint=(0, 0))
    .rect(keyway_width, keyway_depth)
    .extrude(-length)
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)