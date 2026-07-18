import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
flange_diameter = 1.5 * IN
flange_thickness = 0.375 * IN
hub_diameter = 0.75 * IN
hub_length = 1.25 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the flange
flange = (
    cq.Workplane("XY")
    .circle(flange_diameter / 2 - undersize / 2)
    .extrude(flange_thickness)
)

# Create the hub
hub = (
    cq.Workplane("XY")
    .circle(hub_diameter / 2 - undersize / 2)
    .extrude(hub_length)
)

# Combine flange and hub
result = (
    flange
    .faces("<Z").workplane()
    .union(hub.translate((0, 0, -hub_length)))
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)