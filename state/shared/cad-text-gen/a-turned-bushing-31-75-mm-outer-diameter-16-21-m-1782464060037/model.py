import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
OD_INCHES = 31.75 / IN  # Outer Diameter
BORE_INCHES = 16.21 / IN  # Bore Diameter
LENGTH_INCHES = 76.2 / IN  # Length

# Convert dimensions to mm
OD_MM = OD_INCHES * IN
BORE_MM = BORE_INCHES * IN
LENGTH_MM = LENGTH_INCHES * IN

# Sinker EDM undersize (0.003 inch total spark gap)
EDM_UNDERSIZE = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD_MM / 2 - EDM_UNDERSIZE)
    .extrude(LENGTH_MM)
    .faces(">Z").workplane()
    .circle(BORE_MM / 2 + EDM_UNDERSIZE)
    .cutThruAll()
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)