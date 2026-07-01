import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions
plate_size_in = 2.0 * IN  # inches to mm
plate_thickness_in = 0.375 * IN  # inches to mm
hole_diameter_in = 0.5 * IN  # inches to mm
inset_distance_in = 0.375 * IN  # inches to mm

# Sinker EDM undersize
undersize_in = 2 * 0.0015 * IN  # total spark gap in mm

# Adjusted dimensions for sinker EDM
hole_diameter_edm_in = hole_diameter_in - undersize_in

# Create the plate
result = (cq.Workplane("XY")
          .rect(plate_size_in, plate_size_in)
          .extrude(plate_thickness_in))

# Cut holes in each corner inset
result = (result.faces(">Z").workplane()
          .center(-plate_size_in/2 + inset_distance_in, -plate_size_in/2 + inset_distance_in)
          .circle(hole_diameter_edm_in / 2)
          .cutThruAll()
          .center(plate_size_in - inset_distance_in * 2, 0)
          .circle(hole_diameter_edm_in / 2)
          .cutThruAll()
          .center(0, plate_size_in - inset_distance_in * 2)
          .circle(hole_diameter_edm_in / 2)
          .cutThruAll()
          .center(-plate_size_in + inset_distance_in * 2, 0)
          .circle(hole_diameter_edm_in / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)