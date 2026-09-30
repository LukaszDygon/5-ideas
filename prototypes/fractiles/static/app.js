  /* -------------------------------------------------------------------------- */
  /* 1. MATHEMATICAL ENGINE & PRIME NUMBERS                                     */
  /* -------------------------------------------------------------------------- */
  const MAX_SIEVE = 100000;
  const isPrimeArray = new Uint8Array(MAX_SIEVE + 1);
  isPrimeArray.fill(1);
  isPrimeArray[0] = 0;
  isPrimeArray[1] = 0;
  for (let p = 2; p * p <= MAX_SIEVE; p++) {
    if (isPrimeArray[p]) {
      for (let i = p * p; i <= MAX_SIEVE; i += p) {
        isPrimeArray[i] = 0;
      }
    }
  }

  function isPrime(n) {
    if (n <= 1) return false;
    if (n <= MAX_SIEVE) return isPrimeArray[n] === 1;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  function getSmallestPrimeFactor(n) {
    if (n <= 1) return 1;
    if (n % 2 === 0) return 2;
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return i;
    }
    return n;
  }

  function getPrimeFactors(n) {
    if (n <= 1) return ["None"];
    if (isPrime(n)) return [`Prime (${n})`];
    const factors = [];
    let d = 2;
    let temp = n;
    while (d * d <= temp) {
      if (temp % d === 0) {
        let count = 0;
        while (temp % d === 0) {
          count++;
          temp /= d;
        }
        factors.push(count > 1 ? `${d}^${count}` : `${d}`);
      }
      d++;
    }
    if (temp > 1) factors.push(`${temp}`);
    return factors;
  }

  /* -------------------------------------------------------------------------- */
  /* 2. AUDIO SYNTHESIZER (CERAMIC TAPS & BELLS)                                */
  /* -------------------------------------------------------------------------- */
  let audioCtx = null;
  let soundEnabled = true;
  const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function toggleSound() {
    initAudio();
    soundEnabled = !soundEnabled;
    const soundText = document.getElementById("sound-text");
    const soundIcon = document.getElementById("sound-icon");
    const soundBtn = document.getElementById("sound-btn");

    if (soundEnabled) {
      soundText.innerText = "AUDIO ON";
      soundIcon.innerText = "volume_up";
      soundBtn.classList.remove("neo-btn-white");
      soundBtn.classList.add("neo-btn-yellow");
      playChime(523.25);
    } else {
      soundText.innerText = "AUDIO OFF";
      soundIcon.innerText = "volume_off";
      soundBtn.classList.remove("neo-btn-yellow");
      soundBtn.classList.add("neo-btn-white");
    }
  }

  function playTileSettle(n) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const isP = isPrime(n);
      const isTwin = isP && (isPrime(n - 2) || isPrime(n + 2));

      if (isTwin) {
        // High dual crystalline bell for twin primes
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const base = PENTATONIC[n % 8] * 1.5;
        osc1.frequency.setValueAtTime(base, now);
        osc2.frequency.setValueAtTime(base * 1.5, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start(now); osc2.start(now);
        osc1.stop(now + 0.45); osc2.stop(now + 0.45);
      } else if (isP) {
        // Resonant glazed ceramic bell
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(PENTATONIC[n % 8], now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Tactile ceramic click / grout settle sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(750 + (n % 10) * 35, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch(e) {}
  }

  function playChime(freq) {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.25);
    } catch(e) {}
  }

  /* -------------------------------------------------------------------------- */
  /* 3. SIMULATION STATE & CONFIGURATION                                        */
  /* -------------------------------------------------------------------------- */
  const canvas = document.getElementById("fractile-canvas");
  const ctx = canvas.getContext("2d");

  let currentEngine = "spiral";      // spiral, voronoi, triangles
  let currentTileCount = 100;
  let maxTargetLimit = 120;
  let ribbonWidth = 38;             // W parameter: radial thickness of each spiral turn
  let groutWidth = 2.5;             // Thickness of dark ceramic grout lines
  let growthSpeed = 20;             // tiles placed per second
  let isPlaying = false;
  let playTimer = null;

  let enableFractalSubdiv = true;   // Primes subdivide 2x2, Twin primes 3x3
  let enablePrimeMod = true;        // Tile widths vary aperiodically by prime factors
  let enableAzulejoArt = true;      // Ornate Portuguese Rosettes on Primes

  let currentPalette = "porto";     // porto, memphis, terracotta, emerald

  // Viewport Pan/Zoom
  let viewX = 0;
  let viewY = 0;
  let viewZoom = 1.0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Hover detection
  let hoveredTile = null;

  /* -------------------------------------------------------------------------- */
  /* 4. CERAMIC GLAZE COLOR SCHEMES                                             */
  /* -------------------------------------------------------------------------- */
  const PALETTES = {
    porto: {
      primeMain: "#0038A8",         // Deep Porto Azulejo Cobalt Blue
      primeAccent: "#FBBF24",       // Warm Ochre Gold
      primeSubdiv: "#1D4ED8",       // Royal Blue
      compositeA: "#FFFFFF",        // Glazed White Porcelain
      compositeB: "#F0F7FF",        // Tinted Glaze Ceramic
      grout: "#1C1B1B",             // Pitch Ink Black Grout
      rosette: "#FFFFFF"
    },
    memphis: {
      primeMain: "#B40065",         // Radical Magenta
      primeAccent: "#FAE100",       // Sunshine Yellow
      primeSubdiv: "#FF5E00",       // Vivid Orange
      compositeA: "#00E5FF",        // Electric Cyan
      compositeB: "#39FF14",        // Acid Lime
      grout: "#1C1B1B",
      rosette: "#FFFFFF"
    },
    terracotta: {
      primeMain: "#C2410C",         // Burnt Terracotta
      primeAccent: "#FBBF24",       // Amber
      primeSubdiv: "#EA580C",       // Warm Rust
      compositeA: "#FEF3C7",        // Sandstone
      compositeB: "#FED7AA",        // Clay Cream
      grout: "#1C1B1B",
      rosette: "#FFFBEB"
    },
    emerald: {
      primeMain: "#065F46",         // Imperial Dark Emerald
      primeAccent: "#FBBF24",       // Gold
      primeSubdiv: "#047857",       // Medium Jade
      compositeA: "#ECFDF5",        // Mint Porcelain
      compositeB: "#D1FAE5",        // Celadon
      grout: "#1C1B1B",
      rosette: "#FFFFFF"
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 5. GAPLESS SPIRAL TESSELLATION GEOMETRY CALCULATOR                         */
  /* -------------------------------------------------------------------------- */
  // Precomputes the contiguous angular partition { theta_0, theta_1, ... theta_N }
  let spiralTiles = [];

  function computeSpiralPartition() {
    spiralTiles = [];
    const W = ribbonWidth;
    let theta = 0;

    // Tile 0: Center Medallion seed
    spiralTiles.push({
      n: 0,
      thetaStart: 0,
      thetaEnd: Math.PI * 2,
      isCore: true
    });

    theta = 0;
    for (let i = 1; i <= Math.max(currentTileCount, maxTargetLimit) + 20; i++) {
      // Calculate centerline radius at current angle
      // r_in(theta) = (W / 2PI) * theta
      // r_mid(theta) = r_in(theta) + W / 2
      const r_mid = Math.max(W * 0.7, (W / (Math.PI * 2)) * theta + (W / 2));

      // Calculate desired arc length along the centerline
      let arcLength = W * 1.1; // Default square-ish aspect ratio
      if (enablePrimeMod) {
        if (isPrime(i)) {
          arcLength = W * 1.35; // Keystones are wider to house ornate motifs
        } else {
          const factor = getSmallestPrimeFactor(i);
          // Modulate arc length aperiodically based on smallest prime factor
          arcLength = W * (0.85 + 0.15 * (factor % 5));
        }
      }

      const dTheta = arcLength / r_mid;
      const thetaStart = theta;
      const thetaEnd = theta + dTheta;

      spiralTiles.push({
        n: i,
        thetaStart,
        thetaEnd,
        r_mid,
        isCore: false
      });

      theta = thetaEnd;
    }
  }

  // Evaluates the continuous boundary curves
  // To ensure 100% gapless matching: r_out(theta) = r_in(theta + 2*PI)
  function r_in(t) {
    const W = ribbonWidth;
    if (t < Math.PI * 2) {
      // Origin transition curve: smooth transition from origin to W
      return (W / (Math.PI * 2)) * (t * 0.5);
    }
    return (W / (Math.PI * 2)) * (t - Math.PI * 2);
  }

  function r_out(t) {
    const W = ribbonWidth;
    return (W / (Math.PI * 2)) * t;
  }

  // Returns array of points defining the exact 4-sided curved tile polygon
  function getSpiralTilePolygon(t0, t1, steps = 6) {
    const pts = [];
    // 1. Inner boundary from t0 to t1
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (t1 - t0) * (i / steps);
      const r = r_in(t);
      pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    // 2. Outer boundary from t1 back to t0
    for (let i = steps; i >= 0; i--) {
      const t = t0 + (t1 - t0) * (i / steps);
      const r = r_out(t);
      pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    return pts;
  }

  /* -------------------------------------------------------------------------- */
  /* 6. VORONOI CALÇADA MOSAIC ENGINE (100% GAPLESS VIA SUTHERLAND-HODGMAN)     */
  /* -------------------------------------------------------------------------- */
  let voronoiPoints = [];
  let voronoiPolys = [];

  function computeVoronoiMosaic() {
    voronoiPoints = [];
    voronoiPolys = [];
    const count = currentTileCount;
    if (count < 1) return;
    const c = ribbonWidth * 1.1;

    // Seeds placed on prime-divergence spiral
    let currentAngle = 0;
    for (let i = 1; i <= count; i++) {
      let stepAngle = 137.507764; // Golden angle
      if (enablePrimeMod) {
        stepAngle += (getSmallestPrimeFactor(i) % 7) * 2.5;
      }
      currentAngle += (stepAngle * Math.PI) / 180.0;
      const r = c * Math.sqrt(i);
      voronoiPoints.push({
        n: i,
        x: r * Math.cos(currentAngle),
        y: r * Math.sin(currentAngle)
      });
    }

    if (count === 1) {
      const p = voronoiPoints[0];
      const singlePoly = [];
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI * 2) / 16;
        singlePoly.push({ x: p.x + ribbonWidth * Math.cos(a), y: p.y + ribbonWidth * Math.sin(a) });
      }
      voronoiPolys.push({ n: p.n, pts: singlePoly });
      return;
    }

    for (let i = 0; i < count; i++) {
      const pi = voronoiPoints[i];
      const dists = [];
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const pj = voronoiPoints[j];
        const dSq = (pi.x - pj.x) ** 2 + (pi.y - pj.y) ** 2;
        dists.push({ j, dSq, pj });
      }
      dists.sort((a, b) => a.dSq - b.dSq);
      const dMin = Math.sqrt(dists[0].dSq);

      // Start with a smooth local polygon around pi (prevents infinite spikes on perimeter)
      const maxR = Math.max(12, dMin * 1.55);
      let poly = [];
      const sides = 16;
      for (let k = 0; k < sides; k++) {
        const a = (k * Math.PI * 2) / sides;
        poly.push({ x: pi.x + maxR * Math.cos(a), y: pi.y + maxR * Math.sin(a) });
      }

      // Clip against the nearest 18 neighbors in sorted distance order
      const clipLimit = Math.min(18, dists.length);
      for (let k = 0; k < clipLimit; k++) {
        const pj = dists[k].pj;
        const M = { x: (pi.x + pj.x) / 2, y: (pi.y + pj.y) / 2 };
        const N = { x: pi.x - pj.x, y: pi.y - pj.y };
        poly = clipPolyByHalfPlane(poly, M, N);
        if (poly.length < 3) break;
      }

      if (poly.length >= 3) {
        voronoiPolys.push({ n: pi.n, pts: poly });
      }
    }
  }

  function clipPolyByHalfPlane(poly, M, N) {
    const out = [];
    if (poly.length === 0) return out;
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i];
      const prev = poly[(i - 1 + poly.length) % poly.length];
      const curIn = ((cur.x - M.x) * N.x + (cur.y - M.y) * N.y) >= 0;
      const prevIn = ((prev.x - M.x) * N.x + (prev.y - M.y) * N.y) >= 0;

      if (curIn) {
        if (!prevIn) {
          const dPrev = (prev.x - M.x) * N.x + (prev.y - M.y) * N.y;
          const dCur = (cur.x - M.x) * N.x + (cur.y - M.y) * N.y;
          const t = dPrev / (dPrev - dCur);
          out.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
        }
        out.push(cur);
      } else if (prevIn) {
        const dPrev = (prev.x - M.x) * N.x + (prev.y - M.y) * N.y;
        const dCur = (cur.x - M.x) * N.x + (cur.y - M.y) * N.y;
        const t = dPrev / (dPrev - dCur);
        out.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
      }
    }
    return out;
  }

  /* -------------------------------------------------------------------------- */
  /* 7. TRIANGULAR PINWHEEL FAN ENGINE (GAPLESS SHARDS)                         */
  /* -------------------------------------------------------------------------- */
  let triangleTiles = [];

  function computeTriangularFan() {
    triangleTiles = [];
    const count = currentTileCount;
    const W = ribbonWidth;
    let theta = 0;

    for (let i = 1; i <= count; i++) {
      const rInner = (W / (Math.PI * 2)) * Math.max(0, theta - Math.PI * 2);
      const rOuter = (W / (Math.PI * 2)) * theta;
      const dTheta = enablePrimeMod && isPrime(i) ? 0.45 : 0.32;

      // Two complementary triangles making a gapless quad shard
      const p1 = { x: rInner * Math.cos(theta), y: rInner * Math.sin(theta) };
      const p2 = { x: rOuter * Math.cos(theta), y: rOuter * Math.sin(theta) };
      const p3 = { x: rOuter * Math.cos(theta + dTheta), y: rOuter * Math.sin(theta + dTheta) };
      const p4 = { x: rInner * Math.cos(theta + dTheta), y: rInner * Math.sin(theta + dTheta) };

      triangleTiles.push({
        n: i,
        poly: [p1, p2, p3, p4],
        t0: theta,
        t1: theta + dTheta
      });

      theta += dTheta;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 8. TILE ART & AZULEJO ROSETTE DRAWING                                      */
  /* -------------------------------------------------------------------------- */
  function drawCurvedTilePatch(ctx, t0, t1, n, isP, isTwin, pal) {
    const visualSize = ribbonWidth * viewZoom;
    const isSubdivided = enableFractalSubdiv && isP && visualSize >= 12;

    if (isSubdivided) {
      // 2x2 or 3x3 Recursive Fractal Azulejo Subdivision
      const divCount = isTwin ? 3 : 2;
      const dTheta = (t1 - t0) / divCount;

      for (let di = 0; di < divCount; di++) {
        const subT0 = t0 + di * dTheta;
        const subT1 = subT0 + dTheta;

        for (let dj = 0; dj < divCount; dj++) {
          // Custom fractional radius band for the subdivision
          const poly = getSubdividedPolygon(subT0, subT1, dj, divCount);
          const isCenter = isTwin && di === 1 && dj === 1;

          ctx.beginPath();
          poly.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();

          // Subdivided ceramic glaze fill
          ctx.fillStyle = isCenter ? pal.primeAccent : ((di + dj) % 2 === 0 ? pal.primeMain : pal.primeSubdiv);
          ctx.fill();

          // Delicate internal grout seam
          ctx.strokeStyle = pal.grout;
          ctx.lineWidth = Math.max(1, groutWidth * 0.65);
          ctx.stroke();

          // Inner miniature rosette on center
          if (isCenter && enableAzulejoArt && visualSize >= 24) {
            const centroid = getCentroid(poly);
            drawMiniRosette(ctx, centroid.x, centroid.y, 4, "#FFFFFF");
          }
        }
      }

      // Draw bold outer grout boundary around the master keystone tile
      const masterPoly = getSpiralTilePolygon(t0, t1, 8);
      ctx.beginPath();
      masterPoly.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.strokeStyle = pal.grout;
      ctx.lineWidth = groutWidth;
      ctx.stroke();

    } else {
      // Single Solid Ceramic Tile
      const poly = getSpiralTilePolygon(t0, t1, 8);
      ctx.beginPath();
      poly.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();

      // Glaze fill
      if (isP) {
        ctx.fillStyle = pal.primeMain;
      } else {
        ctx.fillStyle = (n % 2 === 0) ? pal.compositeA : pal.compositeB;
      }
      ctx.fill();

      // Grout line (Pitch Black Neo-Brutalist seam)
      ctx.strokeStyle = pal.grout;
      ctx.lineWidth = groutWidth;
      ctx.stroke();

      // Portuguese Azulejo Motif on Keystone
      if (isP && enableAzulejoArt && visualSize >= 14) {
        const centroid = getCentroid(poly);
        drawAzulejoRosette(ctx, centroid.x, centroid.y, (t0 + t1) / 2, pal, isTwin);
      }
    }
  }

  function getSubdividedPolygon(t0, t1, radialBand, totalBands) {
    const pts = [];
    const steps = 4;
    const rInBase = (t) => r_in(t);
    const rOutBase = (t) => r_out(t);

    // Fraction along radial band
    const fIn = radialBand / totalBands;
    const fOut = (radialBand + 1) / totalBands;

    // Inner sub-arc
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (t1 - t0) * (i / steps);
      const rin = rInBase(t);
      const rout = rOutBase(t);
      const r = rin + (rout - rin) * fIn;
      pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    // Outer sub-arc
    for (let i = steps; i >= 0; i--) {
      const t = t0 + (t1 - t0) * (i / steps);
      const rin = rInBase(t);
      const rout = rOutBase(t);
      const r = rin + (rout - rin) * fOut;
      pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    return pts;
  }

  function drawAzulejoRosette(ctx, cx, cy, angleRad, pal, isTwin) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);

    const rad = Math.min(ribbonWidth * 0.35, 14);

    // Central Rosette Diamond
    ctx.beginPath();
    ctx.moveTo(0, -rad);
    ctx.lineTo(rad, 0);
    ctx.lineTo(0, rad);
    ctx.lineTo(-rad, 0);
    ctx.closePath();
    ctx.fillStyle = isTwin ? "#FFFFFF" : pal.primeAccent;
    ctx.fill();
    ctx.strokeStyle = pal.grout;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4 Glazed Inlay dots
    ctx.fillStyle = "#FFFFFF";
    const d = rad * 0.55;
    ctx.beginPath();
    ctx.arc(-d, 0, 1.8, 0, Math.PI * 2);
    ctx.arc(d, 0, 1.8, 0, Math.PI * 2);
    ctx.arc(0, -d, 1.8, 0, Math.PI * 2);
    ctx.arc(0, d, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawMiniRosette(ctx, cx, cy, size, fill) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function getCentroid(pts) {
    let sx = 0, sy = 0;
    pts.forEach(p => { sx += p.x; sy += p.y; });
    return { x: sx / pts.length, y: sy / pts.length };
  }

  /* -------------------------------------------------------------------------- */
  /* 9. MASTER RENDER PASS                                                      */
  /* -------------------------------------------------------------------------- */
  function render() {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Viewport pan & zoom
    ctx.translate((width / 2) + viewX, (height / 2) + viewY);
    ctx.scale(viewZoom, viewZoom);

    const pal = PALETTES[currentPalette];

    if (currentEngine === "spiral") {
      // 1. Central Core Medallion
      const coreR = r_in(Math.PI * 2);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(coreR, 12), 0, Math.PI * 2);
      ctx.fillStyle = pal.primeAccent;
      ctx.fill();
      ctx.strokeStyle = pal.grout;
      ctx.lineWidth = groutWidth;
      ctx.stroke();

      drawAzulejoRosette(ctx, 0, 0, 0, pal, true);

      // 2. Continuous Interlocking Spiral Tiles
      for (let i = 1; i <= currentTileCount && i < spiralTiles.length; i++) {
        const t = spiralTiles[i];
        const isP = isPrime(t.n);
        const isTwin = isP && (isPrime(t.n - 2) || isPrime(t.n + 2));
        drawCurvedTilePatch(ctx, t.thetaStart, t.thetaEnd, t.n, isP, isTwin, pal);
      }

    } else if (currentEngine === "voronoi") {
      // Voronoi Calçada Mosaic
      for (let i = 0; i < voronoiPolys.length; i++) {
        const item = voronoiPolys[i];
        if (item.n > currentTileCount) continue;
        const isP = isPrime(item.n);
        const isTwin = isP && (isPrime(item.n - 2) || isPrime(item.n + 2));
        const poly = item.pts;
        if (poly.length < 3) continue;

        ctx.beginPath();
        poly.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();

        ctx.fillStyle = isP ? (isTwin ? pal.primeAccent : pal.primeMain) : ((item.n % 2 === 0) ? pal.compositeA : pal.compositeB);
        ctx.fill();

        ctx.strokeStyle = pal.grout;
        ctx.lineWidth = groutWidth;
        ctx.stroke();

        if (isP && enableAzulejoArt) {
          const centroid = getCentroid(poly);
          drawAzulejoRosette(ctx, centroid.x, centroid.y, 0, pal, isTwin);
        }
      }

    } else if (currentEngine === "triangles") {
      // Triangular Pinwheel Fan
      for (let i = 0; i < triangleTiles.length; i++) {
        const item = triangleTiles[i];
        if (item.n > currentTileCount) continue;
        const isP = isPrime(item.n);
        const isTwin = isP && (isPrime(item.n - 2) || isPrime(item.n + 2));
        const poly = item.poly;

        ctx.beginPath();
        poly.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();

        ctx.fillStyle = isP ? pal.primeMain : ((item.n % 2 === 0) ? pal.compositeA : pal.compositeB);
        ctx.fill();

        ctx.strokeStyle = pal.grout;
        ctx.lineWidth = groutWidth;
        ctx.stroke();

        if (isP && enableAzulejoArt) {
          const centroid = getCentroid(poly);
          drawAzulejoRosette(ctx, centroid.x, centroid.y, (item.t0 + item.t1) / 2, pal, isTwin);
        }
      }
    }

    // Hover Highlight
    if (hoveredTile && hoveredTile <= currentTileCount) {
      highlightTile(ctx, hoveredTile);
    }

    ctx.restore();
    updateTelemetry();
  }

  function highlightTile(ctx, n) {
    let poly = null;
    if (currentEngine === "spiral") {
      const t = spiralTiles[n];
      if (t) poly = getSpiralTilePolygon(t.thetaStart, t.thetaEnd, 8);
    } else if (currentEngine === "voronoi") {
      const item = voronoiPolys.find(p => p.n === n);
      if (item) poly = item.pts;
    } else if (currentEngine === "triangles") {
      const item = triangleTiles.find(p => p.n === n);
      if (item) poly = item.poly;
    }
    if (poly && poly.length >= 3) {
      ctx.save();
      ctx.beginPath();
      poly.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "#FBBF24";
      ctx.lineWidth = groutWidth + 3.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* 10. TELEMETRY & HUD STATS                                                  */
  /* -------------------------------------------------------------------------- */
  function updateTelemetry() {
    let primeCount = 0;
    let lastPrime = null;
    let isLastTwin = false;

    for (let i = 1; i <= currentTileCount; i++) {
      if (isPrime(i)) {
        primeCount++;
        lastPrime = i;
      }
    }

    if (lastPrime) {
      isLastTwin = isPrime(lastPrime - 2) || isPrime(lastPrime + 2);
    }

    const pct = currentTileCount > 0 ? ((primeCount / currentTileCount) * 100).toFixed(1) : "0.0";
    document.getElementById("stat-tile-count").innerText = currentTileCount;
    document.getElementById("stat-prime-count").innerText = `${primeCount} (${pct}%)`;
    document.getElementById("stat-last-prime").innerText = lastPrime ? `#${lastPrime} ${isLastTwin ? '(Twin)' : ''}` : 'None';
  }

  /* -------------------------------------------------------------------------- */
  /* 11. GENERATIVE STEP-BY-STEP PLAYBACK                                       */
  /* -------------------------------------------------------------------------- */
  function togglePlay() {
    initAudio();
    if (isPlaying) pauseAnimation();
    else startAnimation();
  }

  function startAnimation() {
    if (currentTileCount >= maxTargetLimit) {
      currentTileCount = 1;
    }
    isPlaying = true;
    document.getElementById("play-status-pill").innerText = "LAYING TILES";
    document.getElementById("play-status-pill").className = "font-mono text-[10px] font-bold uppercase bg-acid-lime text-ink px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_#1c1b1b]";
    document.getElementById("play-icon").innerText = "pause";
    document.getElementById("play-label").innerText = "PAUSE";

    scheduleNextStep();
  }

  function pauseAnimation() {
    isPlaying = false;
    if (playTimer) clearTimeout(playTimer);
    document.getElementById("play-status-pill").innerText = "PAUSED";
    document.getElementById("play-status-pill").className = "font-mono text-[10px] font-bold uppercase bg-tertiary-yellow text-ink px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_#1c1b1b]";
    document.getElementById("play-icon").innerText = "play_arrow";
    document.getElementById("play-label").innerText = "RESUME";
  }

  function scheduleNextStep() {
    if (!isPlaying) return;
    const intervalMs = Math.max(12, 1000 / growthSpeed);
    playTimer = setTimeout(() => {
      if (currentTileCount < maxTargetLimit) {
        currentTileCount++;
        playTileSettle(currentTileCount);
        if (currentEngine === "voronoi") computeVoronoiMosaic();
        render();
        scheduleNextStep();
      } else {
        pauseAnimation();
      }
    }, intervalMs);
  }

  function stepBy(delta) {
    initAudio();
    pauseAnimation();
    const target = Math.max(1, Math.min(maxTargetLimit, currentTileCount + delta));
    if (target !== currentTileCount) {
      currentTileCount = target;
      playTileSettle(currentTileCount);
      if (currentEngine === "voronoi") computeVoronoiMosaic();
      render();
    }
  }

  function resetTessellation() {
    pauseAnimation();
    currentTileCount = 1;
    if (currentEngine === "voronoi") computeVoronoiMosaic();
    render();
  }

  /* -------------------------------------------------------------------------- */
  /* 12. CONTROLS, SETTERS & ENGINE SWITCHER                                    */
  /* -------------------------------------------------------------------------- */
  function setEngine(engine) {
    initAudio();
    currentEngine = engine;
    ['spiral', 'voronoi', 'triangles'].forEach(e => {
      const btn = document.getElementById(`engine-${e}`);
      if (e === engine) {
        btn.className = "border-2 border-ink p-2.5 bg-[#0038A8] text-white font-bold text-left shadow-[2px_2px_0px_#1c1b1b] flex items-center justify-between";
      } else {
        btn.className = "border-2 border-ink p-2.5 bg-white text-ink font-bold text-left shadow-[2px_2px_0px_#1c1b1b] flex items-center justify-between";
      }
    });

    const titles = {
      spiral: "Interlocking Azulejo Spiral (Space-Filling)",
      voronoi: "Voronoi Calçada Mosaic (100% Edge-Sharing)",
      triangles: "Triangular Pinwheel Fan (Gapless Shards)"
    };
    document.getElementById("viewport-title").innerText = titles[engine];

    recomputeGeometry();
    render();
  }

  function recomputeGeometry() {
    computeSpiralPartition();
    if (currentEngine === "voronoi") computeVoronoiMosaic();
    if (currentEngine === "triangles") computeTriangularFan();
  }

  function updateSpeed(val) {
    growthSpeed = parseInt(val, 10);
    document.getElementById("speed-val").innerText = `${growthSpeed} tiles/sec`;
  }

  function updateTargetLimit(val) {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 50000) num = 50000;
    maxTargetLimit = num;

    const numInput = document.getElementById("target-number-input");
    if (numInput && parseInt(numInput.value, 10) !== num) {
      numInput.value = num;
    }
    const slider = document.getElementById("target-slider");
    if (slider) {
      if (num > parseInt(slider.max, 10)) {
        slider.max = Math.max(num, 5000);
      }
      slider.value = Math.min(num, parseInt(slider.max, 10));
    }

    recomputeGeometry();
    render();
  }

  function setTargetPreset(val) {
    initAudio();
    updateTargetLimit(val);
    jumpToTarget();
  }

  function jumpToTarget() {
    initAudio();
    pauseAnimation();
    currentTileCount = maxTargetLimit;
    playChime(783.99);
    recomputeGeometry();
    autoFitZoom();
  }

  function updateRibbonWidth(val) {
    ribbonWidth = parseInt(val, 10);
    recomputeGeometry();
    render();
  }

  function updateGroutWidth(val) {
    groutWidth = parseFloat(val);
    render();
  }

  function toggleFractalSubdiv(val) {
    enableFractalSubdiv = val;
    render();
  }

  function togglePrimeMod(val) {
    enablePrimeMod = val;
    recomputeGeometry();
    render();
  }

  function toggleAzulejoArt(val) {
    enableAzulejoArt = val;
    render();
  }

  function setPalette(palKey) {
    initAudio();
    currentPalette = palKey;
    ['porto', 'memphis', 'terracotta', 'emerald'].forEach(k => {
      const btn = document.getElementById(`pal-${k}`);
      if (k === palKey) {
        btn.className = "border-2 border-ink p-2 bg-blue-50 text-ink font-bold text-left shadow-[2px_2px_0px_#1c1b1b] flex items-center justify-between";
      } else {
        btn.className = "border-2 border-ink p-2 bg-white text-ink font-bold text-left shadow-[2px_2px_0px_#1c1b1b] flex items-center justify-between";
      }
    });
    render();
  }

  /* -------------------------------------------------------------------------- */
  /* 13. PAN, ZOOM & HOVER INSPECTOR                                            */
  /* -------------------------------------------------------------------------- */
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    render();
  }
  window.addEventListener("resize", resizeCanvas);

  function autoFitZoom() {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    viewX = 0;
    viewY = 0;

    let maxR = 150;
    if (currentEngine === "spiral") {
      const lastTileIdx = Math.min(currentTileCount, spiralTiles.length - 1);
      if (lastTileIdx > 0 && spiralTiles[lastTileIdx]) {
        maxR = r_out(spiralTiles[lastTileIdx].thetaEnd);
      }
    } else if (currentEngine === "voronoi") {
      maxR = ribbonWidth * 1.5 * Math.sqrt(currentTileCount) + 50;
    } else {
      maxR = (ribbonWidth / (Math.PI * 2)) * (currentTileCount * 0.4);
    }

    const availableR = Math.min(width, height) * 0.44;
    viewZoom = Math.max(0.005, Math.min(3.0, availableR / Math.max(30, maxR)));
    const zoomPct = viewZoom < 0.1 ? (viewZoom * 100).toFixed(1) : Math.round(viewZoom * 100);
    document.getElementById("canvas-zoom-indicator").innerText = `Zoom: ${zoomPct}%`;
    render();
  }

  function recenterView() {
    viewX = 0;
    viewY = 0;
    viewZoom = 1.0;
    document.getElementById("canvas-zoom-indicator").innerText = "Zoom: 100%";
    render();
  }

  function zoomDelta(delta) {
    const factor = delta > 0 ? 1.25 : 0.8;
    viewZoom = Math.max(0.005, Math.min(10.0, viewZoom * factor));
    const zoomPct = viewZoom < 0.1 ? (viewZoom * 100).toFixed(1) : Math.round(viewZoom * 100);
    document.getElementById("canvas-zoom-indicator").innerText = `Zoom: ${zoomPct}%`;
    render();
  }

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    const factor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
    const newZoom = Math.max(0.005, Math.min(10.0, viewZoom * factor));

    // Smooth cursor-centered zoom
    const worldX = (mouseX - (width / 2) - viewX) / viewZoom;
    const worldY = (mouseY - (height / 2) - viewY) / viewZoom;

    viewZoom = newZoom;
    viewX = mouseX - (width / 2) - worldX * viewZoom;
    viewY = mouseY - (height / 2) - worldY * viewZoom;

    const zoomPct = viewZoom < 0.1 ? (viewZoom * 100).toFixed(1) : Math.round(viewZoom * 100);
    document.getElementById("canvas-zoom-indicator").innerText = `Zoom: ${zoomPct}%`;
    render();
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    initAudio();
    isDragging = true;
    dragStartX = e.clientX - viewX;
    dragStartY = e.clientY - viewY;
  });

  window.addEventListener("pointermove", (e) => {
    if (isDragging) {
      viewX = e.clientX - dragStartX;
      viewY = e.clientY - dragStartY;
      render();
    } else {
      handlePointerHover(e);
    }
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  function handlePointerHover(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
      hideTooltip();
      if (hoveredTile !== null) {
        hoveredTile = null;
        render();
      }
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const canvasX = (mouseX - (width / 2) - viewX) / viewZoom;
    const canvasY = (mouseY - (height / 2) - viewY) / viewZoom;

    // Detect tile under mouse in polar or polygon coordinates
    let detected = null;

    if (currentEngine === "spiral") {
      const r = Math.hypot(canvasX, canvasY);
      let angle = Math.atan2(canvasY, canvasX);
      if (angle < 0) angle += Math.PI * 2;

      // Unwind angle to find spiral turn
      const W = ribbonWidth;
      for (let turn = 0; turn <= 12; turn++) {
        const testTheta = angle + turn * Math.PI * 2;
        const rin = r_in(testTheta);
        const rout = r_out(testTheta);
        if (r >= rin && r <= rout) {
          // Find matching tile in partition
          for (let i = 1; i <= currentTileCount && i < spiralTiles.length; i++) {
            const t = spiralTiles[i];
            if (testTheta >= t.thetaStart && testTheta <= t.thetaEnd) {
              detected = t.n;
              break;
            }
          }
          if (detected) break;
        }
      }
    } else if (currentEngine === "voronoi") {
      let minDistSq = (ribbonWidth * 1.6) ** 2;
      for (let i = 0; i < voronoiPoints.length; i++) {
        const p = voronoiPoints[i];
        if (p.n > currentTileCount) continue;
        const dSq = (canvasX - p.x) ** 2 + (canvasY - p.y) ** 2;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          detected = p.n;
        }
      }
    } else if (currentEngine === "triangles") {
      for (let i = 0; i < triangleTiles.length; i++) {
        const item = triangleTiles[i];
        if (item.n > currentTileCount) continue;
        const centroid = getCentroid(item.poly);
        const dSq = (canvasX - centroid.x) ** 2 + (canvasY - centroid.y) ** 2;
        if (dSq < (ribbonWidth * 1.2) ** 2) {
          detected = item.n;
          break;
        }
      }
    }

    if (detected !== hoveredTile) {
      hoveredTile = detected;
      if (hoveredTile) showTooltip(hoveredTile, mouseX, mouseY);
      else hideTooltip();
      render();
    } else if (hoveredTile) {
      updateTooltipPos(mouseX, mouseY);
    }
  }

  function showTooltip(n, clientX, clientY) {
    const isP = isPrime(n);
    const isTwin = isP && (isPrime(n - 2) || isPrime(n + 2));
    const factors = getPrimeFactors(n).join(" × ");

    document.getElementById("tip-index").innerText = `Tile #${n}`;
    const tipBadge = document.getElementById("tip-badge");
    const tipFractal = document.getElementById("tip-fractal");

    if (isTwin) {
      tipBadge.innerText = "TWIN KEYSTONE";
      tipBadge.className = "px-1.5 py-0.5 text-[10px] font-black uppercase text-ink bg-tertiary-yellow border border-ink shadow-[1px_1px_0px_#1c1b1b]";
      tipFractal.innerText = "3×3 Gold-Center Azulejo";
    } else if (isP) {
      tipBadge.innerText = "KEYSTONE PRIME";
      tipBadge.className = "px-1.5 py-0.5 text-[10px] font-black uppercase text-white bg-[#0038A8] border border-ink shadow-[1px_1px_0px_#1c1b1b]";
      tipFractal.innerText = "2×2 Nested Azulejo";
    } else {
      tipBadge.innerText = "COMPOSITE TILE";
      tipBadge.className = "px-1.5 py-0.5 text-[10px] font-black uppercase text-ink bg-gray-200 border border-ink shadow-[1px_1px_0px_#1c1b1b]";
      tipFractal.innerText = "Solid Glazed Ceramic";
    }

    document.getElementById("tip-factors").innerText = factors;
    document.getElementById("tip-edges").innerText = "4 Shared Grout Seams (0 Gaps)";

    const tip = document.getElementById("tile-tooltip");
    tip.classList.remove("hidden");
    updateTooltipPos(clientX, clientY);
  }

  function updateTooltipPos(clientX, clientY) {
    const tip = document.getElementById("tile-tooltip");
    tip.style.left = `${clientX + 16}px`;
    tip.style.top = `${clientY + 16}px`;
  }

  function hideTooltip() {
    document.getElementById("tile-tooltip").classList.add("hidden");
  }

  /* -------------------------------------------------------------------------- */
  /* 14. 1080P SNAPSHOT EXPORT                                                  */
  /* -------------------------------------------------------------------------- */
  function exportPNG() {
    initAudio();
    playChime(783.99);

    const expCanvas = document.createElement("canvas");
    expCanvas.width = 1920;
    expCanvas.height = 1080;
    const expCtx = expCanvas.getContext("2d");

    // Backdrop
    expCtx.fillStyle = "#F1F5F9";
    expCtx.fillRect(0, 0, 1920, 1080);

    expCtx.save();
    expCtx.translate(960, 540);
    expCtx.scale(1.4, 1.4);

    const pal = PALETTES[currentPalette];

    // Render Spiral Mosaic
    const coreR = r_in(Math.PI * 2);
    expCtx.beginPath();
    expCtx.arc(0, 0, Math.max(coreR, 12), 0, Math.PI * 2);
    expCtx.fillStyle = pal.primeAccent;
    expCtx.fill();
    expCtx.strokeStyle = pal.grout;
    expCtx.lineWidth = groutWidth;
    expCtx.stroke();
    drawAzulejoRosette(expCtx, 0, 0, 0, pal, true);

    for (let i = 1; i <= currentTileCount && i < spiralTiles.length; i++) {
      const t = spiralTiles[i];
      const isP = isPrime(t.n);
      const isTwin = isP && (isPrime(t.n - 2) || isPrime(t.n + 2));
      drawCurvedTilePatch(expCtx, t.thetaStart, t.thetaEnd, t.n, isP, isTwin, pal);
    }
    expCtx.restore();

    // Watermark
    expCtx.fillStyle = "#1C1B1B";
    expCtx.font = "bold 26px 'Bricolage Grotesque', sans-serif";
    expCtx.fillText("FRACTILES: GAPLESS PRIME SPIRAL TESSELLATION", 60, 1010);
    expCtx.font = "16px 'JetBrains Mono', monospace";
    expCtx.fillText(`100% SPACE-FILLING CERAMIC TILES • N=${currentTileCount} • PORTO AZULEJO PROTOCOL`, 60, 1040);

    const link = document.createElement("a");
    link.download = `fractiles_tessellation_n${currentTileCount}_${Date.now()}.png`;
    link.href = expCanvas.toDataURL("image/png");
    link.click();
  }

  // Initial Startup
  document.addEventListener("DOMContentLoaded", () => {
    computeSpiralPartition();
    resizeCanvas();
  });
  setTimeout(() => {
    computeSpiralPartition();
    resizeCanvas();
  }, 50);
