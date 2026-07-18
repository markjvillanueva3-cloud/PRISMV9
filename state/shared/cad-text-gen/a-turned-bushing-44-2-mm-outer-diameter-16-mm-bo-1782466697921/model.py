import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
OD_IN = 44.2 / IN  # Outer diameter
BORE_IN = 16 / IN  # Bore diameter
LENGTH_IN = 17.86 / IN  # Length

# Convert to millimeters
OD_MM = OD_IN * IN
BORE_MM = BORE_IN * IN
LENGTH_MM = LENGTH_IN * IN

# Sinker EDM undersize (0.003 total spark gap)
EDM_ALLOWANCE = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD_MM / 2 - EDM_ALLOWANCE)
    .extrude(LENGTH_MM)
    .faces(">Z").workplane()
    .circle(BORE_MM / 2 + EDM_ALLOWANCE)
    .cutThruAll()
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)