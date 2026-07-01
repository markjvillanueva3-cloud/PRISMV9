import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
OD_INCHES = 31.76 / IN
ID_INCHES = 15.88 / IN
LENGTH_INCHES = 41.02 / IN

# Convert to millimeters
OD_MM = OD_INCHES * IN
ID_MM = ID_INCHES * IN
LENGTH_MM = LENGTH_INCHES * IN

# Sinker EDM undersize (0.003 inch total spark gap)
EDM_ALLOWANCE = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD_MM / 2 - EDM_ALLOWANCE)
    .cut(
        cq.Workplane("XY")
        .circle(ID_MM / 2 + EDM_ALLOWANCE)
        .extrude(LENGTH_MM)
    )
    .extrude(LENGTH_MM)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)