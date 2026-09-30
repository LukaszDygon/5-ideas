  /* ==========================================================================
     PALETTES (STRICT CHROMATIC MAPS)
     ========================================================================== */
  var PALETTES = {
    amber: {
      name: "Amber Fireplace",
      core: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xff8800),
      ember: new THREE.Color(0xb32400),
      base: new THREE.Color(0x380500),
      lightHex: 0xff8800
    },
    ruby: {
      name: "Hearth Ruby",
      core: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xff2222),
      ember: new THREE.Color(0x8a0014),
      base: new THREE.Color(0x2b0005),
      lightHex: 0xff2222
    },
    twilight: {
      name: "Twilight Violet",
      core: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xb84dff),
      ember: new THREE.Color(0x5a189a),
      base: new THREE.Color(0x190033),
      lightHex: 0xb84dff
    },
    frost: {
      name: "Glacial Frost",
      core: new THREE.Color(0xffffff),
      mid: new THREE.Color(0x00e5ff),
      ember: new THREE.Color(0x007799),
      base: new THREE.Color(0x001a24),
      lightHex: 0x00e5ff
    },
    solar: {
      name: "Solar Radiance",
      core: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xffcc00),
      ember: new THREE.Color(0x996600),
      base: new THREE.Color(0x2b1b00),
      lightHex: 0xffcc00
    },
    monochrome: {
      name: "Techno Monochrome",
      core: new THREE.Color(0xffffff),
      mid: new THREE.Color(0xdddddd),
      ember: new THREE.Color(0x666666),
      base: new THREE.Color(0x1a1a1a),
      lightHex: 0xffffff
    }
  };

  var activePaletteKey = 'amber';
  var activePalette = PALETTES.amber;

  // Three.js Scene Variables
  var scene, camera, renderer, controls;
  var hearthPlinth;
  var hearthAmbientLight;
  var hearthCoreLight;
  var ledBlocks = [];
  var selectedBlock = null;
  var blockCounter = 1;

  // Plinth surface level in world Y coordinates
  var PLINTH_TOP_Y = 0.08;

  // Dynamic Lighting & Flicker Speed Controls
  var spatialFalloff = 1.1;
  var masterLuminance = 0.80;
  var flickerSpeed = 0.8;
  var flickerTurbulence = 1.2;
  var isSidePanelVisible = true;

  // Radial Soft Glow Texture for radiant halos
  var glowTexture = createSoftRadialGlowTexture();

  function createSoftRadialGlowTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  /* ==========================================================================
     CLEAN 4-SIDED SHAPE GEOMETRIES (MINIMALIST VOXEL TIMBERS, CUBES, SLABS)
     ========================================================================== */
  function initShapeGeometries() {
    var shapes = {
      timber: {
        name: 'timber',
        label: 'TIMBER_LOG',
        isLog: true,
        outer: new THREE.BoxGeometry(0.28, 0.28, 1.80),
        inner: new THREE.BoxGeometry(0.18, 0.18, 1.66),
        width: 0.28,
        height: 0.28,
        depth: 1.80,
        halfY: 0.14,
        groundScale: 2.5
      },
      chunk: {
        name: 'chunk',
        label: 'CHUNKY_LOG',
        isLog: true,
        outer: new THREE.BoxGeometry(0.36, 0.36, 1.20),
        inner: new THREE.BoxGeometry(0.24, 0.24, 1.06),
        width: 0.36,
        height: 0.36,
        depth: 1.20,
        halfY: 0.18,
        groundScale: 2.2
      },
      kindling: {
        name: 'kindling',
        label: 'KINDLING_STICK',
        isLog: true,
        outer: new THREE.BoxGeometry(0.14, 0.14, 1.10),
        inner: new THREE.BoxGeometry(0.08, 0.08, 0.98),
        width: 0.14,
        height: 0.14,
        depth: 1.10,
        halfY: 0.07,
        groundScale: 1.6
      },
      spark: {
        name: 'spark',
        label: 'SPARK_CRYSTAL',
        isLog: false,
        isSpark: true,
        outer: new THREE.OctahedronGeometry(0.22, 0),
        inner: new THREE.OctahedronGeometry(0.14, 0),
        width: 0.44,
        height: 0.44,
        depth: 0.44,
        halfY: 0.22,
        groundScale: 1.4
      },
      cube: {
        name: 'cube',
        label: 'COAL_CUBE',
        isLog: false,
        outer: new THREE.BoxGeometry(0.65, 0.65, 0.65),
        inner: new THREE.BoxGeometry(0.48, 0.48, 0.48),
        width: 0.65,
        height: 0.65,
        depth: 0.65,
        halfY: 0.325,
        groundScale: 1.8
      },
      slab: {
        name: 'slab',
        label: 'HEARTH_SLAB',
        isLog: false,
        outer: new THREE.BoxGeometry(1.40, 0.18, 1.40),
        inner: new THREE.BoxGeometry(1.22, 0.10, 1.22),
        width: 1.40,
        height: 0.18,
        depth: 1.40,
        halfY: 0.09,
        groundScale: 2.6
      }
    };

    for (var k in shapes) {
      shapes[k].edges = new THREE.EdgesGeometry(shapes[k].outer);
    }
    return shapes;
  }

  var SHAPES = initShapeGeometries();

  // Shared geometry for flat horizontal ground glow pools
  var groundPoolGeo = new THREE.PlaneGeometry(1, 1);

  // Drag & Drop Mechanics
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var isDragging = false;
  var dragPlane = new THREE.Plane();
  var planeIntersect = new THREE.Vector3();
  var dragOffset = new THREE.Vector3();
  var draggedBlock = null;
  var dragStartY = 0;
  var dragStartMouseY = 0;
  var isShiftKeyHeld = false;

  /* ==========================================================================
     INITIALIZATION
     ========================================================================== */
  window.addEventListener('DOMContentLoaded', function() {
    try {
      initThree();
      applyFormation('teepee');
      animate();
    } catch (err) {
      console.error('Three.js Init Error:', err);
    }

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  function initThree() {
    var container = document.getElementById('canvas-3d');
    var width = container.clientWidth || 800;
    var height = container.clientHeight || 750;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    scene.fog = new THREE.FogExp2(0x050507, 0.022);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.2, 8.2);

    // 3. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.75, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 16.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;

    // 5. Build Exhibition Room
    buildGallerySpace();

    // 6. Attach Pointer Listeners for Voxel Dragging
    renderer.domElement.addEventListener('pointerdown', onVoxelPointerDown);
    renderer.domElement.addEventListener('pointermove', onVoxelPointerMove);
    renderer.domElement.addEventListener('pointerup', onVoxelPointerUp);
    renderer.domElement.addEventListener('pointerleave', onVoxelPointerUp);

    if (window.ResizeObserver) {
      new ResizeObserver(function() { handleWindowResize(); }).observe(container);
    }
  }

  /* ==========================================================================
     EXHIBITION ROOM (SOLID OPAQUE FLOOR, MATTE PLINTH & DYNAMIC CORE LIGHT)
     ========================================================================== */
  function buildGallerySpace() {
    // 1. Solid Opaque Dark Slate Floor (Matte, depthWrite: true)
    var floorGeo = new THREE.PlaneGeometry(36, 36);
    var floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d12,
      roughness: 0.92,
      metalness: 0.0,
      depthWrite: true
    });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle Monochromatic Floor Grid
    var floorGrid = new THREE.GridHelper(26, 26, 0x222634, 0x11131a);
    floorGrid.position.y = 0.002;
    scene.add(floorGrid);

    // 2. Solid Opaque Exhibition Plinth (Pedestal top is at Y = 0.08)
    var plinthGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.08, 48);
    var plinthMat = new THREE.MeshStandardMaterial({
      color: 0x13151f,
      roughness: 0.88,
      metalness: 0.05,
      depthWrite: true
    });
    hearthPlinth = new THREE.Mesh(plinthGeo, plinthMat);
    hearthPlinth.position.y = 0.04;
    hearthPlinth.receiveShadow = true;
    scene.add(hearthPlinth);

    // Perimeter Accent Ring on Plinth
    var ringGeo = new THREE.TorusGeometry(3.6, 0.02, 12, 64);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x3d4358 });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    scene.add(ring);

    // 3. Gallery Backdrop Wall
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.95, depthWrite: true });
    var backWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 16), wallMat);
    backWall.position.set(0, 8, -14);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // 4. Ambient Baseline Light
    hearthAmbientLight = new THREE.AmbientLight(0x181a26, 0.55);
    scene.add(hearthAmbientLight);

    // 5. Dedicated Central Hearth Point Light (Radiates colored warmth across the installation)
    hearthCoreLight = new THREE.PointLight(activePalette.lightHex, 1.2, 7.0, 1.4);
    hearthCoreLight.position.set(0, 0.65, 0);
    scene.add(hearthCoreLight);

    // Overhead Exhibition Spotlight
    var spot = new THREE.SpotLight(0x283042, 0.45, 28, Math.PI / 4, 0.4);
    spot.position.set(0, 12, 0);
    spot.target = hearthPlinth;
    scene.add(spot);
  }

  /* ==========================================================================
     LED VOXEL CLASS (HIGH-EMISSION SHELL, RADIANT AURA, ZERO-G / GRAVITY)
     ========================================================================== */
  function LEDVoxel(x, y, z, shapeType, mode, hasGravity, scale) {
    this.id = blockCounter++;
    this.shapeType = shapeType || 'timber';
    this.shapeDef = SHAPES[this.shapeType] || SHAPES.timber;
    this.mode = mode || 'flame';
    this.hasGravity = (hasGravity !== undefined) ? hasGravity : (this.shapeType !== 'spark');
    this.scale = scale || 1.0;
    this.baseHoverY = y;

    this.pulseOffset = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.8 + Math.random() * 0.8;
    this.heat = 1.0;
    this.isSelected = false;
    this.velocityY = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    this.group.userData = { block: this };

    // 1. Translucent Frosted Shell (High emissive luminance, unblocked glow)
    this.outerMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b10,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.84,
      emissive: activePalette.mid,
      emissiveIntensity: 1.2
    });
    this.outerMesh = new THREE.Mesh(this.shapeDef.outer, this.outerMat);
    this.outerMesh.castShadow = false; // Never block its own emitter
    this.outerMesh.receiveShadow = true;
    this.group.add(this.outerMesh);

    // 2. Inner Glowing Core
    this.innerMat = new THREE.MeshBasicMaterial({
      color: activePalette.core,
      transparent: true,
      opacity: 0.95
    });
    this.innerMesh = new THREE.Mesh(this.shapeDef.inner, this.innerMat);
    this.group.add(this.innerMesh);

    // 3. Techno Wireframe Edges
    this.edgesMat = new THREE.LineBasicMaterial({
      color: activePalette.mid,
      transparent: true,
      opacity: 0.95,
      linewidth: 1
    });
    this.edgesMesh = new THREE.LineSegments(this.shapeDef.edges, this.edgesMat);
    this.group.add(this.edgesMesh);

    // 4. Radiant Optical Corona Aura (Additive Blending)
    var coronaMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: activePalette.lightHex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.35,
      depthTest: true,
      depthWrite: false
    });
    this.coronaSprite = new THREE.Sprite(coronaMat);
    var cs = Math.max(this.shapeDef.width, this.shapeDef.depth) * 2.2;
    this.coronaSprite.scale.set(cs, cs, 1.0);
    this.group.add(this.coronaSprite);

    // 5. Dynamic Wide-Reach Physical Point Light
    this.pointLight = new THREE.PointLight(activePalette.lightHex, 1.2, 5.0, 1.4);
    this.pointLight.castShadow = false; // Smooth radiant glow without shadow acne
    this.group.add(this.pointLight);

    // 6. Horizontal Ground Glow Pool
    var poolMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: activePalette.lightHex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      opacity: 0.38
    });
    this.groundGlow = new THREE.Mesh(groundPoolGeo, poolMat);
    this.groundGlow.rotation.x = -Math.PI / 2;
    this.groundGlow.position.set(x, PLINTH_TOP_Y + 0.005, z);
    scene.add(this.groundGlow);

    // 7. Selection Bracket (Oriented bounding cage perfectly wrapping the shape)
    var selGeo = new THREE.EdgesGeometry(this.shapeDef.outer);
    var selMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });
    this.selectionMesh = new THREE.LineSegments(selGeo, selMat);
    this.selectionMesh.scale.set(1.05, 1.05, 1.05);
    this.selectionMesh.visible = false;
    this.group.add(this.selectionMesh);

    // Apply scale
    this.applyScale(this.scale);

    scene.add(this.group);
  }

  LEDVoxel.prototype.setSelected = function(val) {
    this.isSelected = val;
    if (this.selectionMesh) this.selectionMesh.visible = val;
  };

  LEDVoxel.prototype.applyScale = function(s) {
    this.scale = Math.max(0.4, Math.min(2.4, s));
    this.group.scale.set(this.scale, this.scale, this.scale);
  };

  LEDVoxel.prototype.destroy = function() {
    scene.remove(this.group);
    scene.remove(this.groundGlow);
    this.outerMat.dispose();
    this.innerMat.dispose();
    this.edgesMat.dispose();
    if (this.selectionMesh) {
      this.selectionMesh.geometry.dispose();
      this.selectionMesh.material.dispose();
    }
    this.groundGlow.material.dispose();
  };

  /* ==========================================================================
     STABLE GRAVITY PHYSICS (NO DRIFT, STRICT DOWNWARD SUPPORT)
     ========================================================================== */
  function getLowestSupportedY(block) {
    var box = new THREE.Box3().setFromObject(block.outerMesh);
    var halfH = (box.max.y - box.min.y) / 2;
    var lowestY = PLINTH_TOP_Y + halfH;

    for (var i = 0; i < ledBlocks.length; i++) {
      var other = ledBlocks[i];
      if (other === block) continue;

      // Must be lower than this block center
      if (other.group.position.y >= block.group.position.y - 0.04) continue;

      var otherBox = new THREE.Box3().setFromObject(other.outerMesh);
      // Other top must be below or level with this block bottom
      if (otherBox.max.y > box.min.y + 0.10) continue;

      // Horizontal bounding overlap check
      var overlapX = Math.min(box.max.x, otherBox.max.x) - Math.max(box.min.x, otherBox.min.x);
      var overlapZ = Math.min(box.max.z, otherBox.max.z) - Math.max(box.min.z, otherBox.min.z);

      if (overlapX > 0.08 && overlapZ > 0.08) {
        var supportY = otherBox.max.y + halfH;
        if (supportY > lowestY) {
          lowestY = supportY;
        }
      }
    }
    return lowestY;
  }

  function updateGravityPhysics(dt) {
    var gravity = 9.8;

    for (var i = 0; i < ledBlocks.length; i++) {
      var b = ledBlocks[i];
      if (b === draggedBlock) continue;

      // Zero-G blocks stay suspended where placed (never fall)
      if (!b.hasGravity) continue;

      var targetY = getLowestSupportedY(b);

      if (b.group.position.y > targetY + 0.005) {
        b.velocityY += gravity * dt;
        b.group.position.y -= b.velocityY * dt;

        if (b.group.position.y <= targetY) {
          b.group.position.y = targetY;
          b.velocityY = 0;
        }
      } else if (b.group.position.y < targetY - 0.02) {
        b.group.position.y = targetY;
        b.velocityY = 0;
      } else {
        b.velocityY = 0;
      }
    }
  }

  function settleAllWithGravity() {
    for (var step = 0; step < 16; step++) {
      for (var i = 0; i < ledBlocks.length; i++) {
        var b = ledBlocks[i];
        if (!b.hasGravity) continue;
        var targetY = getLowestSupportedY(b);
        b.group.position.y = targetY;
        b.velocityY = 0;
        b.baseHoverY = targetY;
      }
    }
    updateInspectorUI();
  }

  function dropSelectedWithGravity() {
    if (!selectedBlock) return;
    selectedBlock.hasGravity = true;
    selectedBlock.group.position.y = getLowestSupportedY(selectedBlock);
    selectedBlock.velocityY = 0;
    selectedBlock.baseHoverY = selectedBlock.group.position.y;
    updateInspectorUI();
  }

  /* ==========================================================================
     DANCING FLAME ENGINE & RADIANT GLOW EMISSION (USER-CONTROLLED SPEED & POPS)
     ========================================================================== */
  function getCentroid() {
    if (ledBlocks.length === 0) return { x: 0, z: 0 };
    var sumX = 0, sumZ = 0;
    for (var i = 0; i < ledBlocks.length; i++) {
      sumX += ledBlocks[i].group.position.x;
      sumZ += ledBlocks[i].group.position.z;
    }
    return { x: sumX / ledBlocks.length, z: sumZ / ledBlocks.length };
  }

  function samplePaletteColor(heat) {
    var p = activePalette;
    var col = new THREE.Color();
    if (heat > 0.65) {
      var t = (heat - 0.65) / 0.35;
      col.copy(p.mid).lerp(p.core, t);
    } else if (heat > 0.25) {
      var t = (heat - 0.25) / 0.4;
      col.copy(p.ember).lerp(p.mid, t);
    } else {
      var t = heat / 0.25;
      col.copy(p.base).lerp(p.ember, t);
    }
    return col;
  }

  function updateBlockPhysicsAndLighting(timeSec) {
    var centroid = getCentroid();
    var maxRadius = 0.001;

    for (var i = 0; i < ledBlocks.length; i++) {
      var b = ledBlocks[i];
      var dx = b.group.position.x - centroid.x;
      var dz = b.group.position.z - centroid.z;
      var r = Math.sqrt(dx * dx + dz * dz);
      if (r > maxRadius) maxRadius = r;
    }

    var totalFlameHeat = 0;

    for (var i = 0; i < ledBlocks.length; i++) {
      var b = ledBlocks[i];

      // Subtle Zero-G floating wave for suspended blocks
      if (!b.hasGravity && b.group.position.y > PLINTH_TOP_Y + 0.3) {
        if (typeof b.baseHoverY !== 'number' || isNaN(b.baseHoverY)) {
          b.baseHoverY = b.group.position.y;
        }
        var hoverOffset = Math.sin(timeSec * 1.5 + b.pulseOffset) * 0.025;
        b.group.position.y = b.baseHoverY + hoverOffset;
      }

      var dx = b.group.position.x - centroid.x;
      var dz = b.group.position.z - centroid.z;
      var r = Math.sqrt(dx * dx + dz * dz);
      var normR = Math.min(1.0, r / Math.max(1.4, maxRadius));

      // Geometric Falloff formula
      var geoHeat = 1.0 - normR * Math.min(1.0, spatialFalloff * 0.40);
      if (spatialFalloff > 1.0) {
        var factor = spatialFalloff - 1.0;
        geoHeat = Math.pow(Math.max(0.05, 1.0 - normR), 1.0 + factor * 1.5) * (1.0 + factor * 0.5);
      }

      var elevationBoost = Math.max(0, b.group.position.y - 0.4) * 0.18;

      // DANCING FLAME FORMULA WITH NON-LINEAR CRACKLE PEAKS
      var spd = flickerSpeed * b.pulseSpeed;
      var flicker = 1.0;

      if (b.mode === 'flame') {
        var f1 = Math.sin(timeSec * 3.2 * spd + b.pulseOffset);
        var f2 = Math.sin(timeSec * 6.7 * spd + b.pulseOffset * 2.3);
        var f3 = Math.cos(timeSec * 11.4 * spd + b.pulseOffset * 4.1);

        // Sharp crackle flare spike
        var rawPeak = Math.sin(timeSec * 14.1 * spd + b.pulseOffset * 3.7) * 0.5 + 0.5;
        var flareSpike = Math.pow(rawPeak, 4.0);

        var flameWave = 0.72 + (f1 * 0.15 + f2 * 0.10 + f3 * 0.05) * (1.0 + flickerTurbulence * 0.5);
        var flameFlare = flareSpike * 0.45 * flickerTurbulence;

        flicker = Math.min(1.45, Math.max(0.45, flameWave + flameFlare));
      } else {
        // Ember breathing
        var emberBreathe = Math.sin(timeSec * 1.2 * spd + b.pulseOffset) * 0.12;
        var emberSnap = Math.pow(Math.sin(timeSec * 4.5 * spd + b.pulseOffset) * 0.5 + 0.5, 3.0) * 0.18 * flickerTurbulence;
        flicker = 0.85 + emberBreathe + emberSnap;
      }

      var finalHeat = Math.min(1.0, Math.max(0.08, (geoHeat + elevationBoost) * flicker * masterLuminance));
      b.heat = finalHeat;
      totalFlameHeat += finalHeat;

      // Outer Emissive Shell (Warm, non-blinding colored glow)
      var heatCol = samplePaletteColor(finalHeat);
      b.outerMat.emissive.copy(heatCol);
      b.outerMat.emissiveIntensity = 0.4 + finalHeat * 1.4;

      // Inner Core (Warm luminous core)
      var coreCol = samplePaletteColor(Math.min(1.0, finalHeat * 1.25));
      b.innerMat.color.copy(coreCol);
      b.innerMat.opacity = 0.70 + finalHeat * 0.25;

      // Wireframe Edges
      b.edgesMat.color.copy(heatCol);
      b.edgesMat.opacity = 0.4 + finalHeat * 0.45;

      // Radiant Optical Corona Aura (Soft, warm halo)
      b.coronaSprite.material.color.setHex(activePalette.lightHex);
      b.coronaSprite.material.opacity = (0.15 + finalHeat * 0.28) * masterLuminance;
      var baseCs = Math.max(b.shapeDef.width, b.shapeDef.depth) * b.scale * 2.0;
      var auraScale = baseCs * (0.88 + flicker * 0.24);
      b.coronaSprite.scale.set(auraScale, auraScale, 1.0);

      // Balanced Local Point Light (Casts warm light without washing out room)
      b.pointLight.color.setHex(activePalette.lightHex);
      b.pointLight.intensity = (0.5 + finalHeat * 1.4) * masterLuminance;
      b.pointLight.distance = (3.5 + finalHeat * 2.2) * b.scale;

      // Horizontal Ground Glow Pool (Velvety, subtle plinth glow)
      b.groundGlow.position.x = b.group.position.x;
      b.groundGlow.position.z = b.group.position.z;

      var elevation = Math.max(0, b.group.position.y - (PLINTH_TOP_Y + b.shapeDef.halfY * b.scale));
      var poolScale = b.shapeDef.groundScale * b.scale * (1.0 + elevation * 0.6);
      b.groundGlow.scale.set(poolScale, poolScale, 1.0);
      b.groundGlow.material.color.setHex(activePalette.lightHex);
      b.groundGlow.material.opacity = ((0.20 + finalHeat * 0.28) / (1.0 + elevation * 1.5)) * masterLuminance;

      if (b.selectionMesh && b.isSelected) {
        var selPulse = 0.78 + Math.sin(timeSec * 5.0) * 0.22;
        b.selectionMesh.material.opacity = selPulse;
      }
    }

    // Dynamic Central Hearth Core Light (Warm ambient flicker)
    if (hearthCoreLight && ledBlocks.length > 0) {
      var avgHeat = totalFlameHeat / ledBlocks.length;
      hearthCoreLight.color.setHex(activePalette.lightHex);
      hearthCoreLight.intensity = (0.6 + avgHeat * 1.2) * masterLuminance;
    }
  }

  /* ==========================================================================
     INTERACTIVE VOXEL DRAG & DROP
     ========================================================================== */
  function onVoxelPointerDown(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var meshes = ledBlocks.map(function(b) { return b.outerMesh; });
    var intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      var hitBlock = intersects[0].object.parent.userData.block;
      selectVoxel(hitBlock);

      isDragging = true;
      draggedBlock = hitBlock;
      controls.enabled = false;

      dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        draggedBlock.group.position
      );

      if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
        dragOffset.copy(draggedBlock.group.position).sub(planeIntersect);
      }
      dragStartY = draggedBlock.group.position.y;
      dragStartMouseY = e.clientY;

      var cue = document.getElementById('interaction-cue');
      if (cue) cue.style.opacity = '0.4';
    }
  }

  function onVoxelPointerMove(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging && draggedBlock) {
      raycaster.setFromCamera(mouse, camera);

      if (isShiftKeyHeld) {
        var deltaY = (dragStartMouseY - e.clientY) * 0.015;
        var minSupportedY = PLINTH_TOP_Y + (draggedBlock.shapeDef.halfY * draggedBlock.scale);
        draggedBlock.group.position.y = Math.max(minSupportedY, dragStartY + deltaY);
        draggedBlock.baseHoverY = draggedBlock.group.position.y;
      } else {
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
          var target = planeIntersect.add(dragOffset);
          var rad = Math.sqrt(target.x * target.x + target.z * target.z);
          if (rad > 3.3) {
            target.x = (target.x / rad) * 3.3;
            target.z = (target.z / rad) * 3.3;
          }
          draggedBlock.group.position.x = target.x;
          draggedBlock.group.position.z = target.z;
        }
      }
      updateInspectorUI();
    } else {
      raycaster.setFromCamera(mouse, camera);
      var meshes = ledBlocks.map(function(b) { return b.outerMesh; });
      var hits = raycaster.intersectObjects(meshes, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    }
  }

  function onVoxelPointerUp() {
    if (isDragging) {
      isDragging = false;
      draggedBlock = null;
      controls.enabled = true;
      var cue = document.getElementById('interaction-cue');
      if (cue) cue.style.opacity = '1';
    }
  }

  /* ==========================================================================
     KEYBOARD SHORTCUTS & USER CONTROLS
     ========================================================================== */
  function handleKeyDown(e) {
    if (e.key === 'Shift') isShiftKeyHeld = true;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var k = e.key.toLowerCase();

    if (k === 'h') {
      toggleSidePanel();
      e.preventDefault();
      return;
    }
    if (k === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey && !selectedBlock) {
      toggleFullScreen();
      e.preventDefault();
      return;
    }

    if (e.key === 'Tab') {
      cycleSelectedVoxel(e.shiftKey ? -1 : 1);
      e.preventDefault();
      return;
    }

    if (e.key === ' ') {
      toggleSelectedBlockMode();
      e.preventDefault();
      return;
    }

    if (k === 'g') {
      toggleSelectedGravity();
      e.preventDefault();
      return;
    }

    if (e.key === '[' || e.key === '{') {
      stepSelectedScale(-0.1);
      e.preventDefault();
      return;
    }
    if (e.key === ']' || e.key === '}') {
      stepSelectedScale(0.1);
      e.preventDefault();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      removeBlock();
      e.preventDefault();
      return;
    }

    if (!selectedBlock) return;

    var step = 0.12;
    var moved = false;

    // Movement X/Z
    if (k === 'a' || e.key === 'ArrowLeft') {
      moveSelectedVoxel(-step, 0);
      moved = true;
    } else if (k === 'd' || e.key === 'ArrowRight') {
      moveSelectedVoxel(step, 0);
      moved = true;
    } else if (k === 'w' || e.key === 'ArrowUp') {
      moveSelectedVoxel(0, -step);
      moved = true;
    } else if (k === 's' || e.key === 'ArrowDown') {
      moveSelectedVoxel(0, step);
      moved = true;
    }

    // 3-Axis Rotations
    if (k === 'q') {
      rotateSelectedAxis('y', -15);
      moved = true;
    } else if (k === 'e') {
      rotateSelectedAxis('y', 15);
      moved = true;
    }
    if (k === 'z') {
      rotateSelectedAxis('x', -15);
      moved = true;
    } else if (k === 'c') {
      rotateSelectedAxis('x', 15);
      moved = true;
    }

    // R / F : Elevate (Y)
    if (k === 'r' || e.key === 'PageUp') {
      elevateSelectedBlock(0.12);
      moved = true;
    } else if (k === 'f' || e.key === 'PageDown') {
      elevateSelectedBlock(-0.12);
      moved = true;
    }

    if (moved) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e) {
    if (e.key === 'Shift') isShiftKeyHeld = false;
  }

  function moveSelectedVoxel(dx, dz) {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    selectedBlock.group.position.x += dx;
    selectedBlock.group.position.z += dz;

    var rad = Math.sqrt(selectedBlock.group.position.x * selectedBlock.group.position.x + selectedBlock.group.position.z * selectedBlock.group.position.z);
    if (rad > 3.3) {
      selectedBlock.group.position.x = (selectedBlock.group.position.x / rad) * 3.3;
      selectedBlock.group.position.z = (selectedBlock.group.position.z / rad) * 3.3;
    }

    updateInspectorUI();
  }

  function rotateSelectedAxis(axis, deg) {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    var rad = (deg * Math.PI) / 180;
    if (axis === 'x') selectedBlock.group.rotation.x += rad;
    if (axis === 'y') selectedBlock.group.rotation.y += rad;
    if (axis === 'z') selectedBlock.group.rotation.z += rad;
    updateInspectorUI();
  }

  function toggleSelectedGravity() {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    selectedBlock.hasGravity = !selectedBlock.hasGravity;
    selectedBlock.baseHoverY = selectedBlock.group.position.y;
    updateInspectorUI();
  }

  function setSelectedScale(s) {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    selectedBlock.applyScale(s);
    updateInspectorUI();
  }

  function stepSelectedScale(delta) {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    selectedBlock.applyScale(selectedBlock.scale + delta);
    updateInspectorUI();
  }

  function cycleSelectedVoxel(direction) {
    if (ledBlocks.length === 0) return;
    if (!selectedBlock) {
      selectVoxel(ledBlocks[0]);
      return;
    }
    var idx = ledBlocks.indexOf(selectedBlock);
    var nextIdx = (idx + direction + ledBlocks.length) % ledBlocks.length;
    selectVoxel(ledBlocks[nextIdx]);
  }

  function selectVoxel(b) {
    if (selectedBlock) selectedBlock.setSelected(false);
    selectedBlock = b;
    if (selectedBlock) selectedBlock.setSelected(true);
    updateInspectorUI();
  }

  function updateInspectorUI() {
    var idEl = document.getElementById('sel-voxel-id');
    var shapeEl = document.getElementById('sel-voxel-shape');
    var modeEl = document.getElementById('sel-voxel-mode');
    var physEl = document.getElementById('sel-voxel-physics');
    var rotEl = document.getElementById('sel-voxel-rot');
    var scaleLabel = document.getElementById('sel-scale-label');
    var gravBtn = document.getElementById('sel-gravity-btn');
    var gravBtnLabel = document.getElementById('sel-gravity-btn-label');
    var hudGravBadge = document.getElementById('hud-gravity-badge');

    if (!selectedBlock) {
      if (idEl) idEl.innerText = '[NONE]';
      if (shapeEl) shapeEl.innerText = 'NONE';
      if (modeEl) modeEl.innerText = 'SELECT VOXEL';
      if (physEl) { physEl.innerText = 'NO SELECTION'; physEl.className = 'text-[#71768c] font-mono font-bold'; }
      if (rotEl) rotEl.innerText = '0°, 0°, 0°';
      if (scaleLabel) scaleLabel.innerText = '1.00x';
      return;
    }

    if (idEl) idEl.innerText = '[#' + String(selectedBlock.id).padStart(2, '0') + ']';
    if (shapeEl) shapeEl.innerText = selectedBlock.shapeDef.label;
    if (modeEl) modeEl.innerText = selectedBlock.mode === 'flame' ? 'DANCING FLAME' : 'COZY EMBER';

    if (scaleLabel) scaleLabel.innerText = selectedBlock.scale.toFixed(2) + 'x';

    if (selectedBlock.hasGravity) {
      if (physEl) {
        physEl.innerText = 'GRAVITY DYNAMIC';
        physEl.className = 'text-green-400 font-mono font-bold';
      }
      if (gravBtn) {
        gravBtn.classList.add('active');
        gravBtn.classList.remove('border-cyan-500', 'text-cyan-300');
      }
      if (gravBtnLabel) gravBtnLabel.innerText = 'Gravity: ON (Physics ⬇) [G]';
      if (hudGravBadge) {
        hudGravBadge.innerText = '● GRAVITY_ACTIVE';
        hudGravBadge.className = 'text-green-400 text-[9px] font-bold tracking-wider';
      }
    } else {
      if (physEl) {
        physEl.innerText = 'ZERO-G FLOAT';
        physEl.className = 'text-cyan-400 font-mono font-bold';
      }
      if (gravBtn) {
        gravBtn.classList.remove('active');
        gravBtn.classList.add('border-cyan-500', 'text-cyan-300');
      }
      if (gravBtnLabel) gravBtnLabel.innerText = 'Zero-G: FLOAT ✦ [G]';
      if (hudGravBadge) {
        hudGravBadge.innerText = '✦ ZERO_G_HOVER';
        hudGravBadge.className = 'text-cyan-400 text-[9px] font-bold tracking-wider';
      }
    }

    if (rotEl) {
      var rx = Math.round((selectedBlock.group.rotation.x * 180) / Math.PI) % 360;
      var ry = Math.round((selectedBlock.group.rotation.y * 180) / Math.PI) % 360;
      var rz = Math.round((selectedBlock.group.rotation.z * 180) / Math.PI) % 360;
      rotEl.innerText = rx + '°, ' + ry + '°, ' + rz + '°';
    }
  }

  function toggleSelectedBlockMode() {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    selectedBlock.mode = selectedBlock.mode === 'flame' ? 'ember' : 'flame';
    updateInspectorUI();
  }

  function elevateSelectedBlock(delta) {
    if (!selectedBlock) {
      if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
      else return;
    }
    var minSupportedY = PLINTH_TOP_Y + (selectedBlock.shapeDef.halfY * selectedBlock.scale);
    var newY = Math.max(minSupportedY, selectedBlock.group.position.y + delta);
    selectedBlock.group.position.y = Math.round(newY * 100) / 100;
    selectedBlock.baseHoverY = selectedBlock.group.position.y;
    updateInspectorUI();
  }

  /* ==========================================================================
     AUTHENTIC NON-OVERLAPPING CAMPFIRE FORMATIONS (CLEAN 4-SIDED TIMBERS)
     ========================================================================== */
  function clearBlocks() {
    for (var i = 0; i < ledBlocks.length; i++) {
      ledBlocks[i].destroy();
    }
    ledBlocks = [];
    selectedBlock = null;
    updateInspectorUI();
    updateHUDText();
  }

  function applyFormation(type) {
    clearBlocks();

    document.querySelectorAll('.formation-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.innerText.toLowerCase().indexOf(type.slice(0, 4)) !== -1) {
        btn.classList.add('active');
      }
    });

    var curLabel = document.getElementById('formation-current');
    if (curLabel) curLabel.innerText = type.toUpperCase();

    if (type === 'teepee') {
      // Clean 4-Pole Timber Teepee: 4 square timbers leaning inward, meeting only at apex
      // 1. Central glowing coal cube on the plinth
      ledBlocks.push(new LEDVoxel(0, 0.405, 0, 'cube', 'flame', true, 0.95));

      // 2. Four square timbers (North, South, East, West) leaning inward at ~32 degrees
      // North Timber
      var tN = new LEDVoxel(0, 0.81, -0.40, 'timber', 'flame', true, 1.0);
      tN.group.lookAt(0, 1.40, 0);
      ledBlocks.push(tN);

      // South Timber
      var tS = new LEDVoxel(0, 0.81, 0.40, 'timber', 'flame', true, 1.0);
      tS.group.lookAt(0, 1.40, 0);
      ledBlocks.push(tS);

      // West Timber
      var tW = new LEDVoxel(-0.40, 0.81, 0, 'timber', 'flame', true, 1.0);
      tW.group.lookAt(0, 1.40, 0);
      ledBlocks.push(tW);

      // East Timber
      var tE = new LEDVoxel(0.40, 0.81, 0, 'timber', 'flame', true, 1.0);
      tE.group.lookAt(0, 1.40, 0);
      ledBlocks.push(tE);

      // 3. Two diagonal kindling sticks leaning in
      var k1 = new LEDVoxel(-0.35, 0.55, -0.35, 'kindling', 'flame', true, 1.0);
      k1.group.lookAt(0, 1.1, 0);
      var k2 = new LEDVoxel(0.35, 0.55, 0.35, 'kindling', 'flame', true, 1.0);
      k2.group.lookAt(0, 1.1, 0);
      ledBlocks.push(k1, k2);

      // 4. Three Floating Spark Crystals suspended in Zero-G above the apex
      ledBlocks.push(new LEDVoxel(0, 1.85, 0, 'spark', 'flame', false, 1.2));
      ledBlocks.push(new LEDVoxel(-0.25, 2.30, 0.2, 'spark', 'flame', false, 0.9));
      ledBlocks.push(new LEDVoxel(0.2, 2.75, -0.15, 'spark', 'flame', false, 0.7));
    }
    else if (type === 'cabin') {
      // Orthogonal Stacked Cross-Timbers (Zero volume clipping, classic Lincoln Logs fire)
      // Tier 0: 2 chunky square timbers along X resting on plinth (Y = 0.08 + 0.18 = 0.26)
      var t0A = new LEDVoxel(0, 0.26, -0.65, 'chunk', 'ember', true, 1.0);
      t0A.group.rotation.y = Math.PI / 2;
      var t0B = new LEDVoxel(0, 0.26, 0.65, 'chunk', 'ember', true, 1.0);
      t0B.group.rotation.y = Math.PI / 2;
      ledBlocks.push(t0A, t0B);

      // Tier 1: 2 square timbers along Z resting across Tier 0 (Y = 0.26 + 0.28 = 0.54)
      var t1A = new LEDVoxel(-0.65, 0.54, 0, 'timber', 'flame', true, 1.0);
      var t1B = new LEDVoxel(0.65, 0.54, 0, 'timber', 'flame', true, 1.0);
      ledBlocks.push(t1A, t1B);

      // Tier 2: 2 square timbers along X resting across Tier 1 (Y = 0.54 + 0.28 = 0.82)
      var t2A = new LEDVoxel(0, 0.82, -0.65, 'timber', 'flame', true, 1.0);
      t2A.group.rotation.y = Math.PI / 2;
      var t2B = new LEDVoxel(0, 0.82, 0.65, 'timber', 'flame', true, 1.0);
      t2B.group.rotation.y = Math.PI / 2;
      ledBlocks.push(t2A, t2B);

      // Center Coal Heart & Kindling
      ledBlocks.push(new LEDVoxel(0, 0.405, 0, 'cube', 'flame', true, 0.95));
      var cabinK = new LEDVoxel(0, 0.42, 0, 'kindling', 'flame', true, 1.1);
      cabinK.group.rotation.y = 0.75;
      ledBlocks.push(cabinK);

      // Floating spark crystal above the flue
      ledBlocks.push(new LEDVoxel(0, 2.05, 0, 'spark', 'flame', false, 1.2));
    }
    else if (type === 'leanto') {
      // Wilderness Lean-To: Chunky foundation wall at back, timbers leaning across
      // Foundation Wall: 2 chunky timbers stacked at back (Z = -0.65)
      var fWall1 = new LEDVoxel(0, 0.26, -0.65, 'chunk', 'ember', true, 1.1);
      fWall1.group.rotation.y = Math.PI / 2;
      var fWall2 = new LEDVoxel(0, 0.54, -0.65, 'chunk', 'ember', true, 1.1);
      fWall2.group.rotation.y = Math.PI / 2;
      ledBlocks.push(fWall1, fWall2);

      // 3 Timbers resting against the top of the wall (clean non-overlapping lean)
      var xs = [-0.5, 0.0, 0.5];
      for (var j = 0; j < xs.length; j++) {
        var xP = xs[j];
        var leanT = new LEDVoxel(xP, 0.58, -0.15, 'timber', 'flame', true, 1.0);
        leanT.group.lookAt(xP, 0.75, -0.65);
        ledBlocks.push(leanT);
      }

      // Sheltered glowing coals & kindling
      ledBlocks.push(new LEDVoxel(0, 0.405, -0.05, 'cube', 'flame', true, 0.9));
      var ltK = new LEDVoxel(-0.25, 0.20, 0.1, 'kindling', 'flame', true, 1.0);
      ltK.group.rotation.y = 0.5;
      ledBlocks.push(ltK);

      // 2 Floating sparks above
      ledBlocks.push(new LEDVoxel(-0.2, 1.7, -0.1, 'spark', 'flame', false, 1.0));
      ledBlocks.push(new LEDVoxel(0.25, 2.2, -0.15, 'spark', 'flame', false, 0.8));
    }
    else if (type === 'star') {
      // Star Fire: 5 square timbers radiating outwards on floor (Clean non-overlapping sectors)
      for (var s = 0; s < 5; s++) {
        var sAng = (s / 5) * Math.PI * 2;
        var rLog = new LEDVoxel(Math.cos(sAng) * 1.15, 0.22, Math.sin(sAng) * 1.15, 'timber', 'ember', true, 1.0);
        rLog.group.lookAt(0, 0.22, 0);
        ledBlocks.push(rLog);
      }

      // Central coals & crossed kindling
      ledBlocks.push(new LEDVoxel(0, 0.405, 0, 'cube', 'flame', true, 1.0));
      var sK1 = new LEDVoxel(0, 0.74, 0, 'kindling', 'flame', true, 1.1);
      sK1.group.rotation.y = 0.6;
      var sK2 = new LEDVoxel(0, 0.88, 0, 'kindling', 'flame', true, 1.1);
      sK2.group.rotation.y = -0.6;
      ledBlocks.push(sK1, sK2);

      // Floating sparks
      ledBlocks.push(new LEDVoxel(-0.15, 1.75, 0.1, 'spark', 'flame', false, 1.0));
      ledBlocks.push(new LEDVoxel(0.2, 2.25, -0.1, 'spark', 'flame', false, 0.85));
    }
    else if (type === 'darkmatter') {
      // Zero-G Embers Sanctuary (Dark Matter Berlin Light Art)
      ledBlocks.push(new LEDVoxel(0, 0.17, 0, 'slab', 'ember', true, 1.3));
      
      // 4 Short square timbers on the slab perimeter
      var pT1 = new LEDVoxel(0, 0.26, -0.60, 'chunk', 'ember', true, 0.9);
      pT1.group.rotation.y = Math.PI / 2;
      var pT2 = new LEDVoxel(0, 0.26, 0.60, 'chunk', 'ember', true, 0.9);
      pT2.group.rotation.y = Math.PI / 2;
      var pT3 = new LEDVoxel(-0.60, 0.26, 0, 'chunk', 'ember', true, 0.9);
      var pT4 = new LEDVoxel(0.60, 0.26, 0, 'chunk', 'ember', true, 0.9);
      ledBlocks.push(pT1, pT2, pT3, pT4);

      ledBlocks.push(new LEDVoxel(0, 0.405, 0, 'cube', 'flame', true, 0.8));

      // Suspended constellation of 6 floating sparks in Zero-G
      var floatSparks = [
        { x: 0, y: 1.15, z: 0, scale: 1.2 },
        { x: -0.65, y: 1.55, z: -0.4, scale: 0.9 },
        { x: 0.65, y: 1.75, z: -0.4, scale: 0.9 },
        { x: -0.5, y: 2.15, z: 0.5, scale: 0.8 },
        { x: 0.5, y: 2.35, z: 0.5, scale: 0.75 },
        { x: 0, y: 2.80, z: 0, scale: 1.0 }
      ];
      for (var f = 0; f < floatSparks.length; f++) {
        var sp = floatSparks[f];
        ledBlocks.push(new LEDVoxel(sp.x, sp.y, sp.z, 'spark', 'flame', false, sp.scale));
      }

      var floatStick = new LEDVoxel(0, 1.95, 0.2, 'kindling', 'flame', false, 0.9);
      floatStick.group.rotation.x = 0.3;
      ledBlocks.push(floatStick);
    }

    updateHUDText();
    if (ledBlocks.length > 0) selectVoxel(ledBlocks[0]);
  }

  function addBlockWithShape(shapeType) {
    var sh = SHAPES[shapeType] || SHAPES.timber;
    var offset = (Math.random() - 0.5) * 0.8;
    var isSpark = (shapeType === 'spark');
    var spawnY = isSpark ? 1.6 : (PLINTH_TOP_Y + sh.halfY + 0.6);

    var newVoxel = new LEDVoxel(offset, spawnY, -offset, shapeType, 'flame', !isSpark, 1.0);
    newVoxel.group.rotation.y = (Math.random() - 0.5) * 1.2;
    ledBlocks.push(newVoxel);
    selectVoxel(newVoxel);
    updateHUDText();
  }

  function removeBlock() {
    if (ledBlocks.length <= 1) return;
    var target = selectedBlock || ledBlocks[ledBlocks.length - 1];
    var idx = ledBlocks.indexOf(target);
    if (idx !== -1) {
      target.destroy();
      ledBlocks.splice(idx, 1);
    }
    selectVoxel(ledBlocks.length > 0 ? ledBlocks[0] : null);
    updateHUDText();
  }

  function updateHUDText() {
    var hud = document.getElementById('hud-subline');
    if (hud) {
      var audioStateStr = isAudioOn ? 'MATRIX_ONLINE' : 'MUTED';
      hud.innerText = 'VOXELS: ' + ledBlocks.length + ' | PALETTE: ' + activePaletteKey.toUpperCase() + ' | AUDIO: ' + audioStateStr;
    }
  }

  /* ==========================================================================
     CHROMATIC & DYNAMIC FLICKER CONTROLS
     ========================================================================== */
  function setColorPalette(key) {
    if (!PALETTES[key]) return;
    activePaletteKey = key;
    activePalette = PALETTES[key];

    document.querySelectorAll('.palette-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.innerText.toLowerCase().indexOf(key.slice(0, 4)) !== -1) {
        btn.classList.add('active');
      }
    });

    var palLabel = document.getElementById('palette-current');
    if (palLabel) palLabel.innerText = key.toUpperCase();

    if (hearthCoreLight) hearthCoreLight.color.setHex(activePalette.lightHex);

    updateHUDText();
  }

  function updateFlickerSpeed(val) {
    flickerSpeed = parseFloat(val);
    var label = document.getElementById('flicker-speed-val');
    if (label) label.innerText = Number(flickerSpeed.toFixed(2)) + 'x';
  }

  function updateFlickerTurbulence(val) {
    flickerTurbulence = parseFloat(val);
    var label = document.getElementById('flicker-turb-val');
    if (label) label.innerText = flickerTurbulence.toFixed(1) + 'x';
  }

  function updateSpatialIntensity(val) {
    spatialFalloff = parseFloat(val);
    var label = document.getElementById('spatial-val');
    if (label) label.innerText = spatialFalloff.toFixed(2) + 'x';
  }

  function updateLuminance(val) {
    masterLuminance = parseFloat(val);
    var label = document.getElementById('luminance-val');
    if (label) label.innerText = Math.round(masterLuminance * 100) + '%';
  }

  /* ==========================================================================
     MULTI-TRACK SOUNDSCAPE MATRIX & PROCEDURAL HEARTH
     ========================================================================== */
  var audioCtx = null;
  var isAudioOn = false;
  var masterGain = null;
  var dynamicsCompressor = null;
  var analyserNode = null;
  var vuAnimFrame = null;
  var rumbleSource = null;
  var rumbleGain = null;
  var popTimeout = null;
  var currentVolume = 0.75;
  var useDirectFallback = false;

  var stemStates = {
    music: { active: true, volume: 0.65, elId: 'audio-stem-music', isMedia: true },
    crackle: { active: true, volume: 0.85, elId: 'audio-stem-crackle', isMedia: true },
    wind: { active: true, volume: 0.45, elId: 'audio-stem-wind', isMedia: true },
    crickets: { active: false, volume: 0.40, elId: 'audio-stem-crickets', isMedia: true },
    pops: { active: true, volume: 0.70, isMedia: false }
  };

  var stemNodes = {
    sources: {},
    gains: {}
  };

  function getAudioContext() {
    if (!audioCtx) {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // Dynamics compressor prevents harshness and creates unified warm glue
      dynamicsCompressor = audioCtx.createDynamicsCompressor();
      dynamicsCompressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
      dynamicsCompressor.knee.setValueAtTime(12, audioCtx.currentTime);
      dynamicsCompressor.ratio.setValueAtTime(4.5, audioCtx.currentTime);
      dynamicsCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      dynamicsCompressor.release.setValueAtTime(0.15, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);

      // Real-time frequency analyser for visual VU meter
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.65;

      masterGain.connect(dynamicsCompressor);
      dynamicsCompressor.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      // Wire HTML5 media stems into Web Audio graph
      ['music', 'crackle', 'wind', 'crickets'].forEach(function(key) {
        var el = document.getElementById(stemStates[key].elId);
        if (el && !stemNodes.sources[key]) {
          try {
            var src = audioCtx.createMediaElementSource(el);
            var g = audioCtx.createGain();
            var targetVol = stemStates[key].active ? stemStates[key].volume : 0;
            g.gain.setValueAtTime(targetVol, audioCtx.currentTime);
            src.connect(g);
            g.connect(masterGain);
            stemNodes.sources[key] = src;
            stemNodes.gains[key] = g;
          } catch(err) {
            console.warn('Web Audio media source fallback for ' + key + ':', err);
            useDirectFallback = true;
          }
        }
      });
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function toggleAudio() {
    if (isAudioOn) {
      stopAudio();
    } else {
      startAudio();
    }
  }

  function startAudio() {
    var ctx = getAudioContext();

    // 1. Warm Low Hearth Rumble & Sub-Draft (105Hz low-pass)
    try {
      if (!rumbleSource) {
        var bufSize = ctx.sampleRate * 2;
        var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        var data = buf.getChannelData(0);
        var last = 0.0;
        for (var i = 0; i < bufSize; i++) {
          var white = Math.random() * 2 - 1;
          data[i] = (last + (0.02 * white)) / 1.02;
          last = data[i];
          data[i] *= 2.2;
        }
        rumbleSource = ctx.createBufferSource();
        rumbleSource.buffer = buf;
        rumbleSource.loop = true;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(105, ctx.currentTime);
        filter.Q.setValueAtTime(1.1, ctx.currentTime);

        rumbleGain = ctx.createGain();
        var rumbleVol = stemStates.crackle.active ? 0.35 : 0.0;
        rumbleGain.gain.setValueAtTime(rumbleVol, ctx.currentTime);

        rumbleSource.connect(filter);
        filter.connect(rumbleGain);
        rumbleGain.connect(masterGain);
        rumbleSource.start();
      }
    } catch(e) {
      console.warn('Rumble source error:', e);
    }

    // 2. Start all active media stems
    ['music', 'crackle', 'wind', 'crickets'].forEach(function(key) {
      var st = stemStates[key];
      var el = document.getElementById(st.elId);
      if (el) {
        if (st.active) {
          if (useDirectFallback) {
            el.volume = currentVolume * st.volume;
          } else if (stemNodes.gains[key]) {
            stemNodes.gains[key].gain.setValueAtTime(st.volume, ctx.currentTime);
          }
          el.play().catch(function(e) { console.warn('Stem autoplay prevented on ' + key, e); });
        } else {
          el.pause();
          if (stemNodes.gains[key]) {
            stemNodes.gains[key].gain.setValueAtTime(0, ctx.currentTime);
          }
        }
      }
    });

    // 3. Schedule resonant acoustic sap pops
    if (stemStates.pops.active) {
      scheduleResonantPops(ctx);
    }

    isAudioOn = true;
    startVUAnimation();
    updateAudioUI();
    updateHUDText();
  }

  function stopAudio() {
    if (rumbleSource) {
      try { rumbleSource.stop(); } catch(e) {}
      rumbleSource = null;
      rumbleGain = null;
    }
    if (popTimeout) {
      clearTimeout(popTimeout);
      popTimeout = null;
    }

    ['music', 'crackle', 'wind', 'crickets'].forEach(function(key) {
      var el = document.getElementById(stemStates[key].elId);
      if (el) {
        el.pause();
      }
      if (stemNodes.gains[key] && audioCtx) {
        try { stemNodes.gains[key].gain.setValueAtTime(0, audioCtx.currentTime); } catch(e) {}
      }
    });

    isAudioOn = false;
    stopVUAnimation();
    updateAudioUI();
    updateHUDText();
  }

  function toggleStem(key) {
    if (!stemStates[key]) return;
    var st = stemStates[key];
    st.active = !st.active;

    // Update UI button and indicator styling
    var btn = document.getElementById('stem-btn-' + key);
    if (btn) {
      if (st.active) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }

    if (!isAudioOn) return;

    var ctx = getAudioContext();
    if (st.isMedia) {
      var el = document.getElementById(st.elId);
      if (st.active) {
        if (useDirectFallback && el) {
          el.volume = currentVolume * st.volume;
        } else if (stemNodes.gains[key]) {
          stemNodes.gains[key].gain.setTargetAtTime(st.volume, ctx.currentTime, 0.05);
        }
        if (el) el.play().catch(function(e) {});
      } else {
        if (useDirectFallback && el) {
          el.volume = 0;
        } else if (stemNodes.gains[key]) {
          stemNodes.gains[key].gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        }
        if (el) {
          setTimeout(function() {
            if (!st.active && el) el.pause();
          }, 120);
        }
      }
      if (key === 'crackle' && rumbleGain) {
        rumbleGain.gain.setTargetAtTime(st.active ? 0.35 : 0, ctx.currentTime, 0.08);
      }
    } else if (key === 'pops') {
      if (st.active) {
        if (!popTimeout) scheduleResonantPops(ctx);
      } else {
        if (popTimeout) {
          clearTimeout(popTimeout);
          popTimeout = null;
        }
      }
    }
  }

  function setStemVolume(key, val) {
    if (!stemStates[key]) return;
    var v = parseFloat(val);
    stemStates[key].volume = v;

    var label = document.getElementById('stem-val-' + key);
    if (label) label.innerText = Math.round(v * 100) + '%';

    if (!isAudioOn || !stemStates[key].active) return;

    if (stemStates[key].isMedia) {
      if (useDirectFallback) {
        var el = document.getElementById(stemStates[key].elId);
        if (el) el.volume = currentVolume * v;
      } else if (stemNodes.gains[key] && audioCtx) {
        stemNodes.gains[key].gain.setTargetAtTime(v, audioCtx.currentTime, 0.05);
      }
    }
  }

  function setAudioVolume(val) {
    currentVolume = parseFloat(val);
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(currentVolume, audioCtx.currentTime, 0.05);
    }
    if (useDirectFallback) {
      ['music', 'crackle', 'wind', 'crickets'].forEach(function(key) {
        var el = document.getElementById(stemStates[key].elId);
        if (el && isAudioOn && stemStates[key].active) {
          el.volume = currentVolume * stemStates[key].volume;
        }
      });
    }
    var label = document.getElementById('volume-val');
    if (label) label.innerText = Math.round(currentVolume * 100) + '%';
  }

  function applySoundPreset(preset) {
    var targets = {
      fire: { music: false, crackle: true, wind: false, crickets: false, pops: true },
      gallery: { music: true, crackle: true, wind: true, crickets: false, pops: true },
      forest: { music: false, crackle: true, wind: true, crickets: true, pops: true },
      all: { music: true, crackle: true, wind: true, crickets: true, pops: true }
    };
    var target = targets[preset];
    if (!target) return;

    Object.keys(target).forEach(function(key) {
      if (stemStates[key].active !== target[key]) {
        toggleStem(key);
      }
    });

    if (!isAudioOn) {
      startAudio();
    }
  }

  function scheduleResonantPops(ctx) {
    if (popTimeout) clearTimeout(popTimeout);

    function nextPop() {
      if (!isAudioOn || !stemStates.pops.active) return;
      triggerResonantPop(ctx);
      var delay = 130 + Math.random() * 260;
      popTimeout = setTimeout(nextPop, delay);
    }
    nextPop();
  }

  function triggerResonantPop(ctx) {
    var now = ctx.currentTime;
    var userPopVol = stemStates.pops.volume;

    // A: Warm triangle pitch dive (320Hz -> 100Hz)
    var osc = ctx.createOscillator();
    var oscGain = ctx.createGain();
    var startFreq = 300 + Math.random() * 160;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(95 + Math.random() * 25, now + 0.045);

    var popVol = (0.50 + Math.random() * 0.35) * userPopVol;
    oscGain.gain.setValueAtTime(popVol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.055);

    // B: Resonant wood acoustic knock
    var dur = 0.028;
    var len = Math.floor(ctx.sampleRate * dur);
    var b = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.32));
    }
    var nSrc = ctx.createBufferSource();
    nSrc.buffer = b;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(480 + Math.random() * 280, now);
    bp.Q.setValueAtTime(2.4, now);
    var nGain = ctx.createGain();
    nGain.gain.setValueAtTime(popVol * 0.7, now);
    nSrc.connect(bp);
    bp.connect(nGain);
    nGain.connect(masterGain);
    nSrc.start(now);
  }

  function startVUAnimation() {
    if (vuAnimFrame) cancelAnimationFrame(vuAnimFrame);

    var b1 = document.getElementById('vu-1');
    var b2 = document.getElementById('vu-2');
    var b3 = document.getElementById('vu-3');
    var b4 = document.getElementById('vu-4');
    var freqData = new Uint8Array(32);

    function loop() {
      if (!isAudioOn) return;
      if (analyserNode) {
        analyserNode.getByteFrequencyData(freqData);

        // Lows (0-3), Low-Mid (4-8), High-Mid (9-16), High (17-31)
        var l = (freqData[1] + freqData[2] + freqData[3]) / 3;
        var lm = (freqData[4] + freqData[6] + freqData[8]) / 3;
        var hm = (freqData[10] + freqData[12] + freqData[14]) / 3;
        var h = (freqData[18] + freqData[22] + freqData[26]) / 3;

        updateVUBar(b1, l > 35, l / 255);
        updateVUBar(b2, lm > 30, lm / 255);
        updateVUBar(b3, hm > 25, hm / 255);
        updateVUBar(b4, h > 20, h / 255);
      }
      vuAnimFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  function updateVUBar(el, isActive, norm) {
    if (!el) return;
    if (isActive) {
      el.classList.add('active');
      var h = Math.max(4, Math.min(16, Math.round(norm * 16)));
      el.style.height = h + 'px';
    } else {
      el.classList.remove('active');
      el.style.height = '4px';
    }
  }

  function stopVUAnimation() {
    if (vuAnimFrame) {
      cancelAnimationFrame(vuAnimFrame);
      vuAnimFrame = null;
    }
    ['vu-1', 'vu-2', 'vu-3', 'vu-4'].forEach(function(id) {
      var b = document.getElementById(id);
      if (b) {
        b.classList.remove('active');
        b.style.height = '4px';
      }
    });
  }

  function updateAudioUI() {
    var btn = document.getElementById('audio-btn');
    var icon = document.getElementById('audio-icon');
    var label = document.getElementById('audio-label');
    var status = document.getElementById('audio-status-label');

    if (isAudioOn) {
      if (btn) btn.classList.add('active');
      if (icon) icon.innerText = 'volume_up';
      if (label) label.innerText = 'Mute Master Audio';
      if (status) {
        status.innerText = 'ONLINE';
        status.classList.remove('text-[#71768c]');
        status.classList.add('text-green-400');
      }
    } else {
      if (btn) btn.classList.remove('active');
      if (icon) icon.innerText = 'volume_off';
      if (label) label.innerText = 'Start Campfire Audio';
      if (status) {
        status.innerText = 'OFF';
        status.classList.remove('text-green-400');
        status.classList.add('text-[#71768c]');
      }
    }
  }

  /* ==========================================================================
     LAYOUT & RESIZE
     ========================================================================== */
  function toggleSidePanel() {
    isSidePanelVisible = !isSidePanelVisible;
    var panel = document.getElementById('techno-side-panel');
    var unhideBtn = document.getElementById('unhide-panel-btn');
    var toggleBtnLabel = document.getElementById('panel-toggle-label');

    if (isSidePanelVisible) {
      panel.style.display = 'flex';
      unhideBtn.classList.remove('flex');
      unhideBtn.classList.add('hidden');
      if (toggleBtnLabel) toggleBtnLabel.innerText = 'Hide Panel';
    } else {
      panel.style.display = 'none';
      unhideBtn.classList.remove('hidden');
      unhideBtn.classList.add('flex');
      if (toggleBtnLabel) toggleBtnLabel.innerText = 'Show Panel';
    }
    setTimeout(handleWindowResize, 50);
  }

  function toggleFullScreen() {
    var elem = document.getElementById('viewport-wrapper');
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  function resetCamera() {
    camera.position.set(0, 4.2, 8.2);
    controls.target.set(0, 0.75, 0);
    controls.update();
  }

  function handleWindowResize() {
    var container = document.getElementById('canvas-3d');
    if (!container || !renderer || !camera) return;
    var width = container.clientWidth;
    var height = container.clientHeight;
    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  /* ==========================================================================
     ANIMATION LOOP
     ========================================================================== */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    var delta = Math.min(0.05, clock.getDelta());
    var time = clock.getElapsedTime();

    if (controls) controls.update();

    // Gravity Physics Simulation (Strict downward bounds, no flying into space)
    updateGravityPhysics(delta);

    // Dynamic Emitter Lights and Radiant Heat Falloff
    updateBlockPhysicsAndLighting(time);

    var camX = document.getElementById('cam-x');
    var camY = document.getElementById('cam-y');
    var camZ = document.getElementById('cam-z');
    if (camX && camera) {
      camX.innerText = camera.position.x.toFixed(1);
      camY.innerText = camera.position.y.toFixed(1);
      camZ.innerText = camera.position.z.toFixed(1);
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
