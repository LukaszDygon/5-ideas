/* =========================================================================
   AQUEOUS CALORIC SPECTROMETER // CLINICAL RUNNER ENGINE
   ========================================================================= */

let audioEnabled = true;
let audioCtx = null;
let uploadedImage = null;
let currentUnits = 'kcal'; // 'kcal' or 'kJ'
let activeAnimationId = null;
let isExpedited = false;

// Speed multiplier (1 = normal elaborate ~24s, 0.25 = expedited ~6s)
let speedMultiplier = 1.0;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const icon = document.getElementById('sound-icon');
  const text = document.getElementById('sound-text');
  const btn = document.getElementById('sound-toggle');
  
  if (audioEnabled) {
    initAudio();
    icon.innerText = 'volume_up';
    text.innerText = 'AUDIO ON';
    btn.className = 'neo-btn neo-btn-yellow text-xs py-2 px-3 flex items-center gap-1.5';
    playTone(880, 0.1, 'sine');
  } else {
    icon.innerText = 'volume_off';
    text.innerText = 'AUDIO MUTED';
    btn.className = 'neo-btn neo-btn-white text-xs py-2 px-3 flex items-center gap-1.5';
  }
}

function playTone(freq = 600, duration = 0.08, type = 'sine', gainVal = 0.12) {
  if (!audioEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio error:', e);
  }
}

function playPumpSound() {
  if (!audioEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(45, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn(e);
  }
}

function playWarningAlarm() {
  if (!audioEnabled) return;
  playTone(880, 0.12, 'square', 0.14);
  setTimeout(() => playTone(660, 0.18, 'sawtooth', 0.14), 140);
}

function playSlamSound() {
  if (!audioEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(32, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.45, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.55);
    playTone(1200, 0.06, 'square', 0.22);
  } catch (e) {
    console.warn(e);
  }
}

function toggleExpedite() {
  isExpedited = !isExpedited;
  speedMultiplier = isExpedited ? 0.25 : 1.0;
  const btnText = document.getElementById('expedite-text');
  const btn = document.getElementById('expedite-btn');
  if (isExpedited) {
    btnText.innerText = 'MODE: RAPID SCAN (LOWER PRECISION)';
    btn.className = 'neo-btn neo-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shadow-none';
    playTone(1100, 0.1, 'sine');
  } else {
    btnText.innerText = 'MODE: STANDARD (HIGH FIDELITY)';
    btn.className = 'neo-btn neo-btn-yellow text-[11px] py-1.5 px-3 flex items-center gap-1 shadow-none';
    playTone(550, 0.1, 'sine');
  }
}

/* =========================================================================
   FILE SELECTION & PREVIEW
   ========================================================================= */

function triggerFileSelect() {
  document.getElementById('file-input').click();
}

function handleFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    processUploadedFile(file);
  }
}

// Drag-and-drop
const dropZone = document.getElementById('drop-zone');
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('bg-tertiary-yellow/20', 'border-primary-magenta');
  });
});
['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('bg-tertiary-yellow/20', 'border-primary-magenta');
  });
});
dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const file = dt && dt.files && dt.files[0];
  if (file && file.type.startsWith('image/')) {
    processUploadedFile(file);
  }
});

function processUploadedFile(file) {
  initAudio();
  playTone(520, 0.1, 'sine');
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      uploadedImage = img;
      
      document.getElementById('preview-image').src = e.target.result;
      document.getElementById('drop-empty-state').classList.add('hidden');
      document.getElementById('drop-loaded-state').classList.remove('hidden');
      document.getElementById('drop-loaded-state').classList.add('flex');
      document.getElementById('clear-btn').classList.remove('hidden');

      document.getElementById('specimen-meta').innerText = `SPECIMEN RECORD: ${file.name.substring(0, 24)}`;
      document.getElementById('specimen-size').innerText = `${(file.size / 1024).toFixed(1)} KB`;

      const btn = document.getElementById('analyze-btn');
      btn.disabled = false;
      btn.classList.remove('opacity-40', 'cursor-not-allowed');
      btn.classList.add('hover:scale-105');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearSpecimen() {
  uploadedImage = null;
  document.getElementById('file-input').value = '';
  document.getElementById('preview-image').src = '';
  document.getElementById('drop-empty-state').classList.remove('hidden');
  document.getElementById('drop-loaded-state').classList.add('hidden');
  document.getElementById('drop-loaded-state').classList.remove('flex');
  document.getElementById('clear-btn').classList.add('hidden');

  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  btn.classList.add('opacity-40', 'cursor-not-allowed');
  btn.classList.remove('hover:scale-105');
  playTone(340, 0.08, 'triangle');
}

/* =========================================================================
   STAGE 2: LABORIOUS DIAGNOSTIC EXECUTION
   ========================================================================= */

const CLINICAL_DIAGNOSTICS = [
  // --- PHASE 1: OPTICAL CALIBRATION (0% - 20%) ---
  {
    phase: 1,
    name: "PHASE 1: OPTICAL CALIBRATION & MENISCUS MAPPING",
    title: "Phase 1: Sub-Pixel Surface & Refractive Meniscus Geometry",
    desc: "Mapping the optical interface to compute Snell refraction index (n = 1.3330) and isolate ambient reflection glare.",
    substatus: "MAPPING BOUNDARY GRADIENT",
    progress: 4,
    reticle: { top: "35%", left: "40%", w: "120px", h: "120px", label: "MENISCUS BOUNDARY" },
    log: "[OPT-01] Aperture shutter opened. Capturing photometric pixel array...",
    tickerVal: "1428.50000",
    subtraction: "Uncorrected gross photometric energy across sample plane",
    time: 500
  },
  {
    phase: 1,
    progress: 10,
    reticle: { top: "20%", left: "25%", w: "90px", h: "90px", label: "REFRACTIVE INDEX" },
    log: "[OPT-02] Surface tension contact angle evaluated: 72.8 mN/m confirmed for aqueous phase.",
    time: 1600
  },
  {
    phase: 1,
    progress: 18,
    reticle: { top: "50%", left: "55%", w: "140px", h: "110px", label: "AMBIENT GLARE FILTER" },
    log: "[OPT-03] Filtering ambient specular lighting reflection (-412.000 kcal baseline offset)...",
    tickerVal: "1016.50000",
    subtraction: "-412.000 kcal (ambient photometric reflection)",
    time: 2900
  },
  {
    phase: 1,
    progress: 20,
    log: "[OPT-04] Meniscus geometry resolved at R = 4.2 mm. Optical baseline secured.",
    time: 4200
  },

  // --- PHASE 2: BASELINE CORRECTION & THERMAL SUBTRACTION (20% - 42%) ---
  {
    phase: 2,
    name: "PHASE 2: SENSOR STABILIZATION & THERMAL SUBTRACTION",
    title: "Phase 2: Cryogenic Sensor Stabilization & Ambient Thermal Subtraction",
    desc: "Evacuating atmospheric gas interference and stabilizing sensor array to eliminate ambient blackbody radiation.",
    substatus: "SUBTRACTING DISSOLVED AMBIENT GASES",
    progress: 25,
    pressure: "42.100 kPa",
    temp: "198.40 K",
    reticle: { top: "30%", left: "30%", w: "180px", h: "180px", label: "BACKGROUND SUBTRACTION" },
    log: "[VAC-01] Chamber evacuation active. Compensating for dissolved gaseous nitrogen and oxygen...",
    tickerVal: "842.11020",
    subtraction: "-174.389 kcal (atmospheric dissolved gas energy)",
    time: 5200,
    action: () => playPumpSound()
  },
  {
    phase: 2,
    progress: 32,
    pressure: "8.400 kPa",
    temp: "77.30 K",
    log: "[VAC-02] Thermal baseline adjusted: eliminating ambient sensible heat (-312.440 kcal)...",
    subtraction: "-312.440 kcal (ambient sensible enthalpy)",
    tickerVal: "529.67020",
    time: 6800,
    action: () => playPumpSound()
  },
  {
    phase: 2,
    progress: 38,
    pressure: "0.012 kPa",
    temp: "14.50 K",
    log: "[CRYO-03] Sensor lattice stabilized at 4.20 K. Cryogenic noise floor achieved.",
    time: 8400
  },
  {
    phase: 2,
    progress: 42,
    pressure: "0.002 kPa",
    temp: "4.20 K",
    log: "[CRYO-04] Chamber pressure reading: 0.002 kPa. Background interference eliminated.",
    time: 9800
  },

  // --- PHASE 3: RAMAN & FTIR BOND SPECTROMETRY (42% - 66%) ---
  {
    phase: 3,
    name: "PHASE 3: DUAL-BEAM RAMAN & FTIR MOLECULAR SPECTROMETRY",
    title: "Phase 3: Molecular Hydrogen Bond Harmonic Analysis",
    desc: "Interrogating the vibrational harmonic modes of the dihydrogen monoxide lattice to identify metabolizable carbon bonds.",
    substatus: "FTIR INTERFEROMETER SCANNING 3657 cm⁻¹",
    progress: 48,
    bonds: "428,000,000",
    spectralBand: "BAND: 970 nm (OVERTONE)",
    reticle: { top: "40%", left: "35%", w: "100px", h: "100px", label: "O-H SYMMETRIC STRETCH" },
    log: "[RAMAN-01] Emitting 532 nm laser beam. Probing symmetric O-H stretching mode (v₁ = 3657 cm⁻¹)...",
    tickerVal: "142.10090",
    subtraction: "-387.569 kcal (non-covalent thermal phonons)",
    time: 11000
  },
  {
    phase: 3,
    progress: 54,
    bonds: "1,290,000,000",
    spectralBand: "BAND: 1450 nm (COMBINATION)",
    log: "[RAMAN-02] Interrogating asymmetric stretch mode (v₃ = 3756 cm⁻¹)...",
    tickerVal: "38.44100",
    subtraction: "-103.659 kcal (vibrational rotational modes)",
    time: 12600
  },
  {
    phase: 3,
    progress: 60,
    bonds: "3,840,000,000",
    spectralBand: "BAND: 3657 cm⁻¹ (H-BOND MATRIX)",
    log: "[RAMAN-03] Measuring hydrogen bond network enthalpy: ΔH = 21 kJ/mol (non-metabolizable)...",
    tickerVal: "3.80140",
    subtraction: "-34.639 kcal (intermolecular hydrogen bond network)",
    time: 14200
  },
  {
    phase: 3,
    progress: 66,
    bonds: "9,999,999,999+",
    log: "[RAMAN-04] Carbon-hydrogen (C-H) and C-C bond scan negative. Specimen confirmed pure aqueous matrix.",
    time: 15600
  },

  // --- PHASE 4: ENTHALPY SOLVER & BASELINE AUDIT (66% - 88%) ---
  {
    phase: 4,
    name: "PHASE 4: THERMODYNAMIC ENTHALPY INTEGRATION",
    title: "Phase 4: High-Order Thermodynamic Deconvolution",
    desc: "Solving the Gibbs-Helmholtz equations to compute available biological metabolizable energy.",
    substatus: "INTEGRATING GIBBS EQUATION: ΔG = ΔH - TΔS",
    progress: 72,
    log: "[THERM-01] Computing standard enthalpy of combustion for aqueous components...",
    tickerVal: "0.41840",
    subtraction: "-3.383 kcal (solute hydration enthalpy)",
    time: 17000
  },
  {
    phase: 4,
    progress: 78,
    log: "[THERM-02] Deducting mechanical work of esophageal fluid transit (-0.418 kcal)...",
    tickerVal: "0.00008",
    subtraction: "AUDIT: Evaluating 0.00008 kcal baseline variance",
    time: 18400,
    action: () => {
      playWarningAlarm();
      const meter = document.getElementById('meter-container');
      meter.classList.add('bg-tertiary-yellow/20');
      document.getElementById('ticker-status').innerText = 'AUDIT: 0.00008 kcal VARIANCE DETECTED';
      document.getElementById('ticker-status').className = 'text-primary-magenta font-black';
    }
  },
  {
    phase: 4,
    progress: 82,
    substatus: "EXECUTING 64-POINT FFT BASELINE FILTER",
    log: "[AUDIT-03] High-frequency variance detected (0.00008 kcal). Running 64-point FFT spectral baseline correction...",
    time: 19800
  },
  {
    phase: 4,
    progress: 88,
    log: "[RESOLVED-04] Variance resolved: Optical refraction through specimen vessel wall. Corrected to 0.00000 kcal.",
    tickerVal: "0.00000",
    subtraction: "Absolute mathematical convergence: 0.00000 kcal",
    time: 21200,
    action: () => {
      const meter = document.getElementById('meter-container');
      meter.classList.remove('bg-tertiary-yellow/20');
      document.getElementById('ticker-status').innerText = 'CONVERGENCE: ABSOLUTE ZERO';
      document.getElementById('ticker-status').className = 'text-acid-lime bg-ink px-2 font-black';
      playTone(1050, 0.15, 'sine');
    }
  },

  // --- PHASE 5: METROLOGY CERTIFICATION (88% - 100%) ---
  {
    phase: 5,
    name: "PHASE 5: METROLOGY CERTIFICATION & CHECKSUM",
    title: "Phase 5: Laboratory Calibration Verification & Integrity Checksum",
    desc: "Generating cryptographic hash of analytical dataset and compiling official physical measurement record.",
    substatus: "COMPILING PHYSICAL MEASUREMENT RECORD",
    progress: 92,
    hash: "0x7f4e89a2bc...",
    log: "[METROLOGY-01] Generating SHA-256 measurement integrity checksum: 7f4e89a2bc993e11...",
    time: 22600
  },
  {
    phase: 5,
    progress: 97,
    hash: "0x7f4e89a2bc993e11f8...",
    log: "[METROLOGY-02] Checksum validated against Standard Reference Materials protocol.",
    time: 23800
  },
  {
    phase: 5,
    progress: 100,
    log: "[METROLOGY-03] ANALYTICAL DETERMINATION CONCLUDED: 0.00000 kcal CONFIRMED.",
    time: 24800
  }
];

let currentDiagnosticTimeouts = [];

function startAnalysis() {
  if (!uploadedImage) return;
  initAudio();
  playTone(700, 0.15, 'sine', 0.25);

  document.getElementById('upload-panel').classList.add('hidden');
  const theater = document.getElementById('analysis-theater');
  theater.classList.remove('hidden');
  theater.classList.add('flex');
  document.getElementById('certificate-panel').classList.add('hidden');

  const canvas = document.getElementById('specimen-canvas');
  canvas.width = uploadedImage.width || 400;
  canvas.height = uploadedImage.height || 300;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

  document.getElementById('terminal-log').innerHTML = '';
  setupRadar();

  executeClinicalSchedule();
}

function executeClinicalSchedule() {
  currentDiagnosticTimeouts.forEach(t => clearTimeout(t));
  currentDiagnosticTimeouts = [];

  const totalScheduleDuration = CLINICAL_DIAGNOSTICS[CLINICAL_DIAGNOSTICS.length - 1].time;

  CLINICAL_DIAGNOSTICS.forEach(step => {
    const scaledTime = step.time * speedMultiplier;
    const timeout = setTimeout(() => {
      applyClinicalStep(step);
    }, scaledTime);
    currentDiagnosticTimeouts.push(timeout);
  });

  const finishTimeout = setTimeout(() => {
    finishAnalysis();
  }, (totalScheduleDuration + 800) * speedMultiplier);
  currentDiagnosticTimeouts.push(finishTimeout);
}

function applyClinicalStep(step) {
  const progressFill = document.getElementById('master-progress-fill');
  const progressPct = document.getElementById('master-progress-pct');
  progressFill.style.width = `${step.progress}%`;
  progressPct.innerText = `${step.progress}%`;

  for (let i = 1; i <= 5; i++) {
    const badge = document.getElementById(`step-badge-${i}`);
    if (i === step.phase) {
      badge.className = 'p-1.5 border-2 border-tertiary-yellow bg-tertiary-yellow text-ink font-black step-active-pulse shadow-[2px_2px_0px_#1c1b1b]';
    } else if (i < step.phase) {
      badge.className = 'p-1.5 border border-acid-lime bg-acid-lime/20 text-acid-lime font-bold';
      badge.innerHTML = `✓ [${i}] COMPLETED`;
    } else {
      badge.className = 'p-1.5 border border-white/20 bg-white/5 text-white/50 font-normal';
    }
  }

  if (step.name) document.getElementById('active-phase-name').innerText = step.name;
  if (step.title) document.getElementById('phase-title').innerText = step.title;
  if (step.desc) document.getElementById('phase-description').innerText = step.desc;
  if (step.substatus) document.getElementById('phase-substatus').innerText = `STATUS: ${step.substatus}`;
  if (step.phase) document.getElementById('phase-icon-box').innerText = step.phase;

  if (step.reticle) {
    const ret = document.getElementById('scanning-reticle-box');
    ret.style.top = step.reticle.top;
    ret.style.left = step.reticle.left;
    ret.style.width = step.reticle.w;
    ret.style.height = step.reticle.h;
    if (step.reticle.label) document.getElementById('reticle-label').innerText = step.reticle.label;
  }

  if (step.pressure) document.getElementById('gauge-pressure').innerText = step.pressure;
  if (step.temp) document.getElementById('gauge-temp').innerText = step.temp;
  if (step.bonds) document.getElementById('gauge-bonds').innerText = step.bonds;
  if (step.spectralBand) document.getElementById('spectral-band-indicator').innerText = step.spectralBand;
  if (step.hash) document.getElementById('gauge-hash').innerText = step.hash;

  if (step.tickerVal) {
    document.getElementById('ticker-number').innerText = step.tickerVal;
  }
  if (step.subtraction) {
    document.getElementById('subtraction-banner').innerText = step.subtraction;
  }

  if (step.log) {
    const term = document.getElementById('terminal-log');
    const line = document.createElement('div');
    line.className = 'leading-tight';
    line.innerText = step.log;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
    playTone(420 + Math.random() * 300, 0.04, 'square', 0.08);
  }

  if (step.action) {
    step.action();
  }
}

function finishAnalysis() {
  if (activeAnimationId) {
    cancelAnimationFrame(activeAnimationId);
  }

  playSlamSound();

  document.getElementById('analysis-theater').classList.add('hidden');
  document.getElementById('analysis-theater').classList.remove('flex');
  const certPanel = document.getElementById('certificate-panel');
  certPanel.classList.remove('hidden');
  certPanel.classList.add('flex');

  const root = document.getElementById('hydrocal-root');
  root.classList.add('rumble');
  setTimeout(() => root.classList.remove('rumble'), 500);

  const randomRef = 'H2O-' + Math.floor(10000 + Math.random() * 90000);
  document.getElementById('cert-id').innerText = '#' + randomRef;
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('cert-date').innerText = todayStr;
  const shortHash = '0x' + Math.random().toString(16).substring(2, 10) + '...';
  document.getElementById('cert-hash').innerText = shortHash;

  const url = new URL(window.location);
  url.searchParams.set('cert', randomRef);
  url.searchParams.set('ts', todayStr);
  window.history.replaceState({}, '', url);
}

/* =========================================================================
   STAGE 3: CERTIFICATE & EXPORT
   ========================================================================= */

function toggleUnits() {
  const valEl = document.getElementById('monumental-val');
  const unitEl = document.getElementById('unit-label');
  
  if (currentUnits === 'kcal') {
    currentUnits = 'kJ';
    valEl.innerText = '0.00000';
    unitEl.innerText = 'KILOJOULES (kJ)';
  } else {
    currentUnits = 'kcal';
    valEl.innerText = '0.00000';
    unitEl.innerText = 'KILOCALORIES (kcal)';
  }
  playTone(640, 0.08, 'sine');
}

function copyShareLink() {
  initAudio();
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const btnText = document.getElementById('copy-btn-text');
    const originalText = btnText.innerText;
    btnText.innerText = 'LINK COPIED! ✓';
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => {
      btnText.innerText = originalText;
    }, 2000);
  }).catch(err => {
    alert('Share URL: ' + url);
  });
}

function resetLab() {
  clearSpecimen();
  document.getElementById('certificate-panel').classList.add('hidden');
  document.getElementById('certificate-panel').classList.remove('flex');
  document.getElementById('upload-panel').classList.remove('hidden');
  
  const url = new URL(window.location);
  url.searchParams.delete('cert');
  url.searchParams.delete('ts');
  window.history.replaceState({}, '', url.pathname);
}

/* =========================================================================
   CANVAS RADAR & SPECTROGRAM VISUALIZER
   ========================================================================= */

function setupRadar() {
  const canvas = document.getElementById('radar-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth || 300;
  canvas.height = canvas.parentElement.clientHeight || 112;

  let angle = 0;
  const numBars = 36;
  const barHeights = new Array(numBars).fill(0);

  function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const midY = canvas.height / 2;

    ctx.strokeStyle = 'rgba(57, 255, 20, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    const barWidth = canvas.width / numBars;
    for (let i = 0; i < numBars; i++) {
      barHeights[i] += (Math.random() * canvas.height * 0.7 - barHeights[i]) * 0.15;
      ctx.fillStyle = (i % 3 === 0) ? '#00e5ff' : (i % 3 === 1) ? '#39ff14' : '#fae100';
      ctx.fillRect(i * barWidth, canvas.height - barHeights[i], barWidth - 2, barHeights[i]);
    }

    ctx.strokeStyle = '#ff1493';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 3) {
      const y = midY + Math.sin((x + angle * 25) * 0.06) * 18 * Math.cos(angle * 1.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    angle += 0.04;
    activeAnimationId = requestAnimationFrame(draw);
  }

  draw();
}

/* =========================================================================
   CERTIFICATE CARD DOWNLOAD (CANVAS COMPOSITOR)
   ========================================================================= */

function downloadBadge() {
  initAudio();
  playTone(750, 0.1, 'sine');

  const canvas = document.getElementById('export-canvas');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f5f3ef';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1c1b1b';
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#b40065');
  grad.addColorStop(0.5, '#fae100');
  grad.addColorStop(1, '#008190');
  ctx.fillStyle = grad;
  ctx.fillRect(10, 10, canvas.width - 20, 16);

  ctx.fillStyle = '#b40065';
  ctx.font = '900 13px "JetBrains Mono", monospace';
  ctx.fillText('DIVISION OF PHYSICAL CHEMISTRY & METROLOGICAL STANDARDS', 35, 58);

  ctx.fillStyle = '#1c1b1b';
  ctx.font = '900 28px "Bricolage Grotesque", sans-serif';
  ctx.fillText('CERTIFICATE OF ANALYTICAL DETERMINATION', 35, 96);

  const refText = document.getElementById('cert-id').innerText;
  const dateText = document.getElementById('cert-date').innerText;
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1c1b1b';
  ctx.fillText(`SAMPLE: ${refText}  |  DATE: ${dateText}  |  DETERMINATION: CONCLUDED`, 35, 126);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(100, 155, canvas.width - 200, 195);
  ctx.strokeStyle = '#b40065';
  ctx.lineWidth = 4;
  ctx.strokeRect(100, 155, canvas.width - 200, 195);

  ctx.fillStyle = '#b40065';
  ctx.font = '900 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PHYSIOLOGICALLY AVAILABLE METABOLIZABLE ENERGY', canvas.width / 2, 188);

  ctx.fillStyle = '#1c1b1b';
  ctx.font = '900 64px "Bricolage Grotesque", sans-serif';
  ctx.fillText('0.00000', canvas.width / 2, 262);

  ctx.fillStyle = '#fae100';
  ctx.fillRect(canvas.width / 2 - 110, 285, 220, 32);
  ctx.strokeRect(canvas.width / 2 - 110, 285, 220, 32);
  ctx.fillStyle = '#1c1b1b';
  ctx.font = '900 14px "JetBrains Mono", monospace';
  ctx.fillText('KILOCALORIES (kcal)', canvas.width / 2, 307);

  ctx.textAlign = 'left';
  ctx.font = '600 13px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#1c1b1b';
  ctx.fillText('Standard thermodynamic calorimetry confirms zero metabolizable caloric yield in aqueous matrix.', 35, 395);

  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#008190';
  ctx.fillText('5 IDEAS DAILY SHOWCASE // AQUEOUS CALORIC SPECTROMETER // ACS-9', 35, 435);

  const link = document.createElement('a');
  link.download = `Analytical-Certificate-${refText.replace('#', '')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* =========================================================================
   ON LOAD: CHECK FOR SHARED CERTIFICATE URL PARAMS
   ========================================================================= */

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sharedCert = urlParams.get('cert');
  const sharedTs = urlParams.get('ts');

  if (sharedCert) {
    document.getElementById('upload-panel').classList.add('hidden');
    const certPanel = document.getElementById('certificate-panel');
    certPanel.classList.remove('hidden');
    certPanel.classList.add('flex');
    document.getElementById('cert-id').innerText = '#' + sharedCert;
    if (sharedTs) {
      document.getElementById('cert-date').innerText = sharedTs;
    }
  }
});
