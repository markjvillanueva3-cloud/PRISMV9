import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
OD = 25.4  # outer diameter in mm (1 inch)
ID = 10.77  # inner diameter in mm
LENGTH = 88.9  # length in mm (3.5 inches)

# Sinker EDM undersize (0.003 total spark gap, 0.0015 per side)
EDM_ALLOWANCE = 2 * 0.0015 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(OD / 2 - EDM_ALLOWANCE)  # outer diameter with EDM allowance
    .extrude(LENGTH)
    .faces(">Z").workplane()
    .circle(ID / 2 + EDM_ALLOWANCE)  # inner diameter with EDM allowance
    .cutThruAll()
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)