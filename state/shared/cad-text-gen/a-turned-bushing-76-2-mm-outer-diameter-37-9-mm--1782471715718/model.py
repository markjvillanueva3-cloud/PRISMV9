import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
OD_INCHES = 76.2 / IN  # Outer diameter
BORE_INCHES = 37.9 / IN  # Bore diameter
LENGTH_INCHES = 38.1 / IN  # Length

# Convert dimensions to mm
OD_MM = OD_INCHES * IN
BORE_MM = BORE_INCHES * IN
LENGTH_MM = LENGTH_INCHES * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
SPARK_GAP = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD_MM / 2 - SPARK_GAP)  # Outer diameter with spark gap
    .extrude(LENGTH_MM)
    .faces(">Z").workplane()
    .circle(BORE_MM / 2 + SPARK_GAP)  # Bore diameter with spark gap
    .cutThruAll()
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)