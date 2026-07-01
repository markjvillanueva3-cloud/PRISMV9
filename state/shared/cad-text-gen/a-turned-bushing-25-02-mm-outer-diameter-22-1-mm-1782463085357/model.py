import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
OD_INCHES = 25.02 / IN
BORE_INCHES = 22.1 / IN
LENGTH_INCHES = 25.44 / IN

# Convert to millimeters
OD_MM = OD_INCHES * IN
BORE_MM = BORE_INCHES * IN
LENGTH_MM = LENGTH_INCHES * IN

# Sinker EDM undersize (0.003 inch total spark gap)
EDM_ALLOWANCE = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD_MM / 2 - EDM_ALLOWANCE)
    .extrude(LENGTH_MM)
    .cut(
        cq.Workplane("XY", origin=(0, 0, LENGTH_MM))
        .circle(BORE_MM / 2 + EDM_ALLOWANCE)
        .extrude(-LENGTH_MM)
    )
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)