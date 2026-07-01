# PRISM live NURBS proof (slot:delta, #3 frontier) -- loft fitted-spline airfoil
# sections through the LIVE Fusion kernel -> B-spline (NURBS) solid.
# Fusion API internal units = CENTIMETERS. Sets `result` (JSON-returned).
result = {"stage": "start"}
try:
    doc = app.activeDocument
    design = adsk.fusion.Design.cast(
        doc.products.itemByProductType("DesignProductType"))
    if design is None:
        design = adsk.fusion.Design.cast(app.activeProduct)
    if design is None:
        result["stage"] = "no_design"
        result["active_doc"] = doc.name if doc else None
        result["active_product_type"] = (
            app.activeProduct.productType if app.activeProduct else None)
        raise Exception("no active Fusion Design product")
    root = design.rootComponent
    planes = root.constructionPlanes

    def airfoil(chord, t=0.12, n=20):
        up = []
        lo = []
        for i in range(n):
            x = i / (n - 1)
            yt = 5 * t * (0.2969 * math.sqrt(x) - 0.1260 * x - 0.3516 * x * x
                          + 0.2843 * x ** 3 - 0.1015 * x ** 4)
            up.append((x * chord, yt * chord))
            lo.append((x * chord, -yt * chord))
        # closed contour: upper LE->TE, then lower TE->LE minus shared endpoints
        return up + list(reversed(lo))[1:-1]

    sections = [(0.0, 4.0), (2.0, 3.5), (4.0, 3.0)]  # (z_cm, chord_cm) tapered
    profiles = []
    diag = []
    for z, ch in sections:
        if z == 0.0:
            plane = root.xYConstructionPlane
        else:
            pin = planes.createInput()
            pin.setByOffset(root.xYConstructionPlane,
                            adsk.core.ValueInput.createByReal(z))
            plane = planes.add(pin)
        sk = root.sketches.add(plane)
        oc = adsk.core.ObjectCollection.create()
        for (x, y) in airfoil(ch):
            oc.add(adsk.core.Point3D.create(x, y, 0))
        spl = sk.sketchCurves.sketchFittedSplines.add(oc)
        try:
            spl.isClosed = True
        except Exception as ce:
            diag.append("isClosed_err:" + str(ce))
        diag.append("z=%.1f profiles=%d" % (z, sk.profiles.count))
        if sk.profiles.count > 0:
            profiles.append(sk.profiles.item(0))
    result["section_diag"] = diag

    loftFeats = root.features.loftFeatures
    li = loftFeats.createInput(adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    for p in profiles:
        li.loftSections.add(p)
    li.isSolid = True
    loft = loftFeats.add(li)

    result["stage"] = "lofted"
    result["bodies"] = root.bRepBodies.count
    if root.bRepBodies.count > 0:
        b = root.bRepBodies.item(0)
        st = {}
        for f in b.faces:
            key = str(f.geometry.surfaceType)
            st[key] = st.get(key, 0) + 1
        result["faces"] = b.faces.count
        result["volume_cm3"] = round(b.volume, 4)
        result["area_cm2"] = round(b.area, 4)
        result["surface_type_counts"] = st  # SurfaceTypes: 0=Plane .. 7=Nurbs
except Exception as e:
    result["stage"] = "error"
    result["error"] = str(e)
