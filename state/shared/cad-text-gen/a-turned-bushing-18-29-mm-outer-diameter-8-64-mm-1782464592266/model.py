import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
OD = 18.29  # mm
BORE = 8.64  # mm
LENGTH = 21.59  # mm

# Bushing dimensions in inches for reference and conversion check
OD_IN = OD / IN
BORE_IN = BORE / IN
LENGTH_IN = LENGTH / IN

# Sinker EDM undersize (0.003 inch total spark gap)
EDM_ALLOWANCE = 0.003 * IN / 2

# Adjusted dimensions for EDM
OD_EDM = OD - 2 * EDM_ALLOWANCE
BORE_EDM = BORE + 2 * EDM_ALLOWANCE

# Create the bushing
result = (cq.Workplane("XY")
          .circle(OD_EDM / 2)
          .extrude(LENGTH)
          .faces(">Z").workplane()
          .circle(BORE_EDM / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)