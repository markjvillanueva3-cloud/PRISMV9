const PRISM_3D_VISUAL_ENHANCEMENT_ENGINE = {
  version: '1.0.0',

  // WAY COVER / BELLOWS GENERATOR

  generateWayCovers(params) {
    const {
      axis = 'X',
      length = 500,
      width = 100,
      height = 30,
      folds = 15,
      color = 0x333333,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = `wayCover_${axis}`;

    // Create accordion-style bellows
    const foldDepth = length / folds;
    const foldHeight = height * 0.3;

    for (let i = 0; i < folds; i++) {
      // Create each fold as a box with slight taper
      const foldGeo = new THREE.BoxGeometry(foldDepth * 0.9, width, foldHeight);
      const foldMat = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide
      });
      const fold = new THREE.Mesh(foldGeo, foldMat);

      // Position alternating up/down
      const xPos = -length / 2 + (i + 0.5) * foldDepth;
      const zPos = (i % 2 === 0) ? foldHeight / 2 : -foldHeight / 2;

      if (axis === 'X') {
        fold.position.set(xPos, 0, zPos);
      } else if (axis === 'Y') {
        fold.rotation.z = Math.PI / 2;
        fold.position.set(0, xPos, zPos);
      }
      group.add(fold);
    }
    // Add top/bottom cover plates
    const coverGeo = new THREE.BoxGeometry(length, width, 2);
    const topCover = new THREE.Mesh(coverGeo, new THREE.MeshPhongMaterial({ color: 0x444444 }));
    topCover.position.z = height / 2;
    group.add(topCover);

    const bottomCover = topCover.clone();
    bottomCover.position.z = -height / 2;
    group.add(bottomCover);

    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // TOOL CHANGER GENERATOR

  generateToolChanger(params) {
    const {
      type = 'carousel',  // 'carousel', 'arm', 'chain'
      pockets = 20,
      pocketDiameter = 60,
      color = 0x666666,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'toolChanger';

    if (type === 'carousel') {
      // Circular carousel
      const carouselRadius = (pockets * pocketDiameter) / (2 * Math.PI) + 50;

      // Main disc
      const discGeo = new THREE.CylinderGeometry(carouselRadius, carouselRadius, 30, 64);
      const discMat = new THREE.MeshPhongMaterial({ color: color });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 2;
      group.add(disc);

      // Tool pockets
      const pocketGeo = new THREE.CylinderGeometry(pocketDiameter / 2, pocketDiameter / 2, 40, 16);
      const pocketMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

      for (let i = 0; i < pockets; i++) {
        const angle = (i / pockets) * Math.PI * 2;
        const pocket = new THREE.Mesh(pocketGeo, pocketMat);
        pocket.position.x = Math.cos(angle) * (carouselRadius - pocketDiameter / 2 - 10);
        pocket.position.y = Math.sin(angle) * (carouselRadius - pocketDiameter / 2 - 10);
        pocket.rotation.x = Math.PI / 2;
        pocket.name = `pocket_${i + 1}`;
        group.add(pocket);
      }
      // Center hub
      const hubGeo = new THREE.CylinderGeometry(50, 50, 50, 32);
      const hub = new THREE.Mesh(hubGeo, new THREE.MeshPhongMaterial({ color: 0x888888 }));
      hub.rotation.x = Math.PI / 2;
      group.add(hub);
    }
    if (type === 'arm') {
      // Side-mount arm type ATC
      const armLength = 300;
      const armWidth = 80;

      // Main arm
      const armGeo = new THREE.BoxGeometry(armLength, armWidth, 40);
      const arm = new THREE.Mesh(armGeo, new THREE.MeshPhongMaterial({ color: color }));
      group.add(arm);

      // Gripper ends
      const gripperGeo = new THREE.CylinderGeometry(30, 30, 60, 16);
      const gripperMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

      const gripper1 = new THREE.Mesh(gripperGeo, gripperMat);
      gripper1.position.x = -armLength / 2 + 30;
      gripper1.rotation.x = Math.PI / 2;
      group.add(gripper1);

      const gripper2 = gripper1.clone();
      gripper2.position.x = armLength / 2 - 30;
      group.add(gripper2);

      // Pivot point
      const pivotGeo = new THREE.CylinderGeometry(40, 40, 80, 32);
      const pivot = new THREE.Mesh(pivotGeo, new THREE.MeshPhongMaterial({ color: 0x444444 }));
      pivot.rotation.x = Math.PI / 2;
      pivot.position.y = -100;
      group.add(pivot);
    }
    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // COOLANT SYSTEM GENERATOR

  generateCoolantSystem(params) {
    const {
      type = 'flood',  // 'flood', 'mist', 'through_spindle'
      nozzleCount = 4,
      color = 0x3377aa,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'coolantSystem';

    // Coolant nozzle geometry
    const nozzleBaseGeo = new THREE.CylinderGeometry(8, 10, 20, 8);
    const nozzleTubeGeo = new THREE.CylinderGeometry(4, 4, 40, 8);
    const nozzleMat = new THREE.MeshPhongMaterial({ color: 0x777777 });

    // Create nozzles
    for (let i = 0; i < nozzleCount; i++) {
      const angle = (i / nozzleCount) * Math.PI * 2;
      const nozzleGroup = new THREE.Group();

      // Base
      const base = new THREE.Mesh(nozzleBaseGeo, nozzleMat);
      nozzleGroup.add(base);

      // Flexible tube
      const tube = new THREE.Mesh(nozzleTubeGeo, new THREE.MeshPhongMaterial({ color: color }));
      tube.position.y = 30;
      tube.rotation.x = 0.3; // Slight angle
      nozzleGroup.add(tube);

      // Position around spindle area
      const radius = 80;
      nozzleGroup.position.x = Math.cos(angle) * radius;
      nozzleGroup.position.z = Math.sin(angle) * radius;
      nozzleGroup.lookAt(0, -50, 0);

      group.add(nozzleGroup);
    }
    // Through-spindle indicator
    if (type === 'through_spindle') {
      const tscIndicator = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 5, 100, 8),
        new THREE.MeshPhongMaterial({ color: 0x00aaff, transparent: true, opacity: 0.5 })
      );
      tscIndicator.name = 'throughSpindleCoolant';
      group.add(tscIndicator);
    }
    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // MACHINE ENCLOSURE GENERATOR

  generateEnclosure(params) {
    const {
      width = 2000,
      depth = 1500,
      height = 2200,
      doorWidth = 800,
      windowHeight = 600,
      color = 0xeeeeee,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'enclosure';

    const wallThickness = 20;
    const frameMat = new THREE.MeshPhongMaterial({ color: color });
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      frameMat
    );
    backWall.position.set(0, height / 2, -depth / 2);
    group.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height, depth),
      frameMat
    );
    leftWall.position.set(-width / 2, height / 2, 0);
    group.add(leftWall);

    // Right wall
    const rightWall = leftWall.clone();
    rightWall.position.x = width / 2;
    group.add(rightWall);

    // Top
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width, wallThickness, depth),
      frameMat
    );
    top.position.set(0, height, 0);
    group.add(top);

    // Front door frame
    const doorFrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height, wallThickness),
      frameMat
    );
    doorFrameLeft.position.set(-doorWidth / 2 - wallThickness / 2, height / 2, depth / 2);
    group.add(doorFrameLeft);

    const doorFrameRight = doorFrameLeft.clone();
    doorFrameRight.position.x = doorWidth / 2 + wallThickness / 2;
    group.add(doorFrameRight);

    // Window
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, windowHeight, 5),
      glassMat
    );
    window.position.set(0, height / 2 + 200, depth / 2);
    window.name = 'viewingWindow';
    group.add(window);

    // Door (separate group for animation)
    const door = new THREE.Group();
    door.name = 'door';
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth / 2, height - 100, wallThickness),
      frameMat
    );
    doorPanel.position.y = height / 2 - 50;
    door.add(doorPanel);
    door.position.set(-doorWidth / 4, 0, depth / 2);
    group.add(door);

    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // WORK ENVELOPE VISUALIZATION

  generateWorkEnvelope(params) {
    const {
      xTravel = 500,
      yTravel = 400,
      zTravel = 400,
      color = 0x00ff00,
      opacity = 0.1,
      showEdges = true,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'workEnvelope';

    // Semi-transparent box showing work envelope
    const envelopeGeo = new THREE.BoxGeometry(xTravel, yTravel, zTravel);
    const envelopeMat = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    });
    const envelope = new THREE.Mesh(envelopeGeo, envelopeMat);
    group.add(envelope);

    // Edge lines
    if (showEdges) {
      const edgesGeo = new THREE.EdgesGeometry(envelopeGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      group.add(edges);
    }
    // Axis labels
    const labelPositions = [
      { text: `X: ${xTravel}mm`, pos: [xTravel / 2 + 20, 0, 0] },
      { text: `Y: ${yTravel}mm`, pos: [0, yTravel / 2 + 20, 0] },
      { text: `Z: ${zTravel}mm`, pos: [0, 0, zTravel / 2 + 20] }
    ];

    // Note: Text labels would use CSS2DRenderer or sprite-based text
    // Storing label data for external rendering
    group.userData.labels = labelPositions;

    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // AXIS LIMIT INDICATORS

  generateAxisLimitIndicators(params) {
    const {
      axis = 'X',
      minLimit = -250,
      maxLimit = 250,
      currentPosition = 0,
      warningZone = 20,  // Distance from limit to show warning
      color = 0x00ff00,
      warningColor = 0xffff00,
      errorColor = 0xff0000
    } = params;

    const group = new THREE.Group();
    group.name = `limitIndicator_${axis}`;

    const totalTravel = maxLimit - minLimit;
    const indicatorWidth = 10;
    const indicatorHeight = 5;

    // Background track
    const trackGeo = new THREE.BoxGeometry(totalTravel, indicatorHeight, indicatorWidth);
    const trackMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    group.add(track);

    // Warning zones at limits
    const warningGeo = new THREE.BoxGeometry(warningZone, indicatorHeight + 2, indicatorWidth + 2);
    const warningMat = new THREE.MeshPhongMaterial({ color: warningColor, transparent: true, opacity: 0.5 });

    const warningMin = new THREE.Mesh(warningGeo, warningMat);
    warningMin.position.x = minLimit + warningZone / 2 - totalTravel / 2;
    group.add(warningMin);

    const warningMax = new THREE.Mesh(warningGeo, warningMat);
    warningMax.position.x = maxLimit - warningZone / 2 - totalTravel / 2;
    group.add(warningMax);

    // Current position indicator
    const posGeo = new THREE.BoxGeometry(5, indicatorHeight + 4, indicatorWidth + 4);
    const posMat = new THREE.MeshPhongMaterial({ color: color });
    const posIndicator = new THREE.Mesh(posGeo, posMat);
    posIndicator.position.x = currentPosition - (minLimit + maxLimit) / 2;
    posIndicator.name = 'positionIndicator';
    group.add(posIndicator);

    // Store limits for animation updates
    group.userData = {
      minLimit,
      maxLimit,
      warningZone,
      updatePosition: function(newPos) {
        posIndicator.position.x = newPos - (minLimit + maxLimit) / 2;

        // Update color based on proximity to limits
        if (newPos <= minLimit + warningZone || newPos >= maxLimit - warningZone) {
          posMat.color.setHex(warningColor);
        } else {
          posMat.color.setHex(color);
        }
        if (newPos <= minLimit || newPos >= maxLimit) {
          posMat.color.setHex(errorColor);
        }
      }
    };
    return group;
  },
  // CHIP CONVEYOR GENERATOR

  generateChipConveyor(params) {
    const {
      length = 1000,
      width = 300,
      height = 150,
      color = 0x555555,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'chipConveyor';

    // Main trough
    const troughGeo = new THREE.BoxGeometry(length, width, height);
    const troughMat = new THREE.MeshPhongMaterial({ color: color });
    const trough = new THREE.Mesh(troughGeo, troughMat);
    group.add(trough);

    // Belt surface
    const beltGeo = new THREE.BoxGeometry(length - 40, width - 40, 5);
    const beltMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.z = height / 2 - 10;
    belt.name = 'conveyorBelt';
    group.add(belt);

    // End drums
    const drumGeo = new THREE.CylinderGeometry(30, 30, width - 20, 16);
    const drumMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

    const drumFront = new THREE.Mesh(drumGeo, drumMat);
    drumFront.rotation.x = Math.PI / 2;
    drumFront.position.x = -length / 2 + 30;
    drumFront.position.z = height / 2 - 30;
    group.add(drumFront);

    const drumBack = drumFront.clone();
    drumBack.position.x = length / 2 - 30;
    group.add(drumBack);

    // Collection bin
    const binGeo = new THREE.BoxGeometry(200, width + 50, 200);
    const bin = new THREE.Mesh(binGeo, new THREE.MeshPhongMaterial({ color: 0x666666 }));
    bin.position.x = length / 2 + 120;
    bin.position.z = -50;
    bin.name = 'chipBin';
    group.add(bin);

    group.position.set(position.x, position.y, position.z);

    return group;
  }
}