(() => {
  // -------------------------------------------------------------------------
  // 1. STATE & PHYSICAL CONSTANTS
  // -------------------------------------------------------------------------
  const SOUND_SPEED = 34320; // cm/s in air at 20°C

  // Simulation Parameters
  const state = {
    length: 67.0,     // cm (25 to 120)
    bore: 19.0,       // mm (10 to 36)
    wall: 1.2,        // mm (0.5 to 5.0)
    curve: 0,         // degrees (0 to 150)
    material: 'silver',
    breath: 1.0,      // factor (0.2 to 2.0)
    holes: [true, true, true, true, true, true], // 6 holes: true = closed, false = open
    isBlowing: false,
    continuousBlow: false,
    scalePlaying: false,
  };

  // Tone Hole relative positions along the tube (distance from embouchure / length)
  // Tuned to produce a diatonic / natural minor flute fingering progression
  const HOLE_POSITIONS = [0.52, 0.58, 0.65, 0.72, 0.80, 0.88];

  // Note frequency map for closest musical note calculation
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function freqToNote(freq) {
    if (freq <= 0) return { name: "--", octave: "", cents: 0 };
    const midi = 69 + 12 * Math.log2(freq / 440);
    const roundedMidi = Math.round(midi);
    const noteName = NOTE_NAMES[((roundedMidi % 12) + 12) % 12];
    const octave = Math.floor(roundedMidi / 12) - 1;
    const cents = Math.round((midi - roundedMidi) * 100);
    return { name: `${noteName}${octave}`, cents };
  }

  // -------------------------------------------------------------------------
  // 2. WEB AUDIO API PROCEDURAL ACOUSTIC SYNTHESIS
  // -------------------------------------------------------------------------
  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let analyser = null;

  // Exciter nodes
  let noiseNode = null;
  let noiseGain = null;
  let breathFilter = null;
  let coreOsc = null;
  let coreOscGain = null;
  let octaveOsc = null;
  let octaveOscGain = null;

  // Resonator Filter Bank (Fundamental + Overtones)
  let resFilters = [];
  let resGains = [];
  let materialFilter = null;
  let curveDispersionFilter = null;

  function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    // Master bus & compressor
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(12, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.15, audioCtx.currentTime);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    masterGain.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audioCtx.destination);

    // 1. Noise Exciter (Pink/White Breath Buffer)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;
    noiseNode.start(0);

    breathFilter = audioCtx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    breathFilter.Q.setValueAtTime(2.0, audioCtx.currentTime);

    noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    noiseNode.connect(breathFilter);
    breathFilter.connect(noiseGain);

    // 2. Core Air-Column Resonance (Oscillator Blend for Solid Standing Wave)
    coreOsc = audioCtx.createOscillator();
    coreOsc.type = 'triangle';
    coreOsc.frequency.setValueAtTime(523, audioCtx.currentTime);
    coreOsc.start(0);

    coreOscGain = audioCtx.createGain();
    coreOscGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    coreOsc.connect(coreOscGain);

    octaveOsc = audioCtx.createOscillator();
    octaveOsc.type = 'sine';
    octaveOsc.frequency.setValueAtTime(1046, audioCtx.currentTime);
    octaveOsc.start(0);

    octaveOscGain = audioCtx.createGain();
    octaveOscGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    octaveOsc.connect(octaveOscGain);

    // 3. Resonant Filter Bank (Fundamental, 2nd, 3rd harmonics)
    const exciterBus = audioCtx.createGain();
    noiseGain.connect(exciterBus);
    coreOscGain.connect(exciterBus);
    octaveOscGain.connect(exciterBus);

    resFilters = [];
    resGains = [];
    const harmonicRatios = [1, 2, 3, 4];
    for (let h = 0; h < 4; h++) {
      const flt = audioCtx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(523 * harmonicRatios[h], audioCtx.currentTime);
      flt.Q.setValueAtTime(25 - h * 4, audioCtx.currentTime);

      const gn = audioCtx.createGain();
      gn.gain.setValueAtTime(1.0 / (h + 1), audioCtx.currentTime);

      exciterBus.connect(flt);
      flt.connect(gn);
      gn.connect(masterGain);

      resFilters.push(flt);
      resGains.push(gn);
    }

    // Material tone coloring
    materialFilter = audioCtx.createBiquadFilter();
    materialFilter.type = 'lowpass';
    materialFilter.frequency.setValueAtTime(7000, audioCtx.currentTime);

    curveDispersionFilter = audioCtx.createBiquadFilter();
    curveDispersionFilter.type = 'peaking';
    curveDispersionFilter.frequency.setValueAtTime(450, audioCtx.currentTime);
    curveDispersionFilter.gain.setValueAtTime(0, audioCtx.currentTime);
  }

  // -------------------------------------------------------------------------
  // 3. ACOUSTIC CALCULATIONS (PHYSICAL MODEL)
  // -------------------------------------------------------------------------
  function calculateAcoustics() {
    const rBore = (state.bore / 10) / 2; // radius in cm
    const tWall = state.wall / 10;       // wall thickness in cm

    // Find first open hole (from embouchure)
    let firstOpenIdx = -1;
    for (let i = 0; i < state.holes.length; i++) {
      if (!state.holes[i]) {
        firstOpenIdx = i;
        break;
      }
    }

    // End corrections:
    // Open bell end correction: ΔL_bell ≈ 0.61 * r_bore
    // Embouchure end correction: ΔL_emb ≈ 1.6 cm (scaled by bore)
    const deltaEmb = 1.6 * (rBore / 0.95);
    const deltaBell = 0.61 * rBore;

    let effectiveL;
    if (firstOpenIdx === -1) {
      // All holes closed: full acoustic pipe length
      effectiveL = state.length + deltaEmb + deltaBell;
    } else {
      // First open hole determines effective length plus open tone hole chimney correction
      const holeFrac = HOLE_POSITIONS[firstOpenIdx];
      const holeDist = state.length * holeFrac;
      const holeRadius = (state.bore * 0.35) / 20; // cm
      const deltaHole = (Math.pow(rBore, 2) / Math.pow(holeRadius, 2)) * (tWall + 1.4 * holeRadius);
      effectiveL = holeDist + deltaEmb + Math.min(deltaHole, 5.0);
    }

    // Fundamental Frequency: f0 = v / (2 * L_eff) for an open cylinder
    let f0 = SOUND_SPEED / (2 * effectiveL);

    // Overblowing register check based on breath pressure:
    // Flute edge tone speed threshold:
    // If breath > 1.3 -> 2nd harmonic (octave jump)
    // If breath > 1.8 -> 3rd harmonic (12th jump)
    let register = 1;
    let playedFreq = f0;
    if (state.breath >= 1.6) {
      register = 3;
      playedFreq = f0 * 3;
    } else if (state.breath >= 1.15) {
      register = 2;
      playedFreq = f0 * 2;
    }

    // Acoustic cutoff frequency: f_c ≈ 0.18 * v / r_bore
    const fc = (0.18 * SOUND_SPEED) / rBore;

    // Resonant Q factor influenced by wall thickness and material
    let matQ = 24.0;
    if (state.material === 'silver') matQ = 30.0;
    if (state.material === 'wood') matQ = 22.0;
    if (state.material === 'bamboo') matQ = 18.0;
    if (state.material === 'brass') matQ = 28.0;

    const qFactor = matQ * (1 + (state.wall - 1.2) * 0.15) * (1 - (state.curve / 150) * 0.25);

    return {
      f0,
      playedFreq,
      effectiveL,
      deltaL: deltaEmb + (firstOpenIdx === -1 ? deltaBell : 0.8),
      register,
      fc,
      qFactor,
    };
  }

  // -------------------------------------------------------------------------
  // 4. AUDIO PARAMETER UPDATES
  // -------------------------------------------------------------------------
  function applyAudioParameters() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const acoustics = calculateAcoustics();

    // Master gain envelope
    const isPlaying = state.isBlowing || state.continuousBlow;
    const targetGain = isPlaying ? Math.min(0.85, 0.45 * state.breath) : 0.0;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(targetGain, now, isPlaying ? 0.03 : 0.06);

    // Breath exciter filter & gain
    const breathCenter = Math.max(300, acoustics.playedFreq * 1.8);
    breathFilter.frequency.setTargetAtTime(breathCenter, now, 0.03);
    breathFilter.Q.setTargetAtTime(Math.max(1.0, 3.5 - (state.bore / 12)), now, 0.03);

    // Noise ratio: wider bore has more breath noise (shakuhachi style)
    const noiseLevel = isPlaying ? (0.35 + (state.bore / 50) * 0.4) * state.breath : 0.0;
    noiseGain.gain.setTargetAtTime(noiseLevel, now, 0.03);

    // Core tone oscillator frequencies & gains
    coreOsc.frequency.setTargetAtTime(acoustics.f0, now, 0.02);
    octaveOsc.frequency.setTargetAtTime(acoustics.f0 * 2, now, 0.02);

    // Balance between fundamental and overblowing
    if (acoustics.register === 1) {
      coreOscGain.gain.setTargetAtTime(0.38, now, 0.03);
      octaveOscGain.gain.setTargetAtTime(0.08, now, 0.03);
    } else if (acoustics.register === 2) {
      coreOscGain.gain.setTargetAtTime(0.12, now, 0.03);
      octaveOscGain.gain.setTargetAtTime(0.42, now, 0.03);
    } else {
      coreOscGain.gain.setTargetAtTime(0.05, now, 0.03);
      octaveOscGain.gain.setTargetAtTime(0.20, now, 0.03);
    }

    // Resonant Filter Bank
    const harmonics = [1, 2, 3, 4];
    for (let h = 0; h < 4; h++) {
      const harmFreq = Math.min(20000, acoustics.playedFreq * harmonics[h]);
      resFilters[h].frequency.setTargetAtTime(harmFreq, now, 0.02);

      // Higher harmonics damped faster on wide bores and curved tubes
      const curveDamping = 1 - (state.curve / 150) * 0.4 * (h > 0 ? 1 : 0);
      const boreDamping = Math.max(0.1, 1 - (state.bore / 40) * 0.5 * (h > 1 ? 1 : 0));
      const harmGain = (1.0 / (h + 1)) * curveDamping * boreDamping;

      resGains[h].gain.setTargetAtTime(harmGain, now, 0.03);
      resFilters[h].Q.setTargetAtTime(acoustics.qFactor / (1 + h * 0.4), now, 0.03);
    }
  }

  // -------------------------------------------------------------------------
  // 5. HUD & DOM UI UPDATES
  // -------------------------------------------------------------------------
  function updateHUD() {
    const acoustics = calculateAcoustics();
    const noteInfo = freqToNote(acoustics.playedFreq);

    document.getElementById('hud-note').textContent = noteInfo.name;
    document.getElementById('hud-freq').textContent = `${acoustics.playedFreq.toFixed(1)} Hz`;
    document.getElementById('hud-leff').textContent = `${acoustics.effectiveL.toFixed(1)} cm`;
    document.getElementById('hud-delta').textContent = `+${acoustics.deltaL.toFixed(1)} cm`;

    // Overblowing register badge
    const regBadge = document.getElementById('hud-register');
    if (acoustics.register === 1) {
      regBadge.textContent = 'REGISTER 1 (FUNDAMENTAL)';
      regBadge.className = 'neo-badge bg-tertiary-yellow text-ink text-[10px] font-black';
      document.getElementById('dossier-overblow').textContent = 'Fundamental (1st Mode)';
    } else if (acoustics.register === 2) {
      regBadge.textContent = 'REGISTER 2 (OCTAVE OVERBLOWN)';
      regBadge.className = 'neo-badge bg-electric-cyan text-ink text-[10px] font-black';
      document.getElementById('dossier-overblow').textContent = 'Octave Jump (2nd Harmonic)';
    } else {
      regBadge.textContent = 'REGISTER 3 (12TH OVERBLOWN)';
      regBadge.className = 'neo-badge bg-primary-magenta text-white text-[10px] font-black';
      document.getElementById('dossier-overblow').textContent = 'Twelfth Jump (3rd Harmonic)';
    }

    // Audio status indicator
    const isPlaying = state.isBlowing || state.continuousBlow;
    const indText = document.getElementById('audio-indicator-text');
    const indDot = document.getElementById('audio-indicator-dot');
    const indBadge = document.getElementById('playing-badge');

    if (isPlaying) {
      indText.textContent = `PLAYING ${noteInfo.name}`;
      indDot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-acid-lime animate-ping';
      indBadge.className = 'font-mono text-xs font-black uppercase px-3 py-1 border-2 border-ink bg-acid-lime text-ink flex items-center gap-1.5 shadow-[2px_2px_0px_#1c1b1b]';
    } else {
      indText.textContent = 'SILENT / REST';
      indDot.className = 'inline-block w-2.5 h-2.5 rounded-full bg-gray-400';
      indBadge.className = 'font-mono text-xs font-black uppercase px-3 py-1 border-2 border-ink bg-gray-200 text-gray-600 flex items-center gap-1.5 shadow-[2px_2px_0px_#1c1b1b]';
    }

    // Dossier values
    document.getElementById('dossier-leff').textContent = `${acoustics.effectiveL.toFixed(1)} cm`;
    document.getElementById('dossier-delta').textContent = `+${acoustics.deltaL.toFixed(1)} cm`;
    document.getElementById('dossier-cutoff').textContent = `${Math.round(acoustics.fc)} Hz`;
    document.getElementById('dossier-q').textContent = acoustics.qFactor.toFixed(1);

    // Harmonic frequencies in spectrum card
    document.getElementById('harm-1-freq').textContent = `${Math.round(acoustics.playedFreq)} Hz`;
    document.getElementById('harm-2-freq').textContent = `${Math.round(acoustics.playedFreq * 2)} Hz`;
    document.getElementById('harm-3-freq').textContent = `${Math.round(acoustics.playedFreq * 3)} Hz`;

    // Tone hole pad indicators in DOM
    for (let i = 0; i < state.holes.length; i++) {
      const padBtn = document.getElementById(`pad-${i}`);
      const indicator = padBtn.querySelector('.pad-indicator');
      if (state.holes[i]) {
        // Closed
        padBtn.classList.add('closed');
        indicator.className = 'w-5 h-5 rounded-full border-2 border-white bg-tertiary-yellow pad-indicator';
      } else {
        // Open
        padBtn.classList.remove('closed');
        indicator.className = 'w-5 h-5 rounded-full border-2 border-ink bg-white pad-indicator';
      }
    }

    // Breath pressure meter & label
    const breathPct = Math.min(100, Math.round((state.breath / 2.0) * 100));
    const meterBar = document.getElementById('pressure-meter-bar');
    meterBar.style.width = `${breathPct}%`;
    if (state.breath >= 1.6) {
      meterBar.className = 'h-full bg-primary-magenta border-r border-ink transition-all duration-75';
      document.getElementById('pressure-level-text').textContent = '12th Overblow! (High)';
    } else if (state.breath >= 1.15) {
      meterBar.className = 'h-full bg-electric-cyan border-r border-ink transition-all duration-75';
      document.getElementById('pressure-level-text').textContent = 'Octave Overblow!';
    } else {
      meterBar.className = 'h-full bg-acid-lime border-r border-ink transition-all duration-75';
      document.getElementById('pressure-level-text').textContent = `Normal (${state.breath.toFixed(1)}x)`;
    }
  }

  // -------------------------------------------------------------------------
  // 6. DYNAMIC SVG MORPHING GEOMETRY
  // -------------------------------------------------------------------------
  function renderFluteSVG() {
    const group = document.getElementById('flute-geometry-group');
    if (!group) return;

    // Dimensions in SVG space (ViewBox: 0 0 900 240)
    // Flute length mapped: 25cm -> 380px, 120cm -> 760px
    const startX = 70;
    const startY = 120;
    const tubeLenPx = 380 + ((state.length - 25) / (120 - 25)) * 380;
    const endX = startX + tubeLenPx;

    // Bore & Wall thickness scaled in SVG pixels
    const borePx = 14 + ((state.bore - 10) / (36 - 10)) * 24; // 14 to 38 px
    const wallPx = 2 + ((state.wall - 0.5) / (5.0 - 0.5)) * 6; // 2 to 8 px
    const outerDia = borePx + wallPx * 2;

    // Curviness / Bend:
    // Bend angle in degrees (0 to 150)
    // When curved, the path bends downward and backwards like a J-tube or serpent
    const curveDeg = state.curve;
    const curveRad = (curveDeg * Math.PI) / 180;

    // Choose material gradient
    let gradFill = 'url(#metal-grad)';
    if (state.material === 'wood') gradFill = 'url(#wood-grad)';
    if (state.material === 'bamboo') gradFill = 'url(#wood-grad)';
    if (state.material === 'brass') gradFill = 'url(#brass-grad)';

    let svgHtml = '';

    // Calculate curve control points
    if (curveDeg === 0) {
      // STRAIGHT FLUTE CYLINDER
      const halfOuter = outerDia / 2;
      const halfBore = borePx / 2;

      // Outer Shell
      svgHtml += `
        <!-- Outer Flute Body -->
        <rect x="${startX}" y="${startY - halfOuter}" width="${tubeLenPx}" height="${outerDia}" rx="4" fill="${gradFill}" stroke="#1c1b1b" stroke-width="3" filter="url(#svg-hard-shadow)" />

        <!-- Inner Bore Resonance Cutaway Guide (Subtle glow) -->
        <rect x="${startX + 12}" y="${startY - halfBore}" width="${tubeLenPx - 14}" height="${borePx}" fill="url(#bore-grad)" opacity="0.65" stroke="#1c1b1b" stroke-dasharray="3,3" stroke-width="1.5" />

        <!-- Flute Headjoint Crown & Cork -->
        <rect x="${startX - 18}" y="${startY - halfOuter * 0.85}" width="18" height="${outerDia * 0.85}" rx="3" fill="#1c1b1b" stroke="#1c1b1b" stroke-width="2" />
        <circle cx="${startX - 18}" cy="${startY}" r="5" fill="#fae100" stroke="#1c1b1b" stroke-width="1.5" />

        <!-- Embouchure Hole & Lip Plate -->
        <g id="embouchure-marker">
          <ellipse cx="${startX + 42}" cy="${startY - halfOuter}" rx="14" ry="4" fill="#1c1b1b" stroke="#00e5ff" stroke-width="2" />
          <ellipse cx="${startX + 42}" cy="${startY - halfOuter}" rx="8" ry="2.5" fill="#00e5ff" />
          <!-- Air Jet Arrow when blowing -->
          ${(state.isBlowing || state.continuousBlow) ? `
            <path d="M ${startX + 42} ${startY - halfOuter - 35} L ${startX + 42} ${startY - halfOuter - 8}" stroke="#39ff14" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow)" />
            <circle cx="${startX + 42}" cy="${startY - halfOuter - 6}" r="3" fill="#39ff14" class="sound-pulse" />
          ` : `
            <text x="${startX + 42}" y="${startY - halfOuter - 14}" font-family="JetBrains Mono" font-size="9" font-weight="bold" fill="#b40065" text-anchor="middle">BLOW HERE</text>
          `}
        </g>
      `;

      // 6 Tone Holes along the straight pipe
      for (let i = 0; i < 6; i++) {
        const holeFrac = HOLE_POSITIONS[i];
        const holeX = startX + tubeLenPx * holeFrac;
        const isClosed = state.holes[i];
        const holeR = 6 + (state.bore / 36) * 3;

        svgHtml += `
          <g class="tone-hole-svg cursor-pointer" onclick="window.fluteSimToggleHole(${i})">
            <!-- Tone Hole Chimney Wall -->
            <rect x="${holeX - holeR}" y="${startY - halfOuter - wallPx}" width="${holeR * 2}" height="${wallPx + 2}" fill="#1c1b1b" />
            
            ${isClosed ? `
              <!-- Closed Hole Pad Down -->
              <ellipse cx="${holeX}" cy="${startY - halfOuter - 2}" rx="${holeR + 2}" ry="4" fill="#b40065" stroke="#1c1b1b" stroke-width="2" />
              <rect x="${holeX - 2}" y="${startY - halfOuter - 14}" width="4" height="12" fill="#1c1b1b" />
              <circle cx="${holeX}" cy="${startY - halfOuter - 14}" r="5" fill="#fae100" stroke="#1c1b1b" stroke-width="2" />
            ` : `
              <!-- Open Hole with Sound Emission Wave -->
              <ellipse cx="${holeX}" cy="${startY - halfOuter}" rx="${holeR}" ry="3" fill="#ffffff" stroke="#1c1b1b" stroke-width="2" />
              <rect x="${holeX - 2}" y="${startY - halfOuter - 22}" width="4" height="18" fill="#1c1b1b" />
              <circle cx="${holeX}" cy="${startY - halfOuter - 22}" r="5" fill="#00e5ff" stroke="#1c1b1b" stroke-width="2" />
              <!-- Acoustic radiation waves when sound is active -->
              ${(state.isBlowing || state.continuousBlow) ? `
                <circle cx="${holeX}" cy="${startY - halfOuter - 6}" r="8" fill="none" stroke="#39ff14" stroke-width="1.5" opacity="0.8" class="sound-pulse" />
              ` : ''}
            `}
            <text x="${holeX}" y="${startY + halfOuter + 16}" font-family="Bricolage Grotesque" font-size="10" font-weight="800" fill="#1c1b1b" text-anchor="middle">#${i + 1}</text>
          </g>
        `;
      }

      // Bell End Flange
      svgHtml += `
        <ellipse cx="${endX}" cy="${startY}" rx="5" ry="${halfOuter * 1.1}" fill="#1c1b1b" />
        <ellipse cx="${endX}" cy="${startY}" rx="3" ry="${halfBore}" fill="#fae100" />
      `;

    } else {
      // CURVED FLUTE / SERPENT BEND
      // We draw a cubic Bezier curve that dips and curls backwards as curve increases
      const ctrl1X = startX + tubeLenPx * 0.45;
      const ctrl1Y = startY - (curveDeg * 0.3);
      const ctrl2X = startX + tubeLenPx * 0.85;
      const ctrl2Y = startY + (curveDeg * 0.95);
      const curvedEndX = endX - (curveDeg * 0.8);
      const curvedEndY = startY + (curveDeg * 0.7);

      const pathData = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${curvedEndX} ${curvedEndY}`;

      svgHtml += `
        <!-- Curved Flute Outer Wall Body -->
        <path d="${pathData}" fill="none" stroke="#1c1b1b" stroke-width="${outerDia + 6}" stroke-linecap="round" />
        <path d="${pathData}" fill="none" stroke="${gradFill}" stroke-width="${outerDia}" stroke-linecap="round" />
        <path d="${pathData}" fill="none" stroke="#b40065" stroke-width="${borePx}" stroke-dasharray="4,4" opacity="0.6" />

        <!-- Headjoint on curved pipe -->
        <circle cx="${startX - 10}" cy="${startY}" r="12" fill="#1c1b1b" />
        <ellipse cx="${startX + 35}" cy="${startY - outerDia/2 + 2}" rx="10" ry="4" fill="#00e5ff" stroke="#1c1b1b" stroke-width="2" />

        <!-- Curved Bell Opening -->
        <circle cx="${curvedEndX}" cy="${curvedEndY}" r="${outerDia / 2 + 2}" fill="#1c1b1b" />
        <circle cx="${curvedEndX}" cy="${curvedEndY}" r="${borePx / 2}" fill="#fae100" />
      `;

      // Draw interactive holes at approximated curve points
      for (let i = 0; i < 6; i++) {
        const t = HOLE_POSITIONS[i];
        // Cubic bezier point calculation
        const cx = Math.pow(1 - t, 3) * startX + 3 * Math.pow(1 - t, 2) * t * ctrl1X + 3 * (1 - t) * Math.pow(t, 2) * ctrl2X + Math.pow(t, 3) * curvedEndX;
        const cy = Math.pow(1 - t, 3) * startY + 3 * Math.pow(1 - t, 2) * t * ctrl1Y + 3 * (1 - t) * Math.pow(t, 2) * ctrl2Y + Math.pow(t, 3) * curvedEndY;

        const isClosed = state.holes[i];
        svgHtml += `
          <g class="tone-hole-svg cursor-pointer" onclick="window.fluteSimToggleHole(${i})">
            <circle cx="${cx}" cy="${cy}" r="9" fill="${isClosed ? '#b40065' : '#00e5ff'}" stroke="#1c1b1b" stroke-width="2.5" />
            <text x="${cx}" y="${cy + 3.5}" font-family="Bricolage Grotesque" font-size="9" font-weight="900" fill="${isClosed ? '#ffffff' : '#1c1b1b'}" text-anchor="middle">${i + 1}</text>
          </g>
        `;
      }
    }

    group.innerHTML = svgHtml;
  }

  // Expose toggle hole to window for SVG inline onclick
  window.fluteSimToggleHole = (index) => {
    toggleHole(index);
  };

  // -------------------------------------------------------------------------
  // 7. PARTICLES & SPECTRUM VISUALIZER ANIMATION LOOP
  // -------------------------------------------------------------------------
  const particles = [];
  const airflowCanvas = document.getElementById('airflow-canvas');
  const airflowCtx = airflowCanvas.getContext('2d');

  const spectrumCanvas = document.getElementById('spectrum-canvas');
  const spectrumCtx = spectrumCanvas.getContext('2d');

  function resizeCanvases() {
    const container = document.getElementById('visualizer-container');
    if (container) {
      airflowCanvas.width = container.clientWidth;
      airflowCanvas.height = container.clientHeight;
    }
    const specParent = spectrumCanvas.parentElement;
    if (specParent) {
      spectrumCanvas.width = specParent.clientWidth;
      spectrumCanvas.height = specParent.clientHeight;
    }
  }
  window.addEventListener('resize', resizeCanvases);

  function animationLoop() {
    requestAnimationFrame(animationLoop);

    const isPlaying = state.isBlowing || state.continuousBlow;

    // --- A. Airflow Particles ---
    airflowCtx.clearRect(0, 0, airflowCanvas.width, airflowCanvas.height);

    if (isPlaying) {
      // Spawn new particles at embouchure (approximate coordinates relative to SVG)
      const rect = airflowCanvas.getBoundingClientRect();
      const originX = airflowCanvas.width * 0.12;
      const originY = airflowCanvas.height * 0.48;

      const pCount = Math.floor(2 + state.breath * 3);
      for (let p = 0; p < pCount; p++) {
        particles.push({
          x: originX + (Math.random() * 8 - 4),
          y: originY + (Math.random() * 8 - 4),
          vx: 3 + Math.random() * 4 * state.breath,
          vy: (Math.random() - 0.5) * 2.5,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.02,
          size: 2 + Math.random() * 3,
          color: state.breath > 1.2 ? '#00e5ff' : '#39ff14',
        });
      }
    }

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0 || p.x > airflowCanvas.width) {
        particles.splice(i, 1);
        continue;
      }

      airflowCtx.fillStyle = p.color;
      airflowCtx.globalAlpha = p.life;
      airflowCtx.beginPath();
      airflowCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      airflowCtx.fill();
    }
    airflowCtx.globalAlpha = 1.0;

    // --- B. Real-time Spectrum Analyzer & Oscilloscope ---
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    const w = spectrumCanvas.width;
    const h = spectrumCanvas.height;

    spectrumCtx.fillStyle = '#1c1b1b';
    spectrumCtx.fillRect(0, 0, w, h);

    // 1. Draw Frequency Spectrum Bars
    const barWidth = (w / 64) - 1;
    let barX = 0;
    for (let i = 0; i < 64; i++) {
      const barHeight = (freqData[i * 4] / 255) * (h * 0.7);
      spectrumCtx.fillStyle = i % 2 === 0 ? '#fae100' : '#b40065';
      spectrumCtx.fillRect(barX, h - barHeight, barWidth, barHeight);
      barX += barWidth + 1;
    }

    // 2. Draw Oscilloscope Waveform Overlay
    spectrumCtx.lineWidth = 2.5;
    spectrumCtx.strokeStyle = '#39ff14';
    spectrumCtx.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) spectrumCtx.moveTo(x, y);
      else spectrumCtx.lineTo(x, y);
      x += sliceWidth;
    }
    spectrumCtx.stroke();
  }

  // -------------------------------------------------------------------------
  // 8. INTERACTIVE EVENT HANDLERS & PRESETS
  // -------------------------------------------------------------------------
  window.updateParam = (param, value) => {
    initAudio();
    if (param === 'length') {
      state.length = parseFloat(value);
      document.getElementById('val-length').textContent = `${state.length.toFixed(1)} cm`;
    } else if (param === 'bore') {
      state.bore = parseFloat(value);
      document.getElementById('val-bore').textContent = `${state.bore.toFixed(1)} mm`;
    } else if (param === 'wall') {
      state.wall = parseFloat(value);
      document.getElementById('val-wall').textContent = `${state.wall.toFixed(1)} mm`;
    } else if (param === 'curve') {
      state.curve = parseInt(value, 10);
      document.getElementById('val-curve').textContent = `${state.curve}° ${state.curve === 0 ? '(Straight)' : ''}`;
    } else if (param === 'material') {
      state.material = value;
    } else if (param === 'breath') {
      state.breath = parseFloat(value);
      document.getElementById('val-breath').textContent = `${state.breath.toFixed(1)}x`;
    }

    renderFluteSVG();
    applyAudioParameters();
    updateHUD();
  };

  window.toggleHole = (index) => {
    initAudio();
    state.holes[index] = !state.holes[index];
    renderFluteSVG();
    applyAudioParameters();
    updateHUD();
  };

  window.setAllHoles = (closed) => {
    initAudio();
    state.holes = [closed, closed, closed, closed, closed, closed];
    renderFluteSVG();
    applyAudioParameters();
    updateHUD();
  };

  window.toggleContinuousBlow = () => {
    initAudio();
    state.continuousBlow = !state.continuousBlow;
    const holdBtn = document.getElementById('toggle-hold-btn');
    const holdIcon = document.getElementById('hold-icon');
    const holdText = document.getElementById('hold-text');

    if (state.continuousBlow) {
      holdBtn.className = 'neo-btn neo-btn-lime text-xs py-3 px-4 flex items-center gap-1.5 shadow-[3px_3px_0px_#1c1b1b]';
      holdIcon.textContent = 'toggle_on';
      holdText.textContent = 'HOLD BLOW: ON';
    } else {
      holdBtn.className = 'neo-btn neo-btn-white text-xs py-3 px-4 flex items-center gap-1.5 shadow-[3px_3px_0px_#1c1b1b]';
      holdIcon.textContent = 'toggle_off';
      holdText.textContent = 'HOLD BLOW: OFF';
    }

    applyAudioParameters();
    updateHUD();
  };

  window.applyPreset = (name) => {
    initAudio();
    if (name === 'concert') {
      state.length = 67.0;
      state.bore = 19.0;
      state.wall = 1.2;
      state.curve = 0;
      state.material = 'silver';
      state.breath = 1.0;
    } else if (name === 'traverso') {
      state.length = 61.0;
      state.bore = 16.0;
      state.wall = 3.5;
      state.curve = 0;
      state.material = 'wood';
      state.breath = 0.95;
    } else if (name === 'shakuhachi') {
      state.length = 54.0;
      state.bore = 26.0;
      state.wall = 4.2;
      state.curve = 0;
      state.material = 'bamboo';
      state.breath = 1.1;
    } else if (name === 'piccolo') {
      state.length = 32.0;
      state.bore = 11.0;
      state.wall = 1.0;
      state.curve = 0;
      state.material = 'silver';
      state.breath = 1.15;
    } else if (name === 'serpent') {
      state.length = 110.0;
      state.bore = 30.0;
      state.wall = 2.8;
      state.curve = 120;
      state.material = 'brass';
      state.breath = 1.25;
    }

    // Sync UI inputs
    document.getElementById('param-length').value = state.length;
    document.getElementById('param-bore').value = state.bore;
    document.getElementById('param-wall').value = state.wall;
    document.getElementById('param-curve').value = state.curve;
    document.getElementById('param-material').value = state.material;
    document.getElementById('param-breath').value = state.breath;

    document.getElementById('val-length').textContent = `${state.length.toFixed(1)} cm`;
    document.getElementById('val-bore').textContent = `${state.bore.toFixed(1)} mm`;
    document.getElementById('val-wall').textContent = `${state.wall.toFixed(1)} mm`;
    document.getElementById('val-curve').textContent = `${state.curve}° ${state.curve === 0 ? '(Straight)' : ''}`;
    document.getElementById('val-breath').textContent = `${state.breath.toFixed(1)}x`;

    renderFluteSVG();
    applyAudioParameters();
    updateHUD();
  };

  window.playAcousticScale = () => {
    initAudio();
    if (state.scalePlaying) return;
    state.scalePlaying = true;
    state.continuousBlow = true;
    applyAudioParameters();

    // Diatonic fingering sequence: 6 closed -> 1 open each step
    const steps = [
      [true, true, true, true, true, true],
      [true, true, true, true, true, false],
      [true, true, true, true, false, false],
      [true, true, true, false, false, false],
      [true, true, false, false, false, false],
      [true, false, false, false, false, false],
      [false, false, false, false, false, false],
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= steps.length) {
        clearInterval(interval);
        state.scalePlaying = false;
        state.continuousBlow = false;
        state.holes = [true, true, true, true, true, true];
        applyAudioParameters();
        updateHUD();
        renderFluteSVG();
        return;
      }
      state.holes = steps[idx];
      renderFluteSVG();
      applyAudioParameters();
      updateHUD();
      idx++;
    }, 450);
  };

  // -------------------------------------------------------------------------
  // 9. TACTILE BLOW BUTTON & KEYBOARD BINDINGS
  // -------------------------------------------------------------------------
  const blowBtn = document.getElementById('blow-btn');

  function startBlowing(e) {
    if (e) e.preventDefault();
    initAudio();
    state.isBlowing = true;
    blowBtn.classList.add('translate-x-1', 'translate-y-1', 'shadow-none');
    applyAudioParameters();
    updateHUD();
  }

  function stopBlowing(e) {
    if (e) e.preventDefault();
    state.isBlowing = false;
    blowBtn.classList.remove('translate-x-1', 'translate-y-1', 'shadow-none');
    applyAudioParameters();
    updateHUD();
  }

  blowBtn.addEventListener('mousedown', startBlowing);
  window.addEventListener('mouseup', stopBlowing);
  blowBtn.addEventListener('touchstart', startBlowing, { passive: false });
  window.addEventListener('touchend', stopBlowing);

  // Keyboard shortcut support:
  // Space: Blow
  // A, S, D, J, K, L: Holes 1 - 6
  window.addEventListener('keydown', (e) => {
    // Ignore when user typing into inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.isBlowing) startBlowing();
      return;
    }

    const key = e.key.toLowerCase();
    const keyMap = { 'a': 0, 's': 1, 'd': 2, 'j': 3, 'k': 4, 'l': 5 };
    if (keyMap.hasOwnProperty(key)) {
      toggleHole(keyMap[key]);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      stopBlowing();
    }
  });

  // -------------------------------------------------------------------------
  // 10. INITIALIZATION
  // -------------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvases();
    renderFluteSVG();
    updateHUD();
    requestAnimationFrame(animationLoop);
  });
})();
