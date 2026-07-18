import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
length = (2 - SPARK_GAP) * IN
width = (1 - SPARK_GAP) * IN
height = 0.75 * IN
chamfer_length = 0.125 * IN
chamfer_angle = 45

# Chamfer distance in XY plane
chamfer_distance = chamfer_length * cq.cos(cq.radians(chamfer_angle))

# Create the block with chamfers
result = (
    cq.Workplane("XY")
    .rect(length, width)
    .extrude(height)
    .edges("|Z and >Z")
    .chamfer(chamfer_length, angle=chamfer_angle)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)