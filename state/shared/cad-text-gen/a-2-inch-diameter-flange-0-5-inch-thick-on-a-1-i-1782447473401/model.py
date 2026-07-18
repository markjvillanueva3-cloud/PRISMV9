import cadquery as cq
from cadquery import exporters
import os

# Constants for unit conversion
IN = 25.4

# Dimensions in inches, converted to mm
flange_diameter = 2 * IN
flange_thickness = 0.5 * IN
hub_diameter = 1 * IN
hub_length = 1.5 * IN

# Sinker-EDM undersize for burning surfaces
burning_undersize = 0.003 * IN

# Create the flange
flange = (
    cq.Workplane("XY")
    .circle(flange_diameter / 2 - burning_undersize)
    .extrude(flange_thickness)
)

# Create the hub
hub = (
    cq.Workplane("XY", origin=(0, 0, flange_thickness))
    .circle(hub_diameter / 2 - burning_undersize)
    .extrude(hub_length)
)

# Combine flange and hub
result = flange.union(hub)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)