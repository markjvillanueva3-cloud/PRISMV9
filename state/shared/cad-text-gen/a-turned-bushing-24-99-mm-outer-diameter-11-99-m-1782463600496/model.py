import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
OD_INCHES = 24.99 / IN
BORE_INCHES = 11.99 / IN
LENGTH_INCHES = 15.01 / IN

# Convert to millimeters
OD_MM = OD_INCHES * IN
BORE_MM = BORE_INCHES * IN
LENGTH_MM = LENGTH_INCHES * IN

# Sinker-EDM undersize (0.003 total spark gap)
SPARK_GAP = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD_MM / 2 - SPARK_GAP)
    .extrude(LENGTH_MM)
    .cut(
        cq.Workplane("XY", origin=(0, 0, LENGTH_MM))
        .circle(BORE_MM / 2 + SPARK_GAP)
        .extrude(-LENGTH_MM)
    )
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)