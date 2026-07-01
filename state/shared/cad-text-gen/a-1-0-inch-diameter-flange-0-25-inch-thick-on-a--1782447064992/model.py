import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
flange_diameter = 1.0 * IN
flange_thickness = 0.25 * IN
hub_diameter = 0.5 * IN
hub_length = 1.0 * IN

# Create the flange
result = (cq.Workplane("XY")
          .circle(flange_diameter / 2)
          .extrude(flange_thickness))

# Create the hub
hub = (cq.Workplane("XY", origin=(0, 0, -hub_length + flange_thickness))
       .circle(hub_diameter / 2)
       .extrude(hub_length))

# Combine flange and hub
result = result.union(hub)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)