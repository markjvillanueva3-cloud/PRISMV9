import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for sinker-EDM

# Dimensions in inches, converted to mm
OD_INCHES = 25.4 / IN  # outer diameter in inches
BORE_INCHES = 10.92 / IN  # bore diameter in inches
LENGTH_INCHES = 42.55 / IN  # length in inches

# Adjusted dimensions for sinker-EDM
OD_MM = OD_INCHES * IN - SPARK_GAP
BORE_MM = BORE_INCHES * IN + SPARK_GAP
LENGTH_MM = LENGTH_INCHES * IN

# Create the bushing
result = (cq.Workplane("XY")
          .circle(OD_MM / 2)
          .extrude(LENGTH_MM)
          .faces(">Z").workplane()
          .circle(BORE_MM / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)