import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
outer_diameter_in = 0.875
bore_diameter_in = 0.5
length_in = 0.875
keyway_width_in = 0.125
keyway_depth_in = 0.0625

# Convert dimensions to millimeters
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN
keyway_width = keyway_width_in * IN
keyway_depth = keyway_depth_in * IN

# Sinker EDM spark gap (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN
undersized_bore_diameter = bore_diameter - 2 * spark_gap_per_side

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2)
    .extrude(length)
    .faces("<Z")
    .workplane()
    .hole(undersized_bore_diameter / 2)
)

# Add keyway to the bore
keyway_center_offset = (bore_diameter - keyway_width) / 2

result = (
    result.faces(">Z")
    .workplane(centerOption="CenterOfMass", originOffset=-length / 2)
    .rect(keyway_width, length)
    .cutThruAll()
)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)